const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const MAIN_SOURCE = fs.readFileSync(path.join(__dirname, '..', 'src', 'main.js'), 'utf8');
const UPDATE_RATES = 'https://ss4.shipstation.com/api/orders/updaterates';

function order(orderId, serviceId, extra) {
    return Object.assign({
        OrderID: orderId,
        OrderNumber: String(orderId),
        ServiceID: serviceId,
        RequestedPackageTypeID: 3,
    }, extra);
}

// Loads src/main.js with fake jQuery, page, ui, and engine, and exposes the hooks
// it registers so each test can replay ShipStation traffic and packer input.
function loadMain(options) {
    options = options || {};
    const clock = { now: 1000000 };
    const docListeners = {};
    const hooks = {};
    const timeouts = [];
    const ui = { calls: [] };
    const engine = { runs: [], logs: [], syncing: false };
    let getQuoteClicks = 0;
    let messageListener = null;

    const container = {
        find(selector) {
            if (selector === '.get-quote') {
                return { length: options.noGetQuote ? 0 : 1, click() { getQuoteClicks++; } };
            }
            return { length: 0, html() { return undefined; }, val() { return ''; } };
        },
    };
    ['showProcessing', 'hideProcessing', 'removeWip'].forEach((name) => {
        ui[name] = () => ui.calls.push(name);
    });
    ui.clearCheapest = (showWip) => ui.calls.push('clearCheapest(' + showWip + ')');
    ui.getContainer = () => container;
    ui.getDimensions = () => ({ length: '20', width: '12', height: '6' });

    engine.rateShop = (requestData) => {
        engine.runs.push(requestData.orderViews[0]);
        return Promise.resolve();
    };
    engine.isSelectionSyncInProgress = () => engine.syncing;
    engine.skipAlreadySelectedDirectSelection = () => false;
    engine.hasMappingForSize = () => true;
    engine.logger = (message) => engine.logs.push(message);

    function wrap(length) {
        const wrapped = {
            length,
            find: () => wrap(0),
            unbind: () => wrapped,
            keydown: () => wrapped,
            change: () => wrapped,
            val: () => '',
            html: () => undefined,
        };
        return wrapped;
    }

    const sandbox = {
        console: { log() {}, error() {} },
        Date: class extends Date { static now() { return clock.now; } },
        setTimeout(fn, ms) { timeouts.push({ fn, ms }); return timeouts.length; },
        postMessage() {},
        addEventListener(type, fn) { if (type === 'message') messageListener = fn; },
        document: {
            addEventListener(type, fn, capture) {
                (docListeners[type] = docListeners[type] || []).push({ fn, capture });
            },
        },
    };
    sandbox.window = sandbox;
    sandbox.Backbone = {
        $(target) {
            if (target === sandbox.document) {
                return {
                    on(_type, _selector, fn) { hooks.rowClick = fn; },
                    ajaxSend(fn) { hooks.ajaxSend = fn; },
                    ajaxSuccess(fn) { hooks.ajaxSuccess = fn; },
                    ajaxError(fn) { hooks.ajaxError = fn; },
                };
            }
            if (target === '#orderlist-body tr[data-ss-selected="1"]') return wrap(1);
            return wrap(0);
        },
    };
    sandbox.FWD = {
        config: {},
        ui,
        engine,
        serviceCatalog: {
            getDefaultEnabledServices: () => ({}),
            normalizeEnabledServices: (value) => value || {},
        },
    };

    vm.runInNewContext(MAIN_SOURCE, sandbox, { filename: 'src/main.js' });
    // main.js only accepts messages whose source is its own `window` (the context's global).
    const pageWindow = vm.runInNewContext('window', sandbox);
    messageListener({ source: pageWindow, data: { type: 'SETTINGS_RESPONSE', settings: {
        enabled: options.enabled !== false,
        autorun: options.autorun !== false,
        skipAlreadySelected: true,
        enabledServices: {},
    } } });

    assert.ok((docListeners.change || []).every((l) => l.capture === true), 'change listeners must capture');
    assert.ok((docListeners.click || []).every((l) => l.capture === true), 'click listeners must capture');

    return {
        ui,
        engine,
        clock,
        timeouts,
        getQuoteClicks: () => getQuoteClicks,
        // One ShipStation /api/orders/updaterates round trip.
        rateRefresh(o) {
            const ajaxOptions = { url: UPDATE_RATES, data: JSON.stringify({ lowPriority: true, orderViews: [o] }) };
            hooks.ajaxSend({}, {}, ajaxOptions);
            hooks.ajaxSuccess({}, {}, ajaxOptions, { final: true, success: true, orders: [o] });
        },
        rateRequestFails(thrownError, statusText) {
            hooks.ajaxError({}, { statusText }, { url: UPDATE_RATES }, thrownError);
        },
        // A change on a Service / Package dropdown; trusted = real packer input.
        pick(name, value, trusted = true) {
            (docListeners.change || []).forEach((l) => l.fn({
                isTrusted: trusted,
                target: {
                    matches: (selector) => selector.includes('[name="' + name + '"]'),
                    getAttribute: () => name,
                    value: String(value),
                },
            }));
        },
        clickGetQuote(trusted = true) {
            (docListeners.click || []).forEach((l) => l.fn({
                isTrusted: trusted,
                target: { closest: (selector) => (selector === '.get-quote' ? {} : null) },
            }));
        },
        clickOrderRow() { hooks.rowClick(); },
    };
}

