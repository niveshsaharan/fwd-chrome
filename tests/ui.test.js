const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const UI_SOURCE = fs.readFileSync(path.join(__dirname, '..', 'src', 'ui.js'), 'utf8');
const SHIP_LOCK = '.ss-wip .btn-group.ship-btn-group';

// Loads src/ui.js against a tiny fake page: an order drawer, an optional modal,
// element class lists, the captured window click listener, and manual timers.
function loadUi() {
    const html = { classes: new Set() };
    const drawer = { classes: new Set() };
    const modal = { classes: new Set() };
    const page = { modalOpen: false };
    const timers = new Map();
    const warnings = [];
    const windowListeners = [];
    let nextTimer = 1;

    function wrap(elements) {
        const wrapped = {
            length: elements.length,
            addClass(name) { elements.forEach((el) => el.classes.add(name)); return wrapped; },
            removeClass(name) { elements.forEach((el) => el.classes.delete(name)); return wrapped; },
            append() { return wrapped; },
            html() { return wrapped; },
            hide() { return wrapped; },
            show() { return wrapped; },
            remove() { return wrapped; },
            find() { return wrap([]); },
        };
        return wrapped;
    }

    function $(selector) {
        if (selector === 'html') return wrap([html]);
        if (selector === '#order-drawer') return wrap([drawer]);
        if (selector === '.modal.order-detail') return wrap(page.modalOpen ? [modal] : []);
        if (selector === '.ss-wip') return wrap([drawer, modal].filter((el) => el.classes.has('ss-wip')));
        return wrap([]);
    }

    const sandbox = {
        Backbone: { $ },
        console: { log() {}, warn(...args) { warnings.push(args); } },
        document: { querySelectorAll() { return []; } },
        setTimeout(fn, ms) { const id = nextTimer++; timers.set(id, { fn, ms }); return id; },
        clearTimeout(id) { timers.delete(id); },
        addEventListener(type, fn, capture) { windowListeners.push({ type, fn, capture }); },
    };
    sandbox.window = sandbox;
    vm.runInNewContext(UI_SOURCE, sandbox, { filename: 'src/ui.js' });

    const clickListener = windowListeners.find((l) => l.type === 'click' && l.capture === true);
    assert.ok(clickListener, 'ui.js must listen for clicks in the capture phase');

    return {
        ui: sandbox.FWD.ui,
        html,
        drawer,
        page,
        timers,
        warnings,
        // Clicks Create Label (or, with insideShipButtons false, something else in the
        // order). closest() is emulated: the ship buttons sit in the current container.
        click(insideShipButtons = true) {
            const container = page.modalOpen ? modal : drawer;
            const event = {
                prevented: false,
                stopped: false,
                target: {
                    closest: (selector) => (insideShipButtons && selector === SHIP_LOCK &&
                        container.classes.has('ss-wip')) ? {} : null,
                },
                preventDefault() { this.prevented = true; },
                stopImmediatePropagation() { this.stopped = true; },
            };
            clickListener.fn(event);
            return event;
        },
        fireTimers() {
            const pending = [...timers.values()];
            timers.clear();
            pending.forEach((timer) => timer.fn());
        },
    };
}

test('Create Label clicks are cancelled only while the order is working', () => {
    const h = loadUi();
    assert.equal(h.click().prevented, false, 'unlocked before any work starts');

    h.ui.setWip();
    const blocked = h.click();
    assert.equal(blocked.prevented, true);
    assert.equal(blocked.stopped, true, 'ShipStation must never see the click');
    assert.equal(h.click(false).prevented, false, 'other clicks in the order still work');

    h.ui.removeWip();
    assert.equal(h.click().prevented, false, 'unlocked once the work is done');
});

test('the working lock releases itself after 20 seconds without activity', () => {
    const h = loadUi();
    h.ui.setWip();
    assert.deepEqual([...h.timers.values()].map((timer) => timer.ms), [20000]);

    h.ui.keepWipAlive();
    assert.equal(h.timers.size, 1, 'activity renews the timeout instead of stacking timers');

    h.fireTimers();
    assert.equal(h.drawer.classes.has('ss-wip'), false);
    assert.equal(h.html.classes.has('ss-fwd-wip'), false);
    assert.equal(h.click().prevented, false);
    assert.equal(h.warnings.length, 1, 'a timed-out lock is reported in the console');
});

test('finishing work cancels the safety timeout, and keepWipAlive never locks an idle order', () => {
    const h = loadUi();
    h.ui.setWip();
    h.ui.removeWip();
    assert.equal(h.timers.size, 0);

    h.ui.keepWipAlive();
    assert.equal(h.timers.size, 0);
    assert.equal(h.click().prevented, false);
});

test('unlocking clears the working state from every container, not only the current one', () => {
    const h = loadUi();
    h.ui.setWip();
    h.page.modalOpen = true;
    h.ui.removeWip();
    assert.equal(h.drawer.classes.has('ss-wip'), false);
});
