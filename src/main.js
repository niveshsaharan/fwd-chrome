(function ($, config, ui, engine, serviceCatalog) {

    if (typeof Backbone === 'undefined') { console.error('Backbone not found.'); return; }

    var settings = {
        enabled: false,
        autorun: false,
        skipAlreadySelected: true,
        enabledServices: serviceCatalog.getDefaultEnabledServices(),
    };

    function onSettingChanged(s) {
        Object.keys(s).forEach(function (k) {
            if (k === 'enabledServices') {
                settings.enabledServices = serviceCatalog.normalizeEnabledServices(s.enabledServices);
                return;
            }

            settings[k] = s[k];
        });
    }

    window.postMessage({ type: 'GET_SETTINGS' }, '*');

    window.addEventListener('message', function (e) {
        if (e.source !== window) return;
        if (e.data.type === 'SETTINGS_RESPONSE') onSettingChanged(e.data.settings);
        if (e.data.type === 'SETTING_CHANGED') onSettingChanged(e.data.changes);
    });

    function isActive() { return !window.fwdPaused && settings.enabled; }

    // ===== A packer's own Service / Package choice =====
    // When a packer changes either dropdown by hand, later rate refreshes for
    // that order are left alone, until the packer clicks Get Quote to hand the
    // order back. Only real user input counts (event.isTrusted): the tool's own
    // jQuery .val().trigger('change') and .click() never fire these listeners.
    // A change is tied to its order by the next /api/orders/updaterates request
    // that carries the chosen value. Keys match engine selection sync.
    var MANUAL_BIND_WINDOW_MS = 10000;
    var manualOrders = {};
    var pendingManual = null;
    var pendingReshopAt = 0;

    function orderIdentity(requestData) {
        var order = requestData && requestData.orderViews && requestData.orderViews[0];
        if (!order) return null;
        if (order.OrderID != null && order.OrderID !== '') return 'id:' + order.OrderID;
        if (order.OrderNumber) return 'number:' + order.OrderNumber;
        return null;
    }

    document.addEventListener('change', function (e) {
        var target = e.target;
        if (!e.isTrusted || !target || typeof target.matches !== 'function') return;
        if (target.matches('[name="ServiceID"], [name="RequestedPackageTypeID"]')) {
            pendingManual = { field: target.getAttribute('name'), value: target.value, at: Date.now() };
        }
    }, true);

    document.addEventListener('click', function (e) {
        var target = e.target;
        if (e.isTrusted && target && typeof target.closest === 'function' && target.closest('.get-quote')) {
            pendingReshopAt = Date.now();
        }
    }, true);

    // Called for each /api/orders/updaterates request; returns true when the
    // request's order is under the packer's manual control.
    function trackManualChoice(requestData) {
        var identity = orderIdentity(requestData);
        if (!identity) return false;
        var order = requestData.orderViews[0];
        var now = Date.now();

        if (pendingReshopAt && now - pendingReshopAt <= MANUAL_BIND_WINDOW_MS) {
            delete manualOrders[identity];
            if (pendingManual && pendingManual.at <= pendingReshopAt) pendingManual = null;
            pendingReshopAt = 0;
        }
        if (pendingManual && now - pendingManual.at <= MANUAL_BIND_WINDOW_MS &&
            parseInt(order[pendingManual.field], 10) === parseInt(pendingManual.value, 10)) {
            manualOrders[identity] = true;
            pendingManual = null;
        }
        return !!manualOrders[identity];
    }

    function clickGetQuote() {
        var $c = ui.getContainer();
        var dims = ui.getDimensions($c);

        if (settings.skipAlreadySelected && engine.skipAlreadySelectedDirectSelection(settings.enabledServices)) {
            return;
        }

        if (dims.length && dims.width && dims.height &&
            !engine.hasMappingForSize(dims.length, dims.width, dims.height, settings.enabledServices)) {
            engine.logger('No enabled services for size — skipping Get Quote.');
            ui.clearCheapest(false);
            ui.removeWip();
            return;
        }

        var $getQuote = $c.find('.get-quote');
        if (!$getQuote.length) {
            engine.logger('Get Quote button not found — skipping.');
            ui.clearCheapest(false);
            return;
        }
        engine.logger('Clicking Get Quote...');
        $getQuote.click();
        ui.clearCheapest(true);
    }

    $(document).on('click', '#orderlist-body tr', function () {
        if ($('#orderlist-body tr[data-ss-selected="1"]').length <= 1) {
            var autoQuote = settings.autorun && isActive();
            if (autoQuote) setTimeout(clickGetQuote, 1000);
            ui.clearCheapest(autoQuote);
        }
    });

    $(document).ajaxSend(function (event, xhr, options) {
        if (!isActive()) return;

        if ($('.input-group.spinner').length && $('.input-group.spinner').find('[type="number"]').length) {
            $('.input-group.spinner').find('[type="number"]').unbind('change').change(function () {
                if ($('.form-group.shipping-rate').length && !$('.form-group.shipping-rate .processing-icon').length) {
                    //clickGetQuote()
                    ui.showProcessing();
                }
            });
        }

        $(window).unbind('keydown').keydown(function (e) {
            if (e.ctrlKey && e.which >= 48 && e.which <= 57) {
                if ($('.form-group.shipping-rate').length && !$('.form-group.shipping-rate .processing-icon').length) {
                   // clickGetQuote()
                    ui.showProcessing();
                }
            }
        });

        if (options.url.endsWith('/api/orders/updaterates')) {
            var data = JSON.parse(options.data);
            var manual = trackManualChoice(data);
            // No "working" lock for refreshes the tool will not act on: a packer's
            // own choice, or ShipStation echoing the tool's own service change.
            if (!manual && !engine.isSelectionSyncInProgress(data)) ui.showProcessing();
            if (data.lowPriority) { data.lowPriority = false; options.data = JSON.stringify(data); }
        }
    });

    // A failed ShipStation rate request must not leave Create Label locked.
    $(document).ajaxError(function (event, xhr, options, thrownError) {
        if (!options || !options.url || !options.url.endsWith('/api/orders/updaterates')) return;
        if (thrownError === 'abort' || (xhr && xhr.statusText === 'abort')) return;
        engine.logger('ShipStation rate request failed — unlocking.');
        ui.clearCheapest(false);
        ui.hideProcessing();
    });

    $(document).ajaxSuccess(function (event, xhr, options, data) {
        if (!isActive()) {
            ui.clearCheapest(false);
            return;
        }

        var $c = ui.getContainer();
        var dims = ui.getDimensions($c);

        if (options.url.endsWith('/api/shipments/costsummary')) {
            if ($('.quick-ship form input[name="HeightIn"]').val() === '') {
                $('.quick-ship form input[name="HeightIn"]').val('0').change();
            }
            return;
        }

        if (options.url.endsWith('/api/orders/updaterates')) {
            var requestData = JSON.parse(options.data);
            if (data.final) {
                engine.logger('HP response', requestData, data);
            } else {
                engine.logger('LP response', requestData, data);
            }
            if (!isActive()) { if (!settings.autorun) ui.clearCheapest(false); return; }
            if (manualOrders[orderIdentity(requestData)]) {
                engine.logger('Service chosen by hand — leaving this order alone. Click Get Quote to rate-shop it again.');
                ui.clearCheapest(false);
                ui.hideProcessing();
                return;
            }
            if (engine.isSelectionSyncInProgress(requestData)) {
                engine.logger('Ignoring updaterates response triggered by winner synchronization.');
                return;
            }
            ui.clearCheapest(true);
            engine.rateShop(requestData, data, settings.enabledServices, {
                skipAlreadySelected: settings.skipAlreadySelected,
            });
            return;
        }

        if (options.url.endsWith('/api/orders/BulkUpdate')) {
            if (!isActive()) { if (!settings.autorun) ui.clearCheapest(false); return; }
            ui.clearCheapest(true);
            if (!dims.length || !dims.width || !dims.height ||
                !engine.hasMappingForSize(dims.length, dims.width, dims.height, settings.enabledServices)) {
                engine.logger('No mapping — skipping.');
                ui.removeWip(true);
                return;
            }
            clickGetQuote();
            return;
        }

        if (options.url.includes('/api/shipments/List?orderID=')) {
            if (!isActive()) { if (!settings.autorun) ui.clearCheapest(false); return; }
            if (!dims.length || !dims.width || !dims.height ||
                !engine.hasMappingForSize(dims.length, dims.width, dims.height, settings.enabledServices)) {
                engine.logger('No mapping — skipping.');
                ui.removeWip(true);
                ui.clearCheapest(false);
                return;
            }
            ui.clearCheapest(true);
            clickGetQuote();
            return;
        }

        if ($c.find('[data-role="service-name"]').html() !== undefined ||
            $('.order-drawer').find('[data-role="service-name"]').html() !== undefined) {
            ui.hideProcessing();
        }
    });

})(Backbone.$, window.FWD.config, FWD.ui, FWD.engine, FWD.serviceCatalog);
