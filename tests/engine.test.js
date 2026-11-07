const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const ENGINE_SOURCE = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'engine.js'),
    'utf8'
);

function makeField(initialValue, events, name) {
    return {
        length: 1,
        value: String(initialValue),
        val: function (nextValue) {
            if (arguments.length) {
                this.value = String(nextValue);
                return this;
            }
            return this.value;
        },
        trigger: function (eventName) {
            events.push({ field: name, event: eventName, value: this.value });
            return this;
        },
        change: function () {
            events.push({ field: name, event: 'change', value: this.value });
            return this;
        },
        data: function () { return null; },
        prop: function () { return this; },
    };
}

function createHarness(options) {
    options = options || {};

    const amazon = {
        toggleId: 'amazon',
        service: 'Amazon Shipping Ground(On and Off Amazon)',
        serviceId: 6747,
        package: 'Package',
        packageId: 3,
        providerId: 81,
        carrierId: 80,
        length: 9,
        width: 12,
        height: 1,
        conditions: [],
    };
    if (options.whenCheapest) {
        amazon.when_cheapest = {
            packageId: 1,
            package: 'Large Envelope or Flat',
            length: 12,
            width: 9,
            height: 0,
        };
    }
    if (options.overrideSellerProviderId) {
        amazon.sellerProviderId = options.overrideSellerProviderId;
    }
    const ups = {
        toggleId: 'ups',
        service: 'UPS® Ground (UPS by ShipStation)',
        serviceId: 10301,
        package: 'Package',
        packageId: 3,
        providerId: 103,
        carrierId: 3,
        length: 9,
        width: 12,
        height: 1,
        conditions: [],
    };
    const events = [];
    const requestBodies = [];
    const logs = [];
    const errors = [];
    const serviceField = makeField(amazon.serviceId, events, 'ServiceID');
    const packageField = makeField(amazon.packageId, events, 'RequestedPackageTypeID');
    const fallbackField = makeField('', events, 'other');
    const container = {
        find: function (selector) {
            if (selector === '[name="ServiceID"]') return serviceField;
            if (selector === '[name="RequestedPackageTypeID"]') return packageField;
            return fallbackField;
        },
    };
    const banners = [];
    const uiCalls = [];
    let checkmarks = 0;

    function responseFor(request) {
        const requestedOrder = request.orderViews[0];
        const shouldReturnWrongWinner = options.wrongFinalResponse &&
            requestBodies.length === 2;
        const shouldReturnWrongAccount = options.wrongFinalAccount &&
            requestBodies.length === 2;
        const responseService = shouldReturnWrongWinner ? ups :
            (requestedOrder.ServiceID === amazon.serviceId ? amazon : ups);
        const price = responseService.serviceId === amazon.serviceId ? 4.72 : 9.34;

        return {
            final: true,
            success: true,
            orders: [{
                ...requestedOrder,
                ServiceID: responseService.serviceId,
                RequestedPackageTypeID: shouldReturnWrongWinner ?
                    responseService.packageId : requestedOrder.RequestedPackageTypeID,
                ProviderID: shouldReturnWrongAccount ? ups.providerId :
                    (shouldReturnWrongWinner ? responseService.providerId : requestedOrder.ProviderID),
                CarrierID: shouldReturnWrongAccount ? ups.carrierId :
                    (shouldReturnWrongWinner ? responseService.carrierId : requestedOrder.CarrierID),
                OrderNumber: '1001',
                RequestedShippingService: 'Standard Std US D2D Dom',
                ShippingCost: price,
                ConfirmationCost: 0,
                InsuranceCost: 0,
                OtherCost: 0,
                RateError: null,
            }],
        };
    }

    const config = {
        buildMappings: function () { return { '9x12x1': [amazon, ups], '***': [] }; },
        evaluate: function () { return true; },
        CONDITIONS: {},
        COMMON_CONDITIONS: [],
        PRIORITY_MAP: {},
        COMMON_FIELDS: { BillToParty: null },
        CARRIER_FIELDS: {},
        EXCEPTION_DIMS: [],
        EXCEPTION_SERVICES: [],
        getStoreOverride: function () { return options.storeOverride ? [amazon] : null; },
    };
    const ui = {
        getContainer: function () { return container; },
        getCurrentShipmentState: function () {
            return {
                ServiceID: amazon.serviceId,
                RequestedPackageTypeID: amazon.packageId,
                ProviderID: options.missingProvider ? '' : amazon.providerId,
                CarrierID: options.missingCarrier ? '' : amazon.carrierId,
                Length: amazon.length,
                Width: amazon.width,
                Height: amazon.height,
            };
        },
        currentlyViewingSameOrder: function (orderNumber) {
            return orderNumber === (options.viewingOrderNumber || '1001');
        },
        setWip: function () { uiCalls.push('setWip'); },
        removeWip: function () {
            uiCalls.push('removeWip');
            events.push({ field: 'ui', event: 'removeWip' });
        },
        keepWipAlive: function () { uiCalls.push('keepWipAlive'); },
        clearCheapest: function (showWip) { uiCalls.push('clearCheapest(' + showWip + ')'); },
        hideProcessing: function () { uiCalls.push('hideProcessing'); },
        showCheckmark: function () { checkmarks++; },
        showCheapestBanner: function (_container, service) { banners.push(service); },
    };
    const sandbox = {
        Backbone: { $: {} },
        console: {
            log: function () { logs.push(Array.from(arguments)); },
            groupCollapsed: function () {},
            groupEnd: function () {},
            error: function () { errors.push(Array.from(arguments)); },
        },
        fetch: async function (_url, fetchOptions) {
            const request = JSON.parse(fetchOptions.body);
            requestBodies.push(request);
            if (options.fetchFails) throw new Error('network down');
            return { json: async function () { return responseFor(request); } };
        },
        setTimeout: function (callback) { callback(); return 1; },
    };
    sandbox.window = sandbox;
    sandbox.FWD = {
        config: config,
        ui: ui,
        serviceCatalog: {
            isServiceEnabled: function () { return true; },
        },
    };

    vm.runInNewContext(ENGINE_SOURCE, sandbox, { filename: 'src/engine.js' });

    const requestData = {
        lowPriority: true,
        orderViews: [{
            OrderID: 1,
            OrderNumber: '1001',
            StoreName: 'Amazon.com',
            RequestedShippingService: 'Standard Std US D2D Dom',
            ServiceID: amazon.serviceId,
            RequestedPackageTypeID: amazon.packageId,
            ProviderID: amazon.providerId,
            CarrierID: amazon.carrierId,
            Length: amazon.length,
            Width: amazon.width,
            Height: amazon.height,
            ResidentialIndicator: 'R',
            ShipCountryCode: 'US',
        }],
    };

    return {
        amazon: amazon,
        ups: ups,
        engine: sandbox.FWD.engine,
        requestData: requestData,
        initialResponse: responseFor(requestData),
        requestBodies: requestBodies,
        events: events,
        banners: banners,
        errors: errors,
        uiCalls: uiCalls,
        getCheckmarks: function () { return checkmarks; },
    };
}

