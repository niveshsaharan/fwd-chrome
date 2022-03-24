(function () {
    if (typeof Backbone === "undefined") {
        console.error("Backbone not found.");
        return;
    }

    const $ = Backbone.$;

    const conditions = {
        residential: function (data) {
            return data.ResidentialIndicator === "R";
        },
        commercial: function (data) {
            return data.ResidentialIndicator === "C";
        },
        not_residential: function (data) {
            return data.ResidentialIndicator !== "R";
        },
        not_commercial: function (data) {
            return data.ResidentialIndicator !== "C";
        },
    };

    const serviceMappings = {
        "2x2x2": [
            {
                service: "FedEx 2Day®",
                serviceId: 52,
                package: "FedEx One Rate® Pak",
                packageId: 505,
                length: 2,
                width: 2,
                height: 2,
                providerId: 4,
                carrierId: 4,
            },
            {
                service: "FedEx Ground®",
                serviceId: 50,
                package: "Package",
                packageId: 3,
                length: 2,
                width: 2,
                height: 2,
                providerId: 4,
                carrierId: 4,
                conditions: ["not_residential"],
            },
            {
                service: "FedEx Standard Overnight®",
                serviceId: 55,
                package: "Package",
                packageId: 3,
                length: 2,
                width: 2,
                height: 2,
                providerId: 4,
                carrierId: 4,
            },
            {
                service: "FedEx Home Delivery®",
                serviceId: 51,
                package: "Package",
                packageId: 3,
                length: 2,
                width: 2,
                height: 2,
                providerId: 4,
                carrierId: 4,
                conditions: ["residential"],
            },
        ],
        "9x12x1": [
            {
                service: "USPS Priority Mail",
                serviceId: 13,
                package: "Package",
                packageId: 3,
                length: 9,
                width: 12,
                height: 1,
                providerId: 2,
                carrierId: 1,
                when_cheapest: {
                    packageId: 1, // Large Envelope or Flat
                    package: 'Large Envelope or Flat',
                    length: 12,
                    width: 9,
                    height: 0,
                }
            },
            {
                service: "FedEx Home Delivery®",
                serviceId: 51,
                package: "Package",
                packageId: 3,
                length: 9,
                width: 12,
                height: 1,
                providerId: 4,
                carrierId: 4,
                conditions: ["residential"],
            },
            {
                service: "FedEx 2Day®",
                serviceId: 52,
                package: "FedEx One Rate® Pak",
                packageId: 505,
                length: 9,
                width: 12,
                height: 1,
                providerId: 4,
                carrierId: 4,
            },
            {
                service: "FedEx Ground®",
                serviceId: 50,
                package: "Package",
                packageId: 3,
                length: 9,
                width: 12,
                height: 1,
                providerId: 4,
                carrierId: 4,
                conditions: ["not_residential"],
            },
            {
                service: "FedEx Standard Overnight®",
                serviceId: 55,
                package: "Package",
                packageId: 3,
                length: 9,
                width: 12,
                height: 1,
                providerId: 4,
                carrierId: 4,
            },
        ],
        "12x15x1": [
            {
                service: "USPS Priority Mail",
                serviceId: 13,
                package: "Package",
                packageId: 3,
                length: 12,
                width: 15,
                height: 1,
                providerId: 2,
                carrierId: 1,
                when_cheapest: {
                    packageId: 1, // Large Envelope or Flat
                    package: 'Large Envelope or Flat',
                    length: 15,
                    width: 12,
                    height: 0,
                }
            },
            {
                service: "FedEx Home Delivery®",
                serviceId: 51,
                package: "Package",
                packageId: 3,
                length: 12,
                width: 15,
                height: 1,
                providerId: 4,
                carrierId: 4,
                conditions: ["residential"],
            },
            {
                service: "FedEx 2Day®",
                serviceId: 52,
                package: "FedEx One Rate® Pak",
                packageId: 505,
                length: 12,
                width: 15,
                height: 1,
                providerId: 4,
                carrierId: 4,
            },
            {
                service: "FedEx Ground®",
                serviceId: 50,
                package: "Package",
                packageId: 3,
                length: 12,
                width: 15,
                height: 1,
                providerId: 4,
                carrierId: 4,
                conditions: ["not_residential"],
            },
            {
                service: "FedEx Standard Overnight®",
                serviceId: 55,
                package: "Package",
                packageId: 3,
                length: 12,
                width: 15,
                height: 1,
                providerId: 4,
                carrierId: 4,
            },
        ],
        "14x12x3": [
            {
                service: "USPS Priority Mail",
                serviceId: 13,
                package: "Package",
                packageId: 3,
                length: 14,
                width: 12,
                height: 3,
                providerId: 2,
                carrierId: 1,
                when_cheapest: {
                    packageId: 1, // Large Envelope or Flat
                    package: 'Large Envelope or Flat',
                    length: 17,
                    width: 14,
                    height: 0,
                }
            },
            {
                service: "FedEx Home Delivery®",
                serviceId: 51,
                package: "Package",
                packageId: 3,
                length: 14,
                width: 12,
                height: 3,
                providerId: 4,
                carrierId: 4,
                conditions: ["residential"],
            },
            {
                service: "FedEx Ground®",
                serviceId: 50,
                package: "Package",
                packageId: 3,
                length: 14,
                width: 12,
                height: 3,
                providerId: 4,
                carrierId: 4,
                conditions: ["not_residential"],
            },
            {
                service: "FedEx Standard Overnight®",
                serviceId: 55,
                package: "Package",
                packageId: 3,
                length: 14,
                width: 12,
                height: 3,
                providerId: 4,
                carrierId: 4,
            },
            {
                service: "FedEx 2Day®",
                serviceId: 52,
                package: "Package",
                packageId: 3,
                length: 14,
                width: 12,
                height: 3,
                providerId: 4,
                carrierId: 4,
            },
        ],
        "15x12x3": [
            {
                service: "USPS Priority Mail",
                serviceId: 13,
                package: "Package",
                packageId: 3,
                length: 15,
                width: 12,
                height: 3,
                providerId: 2,
                carrierId: 1,
                when_cheapest: {
                    packageId: 1, // Large Envelope or Flat
                    package: 'Large Envelope or Flat',
                    length: 19,
                    width: 15,
                    height: 0,
                }
            },
            {
                service: "FedEx Home Delivery®",
                serviceId: 51,
                package: "Package",
                packageId: 3,
                length: 15,
                width: 12,
                height: 3,
                providerId: 4,
                carrierId: 4,
                conditions: ["residential"],
            },
            {
                service: "FedEx Ground®",
                serviceId: 50,
                package: "Package",
                packageId: 3,
                length: 15,
                width: 12,
                height: 3,
                providerId: 4,
                carrierId: 4,
                conditions: ["not_residential"],
            },
            {
                service: "FedEx Standard Overnight®",
                serviceId: 55,
                package: "Package",
                packageId: 3,
                length: 15,
                width: 12,
                height: 3,
                providerId: 4,
                carrierId: 4,
            },
            {
                service: "FedEx 2Day®",
                serviceId: 52,
                package: "Package",
                packageId: 3,
                length: 15,
                width: 12,
                height: 3,
                providerId: 4,
                carrierId: 4,
            },
        ],
    };

    // Basically when dimensions are 20x12x[random variable]
    // I want to rate check between USPS priority mail package and FedEx (ground if commercial, home delivery if residential)
    // And then assign lowest rate
    // Basically same like when dimensions are 14x12x3
    [3, 4, 6, 8, 10, 12, 16, 20].forEach((height) => {
        serviceMappings["20x12x" + height] = [
            {
                service: "USPS Priority Mail",
                serviceId: 13,
                package: "Package",
                packageId: 3,
                length: 20,
                width: 12,
                height: height,
                providerId: 2,
                carrierId: 1,
            },
            {
                service: "FedEx Home Delivery®",
                serviceId: 51,
                package: "Package",
                packageId: 3,
                length: 20,
                width: 12,
                height: height,
                providerId: 4,
                carrierId: 4,
                conditions: ["residential"],
            },
            {
                service: "FedEx Ground®",
                serviceId: 50,
                package: "Package",
                packageId: 3,
                length: 20,
                width: 12,
                height: height,
                providerId: 4,
                carrierId: 4,
                conditions: ["not_residential"],
            },
            {
                service: "FedEx Standard Overnight®",
                serviceId: 55,
                package: "Package",
                packageId: 3,
                length: 20,
                width: 12,
                height: height,
                providerId: 4,
                carrierId: 4,
            },
            {
                service: "FedEx 2Day®",
                serviceId: 52,
                package: "Package",
                packageId: 3,
                length: 20,
                width: 12,
                height: height,
                providerId: 4,
                carrierId: 4,
            },
        ];
    });

    Object.keys(serviceMappings).forEach(size => {
        if (serviceMappings[size]) {
            serviceMappings[size].forEach(service => {
                if (service.when_cheapest) {
                    const newSize = service.when_cheapest.length + 'x' + service.when_cheapest.width + 'x' + service.when_cheapest.height;
                    serviceMappings[newSize] = serviceMappings[newSize] || []

                    serviceMappings[newSize].push({
                        ...service,
                        ...service.when_cheapest,
                        custom: true,
                    })
                }
            })
        }
    })

    const caches = {};

    /**
     * Capture ajaxSent request to modify lowPriority to highPriority Request
     */
    $(document).ajaxSend(function (event, xhr, options) {

        if (
            $(".input-group.spinner") != "undefined" &&
            $(".input-group.spinner").find('[type="number"]').length != 0
        ) {
            logger("Adding input handler");
            $(".input-group.spinner").find('[type="number"]').unbind("change");
            $(".input-group.spinner")
                .find('[type="number"]')
                .change(function () {
                    // alert("test");
                    if (
                        $(".form-group.shipping-rate") != "undefined" &&
                        $(".form-group.shipping-rate").find(".processing-icon").length == 0
                    ) {

                        $(".col-sm-9.form-control-static").hide();
                        $(".rating").find(".processing-icon").remove();
                        $(".form-group.shipping-rate").append(
                            "<div class='processing-icon' style='height: 30px; width: 30px; margin-left: 100px; margin-bottom: 10px;'><img  style= 'max-width: 100%; max-height: 100%; margin: auto; display: block;' src='https://media.giphy.com/media/sSgvbe1m3n93G/giphy.gif'></div>"
                        );
                    }
                    $(".form-group.shipping-rate").find(".processing-icon");
                });
        }

        $(window).unbind("keydown");
        $(window).keydown(function (e) {
            // if CTRL + + was pressed
            if (e.ctrlKey && e.which >= 48 && e.which <= 57) {
                // trigger the event
                if (
                    $(".form-group.shipping-rate") != "undefined" &&
                    $(".form-group.shipping-rate").find(".processing-icon").length == 0
                ) {
                    $(".col-sm-9.form-control-static").hide();
                    $(".rating").find(".processing-icon").remove();
                    $(".form-group.shipping-rate").append(
                        "<div class='processing-icon' style='height: 30px; width: 30px; margin-left: 100px; margin-bottom: 10px;'><img  style= 'max-width: 100%; max-height: 100%; margin: auto; display: block;' src='https://media.giphy.com/media/sSgvbe1m3n93G/giphy.gif'></div>"
                    );
                }
                //alert("trigger");
            }
        });

        if (options.url.endsWith("/api/orders/updaterates")) {

            // adding processing feature to UI
            $(".col-sm-9.form-control-static").hide();
            $(".rating").find(".processing-icon").remove();
            $(".form-group.shipping-rate").append(
                "<div class='processing-icon' style='height: 30px; width: 30px; margin-left: 100px; margin-bottom: 10px;'><img  style= 'max-width: 100%; max-height: 100%; margin: auto; display: block;' src='https://media.giphy.com/media/sSgvbe1m3n93G/giphy.gif'></div>"
            );
            const data = JSON.parse(options.data);

            if (data.lowPriority) {
                data.lowPriority = false;

                options.data = JSON.stringify(data);
            }
        }
    });

    function logger() {
        if (arguments.length > 1) {
            console.groupCollapsed("%c" + arguments[0], "color: #ff8000;");
        }

        for (let i = 0; i < arguments.length; i++) {
            if (arguments.length === 1) {
                console.log("%c" + arguments[i], "color: #ff8000;");
            } else if (i > 0) {
                console.log(arguments[i]);
            }
        }

        if (arguments.length > 1) {
            console.groupEnd();
        }
    }

    function clearCheapestServiceMessaging() {
        $("#cheapest-service").remove();
        $("#cheapest-service-icon").remove();
    }

    /**
     * Capture AajxSuccess
     */
    $(document).ajaxSuccess(function (event, xhr, options, data) {
        // For update rates request
        const $container = $(".modal.order-detail");

        const length = $container.find('[name="LengthIn"]').val();
        const width = $container.find('[name="WidthIn"]').val();
        const height = $container.find('[name="HeightIn"]').val();
        if (options.url.endsWith("/api/shipments/costsummary")) {
            if ($('.quick-ship form input[name="HeightIn"]').val() === '') {
                $('.quick-ship form input[name="HeightIn"]').val('0').change();
                return;
            }
        } else if (options.url.endsWith("/api/orders/updaterates")) {
            if (
                typeof $container.find('[data-role="service-name"]').html() !=
                "undefined"
            ) {
                var requestedFor = $container
                    .find('[data-role="service-name"]')
                    .html()
                    .replace(/\"/g, "");
                logger(requestedFor);
                if (
                    length == 9 &&
                    width == 12 &&
                    height == 1 &&
                    requestedFor != "2-Day Delivery" &&
                    requestedFor != "Next Day Delivery" &&
                    (($container.find('[name="WeightPound"]').val() == 0 &&
                        $container.find('[name="WeightOunce"]').val() >= 15) ||
                        ($container.find('[name="WeightPound"]').val() == 1 &&
                            $container.find('[name="WeightOunce"]').val() <= 5))
                ) {
                    if ($container.find('[name="WeightPound"]').val() != 0) {
                        $container.find('[name="WeightPound"]').val(0).trigger("change");
                    }
                    if ($container.find('[name="WeightOunce"]').val() != 15) {
                        $container.find('[name="WeightOunce"]').val(15).trigger("change");
                    }
                    if ($container.find('[name="ServiceID"]').val() != 10) {
                        $container.find('[name="ServiceID"]').val(10).trigger("change");
                    }
                    if ($container.find('[name="RequestedPackageTypeID"]').val() != 3) {
                        $container
                            .find('[name="RequestedPackageTypeID"]')
                            .val(3)
                            .trigger("change");
                    }
                    //this code will remove processing icon
                    $(".rating").find(".processing-icon").remove();
                    //this will show rate
                    $(".col-sm-9.form-control-static").show();
                    //code to show checkbox only if existing checkbox is not visible
                    if ($(".modal-body") != "undefined" && $(".modal-body").find(".col-sm-9.form-control-static").find("#cheapest-service-icon").length == 0) {
                        $(".modal-body")
                            .find(".col-sm-9.form-control-static")
                            .append(
                                "<a id='cheapest-service-icon' style='vertical-align: bottom;margin-left: 5px;'> <i class='icon-check text-success' style='font-size: 20px;'></i></a>"
                            );
                    }
                    return;
                }
                if (
                    length == 9 &&
                    width == 12 &&
                    height == 1 &&
                    requestedFor != "2-Day Delivery" &&
                    requestedFor != "Next Day Delivery" &&
                    $container.find('[name="WeightPound"]').val() == 0 &&
                    $container.find('[name="WeightOunce"]').val() < 15
                ) {
                    $(".rating").find(".processing-icon").remove();
                    $(".col-sm-9.form-control-static").show();
                    //code to show checkbox
                    if ($(".modal-body") != "undefined" && $(".modal-body").find(".col-sm-9.form-control-static").find("#cheapest-service-icon").length == 0) {
                        $(".modal-body")
                            .find(".col-sm-9.form-control-static")
                            .append(
                                "<a id='cheapest-service-icon' style='vertical-align: bottom;margin-left: 5px;'> <i class='icon-check text-success' style='font-size: 20px;'></i></a>"
                            );
                    }
                    return;
                }
            }
            const requestData = JSON.parse(options.data);

            if (data.final) {
                logger(
                    "High Priority request Sent by ShipStation",
                    "Service ID: " + data.orders[0].ServiceID,
                    "Package ID: " + data.orders[0].RequestedPackageTypeID,
                    "Request: ",
                    requestData,
                    "Response: ",
                    data
                );
            } else {
                logger(
                    "Low Priority request Sent by ShipStation",
                    "Service ID: " + requestData.orderViewIs[0].ServiceID,
                    "Package ID: " + requestData.orderViewIs[0].RequestedPackageTypeID,
                    "Request: ",
                    requestData,
                    "Response: ",
                    data
                );
            }

            if (window.fwdPaused) {
                return;
            }

            clearCheapestServiceMessaging();

            getShippingRatesForServices(requestData, data);
        }


        // When hotkeys are pressed
        if (options.url.endsWith("/api/orders/BulkUpdate")) {
            if (window.fwdPaused) {
                return;
            }

            clearCheapestServiceMessaging();

            if (
                !length ||
                !width ||
                !height ||
                !serviceMappings[length + "x" + width + "x" + height]
            ) {
                logger("No need to check the rates.");
                if ($(".modal-body") != "undefined") {
                    $(".modal-body")
                        .find(".col-sm-9.form-control-static")
                        .append(
                            "<a id='cheapest-service-icon' style='vertical-align: bottom;margin-left: 5px;'> <i class='icon-check text-success' style='font-size: 20px;'></i></a>"
                        );
                }
                return;
            }

            $(".modal.order-detail .get-quote").click();
        }

        // When the order modal is opened
        if (options.url.includes("/api/shipments/List?orderID=")) {
            if (window.fwdPaused) {
                return;
            }

            if (
                !length ||
                !width ||
                !height ||
                !serviceMappings[length + "x" + width + "x" + height]
            ) {
                logger("No need to check the rates.");
                clearCheapestServiceMessaging();
                if ($(".modal-body") != "undefined") {
                    $(".modal-body")
                        .find(".col-sm-9.form-control-static")
                        .append(
                            "<a id='cheapest-service-icon' style='vertical-align: bottom;margin-left: 5px;'> <i class='icon-check text-success' style='font-size: 20px;'></i></a>"
                        );
                }
                return;
            }

            clearCheapestServiceMessaging();

            $(".modal.order-detail .get-quote").click();
        } else {
            if (
                typeof $container.find('[data-role="service-name"]').html() !=
                "undefined"
            ) {
                $(".rating").find(".processing-icon").remove();
                $(".col-sm-9.form-control-static").show();
            } else if (
                $(".order-drawer").find('[data-role="service-name"]').html() !=
                "undefined"
            ) {
                $(".rating").find(".processing-icon").remove();
                $(".col-sm-9.form-control-static").show();
            }
        }
    });

    /**
     * Set cheapest options
     * @param data
     * @param service
     */
    function setCheapestServiceAsSelected(data, service) {
        service = JSON.parse(JSON.stringify(service));
        logger("within setCheapestServiceAsSelected");
        if (
            !(
                service &&
                service.order &&
                currentlyViewingSameOrder(service.order.OrderNumber)
            )
        ) {
            return false;
        }

        const $container = $(".modal.order-detail");

        if (
            parseInt($container.find('[name="ServiceID"]').val(), 10) !==
            parseInt(service.serviceId, 10)
        ) {
            logger(
                "Setting cheapest service as selected. It will fire another AJAX Request."
            );

            $container
                .find('[name="ServiceID"]')
                .val(service.serviceId)
                .trigger("change");
        }

        setTimeout(function () {

            if (service.when_cheapest && service.custom !== true) {
                Object.keys(service.when_cheapest).forEach(key => {
                    service[key] = service.when_cheapest[key];
                })
            }

            if (
                parseInt(
                    $container.find('[name="RequestedPackageTypeID"]').val(),
                    10
                ) !== parseInt(service.packageId, 10)
            ) {
                logger(
                    "Setting cheapest package as selected. It will fire another AJAX Request."
                );

                $container
                    .find('[name="RequestedPackageTypeID"]')
                    .val(service.packageId)
                    .trigger("change");
            } else {
                setTimeout(function () {

                    if (service.when_cheapest && service.custom !== true) {
                        Object.keys(service.when_cheapest).forEach(key => {
                            if (key === 'length') {
                                $container.find('[name="LengthIn"]').val(service[key]).change();
                            }
                            if (key === 'height') {
                                $container.find('[name="HeightIn"]').val(service[key]).change();
                            }
                            if (key === 'width') {
                                $container.find('[name="WidthIn"]').val(service[key]).change();
                            }
                        });

                        return;
                    }
                    logger(
                        "Cheapest service (" +
                        service.service +
                        " - " +
                        service.package +
                        "@" +
                        service.price +
                        ") is set as selected. You can create label now",
                        service
                    );

                    $("#cheapest-service-icon").remove();
                    const checkmarkIcon = `<a id="cheapest-service-icon" style="
    vertical-align: bottom;
    margin-left: 5px;
"> <i class="icon-check text-success" style="font-size: 20px;"></i></a>`;

                    $container.find(".get-quote").after(checkmarkIcon);
                    $(".rating").find(".processing-icon").remove();
                    $(".col-sm-9.form-control-static").show();
                }, 1000);
            }
        }, 2000);
    }

    /**
     * Cache response for a request
     * @param request
     * @param response
     * @returns {*}
     */
    function cache(request, response) {
        const key =
            request.orderViews[0].OrderID +
            "_" +
            request.orderViews[0].ServiceID +
            "_" +
            request.orderViews[0].RequestedPackageTypeID +
            "_" +
            request.orderViews[0].ProviderID +
            "_" +
            request.orderViews[0].CarrierID +
            "_" +
            request.orderViews[0].Length +
            "_" +
            request.orderViews[0].Width +
            "_" +
            request.orderViews[0].Height;

        if (response) {
            let keyFromResponse =
                response.orders[0].OrderID +
                "_" +
                response.orders[0].ServiceID +
                "_" +
                response.orders[0].RequestedPackageTypeID +
                "_" +
                response.orders[0].ProviderID +
                "_" +
                response.orders[0].CarrierID +
                "_" +
                response.orders[0].Length +
                "_" +
                response.orders[0].Width +
                "_" +
                response.orders[0].Height;
            caches[keyFromResponse] = response;
        }

        return caches[key];
    }

    /**
     *
     * @param data
     * @param responseData
     * @returns {Promise<void>}
     */
    async function getShippingRatesForServices(data, responseData) {
        const serviceMappingWithPrices = JSON.parse(
            JSON.stringify(serviceMappings)
        );

        const length = data.orderViews[0].Length;
        const width = data.orderViews[0].Width;
        const height = data.orderViews[0].Height;

        const size = length + "x" + width + "x" + height;
        logger(data.orderViews[0], data);
        logger("size" + size);
        var exceptionDimentions = ["2x2x2"];
        var exceptionServiceReq = ["2-Day Delivery", "Next Day Delivery"];

        if (typeof serviceMappingWithPrices[size] === "object") {
            logger("service map object");
            if (
                exceptionDimentions.includes(size) &&
                !exceptionServiceReq.includes(
                    data.orderViews[0].RequestedShippingService.replace(/\"/g, "")
                )
            ) {
                logger("Exceptional size. Tool will not trigger.");
                if ($(".modal-body") != "undefined") {
                    $(".modal-body")
                        .find(".col-sm-9.form-control-static")
                        .append(
                            "<a id='cheapest-service-icon' style='vertical-align: bottom;margin-left: 5px;'> <i class='icon-check text-success' style='font-size: 20px;'></i></a>"
                        );
                }
                return;
            }
            logger("Tool is getting triggered");
            const services = serviceMappingWithPrices[size].filter((service) => {
                if (service.conditions && service.conditions.length) {
                    return service.conditions.every((condition) =>
                        conditions[condition](data.orderViews[0])
                    );
                }

                return true;
            });

            for (const service of services) {
                logger("within for");
                logger(
                    "test log " +
                    service.service +
                    " - " +
                    service.package +
                    " @ " +
                    service.shippingService,
                    service
                );

                if (
                    responseData &&
                    responseData.final &&
                    responseData.success &&
                    responseData.orders &&
                    responseData.orders.length
                ) {
                    cache(data, responseData);

                    setServiceRateFromResponse(responseData, services);
                }

                if (typeof service.order === "undefined") {
                    data.lowPriority = false;
                    data.orderViews[0].ServiceID = service.serviceId;
                    data.orderViews[0].RequestedPackageTypeID = service.packageId;
                    data.orderViews[0].ProviderID = service.providerId;
                    data.orderViews[0].CarrierID = service.carrierId;
                    data.orderViews[0].Rate = 0;
                    data.orderViews[0].RateError = null;
                    data.orderViews[0].RatingRequestPending = false;
                    data.orderViews[0].UpdatedRate = true;

                    let res = cache(data);

                    if (!res) {
                        res = await fetch(
                            "https://ss4.shipstation.com/api/orders/updaterates?nivesh",
                            {
                                headers: {
                                    accept: "application/json",
                                    "content-type": "application/json; charset=UTF-8",
                                },
                                body: JSON.stringify(data),
                                method: "POST",
                                credentials: "include",
                            }
                        );

                        res = await res.json();

                        logger(
                            "Ajax request sent by the extension to find cheapest rate for " +
                            service.service +
                            "(" +
                            res.orders[0].ServiceID +
                            ") / " +
                            service.package +
                            "(" +
                            res.orders[0].RequestedPackageTypeID +
                            ")",
                            "Request: ",
                            data,
                            "Response: ",
                            res
                        );

                        cache(data, res);
                    }

                    setServiceRateFromResponse(res, services);
                }
            }
            logger("after for");
            handleServiceRates(services, (service) =>
                setCheapestServiceAsSelected(data, service)
            );
        } else {
            //code to show checkbox when size is not in our mapping and tool is not triggered.
            if (
                $(".modal-body") != "undefined" &&
                $(".modal-body")
                    .find(".col-sm-9.form-control-static")
                    .find("#cheapest-service-icon").length == 0
            ) {
                $(".modal-body")
                    .find(".col-sm-9.form-control-static")
                    .append(
                        "<a id='cheapest-service-icon' style='vertical-align: bottom;margin-left: 5px;'> <i class='icon-check text-success' style='font-size: 20px;'></i></a>"
                    );
            }
        }
    }

    function currentlyViewingSameOrder(orderNumber) {
        const text = $(".modal.order-detail .order-num").text();
        const same = text && orderNumber && text.includes(orderNumber);

        if (!same) {
            console.error(
                "You are currently viewing " +
                text +
                " but the response was for Order: " +
                orderNumber
            );
        }

        return same;
    }

    function setServiceRateFromResponse(response, services) {
        if (
            response &&
            response.final &&
            response.success &&
            response.orders &&
            response.orders.length
        ) {
            services.forEach((service) => {
                var deliveryDays = null;
                if (
                    currentlyViewingSameOrder(response.orders[0].OrderNumber) &&
                    parseInt(service.length, 10) ===
                    parseInt(response.orders[0].Length, 10) &&
                    parseInt(service.width, 10) ===
                    parseInt(response.orders[0].Width, 10) &&
                    parseInt(service.height, 10) ===
                    parseInt(response.orders[0].Height, 10) &&
                    parseInt(response.orders[0].ServiceID, 10) ===
                    parseInt(service.serviceId, 10) &&
                    parseInt(response.orders[0].RequestedPackageTypeID, 10) ===
                    parseInt(service.packageId, 10)
                ) {
                    service.order = response.orders[0];

                    if (!response.orders[0].RateError) {
                        service.shippingService =
                            response.orders[0].RequestedShippingService;
                        service.testResidentialIndicator =
                            response.orders[0].ResidentialIndicator;

                        if (
                            service.shippingService == "2-Day Delivery" ||
                            service.shippingService == "Next Day Delivery"
                        ) {
                            logger("Its 2 day deliver");
                        } else {
                            logger("Its NOT 2 day deliver" + String(service.shippingService));
                            logger(typeof service.shippingService);
                            logger(service.testResidentialIndicator);
                        }

                        if (
                            service.serviceId != 50 &&
                            service.serviceId != 51 &&
                            service.serviceId != 52 &&
                            service.serviceId != 55
                        ) {
                            logger("service id is NOT 50 51 52");
                        } else {
                            logger("service id is 50 51 52");
                        }
                        if (
                            service.shippingService == "2-Day Delivery" ||
                            service.shippingService == "Next Day Delivery"
                        ) {
                            if (
                                service.serviceId == 50 ||
                                service.serviceId == 51 ||
                                service.serviceId == 52 ||
                                service.serviceId == 55
                            ) {
                                logger("applyed delivery time logic");
                                service.price =
                                    response.orders[0].ShippingCost +
                                    response.orders[0].ConfirmationCost +
                                    response.orders[0].InsuranceCost +
                                    response.orders[0].OtherCost;
                                //setting delivery time
                                service.deliveryTime = response.orders[0].DeliveryTime;
                                logger("deliveryTime : " + service.deliveryTime);
                                var weekendCounter = 0;
                                var deliveryDate;

                                if (service.deliveryTime.split(" ").length > 1) {
                                    if (
                                        String(service.deliveryTime).split(" ")[0] == "Tomorrow"
                                    ) {
                                        logger("Tommorrow condition satisfied");
                                        var currentTime = new Date();
                                        var currMonth = currentTime.getMonth() + 1;
                                        var currDay = currentTime.getDate() + 1;
                                        var currYear = currentTime.getFullYear();
                                        deliveryDate = new Date(
                                            currMonth + "/" + currDay + "/" + currYear
                                        );
                                    } else {
                                        logger("Tommorrow condition NOT satisfied");
                                        const month = String(service.deliveryTime)
                                            .split(" ")[1]
                                            .split("/")[0];
                                        const day = service.deliveryTime
                                            .split(" ")[1]
                                            .split("/")[1];
                                        const year = new Date().getFullYear();
                                        deliveryDate = new Date(month + "/" + day + "/" + year);
                                        logger(deliveryDate);
                                    }

                                    var currentTime = new Date();
                                    // returns the month (from 0 to 11)
                                    var currMonth = currentTime.getMonth() + 1;
                                    // returns the day of the month (from 1 to 31)
                                    var currDay = currentTime.getDate();
                                    // returns the year (four digits)
                                    var currYear = currentTime.getFullYear();
                                    const currDate = new Date(
                                        currMonth + "/" + currDay + "/" + currYear
                                    );
                                    deliveryDays = Math.ceil(
                                        (deliveryDate - currDate) / (1000 * 60 * 60 * 24)
                                    );
                                    weekendCounter = weekendCount(currDate, deliveryDate);
                                } else {
                                    deliveryDays = service.deliveryTime;
                                }

                                service.deliveryTime = deliveryDays - weekendCounter;
                                logger("Delivery time : " + service.deliveryTime);
                            } else {
                                logger("Ignoring other services");
                            }
                        } else {
                            logger("NOT applyed delivery time logic");
                            service.price =
                                response.orders[0].ShippingCost +
                                response.orders[0].ConfirmationCost +
                                response.orders[0].InsuranceCost +
                                response.orders[0].OtherCost;
                        }
                    } else {
                        logger(
                            "Rate Error for " + service.service,
                            response.orders[0].RateError
                        );
                    }

                    logger(
                        "Response was for " +
                        service.service +
                        " - " +
                        service.package +
                        " @ " +
                        service.price,
                        service
                    );
                }
            });
        }

        return services;
    }

    function weekendCount(currDate, deliveryDate) {
        var d1 = new Date(currDate),
            d2 = new Date(deliveryDate),
            counter = 0;

        while (d1 <= d2) {
            var day = d1.getDay();
            if (day === 6 || day === 0) {
                counter = counter + 1;
            }
            d1.setDate(d1.getDate() + 1);
        }
        return counter;
    }

    function handleServiceRates(services, callback) {
        const logs = ["Find cheapest rate in services"];

        services.forEach((service) => {
            logs.push(
                service.service +
                " - " +
                service.package +
                " - " +
                service.price +
                " - " +
                service.deliveryTime,
                service
            );
        });

        logger(...logs);
        var service = null;
        //check if its "2-Day Delivery" or "Next Day Delivery"
        const counter = services.filter(
            (service) =>
                service.shippingService == "2-Day Delivery" ||
                service.shippingService == "Next Day Delivery"
        ).length;

        if (counter >= 1) {
            const lowestPriceService = services
                .filter(
                    (service) =>
                        service.price > 0 &&
                        service.deliveryTime <= 2 &&
                        (service.shippingService == "2-Day Delivery" ||
                            service.shippingService == "Next Day Delivery") &&
                        (service.serviceId == 50 ||
                            service.serviceId == 51 ||
                            service.serviceId == 52 ||
                            service.serviceId == 55)
                )
                .reduce((prev, curr) => (prev.price < curr.price ? prev : curr), 0);

            const lowestDeliveryTimeService = services
                .filter(
                    (service) =>
                        service.deliveryTime <= 2 &&
                        (service.shippingService == "2-Day Delivery" ||
                            service.shippingService == "Next Day Delivery") &&
                        (service.serviceId == 50 ||
                            service.serviceId == 51 ||
                            service.serviceId == 52 ||
                            service.serviceId == 55)
                )
                .reduce(
                    (prev, curr) => (prev.deliveryTime < curr.deliveryTime ? prev : curr),
                    0
                );

            logger("lowestDeliveryTimeService price : " + lowestDeliveryTimeService);
            logger("lowestPriceService price : " + lowestPriceService);
            if (lowestPriceService.deliveryTime <= 2) {
                logger("delivery time is 2 or below");
            } else {
                logger("delivery time is NOT 2 or below");
                logger(lowestPriceService.deliveryTime);
                logger(lowestPriceService.service);
                logger(typeof lowestPriceService.deliveryTime);
            }
            if (
                lowestPriceService.shippingService == "2-Day Delivery" &&
                lowestPriceService.deliveryTime <= 2
            ) {
                logger("setting service with lowest price for 2-Day Delivery service");
                service = lowestPriceService;
            } else if (
                lowestPriceService.shippingService == "Next Day Delivery" &&
                lowestPriceService.deliveryTime <= 1
            ) {
                logger(
                    "setting service with lowest price for Next Day Delivery service"
                );
                const lowestOvernightService = services
                    .filter(
                        (service) =>
                            service.price > 0 &&
                            service.deliveryTime <= 2 &&
                            service.shippingService == "Next Day Delivery" &&
                            service.serviceId == 55
                    )
                    .reduce((prev, curr) => (prev.price < curr.price ? prev : curr), 0);

                const lowestGroundOrHomeService = services
                    .filter(
                        (service) =>
                            (service.price > 0 &&
                                service.deliveryTime <= 2 &&
                                service.shippingService == "Next Day Delivery" &&
                                service.serviceId == 50) ||
                            service.serviceId == 51
                    )
                    .reduce((prev, curr) => (prev.price < curr.price ? prev : curr), 0);

                if (lowestGroundOrHomeService.deliveryTime <= 1) {
                    service = lowestGroundOrHomeService;
                } else {
                    service = lowestOvernightService;
                }
            } else {
                logger("setting service with lowest time");
                service = lowestDeliveryTimeService;
            }
        } else {
            service = services
                .filter((service) => service.price > 0)
                .reduce((prev, curr) => (prev.price < curr.price ? prev : curr), 0);
        }

        if (
            service &&
            service.price > 0 &&
            service.order &&
            currentlyViewingSameOrder(service.order.OrderNumber)
        ) {
            const $container = $(".modal.order-detail");

            clearCheapestServiceMessaging();

            $container.find(".shipping-rate").after(`
<fieldset class="rating" id="cheapest-service" sty>
    <div class="form-group">
        <label class="control-label col-sm-3">Cheapest</label>
        <div class="col-sm-9" style="color: #6ba03a; padding: 7px 9px;">
            <span>$${service.price} (${service.service}, ${service.package}, ${service.length}x${service.width}x${service.height})</span>
        </div>
    </div>
</fieldset>
    `);

            callback(service);
        } else {
            console.error("Something went wrong.", services, service);
        }
    }
})();
