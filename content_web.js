(function(){

    const $ = Backbone.$;

    const serviceMappings = {
        '12x15x1' : [
            {
                service: 'USPS Priority Mail',
                serviceId: 13,
                package: 'Package',
                packageId: 3,
                length: 12,
                width: 15,
                height: 1,
                providerId: 2,
                carrierId: 1,
            },
            {
                service: 'FedEx 2Day®',
                serviceId: 52,
                package: 'FedEx One Rate® Pak',
                packageId: 505,
                length: 12,
                width: 15,
                height: 1,
                providerId: 4,
                carrierId: 4,
            }
        ],
        '14x12x3' : [
            {
                service: 'USPS Priority Mail',
                serviceId: 13,
                package: 'Package',
                packageId: 3,
                length: 14,
                width: 12,
                height: 3,
                providerId: 2,
                carrierId: 1,
            },
            {
                service: 'UPS 2nd Day Air®',
                serviceId: 28,
                package: 'Package',
                packageId: 3,
                length: 14,
                width: 12,
                height: 3,
                providerId: 3,
                carrierId: 3,
            }
        ]
    }

    const caches = {};

    /**
     * Capture ajaxSent request to modify lowPriority to highPriority Request
     */
    $( document ).ajaxSend(function( event, xhr, options ) {
        if(options.url.endsWith('/api/orders/updaterates'))
        {
            const data = JSON.parse(options.data);

            if(data.lowPriority)
            {
                data.lowPriority = false;

                options.data = JSON.stringify(data)
            }
        }
    })

    function logger(){
        if(arguments.length > 1)
        {
            console.groupCollapsed('%c' + arguments[0], 'color: #ff8000;');
        }

        for(let i = 0; i < arguments.length; i++)
        {
            if(arguments.length === 1)
            {
                console.log('%c' + arguments[i], 'color: #ff8000;');
            }
            else if(i > 0)
            {
                console.log(arguments[i]);
            }
        }

        if(arguments.length > 1)
        {
            console.groupEnd();
        }
    }

    /**
     * Capture AajxSuccess
     */
    $( document ).ajaxSuccess(function( event, xhr, options, data ) {

        // For update rates request
        if(options.url.endsWith('/api/orders/updaterates'))
        {
            const requestData = JSON.parse(options.data);

            if(data.final)
            {
                logger('High Priority request Sent by ShipStation',
                    'Service ID: ' + data.orders[0].ServiceID,
                    'Package ID: ' + data.orders[0].RequestedPackageTypeID,
                    'Request: ', requestData,
                    'Response: ', data
                )
            }
            else{
                logger(
                    'Low Priority request Sent by ShipStation',
                    'Service ID: ' + requestData.orderViewIs[0].ServiceID,
                    'Package ID: ' + requestData.orderViewIs[0].RequestedPackageTypeID,
                    'Request: ', requestData,
                    'Response: ', data
                )
            }

            if(window.fwdPaused)
            {
                return;
            }

            getShippingRatesForServices(requestData, data);
        }

        const $container = $('.modal.order-detail');

        const length = $container.find('[name="LengthIn"]').val();
        const width = $container.find('[name="WidthIn"]').val();
        const height = $container.find('[name="HeightIn"]').val();


        // When hotkeys are pressed
        if(options.url.endsWith('/api/orders/BulkUpdate'))
        {
            if(window.fwdPaused)
            {
                return;
            }

            if(! length || ! width || ! height || ! serviceMappings[length + 'x' + width + 'x' + height]){
                logger('No need to check the rates.')
                return;
            }

            $('.modal.order-detail .get-quote').click();
        }

        // When the order modal is opened
        if(options.url.includes('/api/shipments/List?orderID='))
        {
            if(window.fwdPaused)
            {
                return;
            }

            if(! length || ! width || ! height || ! serviceMappings[length + 'x' + width + 'x' + height]){
                logger('No need to check the rates.')
                return;
            }

            $('.modal.order-detail .get-quote').click();
        }
    });


    /**
     * Set cheapest options
     * @param data
     * @param service
     */
    function setCheapestServiceAsSelected(data, service){

        const $container = $('.modal.order-detail');

        if(parseInt($container.find('[name="ServiceID"]').val(), 10) !== parseInt(service.serviceId, 10))
        {
            logger('Setting cheapest service as selected. It will fire another AJAX Request.')

            $container.find('[name="ServiceID"]').val(service.serviceId).trigger('change');
        }

        setTimeout(function(){
            if(parseInt($container.find('[name="RequestedPackageTypeID"]').val(), 10) !== parseInt(service.packageId, 10))
            {
                logger('Setting cheapest package as selected. It will fire another AJAX Request.')

                $container.find('[name="RequestedPackageTypeID"]').val(service.packageId).trigger('change');
            }
        }, 2000);
    }

    /**
     * Cache response for a request
     * @param request
     * @param response
     * @returns {*}
     */
    function cache(request, response){
        const key = request.orderViews[0].ServiceID +'_' + request.orderViews[0].RequestedPackageTypeID + '_' + request.orderViews[0].ProviderID + '_' + request.orderViews[0].CarrierID + '_' + request.orderViews[0].Length + '_' + request.orderViews[0].Width + '_' + request.orderViews[0].Height;

        if(response)
        {
            caches[key] = response;
        }

        return caches[key];
    }

    /**
     *
     * @param data
     * @param responseData
     * @returns {Promise<void>}
     */
    async function getShippingRatesForServices(data, responseData){

        const serviceMappingWithPrices = JSON.parse(JSON.stringify(serviceMappings));

        const length = data.orderViews[0].Length;
        const width = data.orderViews[0].Width;
        const height = data.orderViews[0].Height;

        const size = length + 'x' + width + 'x' + height

        if(typeof serviceMappingWithPrices[size] === "object") {

            const services = serviceMappingWithPrices[size];

            for(const service of services)
            {
                if(responseData && responseData.final && responseData.success && responseData.orders && responseData.orders.length)
                {
                    cache(data, responseData);

                    setServiceRateFromResponse(responseData, services)
                }

                if(typeof service.order === "undefined")
                {
                    data.lowPriority = false;
                    data.orderViews[0].ServiceID = service.serviceId;
                    data.orderViews[0].RequestedPackageTypeID = service.packageId;
                    data.orderViews[0].ProviderID = service.providerId;
                    data.orderViews[0].CarrierID = service.carrierId;
                    data.orderViews[0].Rate = 0;
                    data.orderViews[0].RateError = null;
                    data.orderViews[0].RatingRequestPending= false;
                    data.orderViews[0].UpdatedRate=  true;

                    let res =  cache(data);

                    if(! res)
                    {


                        res = await fetch("https://ss4.shipstation.com/api/orders/updaterates?nivesh", {
                            "headers": {
                                "accept": "application/json",
                                "content-type": "application/json; charset=UTF-8",
                            },
                            "body": JSON.stringify(data),
                            "method": "POST",
                            "credentials": "include"
                        });

                        res = await res.json();

                        logger(
                            'Ajax request sent by the extension to find cheapest rate for ' + service.service + '(' + res.orders[0].ServiceID + ') / ' + service.package + '(' + res.orders[0].RequestedPackageTypeID +')',
                            'Request: ', data,
                            'Response: ', res
                        )

                        cache(data, res);
                    }

                    setServiceRateFromResponse(res, services)
                }
            }

            handleServiceRates(services, (service) => setCheapestServiceAsSelected(data, service));
        }
    }

    function setServiceRateFromResponse(response, services){

        if(response && response.final && response.success && response.orders && response.orders.length)
        {
            services.forEach(service => {
                if( parseInt(service.length, 10) === parseInt(response.orders[0].Length, 10)
                    && parseInt(service.width, 10) === parseInt(response.orders[0].Width, 10)
                    && parseInt(service.height, 10) === parseInt(response.orders[0].Height, 10)
                    && parseInt(response.orders[0].ServiceID, 10) === parseInt(service.serviceId, 10)
                    && parseInt(response.orders[0].RequestedPackageTypeID, 10) === parseInt(service.packageId, 10))
                {
                    service.order = response.orders[0];

                    if(! response.orders[0].RateError)
                    {
                        service.price = response.orders[0].ShippingCost + response.orders[0].ConfirmationCost + response.orders[0].InsuranceCost + response.orders[0].OtherCost;
                    }
                }
            })
        }

        return services;
    }

    function handleServiceRates(services, callback){

        const service = services.filter(service => service.price > 0).reduce((prev, curr) => prev.price < curr.price ? prev : curr);

        if(service && service.price > 0)
        {
            const $container = $('.modal.order-detail');

            $('#cheapest-service').remove();

            $container.find('.shipping-rate').after(`
<fieldset class="rating" id="cheapest-service" sty>
    <div class="form-group">
        <label class="control-label col-sm-3">Cheapest</label>
        <div class="col-sm-9" style="color: #6ba03a; padding: 7px 9px;">
            <span>$${service.price} (${service.service}, ${service.package}, ${service.length}x${service.width}x${service.height})</span>
        </div>
    </div>
</fieldset>
    `)

            callback(service)
        }
        else{
            console.error('Something went wrong.', services, service)
        }
    }
})()