test('finalizes an Amazon winner after UPS was the last candidate quote', async function () {
    const harness = createHarness();
    const originalRequest = JSON.parse(JSON.stringify(harness.requestData));

    await harness.engine.rateShop(
        harness.requestData,
        harness.initialResponse,
        {},
        { skipAlreadySelected: true }
    );

    assert.deepEqual(harness.requestData, originalRequest, 'candidate quoting must not mutate the triggering request');
    assert.deepEqual(
        harness.requestBodies.map(function (request) { return request.orderViews[0].ServiceID; }),
        [harness.ups.serviceId, harness.amazon.serviceId],
        'the winning Amazon service must be the final uncached updaterates request'
    );
    assert.deepEqual(
        harness.requestBodies.map(function (request) { return request.orderViews[0].ProviderID; }),
        [harness.ups.providerId, harness.amazon.providerId]
    );
    assert.equal(harness.banners.length, 1);
    assert.equal(harness.banners[0].serviceId, harness.amazon.serviceId);
    assert.ok(
        harness.events.some(function (event) {
            return event.field === 'ServiceID' &&
                event.event === 'change' &&
                Number(event.value) === harness.amazon.serviceId;
        }),
        'the visible Amazon value must still emit a change so ShipStation re-synchronizes its model'
    );
    assert.equal(harness.getCheckmarks(), 1);
    assert.equal(harness.errors.length, 0);
    assert.equal(harness.engine.isSelectionSyncInProgress(harness.requestData), true);
    assert.equal(harness.engine.isSelectionSyncInProgress({
        orderViews: [{ OrderID: 2, OrderNumber: '1002' }],
    }), false);
});

test('does not apply or confirm a winner when ShipStation finalizes a different service', async function () {
    const harness = createHarness({ wrongFinalResponse: true });

    await harness.engine.rateShop(
        harness.requestData,
        harness.initialResponse,
        {},
        { skipAlreadySelected: true }
    );

    assert.deepEqual(
        harness.requestBodies.map(function (request) { return request.orderViews[0].ServiceID; }),
        [harness.ups.serviceId, harness.amazon.serviceId]
    );
    assert.equal(harness.banners.length, 0);
    assert.equal(harness.getCheckmarks(), 0);
    assert.equal(harness.events.length, 0);
    assert.equal(harness.errors.length, 1);
    assert.equal(harness.errors[0][0], 'Winning service finalization failed.');
});