test('a service picked by hand is left alone on later rate refreshes for that order', () => {
    const h = loadMain();
    h.rateRefresh(order(1, 51));
    assert.equal(h.engine.runs.length, 1, 'the tool shops the order normally');

    h.pick('ServiceID', 55);
    h.ui.calls.length = 0;
    h.rateRefresh(order(1, 55));
    assert.equal(h.engine.runs.length, 1, "the packer's choice is not re-shopped");
    assert.deepEqual(h.ui.calls, ['clearCheapest(false)', 'hideProcessing'],
        'no working lock, and the tool banner and checkmark are cleared');

    h.rateRefresh(order(1, 55, { Weight: 160 }));
    assert.equal(h.engine.runs.length, 1, 'later refreshes, such as a weight change, keep the choice');
});

test('a package picked by hand is respected the same way', () => {
    const h = loadMain();
    h.pick('RequestedPackageTypeID', 505);
    h.rateRefresh(order(1, 52, { RequestedPackageTypeID: 505 }));
    assert.equal(h.engine.runs.length, 0);
});

test("the tool's own scripted changes are not treated as a packer's choice", () => {
    const h = loadMain();
    h.pick('ServiceID', 55, false);
    h.rateRefresh(order(1, 55));
    assert.equal(h.engine.runs.length, 1);
});

test("the packer's Get Quote click hands the order back to the tool; a scripted click does not", () => {
    const h = loadMain();
    h.pick('ServiceID', 55);
    h.rateRefresh(order(1, 55));
    assert.equal(h.engine.runs.length, 0);

    h.clickGetQuote(false);
    h.rateRefresh(order(1, 55));
    assert.equal(h.engine.runs.length, 0, "autorun's own Get Quote click keeps the packer's choice");

    h.clickGetQuote(true);
    h.rateRefresh(order(1, 55));
    assert.equal(h.engine.runs.length, 1, "the packer's Get Quote click re-shops the order");
});

test('a choice picked by hand applies only to its own order', () => {
    const h = loadMain();
    h.pick('ServiceID', 55);
    h.rateRefresh(order(1, 55));
    h.rateRefresh(order(2, 51));
    assert.deepEqual(h.engine.runs.map((o) => o.OrderID), [2]);
});

test('a change is tied only to a refresh that carries the picked value within 10 seconds', () => {
    const h = loadMain();
    h.pick('ServiceID', 55);
    h.rateRefresh(order(1, 51));
    assert.equal(h.engine.runs.length, 1, 'a refresh without the picked service is not tied to the change');

    h.clock.now += 11000;
    h.rateRefresh(order(1, 55));
    assert.equal(h.engine.runs.length, 2, 'too late to be the result of that change');
});

test('refreshes the tool will not act on do not lock Create Label', () => {
    const h = loadMain();
    h.engine.syncing = true;
    h.rateRefresh(order(1, 51));
    assert.ok(!h.ui.calls.includes('showProcessing'), "ShipStation echoing the tool's own change");
    assert.equal(h.engine.runs.length, 0);

    h.engine.syncing = false;
    h.rateRefresh(order(1, 51));
    assert.ok(h.ui.calls.includes('showProcessing'), 'a normal refresh still shows the working state');
});

test('a failed ShipStation rate request unlocks Create Label; an aborted one does not', () => {
    const h = loadMain();
    h.rateRequestFails('abort', 'abort');
    assert.deepEqual(h.ui.calls, []);

    h.rateRequestFails('Internal Server Error', 'error');
    assert.deepEqual(h.ui.calls, ['clearCheapest(false)', 'hideProcessing']);
});

test('autorun does nothing while the extension is disabled', () => {
    const h = loadMain({ enabled: false, autorun: true });
    h.clickOrderRow();
    assert.equal(h.timeouts.length, 0, 'no Get Quote click is scheduled');
    assert.deepEqual(h.ui.calls, ['clearCheapest(false)']);

    h.ui.calls.length = 0;
    h.rateRefresh(order(1, 51));
    assert.equal(h.engine.runs.length, 0);
    assert.deepEqual(h.ui.calls, ['clearCheapest(false)'], 'leftover working state is cleared');
});

test('autorun clicks Get Quote when enabled, and unlocks if the button is missing', () => {
    const withButton = loadMain();
    withButton.clickOrderRow();
    assert.deepEqual(withButton.ui.calls, ['clearCheapest(true)']);
    withButton.timeouts.forEach((t) => t.fn());
    assert.equal(withButton.getQuoteClicks(), 1);

    const withoutButton = loadMain({ noGetQuote: true });
    withoutButton.clickOrderRow();
    withoutButton.timeouts.forEach((t) => t.fn());
    assert.equal(withoutButton.getQuoteClicks(), 0);
    assert.equal(withoutButton.ui.calls[withoutButton.ui.calls.length - 1], 'clearCheapest(false)');
});
