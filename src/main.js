(function ($, config, ui, engine, serviceCatalog) {

    if (typeof Backbone === 'undefined') { console.error('Backbone not found.'); return; }

    var settings = {
        enabled: false,
        autorun: false,
        skipAlreadySelected: true,
        enabledServices: serviceCatalog.getDefaultEnabledServices(),
    };

    function onSettingChanged(s) {
        Object.keys(s).forEach(function (k) {
            if (k === 'enabledServices') {
                settings.enabledServices = serviceCatalog.normalizeEnabledServices(s.enabledServices);
                return;
            }

            settings[k] = s[k];
        });
    }

    window.postMessage({ type: 'GET_SETTINGS' }, '*');

    window.addEventListener('message', function (e) {
        if (e.source !== window) return;
        if (e.data.type === 'SETTINGS_RESPONSE') onSettingChanged(e.data.settings);
        if (e.data.type === 'SETTING_CHANGED') onSettingChanged(e.data.changes);
    });

    function isActive() { return !window.fwdPaused && settings.enabled; }

    function clickGetQuote() {
        var $c = ui.getContainer();
        var dims = ui.getDimensions($c);

        if (settings.skipAlreadySelected && engine.skipAlreadySelectedDirectSelection(settings.enabledServices)) {
            return;
        }

        if (dims.length && dims.width && dims.height &&
            !engine.hasMappingForSize(dims.length, dims.width, dims.height, settings.enabledServices)) {
            engine.logger('No enabled services for size — skipping Get Quote.');
            ui.clearCheapest(false);
            ui.removeWip();
            return;
        }

        if ($c) { engine.logger('Clicking Get Quote...'); $c.find('.get-quote').click(); }
        ui.clearCheapest(true);
    }

    $(document).on('click', '#orderlist-body tr', function () {
        if ($('#orderlist-body tr[data-ss-selected="1"]').length <= 1) {
            if (settings.autorun) setTimeout(clickGetQuote, 1000);
            ui.clearCheapest(settings.autorun);
        }
    });

    $(document).ajaxSend(function (event, xhr, options) {
        if (!isActive()) return;

        if ($('.input-group.spinner').length && $('.input-group.spinner').find('[type="number"]').length) {
            $('.input-group.spinner').find('[type="number"]').unbind('change').change(function () {
                if ($('.form-group.shipping-rate').length && !$('.form-group.shipping-rate .processing-icon').length) {
                    //clickGetQuote()
                    ui.showProcessing();
                }
            });
        }

        $(window).unbind('keydown').keydown(function (e) {
            if (e.ctrlKey && e.which >= 48 && e.which <= 57) {
                if ($('.form-group.shipping-rate').length && !$('.form-group.shipping-rate .processing-icon').length) {
                   // clickGetQuote()
                    ui.showProcessing();
                }
            }
        });

        if (options.url.endsWith('/api/orders/updaterates')) {
            ui.showProcessing();
            var data = JSON.parse(options.data);
            if (data.lowPriority) { data.lowPriority = false; options.data = JSON.stringify(data); }
        }
    });

    $(document).ajaxSuccess(function (event, xhr, options, data) {
        if (!isActive()) {
            if (!settings.autorun) ui.clearCheapest(false);
            return;
        }

        var $c = ui.getContainer();
        var dims = ui.getDimensions($c);

        if (options.url.endsWith('/api/shipments/costsummary')) {
            if ($('.quick-ship form input[name="HeightIn"]').val() === '') {
                $('.quick-ship form input[name="HeightIn"]').val('0').change();
            }
            return;
        }

        if (options.url.endsWith('/api/orders/updaterates')) {
            var requestData = JSON.parse(options.data);
            if (data.final) {
                engine.logger('HP response', requestData, data);
            } else {
                engine.logger('LP response', requestData, data);
            }
            if (!isActive()) { if (!settings.autorun) ui.clearCheapest(false); return; }
            ui.clearCheapest(true);
            engine.rateShop(requestData, data, settings.enabledServices, {
                skipAlreadySelected: settings.skipAlreadySelected,
            });
            return;
        }

        if (options.url.endsWith('/api/orders/BulkUpdate')) {
            if (!isActive()) { if (!settings.autorun) ui.clearCheapest(false); return; }
            ui.clearCheapest(true);
            if (!dims.length || !dims.width || !dims.height ||
                !engine.hasMappingForSize(dims.length, dims.width, dims.height, settings.enabledServices)) {
                engine.logger('No mapping — skipping.');
                ui.removeWip(true);
                return;
            }
            clickGetQuote();
            return;
        }

        if (options.url.includes('/api/shipments/List?orderID=')) {
            if (!isActive()) { if (!settings.autorun) ui.clearCheapest(false); return; }
            if (!dims.length || !dims.width || !dims.height ||
                !engine.hasMappingForSize(dims.length, dims.width, dims.height, settings.enabledServices)) {
                engine.logger('No mapping — skipping.');
                ui.removeWip(true);
                ui.clearCheapest(false);
                return;
            }
            ui.clearCheapest(true);
            clickGetQuote();
            return;
        }

        if ($c.find('[data-role="service-name"]').html() !== undefined ||
            $('.order-drawer').find('[data-role="service-name"]').html() !== undefined) {
            ui.hideProcessing();
        }
    });

})(Backbone.$, window.FWD.config, FWD.ui, FWD.engine, FWD.serviceCatalog);
