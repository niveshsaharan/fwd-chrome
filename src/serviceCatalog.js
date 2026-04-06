window.FWD = window.FWD || {};
window.FWD.serviceCatalog = (function () {

    var PACKAGE_NAMES = {
        1: 'Large Envelope or Flat',
        3: 'Package',
        502: 'FedEx One Rate Large Box',
        503: 'FedEx One Rate Extra Large Box',
        505: 'FedEx One Rate® Pak',
    };

    var RAW_ENTRIES = [
        { id: 'amazon_shipping_ground_package', carrier: 'Amazon Shipping', service: 'Amazon Shipping Ground(On and Off Amazon)', packageId: 3 },
        { id: 'dhl_express_express_worldwide_package', carrier: 'DHL', service: 'DHL Express Express Worldwide', packageId: 3 },
        { id: 'dhl_parcel_international_direct_ddu_package', carrier: 'DHL', service: 'DHL Parcel International Direct – DDU', packageId: 3 },
        { id: 'dhl_sm_parcel_expedited_max_package', carrier: 'DHL', service: 'DHL SM Parcel Expedited Max', packageId: 3 },
        { id: 'dhl_smartmail_parcel_plus_expedited_package', carrier: 'DHL', service: 'DHL SmartMail Parcel Plus Expedited', packageId: 3 },
        { id: 'fedex_2day_package', carrier: 'FedEx', service: 'FedEx 2Day®', packageId: 3 },
        { id: 'fedex_2day_one_rate_pak', carrier: 'FedEx', service: 'FedEx 2Day®', packageId: 505 },
        { id: 'fedex_2day_one_rate_large_box', carrier: 'FedEx', service: 'FedEx 2Day®', packageId: 502 },
        { id: 'fedex_2day_one_rate_extra_large_box', carrier: 'FedEx', service: 'FedEx 2Day®', packageId: 503 },
        { id: 'fedex_express_saver_one_rate_pak', carrier: 'FedEx', service: 'FedEx Express Saver', packageId: 505 },
        { id: 'fedex_express_saver_one_rate_large_box', carrier: 'FedEx', service: 'FedEx Express Saver', packageId: 502 },
        { id: 'fedex_express_saver_one_rate_extra_large_box', carrier: 'FedEx', service: 'FedEx Express Saver', packageId: 503 },
        { id: 'fedex_ground_economy_parcel_select_package', carrier: 'FedEx', service: 'FedEx Ground Economy Parcel Select', packageId: 3 },
        { id: 'fedex_ground_package', carrier: 'FedEx', service: 'FedEx Ground®', packageId: 3 },
        { id: 'fedex_home_delivery_package', carrier: 'FedEx', service: 'FedEx Home Delivery®', packageId: 3 },
        { id: 'fedex_international_connect_plus_package', carrier: 'FedEx', service: 'FedEx International Connect Plus', packageId: 3 },
        { id: 'fedex_international_economy_package', carrier: 'FedEx', service: 'FedEx International Economy', packageId: 3 },
        { id: 'fedex_international_priority_package', carrier: 'FedEx', service: 'FedEx International Priority', packageId: 3 },
        { id: 'fedex_priority_overnight_package', carrier: 'FedEx', service: 'FedEx Priority Overnight', packageId: 3 },
        { id: 'fedex_smartpost_parcel_select_package', carrier: 'FedEx', service: 'FedEx SmartPost Parcel Select', packageId: 3 },
        { id: 'fedex_standard_overnight_package', carrier: 'FedEx', service: 'FedEx Standard Overnight®', packageId: 3 },
        { id: 'ontrac_ground_service_package', carrier: 'OnTrac', service: 'OnTrac Ground Service', packageId: 3 },
        { id: 'ups_ground_package', carrier: 'UPS', service: 'UPS® Ground (UPS)', packageId: 3 },
        { id: 'ups_ground_saver_package', carrier: 'UPS', service: 'UPS Ground Saver', packageId: 3 },
        { id: 'ups_ground_shipstation_package', carrier: 'UPS', service: 'UPS® Ground (UPS by ShipStation)', packageId: 3 },
        { id: 'usps_first_class_mail_intl_package', carrier: 'USPS', service: 'USPS First Class Mail Intl', packageId: 3 },
        { id: 'usps_ground_advantage_package', carrier: 'USPS', service: 'USPS Ground Advantage', packageId: 3 },
        { id: 'usps_priority_mail_package', carrier: 'USPS', service: 'USPS Priority Mail', packageId: 3 },
        { id: 'usps_priority_mail_large_envelope_or_flat', carrier: 'USPS', service: 'USPS Priority Mail', packageId: 1 },
        { id: 'usps_priority_mail_intl_package', carrier: 'USPS', service: 'USPS Priority Mail Intl', packageId: 3 },
    ];

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function compareAlpha(a, b) {
        return a.toLowerCase().localeCompare(b.toLowerCase());
    }

    function makeEntryKey(service, packageId) {
        return String(service) + '___' + String(packageId);
    }

    function buildEntries() {
        var duplicates = {};

        RAW_ENTRIES.forEach(function (entry) {
            var duplicateKey = entry.carrier + '___' + entry.service;
            duplicates[duplicateKey] = (duplicates[duplicateKey] || 0) + 1;
        });

        return RAW_ENTRIES.map(function (entry) {
            var packageName = entry.package || PACKAGE_NAMES[entry.packageId] || 'Package';
            var duplicateKey = entry.carrier + '___' + entry.service;
            var label = duplicates[duplicateKey] > 1
                ? entry.service + ' (' + packageName + ')'
                : entry.service;

            return {
                id: entry.id,
                carrier: entry.carrier,
                service: entry.service,
                packageId: entry.packageId,
                package: packageName,
                label: label,
            };
        });
    }

    var ENTRIES = buildEntries();
    var ENTRY_BY_ID = {};
    var ENTRY_BY_SERVICE_PACKAGE = {};

    ENTRIES.forEach(function (entry) {
        ENTRY_BY_ID[entry.id] = entry;
        ENTRY_BY_SERVICE_PACKAGE[makeEntryKey(entry.service, entry.packageId)] = entry;
    });

    function getEntries() {
        return ENTRIES.map(clone);
    }

    function getEntry(service, packageId) {
        var entry = ENTRY_BY_SERVICE_PACKAGE[makeEntryKey(service, packageId)];
        return entry ? clone(entry) : null;
    }

    function attachServiceMeta(service) {
        var entry = ENTRY_BY_SERVICE_PACKAGE[makeEntryKey(service.service, service.packageId)];

        if (!entry) {
            throw new Error('Missing service catalog entry for ' + service.service + ' / ' + service.packageId);
        }

        service.toggleId = entry.id;
        service.carrier = entry.carrier;
        service.package = entry.package;
        service.label = entry.label;

        return service;
    }

    function getDefaultEnabledServices() {
        var defaults = {};

        ENTRIES.forEach(function (entry) {
            defaults[entry.id] = true;
        });

        return defaults;
    }

    function normalizeEnabledServices(enabledServices) {
        var normalized = getDefaultEnabledServices();

        if (!enabledServices || typeof enabledServices !== 'object') {
            return normalized;
        }

        Object.keys(normalized).forEach(function (id) {
            if (typeof enabledServices[id] === 'boolean') {
                normalized[id] = enabledServices[id];
            }
        });

        return normalized;
    }

    function isServiceEnabled(toggleId, enabledServices) {
        if (!toggleId || !enabledServices || typeof enabledServices !== 'object') {
            return true;
        }

        return enabledServices[toggleId] !== false;
    }

    function getGroupedEntries() {
        var groups = {};

        ENTRIES.forEach(function (entry) {
            groups[entry.carrier] = groups[entry.carrier] || [];
            groups[entry.carrier].push(clone(entry));
        });

        return Object.keys(groups).sort(compareAlpha).map(function (carrier) {
            return {
                carrier: carrier,
                services: groups[carrier].sort(function (left, right) {
                    return compareAlpha(left.label, right.label);
                }),
            };
        });
    }

    return {
        PACKAGE_NAMES: PACKAGE_NAMES,
        getEntries: getEntries,
        getEntry: getEntry,
        attachServiceMeta: attachServiceMeta,
        getDefaultEnabledServices: getDefaultEnabledServices,
        normalizeEnabledServices: normalizeEnabledServices,
        isServiceEnabled: isServiceEnabled,
        getGroupedEntries: getGroupedEntries,
    };
})();