test('does not apply an Amazon winner when ShipStation confirms the wrong carrier account', async function () {
    const harness = createHarness({ wrongFinalAccount: true });

    await harness.engine.rateShop(
        harness.requestData,
        harness.initialResponse,
        {},
        { skipAlreadySelected: true }
    );

    assert.equal(harness.banners.length, 0);
    assert.equal(harness.getCheckmarks(), 0);
    assert.equal(harness.events.length, 0);
    assert.equal(harness.errors.length, 1);
    assert.equal(harness.errors[0][0], 'Winning service finalization failed.');
});

test('does not skip a direct selection when provider or carrier state is unavailable', function () {
    const missingProvider = createHarness({ storeOverride: true, missingProvider: true });
    const missingCarrier = createHarness({ storeOverride: true, missingCarrier: true });
    const completeState = createHarness({ storeOverride: true });

    assert.equal(missingProvider.engine.skipAlreadySelectedDirectSelection({}), false);
    assert.equal(missingCarrier.engine.skipAlreadySelectedDirectSelection({}), false);
    assert.equal(completeState.engine.skipAlreadySelectedDirectSelection({}), true);
    assert.equal(missingProvider.getCheckmarks(), 0);
    assert.equal(missingCarrier.getCheckmarks(), 0);
    assert.equal(completeState.getCheckmarks(), 1);
});

test('finalizes a when-cheapest package and dimension transformation', async function () {
    const harness = createHarness({ whenCheapest: true });

    await harness.engine.rateShop(
        harness.requestData,
        harness.initialResponse,
        {},
        { skipAlreadySelected: true }
    );

    const finalOrder = harness.requestBodies[harness.requestBodies.length - 1].orderViews[0];
    assert.equal(finalOrder.ServiceID, harness.amazon.serviceId);
    assert.equal(finalOrder.RequestedPackageTypeID, 1);
    assert.equal(finalOrder.Length, 12);
    assert.equal(finalOrder.Width, 9);
    assert.equal(finalOrder.Height, 0);
    assert.equal(harness.banners.length, 1);
    assert.equal(harness.banners[0].packageId, 1);
    assert.equal(harness.getCheckmarks(), 1);
});

test('renews the working lock before every rate request', async function () {
    const harness = createHarness();

    await harness.engine.rateShop(harness.requestData, harness.initialResponse, {}, {});

    assert.equal(harness.requestBodies.length, 2);
    assert.equal(harness.uiCalls.filter(function (call) { return call === 'keepWipAlive'; }).length, 2);
});

test('a failed rate request unlocks the order instead of leaving it working', async function () {
    const harness = createHarness({ fetchFails: true });

    await harness.engine.rateShop(harness.requestData, harness.initialResponse, {}, {});

    assert.ok(harness.uiCalls.includes('clearCheapest(false)'), 'the working lock must be cleared');
    assert.ok(harness.uiCalls.includes('hideProcessing'));
    assert.equal(harness.banners.length, 0);
    assert.equal(harness.errors.length, 1);
    assert.equal(harness.errors[0][0], 'Rate shop failed.');
});

test('a run for an order the packer has left does not unlock the order now open', async function () {
    const harness = createHarness({ viewingOrderNumber: '2002' });

    await harness.engine.rateShop(harness.requestData, harness.initialResponse, {}, {});

    assert.ok(!harness.uiCalls.includes('clearCheapest(false)'));
    assert.ok(!harness.uiCalls.includes('hideProcessing'));
    assert.equal(harness.errors[0][0], 'Rate shop failed — no valid cheapest.');
});

test('a store override with a bill-to account stays locked until the bill-to switch is done', async function () {
    const harness = createHarness({ storeOverride: true, overrideSellerProviderId: 1650146 });

    await harness.engine.rateShop(harness.requestData, null, {}, { skipAlreadySelected: false });

    const billToChange = harness.events.findIndex(function (event) {
        return event.field === 'other' && event.event === 'change';
    });
    const unlock = harness.events.findIndex(function (event) { return event.event === 'removeWip'; });
    assert.ok(billToChange >= 0, 'the bill-to account must be switched');
    assert.ok(unlock > billToChange, 'Create Label must stay locked until the bill-to switch');
    assert.equal(harness.uiCalls.filter(function (call) { return call === 'removeWip'; }).length, 1);
});
