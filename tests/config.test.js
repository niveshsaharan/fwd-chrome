const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function loadConfig(sandbox = { console }) {
    sandbox.window = sandbox;
    for (const file of ['src/serviceCatalog.js', 'src/config.js']) {
        vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), sandbox);
    }
    return sandbox;
}

test('20x12x6 excludes ShipStation Ground but retains UPS-account Ground and One Rate boxes', () => {
    const mappings = loadConfig().FWD.config.buildMappings();
    const services = mappings['20x12x6'].concat(mappings['***']);
    assert.ok(!services.some((s) => s.serviceId === 10301));
    assert.ok(services.some((s) => s.serviceId === 26 && s.providerId === 3 && s.carrierId === 3));
    assert.ok(services.some((s) => s.serviceId === 52 && s.packageId === 503));
    assert.ok(services.some((s) => s.serviceId === 54 && s.packageId === 503));
    assert.equal(mappings['20x12x6'].length, 17);
});

for (const height of [6, 4]) {
    test(`20x12x${height} shops the correct UPS accounts even when ShipStation Ground is cheapest`, async () => {
        const quoted = [];
        const winners = [];
        const sandbox = loadConfig({
            Backbone: { $: {} },
            console: { log() {}, groupCollapsed() {}, groupEnd() {}, error(...args) { throw new Error(args[0]); } },
            setTimeout(callback) { callback(); return 1; },
            fetch: async (_url, options) => {
                const order = JSON.parse(options.body).orderViews[0];
                quoted.push({ service: order.ServiceID, provider: order.ProviderID });
                return { json: async () => ({
                    final: true, success: true,
                    orders: [{ ...order,
                        ShippingCost: order.ServiceID === 10301 ? 1 : order.ServiceID === 26 ? 10 : 20,
                        ConfirmationCost: 0, InsuranceCost: 0, OtherCost: 0, RateError: null,
                    }],
                }) };
            },
        });
        const field = { val(value) { return arguments.length ? this : ''; },
            trigger() { return this; }, change() { return this; } };
        sandbox.FWD.ui = {
            getContainer: () => ({ find: () => field }), currentlyViewingSameOrder: () => true,
            setWip() {}, removeWip() {}, keepWipAlive() {}, clearCheapest() {},
            hideProcessing() {}, showCheckmark() {},
            showCheapestBanner: (_container, service) => winners.push(service),
        };
        vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'src/engine.js'), 'utf8'), sandbox);
        await sandbox.FWD.engine.rateShop({ orderViews: [{
            OrderID: 1, OrderNumber: '1001', StoreName: 'Shopify',
            RequestedShippingService: 'Free Shipping', RequestedShippingServiceID: 0,
            ResidentialIndicator: 'R', ShipCountryCode: 'US',
            Weight: 32, WeightUnitOfMeasure: 'Ounce', Length: 20, Width: 12, Height: height,
        }] }, null, sandbox.FWD.serviceCatalog.getDefaultEnabledServices(), {});

        assert.ok(quoted.some((q) => q.service === 26 && q.provider === 3));
        assert.equal(quoted.some((q) => q.service === 10301), height !== 6);
        assert.equal(winners.length, 1);
        assert.equal(winners[0].serviceId, height === 6 ? 26 : 10301);
        assert.equal(quoted.at(-1).service, winners[0].serviceId, 'final quote confirms the winning account');
    });
}
