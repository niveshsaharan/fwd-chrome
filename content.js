console.log("Loaded")

const servicesBySize = {
    '12x15x1' : [
        {
            service: 'USPS Priority Mail',
            serviceId: 13,
            package: 'Package',
            packageId: 3,
        },
        {
            service: 'FedEx 2Day®',
            serviceId: 52,
            package: 'FedEx One Rate® Pak',
            packageId: 505,
            fixed: true,
            price: 7.65, // will change in Nov
        }
    ],
    '14x12x3' : [
        {
            service: 'USPS Priority Mail',
            serviceId: 13,
            package: 'Package',
            packageId: 3,
        },
        {
            service: 'UPS 2nd Day Air®',
            serviceId: 28,
            package: 'Package',
            packageId: 3,
            fixed: true,
            price: 8.6, // will change in Nov
        }
    ]
}

const extractPriceFromHtml = ($container, resolve, reject) => {
    const shippingRateContainer = $container.find('.shipping-rate.updating-pending');
    if(shippingRateContainer.hasClass('update-pending') || shippingRateContainer.hasClass('updating-rate'))
    {
        setTimeout(function(){
            extractPriceFromHtml($container, resolve, reject);
        }, 2000);
    }
    else{
        let price = $container.find('.current-rate.input-group-addon').text();

        if(price)
        {
            price = parseFloat(price.match(/\d+(?:\.\d+)?/g));

            if(price > 0)
            {
                resolve(price);
            }
            else{
                reject(null);
            }
        }
    }
}

function ensureServiceIsSelected(service, callback){
    const $container = $('.modal.order-detail')

    $container.find('[name="ServiceID"]').val(service.serviceId).trigger('change');
    return;
console.log( $container.find('[name="ServiceID"]').val())
    if($container.find('[name="ServiceID"]').val() != service.serviceId)
    {
        setTimeout(function(){
            ensureServiceIsSelected(service, callback);
        }, 1000)
    }
    else{
        logger('Service is selected.')
        callback(service);
    }
}

function  ensurePackageIsSelected(service, callback) {
    const $container = $('.modal.order-detail');

    if($container.find('[name="RequestedPackageTypeID"] option[value="' + service.packageId + '"]').length === 0)
    {
        $container.find('[name="ServiceID"]').trigger('change');

        setTimeout(function(){
            ensurePackageIsSelected(service, callback)
        }, 1000);
    }
    else if( $container.find('[name="RequestedPackageTypeID"]').val() != service.packageId)
    {
        $container.find('[name="RequestedPackageTypeID"]').val(service.packageId).trigger('change');

        setTimeout(function(){
            ensurePackageIsSelected(service, callback)
        }, 1000);
    }
    else{
        callback(service)
    }
}

const findRateForService = (service) => new Promise((resolve, reject) => {
    const $container = $('.modal.order-detail');

    const shippingRateContainer = $container.find('.shipping-rate');

    if(shippingRateContainer.hasClass('update-pending') || shippingRateContainer.hasClass('updating-rate'))
    {
        setTimeout(function(){
            findRateForService(service);
        }, 1000);
    }
    else{
        let price = $container.find('.current-rate.input-group-addon').text();

        if(price)
        {
            price = parseFloat(price.match(/\d+(?:\.\d+)?/g));

            if(price > 0)
            {
                resolve(price);
            }
            else{
                reject(null);
            }
        }
    }
});

const cheapestService = ($container, prices) => {

    logger('Services with prices', prices)
return;
    const service = prices.reduce((prev, curr) => prev.price < curr.price ? prev : curr);

    if(service && service.price)
    {
        $container.find('[name="ServiceID"]').val(service.serviceId).trigger('change');

        setTimeout(function() {
            ensurePackageIsSelected(service, function () {
                $container.find('.shipping-rate').after(`
                    <div id="cheapest-price-message" style="font-size: 12px; color: green;"><strong>${service.service}</strong> with <strong>${service.package}</strong> is cheapest for <strong>$${service.price}</strong>.</div>
                `)
            })
        }, 2000)
    }
    else
    {
        alert("Something went wrong!")
    }
}


let prices = []

function logger(){
    console.log('Nivesh : ', ...arguments)
}

function start(serviceIndex = 0, final = false){
    const $container = $('.modal.order-detail')

    if(! $container || $container.length === 0)
    {
        alert("It can only work on the orders modal.")
        return;
    }

    const length = $container.find('[name="LengthIn"]').val()
    const width = $container.find('[name="WidthIn"]').val()
    const height = $container.find('[name="HeightIn"]').val()

    if(! length || ! width || ! height){
        alert("Please fill in all the dimensions");
        return;
    }

    $container.find('#cheapest-price-message').remove();

    const size = length + 'x' + width + 'x' + height

    if(typeof servicesBySize[size] === "object"){
        const services = servicesBySize[size];


        const nextOptionIndex = typeof services[serviceIndex + 1] === "object" ? serviceIndex + 1 : null;
        const service = services[serviceIndex];
        logger('Current service is  ', service)

        // Select service
        ensureServiceIsSelected(service, function(service){
            return;
            ensurePackageIsSelected(service, function(service){
                findRateForService(service).then(price => {

                    prices.push({
                        ...services[serviceIndex],
                        price,
                    });

                    if(nextOptionIndex)
                    {
                        start(nextOptionIndex);
                    }
                    else{
                        cheapestService($container, prices)
                    }
                }).catch(() => {
                    console.error("Price not found for ", service)

                    if(nextOptionIndex)
                    {
                        start(nextOptionIndex);
                    }
                    else{
                        cheapestService($container, prices)
                    }
                })
            });
        });


    }
    else{
        alert("No group defined for these dimensions.")
    }
}

chrome.runtime.onMessage.addListener((request, sender, response) => {
    start()
})
