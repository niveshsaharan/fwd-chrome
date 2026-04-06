window.FWD = window.FWD || {};
FWD.engine = (function ($, config, ui, serviceCatalog) {

    var serviceMappings = config.buildMappings();
    var cacheStore = {};

    function logger() {
        if (arguments.length > 1) {
            console.groupCollapsed('%c' + arguments[0], 'color:#ff8000;');
            for (var i = 1; i < arguments.length; i++) console.log(arguments[i]);
            console.groupEnd();
        } else {
            console.log('%c' + arguments[0], 'color:#ff8000;');
        }
    }

    function makeCacheKey(obj) {
        return [obj.OrderID, obj.ServiceID, obj.RequestedPackageTypeID,
            obj.ProviderID, obj.CarrierID, obj.Length, obj.Width, obj.Height].join('_');
    }

    function cacheGet(request) {
        return cacheStore[makeCacheKey(request.orderViews[0])];
    }

    function cacheSet(request, response) {
        if (response && response.orders && response.orders[0]) {
            cacheStore[makeCacheKey(response.orders[0])] = response;
        }
        return cacheStore[makeCacheKey(request.orderViews[0])];
    }

    function filterServices(allServices, orderData, enabledServices) {
        return allServices.filter(function (service) {
            if (!serviceCatalog.isServiceEnabled(service.toggleId, enabledServices)) {
                return false;
            }

            var valid = true;
            if (service.conditions && service.conditions.length) {
                valid = service.conditions.every(function (c) { return config.evaluate(c, orderData); });
            }
            if (valid) {
                config.COMMON_CONDITIONS.forEach(function (cc) {
                    if (valid && typeof config.CONDITIONS[cc['function']] === 'function') {
                        if (config.CONDITIONS[cc['function']](orderData, ...cc.args)) {
                            valid = cc.eligible.services.includes(service.serviceId);
                        }
                    }
                });
            }
            return valid;
        });
    }

    function weekendCount(d1, d2) {
        var a = new Date(d1), b = new Date(d2), count = 0;
        while (a <= b) {
            var day = a.getDay();
            if (day === 0 || day === 6) count++;
            a.setDate(a.getDate() + 1);
        }
        return count;
    }

    function parseDeliveryDays(deliveryTime) {
        if (!deliveryTime) return null;
        var parts = String(deliveryTime).split(' ');
        if (parts.length <= 1) return parseInt(deliveryTime, 10);

        var deliveryDate;
        var now = new Date();
        var today = new Date(now.getMonth() + 1 + '/' + now.getDate() + '/' + now.getFullYear());

        if (parts[0] === 'Tomorrow') {
            deliveryDate = new Date(today);
            deliveryDate.setDate(deliveryDate.getDate() + 1);
        } else {
            var md = parts[1].split('/');
            deliveryDate = new Date(md[0] + '/' + md[1] + '/' + now.getFullYear());
        }

        var rawDays = Math.ceil((deliveryDate - today) / (1000 * 60 * 60 * 24));
        return rawDays - weekendCount(today, deliveryDate);
    }

    var FEDEX_DELIVERY_IDS = [50, 51, 52, 55];

    function setRateFromResponse(response, services) {
        if (!(response && response.final && response.success && response.orders && response.orders.length)) return;

        var order = response.orders[0];
        services.forEach(function (service) {
            if (!ui.currentlyViewingSameOrder(order.OrderNumber)) return;
            var dimsMatch =
                (parseInt(service.length, 10) === parseInt(order.Length, 10) || service.length === null) &&
                (parseInt(service.width, 10) === parseInt(order.Width, 10) || service.width === null) &&
                (parseInt(service.height, 10) === parseInt(order.Height, 10) || service.height === null);
            var idsMatch =
                parseInt(order.ServiceID, 10) === parseInt(service.serviceId, 10) &&
                parseInt(order.RequestedPackageTypeID, 10) === parseInt(service.packageId, 10);

            if (!dimsMatch || !idsMatch) return;

            service.order = order;
            if (order.RateError) {
                logger('Rate Error for ' + service.service, order.RateError);
                return;
            }

            service.shippingService = order.RequestedShippingService;
            service.price = order.ShippingCost + order.ConfirmationCost + order.InsuranceCost + order.OtherCost;

            var reqService = (service.shippingService || '').toLowerCase();
            var is2DayOrNextDay = reqService.includes('2-day delivery') || reqService.includes('next day delivery');

            if (is2DayOrNextDay && FEDEX_DELIVERY_IDS.includes(service.serviceId)) {
                service.deliveryTime = parseDeliveryDays(order.DeliveryTime);
            }

            logger('Response for ' + service.service + ' - ' + service.package + ' @ ' + service.price, service);
        });
    }

    function selectCheapest(services) {
        var has2DayNextDay = services.some(function (s) {
            return s.shippingService &&
                (s.shippingService.toLowerCase().includes('2-day delivery') ||
                 s.shippingService.toLowerCase().includes('next day delivery'));
        });

        if (has2DayNextDay) {
            return select2DayNextDay(services);
        }

        return services
            .filter(function (s) { return s.price > 0; })
            .reduce(function (prev, curr) {
                if (!prev || prev === 0) return curr;
                var prioKey = curr.service + '___' + prev.service;
                if (prev.price <= curr.price && (typeof config.PRIORITY_MAP[prioKey] === 'undefined' || config.PRIORITY_MAP[prioKey] === prev.service)) {
                    return prev;
                }
                return curr;
            }, 0) || null;
    }

    function select2DayNextDay(services) {
        function fedexWithDelivery(maxDays, extraFilter) {
            return services.filter(function (s) {
                var reqSvc = (s.shippingService || '').toLowerCase();
                var is2DayNext = reqSvc.includes('2-day delivery') || reqSvc.includes('next day delivery');
                return s.price > 0 && s.deliveryTime <= maxDays && is2DayNext &&
                    FEDEX_DELIVERY_IDS.includes(s.serviceId) && (!extraFilter || extraFilter(s));
            });
        }

        var cheapest2Day = fedexWithDelivery(2).reduce(function (p, c) { return (!p || c.price < p.price) ? c : p; }, null);
        var fastest = fedexWithDelivery(2).reduce(function (p, c) { return (!p || c.deliveryTime < p.deliveryTime) ? c : p; }, null);

        if (cheapest2Day && cheapest2Day.shippingService &&
            cheapest2Day.shippingService.toLowerCase().includes('2-day delivery') && cheapest2Day.deliveryTime <= 2) {
            return cheapest2Day;
        }

        if (cheapest2Day && cheapest2Day.shippingService &&
            cheapest2Day.shippingService.toLowerCase().includes('next day delivery') && cheapest2Day.deliveryTime <= 1) {
            var overnightOnly = fedexWithDelivery(2, function (s) { return s.serviceId === 55 && s.shippingService.toLowerCase().includes('next day delivery'); })
                .reduce(function (p, c) { return (!p || c.price < p.price) ? c : p; }, null);
            var groundOrHome = fedexWithDelivery(2, function (s) { return (s.serviceId === 50 || s.serviceId === 51) && s.shippingService.toLowerCase().includes('next day delivery'); })
                .reduce(function (p, c) { return (!p || c.price < p.price) ? c : p; }, null);
            return (groundOrHome && groundOrHome.deliveryTime <= 1) ? groundOrHome : overnightOnly;
        }

        return fastest;
    }

    function applySelection(data, service) {
        service = JSON.parse(JSON.stringify(service));

        if (!(service && service.order && ui.currentlyViewingSameOrder(service.order.OrderNumber))) return;

        var $c = ui.getContainer();
        ui.setWip();

        if (parseInt($c.find('[name="ServiceID"]').val(), 10) !== parseInt(service.serviceId, 10)) {
            $c.find('[name="ServiceID"]').val(service.serviceId).trigger('change');
        }

        setTimeout(function () {
            if (service.when_cheapest && service.custom !== true) {
                Object.keys(service.when_cheapest).forEach(function (k) { service[k] = service.when_cheapest[k]; });
            }

            if (parseInt($c.find('[name="RequestedPackageTypeID"]').val(), 10) !== parseInt(service.packageId, 10)) {
                $c.find('[name="RequestedPackageTypeID"]').val(service.packageId).trigger('change');
            } else {
                setTimeout(function () {
                    if (service.when_cheapest && service.custom !== true) {
                        if (service.when_cheapest.length != null) $c.find('[name="LengthIn"]').val(service.length).change();
                        if (service.when_cheapest.width != null)  $c.find('[name="WidthIn"]').val(service.width).change();
                        if (service.when_cheapest.height != null) $c.find('[name="HeightIn"]').val(service.height).change();
                        return;
                    }
                    logger('Cheapest set: ' + service.service + ' - ' + service.package + ' @ ' + service.price, service);
                    ui.showCheckmark($c);
                    ui.hideProcessing();
                    ui.removeWip();
                }, 1000);
            }

            if(service.sellerProviderId){
                setTimeout(function () {
                    if(parseInt($c.find('select.billToSelect option:selected').data('sellerproviderid')) !== parseInt(service.sellerProviderId, 10))
                    {
                        $c.find('select.billToSelect option[data-sellerproviderid="'+service.sellerProviderId+'"]').prop('selected', true).change()
                    }
                }, 1500);
            }
        }, 2000);
    }

    async function fetchRate(data, service) {
        data.lowPriority = false;
        data.orderViews[0].ServiceID = service.serviceId;
        data.orderViews[0].RequestedPackageTypeID = service.packageId;
        data.orderViews[0].ProviderID = service.providerId;
        data.orderViews[0].CarrierID = service.carrierId;
        data.orderViews[0].Rate = 0;
        data.orderViews[0].RateError = null;
        data.orderViews[0].RatingRequestPending = false;
        data.orderViews[0].UpdatedRate = true;

        Object.keys(config.COMMON_FIELDS).forEach(function (f) { data.orderViews[0][f] = config.COMMON_FIELDS[f]; });
        var carrierFields = config.CARRIER_FIELDS[data.orderViews[0].CarrierID];
        if (carrierFields) Object.keys(carrierFields).forEach(function (f) { data.orderViews[0][f] = carrierFields[f]; });

        var res = cacheGet(data);
        if (!res) {
            res = await fetch('https://ss4.shipstation.com/api/orders/updaterates', {
                headers: { accept: 'application/json', 'content-type': 'application/json; charset=UTF-8' },
                body: JSON.stringify(data), method: 'POST', credentials: 'include',
            });
            res = await res.json();
            logger('Fetched rate for ' + service.service + '(' + res.orders[0].ServiceID + ') / ' +
                service.package + '(' + res.orders[0].RequestedPackageTypeID + ')', data, res);
        }
        cacheSet(data, res);
        return res;
    }
    

    async function rateShop(requestData, responseData, enabledServices) {

        const serviceMappingWithPrices = JSON.parse(
            JSON.stringify(serviceMappings)
        );

        var order = requestData.orderViews[0];

        var storeOverride = config.getStoreOverride(order.StoreName, order.RequestedShippingService);

        if (storeOverride) {
            var enabledOverrideServices = storeOverride.filter(function (service) {
                return serviceCatalog.isServiceEnabled(service.toggleId, enabledServices);
            });

            if (enabledOverrideServices.length) {
                var overrideService = enabledOverrideServices[0];
                ui.clearCheapest(true);
                applySelection(requestData, Object.assign({}, overrideService, { order: order }));
                return;
            }

            logger('Store override skipped — all override services are disabled.');
        }

        var size = order.Length + 'x' + order.Width + 'x' + order.Height;

        // if (config.INELIGIBLE_STORES.includes(order.StoreName)) {
        //     ui.clearCheapest(false);
        //     ui.removeWip();
        //     ui.showCheckmark(ui.getContainer());
        //     logger('Store ineligible — checkmark shown');
        //     return;
        // }

        var allServices = [].concat(serviceMappingWithPrices[size] || [], serviceMappingWithPrices['***'] || []);

        if (config.EXCEPTION_DIMS.includes(size)) {
            var reqSvc = (order.RequestedShippingService || '').toLowerCase().replace(/"/g, '');
            if (!config.EXCEPTION_SERVICES.includes(reqSvc)) {
                logger('Exceptional size — tool will not trigger.');
                ui.removeWip();
                return;
            }
        }

        var services = filterServices(allServices, order, enabledServices);

        if (!services.length) {
            logger('No services to check');
            ui.clearCheapest(false);
            ui.removeWip();
            ui.hideProcessing();
            return;
        }

        logger('Rate shopping ' + services.length + ' services...');

        if (responseData && responseData.final && responseData.success && responseData.orders && responseData.orders.length) {
            cacheSet(requestData, responseData);
            setRateFromResponse(responseData, services);
        }

        for (var i = 0; i < services.length; i++) {
            var svc = services[i];
            if (typeof svc.order === 'undefined') {
                var res = await fetchRate(requestData, svc);
                setRateFromResponse(res, services);
            }
        }

        var cheapest = selectCheapest(services);

        if (cheapest && cheapest.price > 0 && cheapest.order && ui.currentlyViewingSameOrder(cheapest.order.OrderNumber)) {
            ui.clearCheapest(true);
            ui.showCheapestBanner(ui.getContainer(), cheapest);
            applySelection(requestData, cheapest);
        } else {
            ui.clearCheapest(false);
            ui.hideProcessing();
            console.error('Rate shop failed — no valid cheapest.', services, cheapest);
        }
    }

    function hasMappingForSize(l, w, h, enabledServices) {
        var services = [].concat(serviceMappings[l + 'x' + w + 'x' + h] || [], serviceMappings['***'] || []);

        return services.some(function (service) {
            return serviceCatalog.isServiceEnabled(service.toggleId, enabledServices);
        });
    }

    return {
        rateShop:           rateShop,
        hasMappingForSize:  hasMappingForSize,
        logger:             logger,
    };

})(Backbone.$, FWD.config, FWD.ui, FWD.serviceCatalog);
