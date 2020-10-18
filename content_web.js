const isWorking = false;
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
            price: 7.65, // will change in November
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
            price: 8.6, // will change in November
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

function ensureServiceIsSelected(service, threadId, callback){

    if(! shouldProceed(threadId)){
        return;
    }

    const $container = $('.modal.order-detail')

    $container.find('[name="ServiceID"]').val(service.serviceId).trigger('change');

    if($container.find('[name="ServiceID"]').val() != service.serviceId)
    {
        setTimeout(function(){
            ensureServiceIsSelected(service, threadId, callback);
        }, 1000)
    }
    else{
        callback(service, threadId);
    }
}

function  ensurePackageIsSelected(service, threadId, callback) {

    if(! shouldProceed(threadId)){
        return;
    }

    const $container = $('.modal.order-detail');

    $container.find('[name="RequestedPackageTypeID"]').val(service.packageId).trigger('change');

    if($container.find('[name="RequestedPackageTypeID"] option[value="' + service.packageId + '"]').length === 0)
    {
        $container.find('[name="ServiceID"]').trigger('change');

        setTimeout(function(){
            ensurePackageIsSelected(service, threadId, callback)
        }, 1000);
    }
    else if( $container.find('[name="RequestedPackageTypeID"]').val() != service.packageId)
    {
        setTimeout(function(){
            ensurePackageIsSelected(service, threadId, callback)
        }, 1000);
    }
    else{
        callback(service, threadId)
    }
}

const findRateForService = (service, threadId, callback) => {

    if(! shouldProceed(threadId)){
        return;
    }

    const $container = $('.modal.order-detail');

    const shippingRateContainer = $container.find('.shipping-rate');

    if(shippingRateContainer.hasClass('update-pending') || shippingRateContainer.hasClass('updating-rate'))
    {
        setTimeout(function(){
            findRateForService(service, threadId, callback);
        }, 1000);
    }
    else{
        let price = $container.find('.current-rate.input-group-addon').text();

        if(price)
        {
            price = parseFloat(price.match(/\d+(?:\.\d+)?/g));

            if(price > 0)
            {
                callback(price, threadId);
            }
            else{
                callback(null, threadId);
            }
        }
    }
};

const cheapestService = ( prices, threadId ) => {

    if(! shouldProceed(threadId)){
        return;
    }

    const $container = $('.modal.order-detail');
    logger('Services with prices', prices)

    const service = prices.reduce((prev, curr) => prev.price < curr.price ? prev : curr);

    if(service && service.price)
    {
        $container.find('.shipping-rate').after(`
                    <div id="cheapest-price-message" style="font-size: 12px; color: green;"><strong>${service.service}</strong> with <strong>${service.package}</strong> is cheapest for <strong>$${service.price}</strong>.</div>
                `)

        ensureServiceIsSelected(service, threadId, function(service, threadId) {
            ensurePackageIsSelected(service, threadId, function (service, threadId) {
                findRateForService(service, threadId, function (price, threadId) {

                    if (price) {

                    }
                })
            })
        })
    }
    else
    {
        alert("Something went wrong!")
    }
}


let prices = []
let startedAt = null;
let currentlyWorking = 0;

function logger(){
    console.log('Nivesh : ', ...arguments)
}

function shouldProceed(threadId){
    if((threadId && currentlyWorking && threadId < currentlyWorking))
    {
        logger('Stop process for thread ' + threadId + ' ' + currentlyWorking )
    }

    return !(threadId && currentlyWorking && threadId < currentlyWorking);
}

function start(serviceIndex = 0, threadId){
    const $container = $('.modal.order-detail')

    if(! $container || $container.length === 0)
    {
        alert("FWD SS Tool - It can only work on the orders modal.")
        return;
    }

    const length = $container.find('[name="LengthIn"]').val()
    const width = $container.find('[name="WidthIn"]').val()
    const height = $container.find('[name="HeightIn"]').val()

    if(! length || ! width || ! height){
        alert("FWD SS Tool - Please fill in all the dimensions");
        return;
    }

    $container.find('#cheapest-price-message').remove();

    const size = length + 'x' + width + 'x' + height

    if(! shouldProceed(threadId)){
        return;
    }

    // Reset prices if starting
    if(serviceIndex === 0)
    {
        prices = [];
        currentlyWorking = new Date().getTime();
        threadId = currentlyWorking;
        $container.find('#cheapest-price-message').remove();
    }

    if(typeof servicesBySize[size] === "object"){
        const services = servicesBySize[size];

        const nextOptionIndex = typeof services[serviceIndex + 1] === "object" ? serviceIndex + 1 : null;
        const service = services[serviceIndex];

        if(service.price > 0)
        {
            logger('Fixed price service  ', service)

            prices.push({
                ...services[serviceIndex],
            });

            if (nextOptionIndex) {
                start(nextOptionIndex, threadId);
            } else {
                cheapestService(prices, threadId)
            }
        }
        else{
            logger('Find rates for service  ', service)

            // Select service
            ensureServiceIsSelected(service, threadId, function(service){
                ensurePackageIsSelected(service, threadId, function(service){
                    findRateForService(service, threadId, function(price) {

                        if(! shouldProceed(threadId)){
                            return;
                        }

                        if (price) {
                            prices.push({
                                ...services[serviceIndex],
                                price,
                            });

                            if (nextOptionIndex) {
                                start(nextOptionIndex, threadId);
                            } else {
                                cheapestService(prices, threadId)
                            }
                        } else {
                            if (nextOptionIndex) {
                                start(nextOptionIndex, threadId);
                            } else {
                                cheapestService(prices, threadId)
                            }
                        }
                    })
                });
            });
        }

    }
    else{
        alert("FWD SS Tool - No group defined for these dimensions.")
    }
}

function waitForTheCurrentFetchAndThen(callback){
    const $container = $('.modal.order-detail');

    const shippingRateContainer = $container.find('.shipping-rate');

    if(shippingRateContainer.hasClass('update-pending') || shippingRateContainer.hasClass('updating-rate'))
    {
        setTimeout(function(){
            waitForTheCurrentFetchAndThen(callback);
        }, 1000);
    }
    else{
        callback();
    }
}

$(document).on('keyup', function(e){
    if(e.ctrlKey || e.metaKey)
    {
        if([56, 57].includes(e.which))
        {
            setTimeout(function() {
                waitForTheCurrentFetchAndThen(function () {
                    start()
                })
            }, 3000)
        }
    }
});

$(document).on('dblclick', '.modal.order-detail .current-rate', function(){
    start();
});
