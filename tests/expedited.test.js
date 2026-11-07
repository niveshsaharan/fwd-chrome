const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

// Pin a US time zone so dates, weekdays, and the November DST change are the same on every machine.
process.env.TZ = 'America/New_York';

const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

const HOME_DELIVERY = 51;
const TWO_DAY = 52;
const STANDARD_OVERNIGHT = 55;

function pinnedDate(year, monthIndex, day) {
    const now = new Date(year, monthIndex, day, 10, 0, 0).getTime();
    return class extends Date {
        constructor(...args) {
            if (args.length) super(...args);
            else super(now);
        }
        static now() { return now; }
    };
}

// Runs the real catalog, config, and engine for one residential US order sized 20x12x6.
// `today` is [year, monthIndex, day]. `quotes` maps a ShipStation ServiceID to
// [price, DeliveryTime]; every other candidate gets a rate error.
async function shop({ today, requested, quotes }) {
    const winners = [];
    const serviceChanges = [];
    const sandbox = {
        Backbone: { $: {} },
        console: { log() {}, groupCollapsed() {}, groupEnd() {}, error() {} },
        Date: pinnedDate(...today),
        setTimeout: (callback) => { callback(); return 1; },
        fetch: async (_url, init) => {
            const order = JSON.parse(init.body).orderViews[0];
            const quote = quotes[order.ServiceID];
            return {
                json: async () => ({
                    final: true,
                    success: true,
                    orders: [{
                        ...order,
                        ShippingCost: quote ? quote[0] : 0,
                        ConfirmationCost: 0,
                        InsuranceCost: 0,
                        OtherCost: 0,
                        RateError: quote ? null : 'No rate',
                        DeliveryTime: quote ? quote[1] : null,
                    }],
                }),
            };
        },
    };
    sandbox.window = sandbox;
    vm.runInNewContext(read('src/serviceCatalog.js'), sandbox);
    vm.runInNewContext(read('src/config.js'), sandbox);

    const field = (selector) => ({
        val(value) {
            if (!arguments.length) return '';
            if (selector === '[name="ServiceID"]') serviceChanges.push(Number(value));
            return this;
        },
        trigger() { return this; },
        change() { return this; },
        data() { return null; },
        prop() { return this; },
    });
    sandbox.FWD.ui = {
        getContainer: () => ({ find: field }),
        currentlyViewingSameOrder: () => true,
        setWip() {},
        removeWip() {},
        keepWipAlive() {},
        clearCheapest() {},
        hideProcessing() {},
        showCheckmark() {},
        showCheapestBanner: (_container, service) => winners.push(service),
    };
    vm.runInNewContext(read('src/engine.js'), sandbox, { filename: 'src/engine.js' });

    await sandbox.FWD.engine.rateShop({
        orderViews: [{
            OrderID: 1,
            OrderNumber: '1001',
            StoreName: 'FWD - 480 Smith St (Shopify)',
            RequestedShippingService: requested,
            ResidentialIndicator: 'R',
            ShipCountryCode: 'US',
            Weight: 145.53,
            WeightUnitOfMeasure: 'Ounce',
            Length: 20,
            Width: 12,
            Height: 6,
        }],
    }, null, {}, {});

    assert.equal(winners.length, 1, 'expected one confirmed winner');
    assert.deepEqual(serviceChanges, [winners[0].serviceId], 'the service control must be set to the winner');
    return winners[0].serviceId;
}

test('next day: Home Delivery arriving Saturday from Thursday is not next day, so Standard Overnight wins', async () => {
    const thursday = [2026, 10, 5];
    const requested = 'Next Day Delivery (Fri, Nov 6, 2026)';

    assert.equal(await shop({ today: thursday, requested, quotes: {
        [HOME_DELIVERY]: [17.44, 'Saturday 11/7 by 11:59 PM'],
        [TWO_DAY]: [31.20, 'Monday 11/9 by 8:00 PM'],
        [STANDARD_OVERNIGHT]: [42.80, 'Friday 11/6 by 8:00 PM'],
    } }), STANDARD_OVERNIGHT);

    assert.equal(await shop({ today: thursday, requested, quotes: {
        [HOME_DELIVERY]: [17.44, 'Saturday 11/7 by 11:59 PM'],
        [STANDARD_OVERNIGHT]: [42.80, 'Tomorrow by 8:00 PM'],
    } }), STANDARD_OVERNIGHT);
});

test('next day: a cheaper Home Delivery that arrives the next business day still wins', async () => {
    assert.equal(await shop({
        today: [2026, 10, 5],
        requested: 'Next Day Delivery (Fri, Nov 6, 2026)',
        quotes: {
            [HOME_DELIVERY]: [17.44, 'Friday 11/6 by 8:00 PM'],
            [STANDARD_OVERNIGHT]: [42.80, 'Friday 11/6 by 8:00 PM'],
        },
    }), HOME_DELIVERY);

    // Friday -> Monday is still next day: weekend days in transit are skipped.
    assert.equal(await shop({
        today: [2026, 10, 6],
        requested: 'Next Day Delivery (Mon, Nov 9, 2026)',
        quotes: {
            [HOME_DELIVERY]: [17.44, 'Monday 11/9 by 8:00 PM'],
            [STANDARD_OVERNIGHT]: [42.80, 'Monday 11/9 by 8:00 PM'],
        },
    }), HOME_DELIVERY);
});

test('2-day: Home Delivery arriving Saturday from Wednesday is 3 days, so FedEx 2Day wins', async () => {
    assert.equal(await shop({
        today: [2026, 10, 4],
        requested: '2-Day Delivery (Fri, Nov 6, 2026)',
        quotes: {
            [HOME_DELIVERY]: [17.44, 'Saturday 11/7 by 11:59 PM'],
            [TWO_DAY]: [31.20, 'Friday 11/6 by 8:00 PM'],
        },
    }), TWO_DAY);
});

test('Saturday processing does not subtract today as a weekend day', async () => {
    assert.equal(await shop({
        today: [2026, 10, 7],
        requested: 'Next Day Delivery (Mon, Nov 9, 2026)',
        quotes: {
            [HOME_DELIVERY]: [17.44, 'Tuesday 11/10 by 8:00 PM'],
            [STANDARD_OVERNIGHT]: [42.80, 'Monday 11/9 by 8:00 PM'],
        },
    }), STANDARD_OVERNIGHT);
});

test('a January estimate seen in December counts into next year', async () => {
    assert.equal(await shop({
        today: [2026, 11, 30],
        requested: 'Next Day Delivery (Thu, Dec 31, 2026)',
        quotes: {
            [HOME_DELIVERY]: [17.44, 'Monday 1/4 by 8:00 PM'],
            [TWO_DAY]: [31.20, 'Monday 1/4 by 8:00 PM'],
            [STANDARD_OVERNIGHT]: [42.80, 'Thursday 12/31 by 8:00 PM'],
        },
    }), STANDARD_OVERNIGHT);
});

test('the November daylight-saving change does not add a delivery day', async () => {
    // Friday Oct 30 -> Tuesday Nov 3, 2026 spans the Nov 1 DST change; FedEx 2Day is 2 days.
    // Counting an extra day here left no qualifying service at all.
    assert.equal(await shop({
        today: [2026, 9, 30],
        requested: '2-Day Delivery (Tue, Nov 3, 2026)',
        quotes: {
            [HOME_DELIVERY]: [17.44, 'Wednesday 11/4 by 8:00 PM'],
            [TWO_DAY]: [31.20, 'Tuesday 11/3 by 8:00 PM'],
        },
    }), TWO_DAY);
});
