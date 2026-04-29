window.FWD = window.FWD || {};
window.FWD.config = (function (serviceCatalog) {

    var CONDITIONS = {
        residential:    function (d) { return d.ResidentialIndicator === 'R'; },
        not_residential:function (d) { return d.ResidentialIndicator !== 'R'; },
        commercial:     function (d) { return d.ResidentialIndicator === 'C'; },
        not_commercial: function (d) { return d.ResidentialIndicator !== 'C'; },
        international:  function (d) { return d.ShipCountryCode !== 'US'; },
        domestic:       function (d) { return d.ShipCountryCode === 'US'; },
        shipto:         function (d, v) { return v.includes(d.ShipCountryCode); },
        not_service_60: function (d) { return d.RequestedShippingServiceID !== 60; },
        dims_present:   function (d) { return !!(d.Length && d.Width && d.Height); },
        service_in:     function (d, v) { return v.includes(d.RequestedShippingService); },
        service_has:    function (d, v) {
            var s = (d.RequestedShippingService || '').toLowerCase();
            return v.some(function (x) { return s.includes(String(x).toLowerCase()); });
        },
        service_lacks:  function (d, v) {
            var s = (d.RequestedShippingService || '').toLowerCase();
            return !v.some(function (x) { return s.includes(String(x).toLowerCase()); });
        },
        store_has:      function (d, v) {
            var s = (d.StoreName || '').toLowerCase();
            return v.some(function (x) { return s.includes(String(x).toLowerCase()); });
        },
        store_lacks:    function (d, v) {
            var s = (d.StoreName || '').toLowerCase();
            return !v.some(function (x) { return s.includes(String(x).toLowerCase()); });
        },
        weight_oz_between: function (d, min, max) {
            return d.Weight >= min && d.Weight <= max && d.WeightUnitOfMeasure === 'Ounce';
        },
    };

    function cond(fn) {
        return { 'function': fn, args: Array.prototype.slice.call(arguments, 1) };
    }

    function evaluate(condition, order) {
        if (typeof condition === 'string') return CONDITIONS[condition](order);
        if (condition && condition['function']) return CONDITIONS[condition['function']](order, ...condition.args);
        return true;
    }

    var NOT60                 = 'not_service_60';
    var NO_PREM               = cond('service_lacks', ['premium shipping']);
    var NO_PREM_EXP           = cond('service_lacks', ['premium shipping', 'expedited']);
    var NO_AMAZON_EXPEDITED   = cond('service_lacks', ['premium shipping', 'expedited', '2-day', '2 day', 'next day', 'next-day', 'overnight']);
    var NEXT_DAY              = cond('service_has', ['next day delivery']);
    var RES                   = 'residential';
    var NOT_RES               = 'not_residential';
    var DOMESTIC              = 'domestic';
    var NOT_WALMART_STORE     = cond('store_lacks', ['walmart']);

    var PKG_NAMES = {
        3: 'Package', 1: 'Large Envelope or Flat',
        505: 'FedEx One Rate® Pak', 502: 'FedEx One Rate Large Box', 503: 'FedEx One Rate Extra Large Box',
    };

    var TEMPLATES = {
        uspsPriority:      { service: 'USPS Priority Mail',                  serviceId: 13,    packageId: 3,   providerId: 2,   carrierId: 1,   conditions: [NOT60] },
        uspsGround:        { service: 'USPS Ground Advantage',               serviceId: 3512,  packageId: 3,   providerId: 2,   carrierId: 1,   conditions: [NOT60, NO_PREM] },
        ontrac:            { service: 'OnTrac Ground Service',               serviceId: 124,   packageId: 3,   providerId: 14,  carrierId: 14,  conditions: [NOT60, NO_PREM] },
        upsGroundSaver:    { service: 'UPS Ground Saver',                    serviceId: 10391, packageId: 3,   providerId: 103, carrierId: 3,   conditions: [NOT60, NO_PREM] },
        amazonShippingUs:  { service: 'Amazon Shipping Ground(On and Off Amazon)',                  serviceId: 6747,  packageId: 3,   providerId: 81,  carrierId: 80,  conditions: [DOMESTIC, NOT60, NO_AMAZON_EXPEDITED, NOT_WALMART_STORE] },
        fedexGroundEcon:   { service: 'FedEx Ground Economy Parcel Select',  serviceId: 1925,  packageId: 3,   providerId: 194, carrierId: 194, conditions: [NOT60, NO_PREM] },
        fedexSmartPost:    { service: 'FedEx SmartPost Parcel Select',       serviceId: 66,    packageId: 3,   providerId: 4,   carrierId: 4,   conditions: [NOT60, NO_PREM] },
        dhlSmartMail:      { service: 'DHL SmartMail Parcel Plus Expedited', serviceId: 74,    packageId: 3,   providerId: 6,   carrierId: 7,   conditions: [NOT60, NO_PREM_EXP] },
        dhlSmMax:          { service: 'DHL SM Parcel Expedited Max',         serviceId: 8346,  packageId: 3,   providerId: 6,   carrierId: 7,   conditions: [NOT60, NO_PREM_EXP, cond('weight_oz_between', 0, 16)] },
        fedexHome:         { service: 'FedEx Home Delivery®',                serviceId: 51,    packageId: 3,   providerId: 4,   carrierId: 4,   conditions: [RES, NOT60] },
        fedexGround:       { service: 'FedEx Ground®',                       serviceId: 50,    packageId: 3,   providerId: 4,   carrierId: 4,   conditions: [NOT_RES, NOT60] },
        fedexStdOvernight: { service: 'FedEx Standard Overnight®',           serviceId: 55,    packageId: 3,   providerId: 4,   carrierId: 4,   conditions: [NOT60, NEXT_DAY] },
        fedexPriOvernight: { service: 'FedEx Priority Overnight',            serviceId: 56,    packageId: 3,   providerId: 4,   carrierId: 4,   conditions: [NEXT_DAY] },
        fedex2Day:         { service: 'FedEx 2Day®',                         serviceId: 52,    packageId: 3,   providerId: 4,   carrierId: 4,   conditions: [NOT60] },
        fedex2DayPak:      { service: 'FedEx 2Day®',                         serviceId: 52,    packageId: 505, providerId: 4,   carrierId: 4,   conditions: [NOT60] },
        fedexExpSaverPak:  { service: 'FedEx Express Saver',                 serviceId: 54,    packageId: 505, providerId: 4,   carrierId: 4,   conditions: [NOT60] },
        upsGround:         { service: 'UPS® Ground (UPS)',                   serviceId: 26,    packageId: 3,   providerId: 3,   carrierId: 3,   conditions: [NOT60] },
        upsGroundSS:       { service: 'UPS® Ground (UPS by ShipStation)',    serviceId: 10301, packageId: 3,   providerId: 103, carrierId: 3,   conditions: [NOT60] },
    };

    function svc(key, l, w, h, overrides) {
        var t = TEMPLATES[key];
        if (!t) throw new Error('Unknown template: ' + key);
        var s = JSON.parse(JSON.stringify(t));
        s.package = PKG_NAMES[s.packageId] || 'Package';
        s.length = (l != null) ? l : null;
        s.width  = (w != null) ? w : null;
        s.height = (h != null) ? h : null;
        if (overrides) {
            Object.keys(overrides).forEach(function (k) { s[k] = overrides[k]; });
            if (overrides.packageId) s.package = PKG_NAMES[overrides.packageId] || s.package;
            if (overrides.package) s.package = overrides.package;
        }

        return serviceCatalog.attachServiceMeta(s);
    }

    // ========== STORE-SPECIFIC RULES ==========
    // When a store+requestedService combo matches a rule, ONLY the listed
    // services are eligible (normal rate-shop is skipped entirely).
    // `match` is compared case-insensitively against RequestedShippingService.
    // `services` is the array of service objects to use instead.
    var STORE_RULES = {
        'Michaels': [
            {
                match: 'ups ground',
                exact: true,
                services: [svc('upsGround', undefined, undefined, undefined, {toggleId: 'michaels_ups_ground_package', sellerProviderId: 1650146, providerId: 3, accountType: 'other-account'})],
            },
            {
                match: 'ups ground saver',
                exact: true,
                services: [svc('upsGroundSaver', undefined, undefined, undefined, {sellerProviderId: 1650146, providerId: 3, accountType: 'other-account'})],
            },
        ],
    };

    function getStoreOverride(storeName, requestedService) {
        var rules = STORE_RULES[storeName];
        if (!rules) return null;
        var req = (requestedService || '').toLowerCase().trim();
        for (var i = 0; i < rules.length; i++) {
            var rule = rules[i];
            var matchVal = rule.match.toLowerCase();
            var matched = rule.exact ? (req === matchVal) : req.includes(matchVal);
            if (matched) return rule.services.map(function (s) { return JSON.parse(JSON.stringify(s)); });
        }
        return null;
    }

    var WHEN_CHEAPEST = {
        '9x12x1':  { packageId: 1, 'package': 'Large Envelope or Flat', length: 12, width: 9,  height: 0 },
        '12x15x1': { packageId: 1, 'package': 'Large Envelope or Flat', length: 15, width: 12, height: 0 },
        '14x12x3': { packageId: 1, 'package': 'Large Envelope or Flat', length: 17, width: 14, height: 0 },
        '15x12x3': { packageId: 1, 'package': 'Large Envelope or Flat', length: 19, width: 15, height: 0 },
    };

    function standardSet(l, w, h, opts) {
        opts = opts || {};
        var key = l + 'x' + w + 'x' + h;
        var list = [];

        var pm = svc('uspsPriority', l, w, h);
        if (WHEN_CHEAPEST[key]) pm.when_cheapest = JSON.parse(JSON.stringify(WHEN_CHEAPEST[key]));
        list.push(pm);

        list.push(svc('uspsGround'), svc('ontrac'), svc('upsGroundSaver'), svc('amazonShippingUs'));
        list.push(svc('fedexGroundEcon'), svc('fedexSmartPost'));
        list.push(svc('dhlSmartMail'), svc('dhlSmMax'));

        list.push(svc('fedexHome', l, w, h));

        if (opts.oneRatePak) {
            list.push(svc('fedex2DayPak', l, w, h));
            list.push(svc('fedexExpSaverPak', l, w, h));
        } else {
            list.push(svc('fedex2Day', l, w, h));
        }

        list.push(svc('fedexGround', l, w, h));
        list.push(svc('fedexStdOvernight', l, w, h));
        list.push(svc('fedexPriOvernight'));
        list.push(svc('upsGround', l, w, h));
        list.push(svc('upsGroundSS', l, w, h));

        return list;
    }

    function intlSvc(service, serviceId, providerId, carrierId, conds) {
        return serviceCatalog.attachServiceMeta({ service: service, serviceId: serviceId, 'package': 'Package', packageId: 3,
            length: null, width: null, height: null, providerId: providerId, carrierId: carrierId,
            conditions: conds });
    }

    function buildInternational() {
        return [
            intlSvc('DHL Parcel International Direct – DDU', 166, 6, 7, [
                cond('service_has', ['International Economy Shipping', 'Free Standard Shipping - Canada',
                    'Standard Shipping - Canada', 'Premium Shipping - Canada', 'Standard Shipping', 'Premium Shipping']),
                cond('shipto', ['CA']),
            ]),
            intlSvc('FedEx International Priority', 60, 4, 4, [
                cond('service_in', ['FedEx International Priority']),
            ]),
            intlSvc('FedEx International Connect Plus', 4011, 4, 4, [
                cond('service_has', ['International Economy Shipping', 'International Expedited Shipping']),
            ]),
            intlSvc('FedEx International Economy', 59, 4, 4, [
                cond('service_has', ['International Economy Shipping', 'International Expedited Shipping']),
            ]),
            intlSvc('USPS First Class Mail Intl', 17, 2, 1, [
                'dims_present', cond('service_has', ['Standard Shipping - Canada', 'International Economy Shipping']),
            ]),
            intlSvc('USPS Priority Mail Intl', 16, 2, 1, [
                'dims_present', cond('service_has', ['Standard Shipping - Canada']),
            ]),
            intlSvc('FedEx International Economy', 59, 4, 4, [
                'dims_present', cond('service_has', ['Standard Shipping - Canada']),
            ]),
            intlSvc('FedEx International Connect Plus', 4011, 4, 4, [
                'dims_present', cond('service_has', ['Standard Shipping - Canada']),
            ]),
            intlSvc('FedEx International Priority', 60, 4, 4, [
                'dims_present', cond('service_has', ['Expedited Shipping - Canada']),
            ]),
            intlSvc('FedEx International Economy', 59, 4, 4, [
                'dims_present', cond('service_has', ['Premium Shipping - Canada']),
            ]),
            intlSvc('FedEx International Connect Plus', 4011, 4, 4, [
                'dims_present', cond('service_has', ['Premium Shipping - Canada']),
            ]),
            intlSvc('DHL Express Express Worldwide', 148, 13, 5, ['international']),
        ];
    }

    function buildMappings() {
        var m = {};

        m['2x2x2'] = [
            svc('fedex2DayPak', 2, 2, 2), svc('fedexGround', 2, 2, 2),
            svc('dhlSmartMail'), svc('fedexStdOvernight', 2, 2, 2), svc('fedexPriOvernight'),
            svc('fedexHome', 2, 2, 2), svc('upsGround', 2, 2, 2), svc('upsGroundSS', 2, 2, 2),
        ];

        [[9,12,1], [12,15,1]].forEach(function (d) {
            m[d.join('x')] = standardSet(d[0], d[1], d[2], { oneRatePak: true });
        });

        [[14,12,3], [15,12,3]].forEach(function (d) {
            m[d.join('x')] = standardSet(d[0], d[1], d[2]);
        });

        var largeDims = [
            [60,4,4],[60,6,6],[60,8,8],[60,10,10],[60,12,12],
            [20,12,3],[20,12,4],[20,12,6],[20,12,8],
            [20,12,10],[20,12,12],[20,12,16],[20,12,20],
        ];
        largeDims.forEach(function (d) {
            var key = d.join('x');
            var services = standardSet(d[0], d[1], d[2]);

            if (['20x12x3','20x12x4','20x12x6'].includes(key)) {
                services.forEach(function (sv) {
                    if (sv.serviceId === 8346) {
                        sv.conditions.push(cond('service_lacks', ['free', 'standard shipping']));
                    }
                });
            }

            services.forEach(function (sv) {
                sv.length = d[0]; sv.width = d[1]; sv.height = d[2];
            });

            m[key] = services;
        });

        var NOT_2DAY = cond('service_lacks', ['2-day', '2 day']);
        var HAS_2DAY = cond('service_has', ['2-day', '2 day']);

        m['20x12x4'].push(
            svc('fedexExpSaverPak', 20, 12, 4, { packageId: 502, conditions: [NOT60, NOT_2DAY] }),
            svc('fedex2DayPak', 20, 12, 4, { packageId: 502, conditions: [NOT60, HAS_2DAY] })
        );

        m['20x12x6'].push(
            svc('fedexExpSaverPak', 20, 12, 6, { packageId: 503, conditions: [NOT60, NOT_2DAY] }),
            svc('fedex2DayPak', 20, 12, 6, { packageId: 503, conditions: [NOT60, HAS_2DAY] })
        );

        m['***'] = buildInternational();

        Object.keys(m).forEach(function (size) {
            (m[size] || []).forEach(function (sv) {
                if (sv.when_cheapest) {
                    var wc = sv.when_cheapest;
                    var newKey = wc.length + 'x' + wc.width + 'x' + wc.height;
                    m[newKey] = m[newKey] || [];
                    var clone = JSON.parse(JSON.stringify(sv));
                    Object.keys(wc).forEach(function (k) { clone[k] = wc[k]; });
                    clone.custom = true;
                    serviceCatalog.attachServiceMeta(clone);
                    m[newKey].push(clone);
                }
            });
        });

        return m;
    }

    return {
        CONDITIONS:          CONDITIONS,
        STORE_RULES:         STORE_RULES,
        getStoreOverride:    getStoreOverride,
        COMMON_CONDITIONS:   [{ 'function': 'service_has', args: [['USPS Priority Mail']], eligible: { services: [13] } }],
        PRIORITY_MAP:        { 'FedEx 2Day®___FedEx Express Saver': 'FedEx 2Day®', 'FedEx Express Saver___FedEx 2Day®': 'FedEx 2Day®' },
        COMMON_FIELDS:       { BillToParty: null },
        CARRIER_FIELDS:      { 1: {} },
        EXCEPTION_DIMS:      ['2x2x2'],
        EXCEPTION_SERVICES:  ['2-day delivery', 'next day delivery'],
        buildMappings:       buildMappings,
        evaluate:            evaluate,
        cond:                cond,
        svc:                 svc,
    };
})(window.FWD.serviceCatalog);
