(function(){
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



    Backbone.$( document ).ajaxSuccess(function( event, xhr, options, data ) {

        if(options.url.endsWith('/api/orders/updaterates'))
        {
            const requestData = JSON.parse(options.data);

            if(data.final)
            {
                console.log('Original Request ' + data.orders[0].ServiceID + ' --- ' + data.orders[0].RequestedPackageTypeID, requestData, data)
            }

            getShippingRatesForServices(requestData, data);
        }

        if(window.fwdPaused)
        {
            return;
        }

        if(options.url.endsWith('/api/orders/BulkUpdate'))
        {
            $('.modal.order-detail .get-quote').click();
        }

        if(options.url.includes('/api/shipments/List?orderID='))
        {
            $('.modal.order-detail .get-quote').click();
        }
    });

    function setCheapestServiceAsSelected(data, service){
        const $container = $('.modal.order-detail');

        if($container.find('[name="ServiceID"]').val() != service.serviceId)
        {
            $container.find('[name="ServiceID"]').val(service.serviceId).trigger('change');
        }

        setTimeout(function(){
            if($container.find('[name="RequestedPackageTypeID"]').val() != service.packageId)
            {
                $container.find('[name="RequestedPackageTypeID"]').val(service.packageId).trigger('change');
            }
        }, 2000);
    }

    async function getShippingRatesForServices(data, responseData){

        if(window.fwdPaused)
        {
            return;
        }

        $('#cheapest-service').remove();

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

                    let res = await fetch("https://ss4.shipstation.com/api/orders/updaterates?nivesh", {
                        "headers": {
                            "accept": "application/json",
                            "content-type": "application/json; charset=UTF-8",
                        },
                        "body": JSON.stringify(data),
                        "method": "POST",
                        "credentials": "include"
                    });

                    res = await res.json();

                    console.log('Manual Request ' + res.orders[0].ServiceID + ' --- ' + res.orders[0].RequestedPackageTypeID, data, res)

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
            console.log('Something went wrong.', services, service)
        }
    }
})()
