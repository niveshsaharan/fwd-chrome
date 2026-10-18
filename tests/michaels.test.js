const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

function loadConfig() {
    const sandbox = { console };
    sandbox.window = sandbox;
    vm.runInNewContext(read('src/serviceCatalog.js'), sandbox);
    vm.runInNewContext(read('src/config.js'), sandbox);
    return sandbox.window.FWD.config;
}

const cfg = loadConfig();
const pick = (req, weight, unit) => {
    const r = cfg.getStoreOverride('Michaels', req, { Weight: weight, WeightUnitOfMeasure: unit || 'Ounce' });
    return r && r[0];
};

test('SurePost under 16 oz -> Ground Saver Less than 1 lb on Michaels account', () => {
    const s = pick('UPS SurePost (rate class unspecified)', 15.9);
    assert.equal(s.service, 'UPS Ground Saver Less than 1 lb');
    assert.equal(s.sellerProviderId, 1650146);
    assert.equal(s.providerId, 3);
});

test('SurePost at exactly 16 oz and above -> Ground Saver 1 lb or Greater', () => {
    assert.equal(pick('UPS SurePost (rate class unspecified)', 16).service, 'UPS Ground Saver 1 lb or Greater');
    assert.equal(pick('ups surepost', 40).service, 'UPS Ground Saver 1 lb or Greater');
    assert.equal(pick('UPS SurePost', 16).sellerProviderId, 1650146);
});

test('weight units are converted to ounces', () => {
    assert.equal(pick('UPS SurePost', 1, 'Pound').service, 'UPS Ground Saver 1 lb or Greater');
    assert.equal(pick('UPS SurePost', 0.9, 'Pound').service, 'UPS Ground Saver Less than 1 lb');
    assert.equal(pick('UPS SurePost', 400, 'Gram').service, 'UPS Ground Saver Less than 1 lb');
    assert.equal(pick('UPS SurePost', 500, 'Gram').service, 'UPS Ground Saver 1 lb or Greater');
});

test('missing weight does not guess a SurePost service', () => {
    assert.equal(cfg.getStoreOverride('Michaels', 'UPS SurePost', {}), null);
});

test('existing UPS Ground / Ground Saver rules unchanged', () => {
    const g = pick('UPS Ground', 10);
    assert.equal(g.service, 'UPS® Ground (UPS)');
    assert.equal(g.serviceId, 26);
    assert.equal(g.sellerProviderId, 1650146);
    assert.equal(pick('UPS Ground Saver', 10).service, 'UPS Ground Saver');
    assert.equal(cfg.getStoreOverride('Michaels', 'Standard', { Weight: 10 }), null);
});

test('SurePost services use ShipStation IDs 90 / 91 on the UPS account', () => {
    const lt = pick('UPS SurePost (rate class unspecified)', 8);
    const ge = pick('UPS SurePost (rate class unspecified)', 24);
    assert.equal(lt.serviceId, 90);
    assert.equal(ge.serviceId, 91);
    [lt, ge].forEach((s) => {
        assert.equal(s.providerId, 3);
        assert.equal(s.carrierId, 3);
        assert.equal(s.packageId, 3);
        assert.equal(s.sellerProviderId, 1650146);
    });
});
