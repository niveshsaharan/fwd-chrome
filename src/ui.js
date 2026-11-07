window.FWD = window.FWD || {};
FWD.ui = (function ($) {

    var STYLES = '<style>' +
        '.ss-wip .btn-group.ship-btn-group a.btn-success,' +
        '.ss-wip .quick-ship-on .btn-group.ship-btn-group a.btn-success{' +
        '  background-color:#c0c0c0!important;cursor:not-allowed!important;border-color:#909090!important;}' +
        '.ss-wip .btn-group.ship-btn-group a.quickship-toggle,' +
        '.ss-wip .quick-ship-on .btn-group.ship-btn-group a.quickship-toggle{' +
        '  border-left:1px solid #909090!important;}' +
        '.ss-fwd-wip #order-grid{pointer-events:none!important;cursor:wait!important;}' +
        '</style>';

    var WIP_LABEL = '<label class="control-label col-sm-3">Shipping+</label>' +
        '<div class="col-sm-9" style="padding:7px 9px;"><span>working...</span></div>';

    // While WIP is shown, clicks on the open order's ship button group (Create
    // Label and its options) are cancelled before ShipStation sees them, so a
    // label cannot be created from a half-finished selection.
    var SHIP_LOCK_SELECTOR = '.ss-wip .btn-group.ship-btn-group';

    // Safety net: if nothing renews or clears WIP for this long (a hung rate
    // request, a flow that never finishes), unlock instead of staying stuck.
    var WIP_TIMEOUT_MS = 20000;
    var wipTimer = null;

    $('head').append(STYLES);

    window.addEventListener('click', function (event) {
        var target = event.target;
        if (!target || typeof target.closest !== 'function' || !target.closest(SHIP_LOCK_SELECTOR)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        console.log('%cCreate Label is locked until FWD finishes working.', 'color:#ff8000;');
    }, true);

    function getContainer() {
        return $('.modal.order-detail').length ? $('.modal.order-detail') : $('#order-drawer');
    }

    function armWipTimeout() {
        clearTimeout(wipTimer);
        wipTimer = setTimeout(function () {
            wipTimer = null;
            console.warn('FWD still working after ' + (WIP_TIMEOUT_MS / 1000) + 's; unlocking Create Label.');
            hideProcessing();
            removeWip();
        }, WIP_TIMEOUT_MS);
    }

    function setWip() {
        $('html').addClass('ss-fwd-wip');
        getContainer().addClass('ss-wip');
        if (!$('#ship-plus-wip').length) {
            $('.ship-details .ship-general').append('<div id="ship-plus-wip" class="form-group">' + WIP_LABEL + '</div>');
        } else {
            $('#ship-plus-wip').html(WIP_LABEL);
        }
        armWipTimeout();
    }

    function removeWip() {
        clearTimeout(wipTimer);
        wipTimer = null;
        $('html').removeClass('ss-fwd-wip');
        // Every container, not just the current one, so a lock cannot linger on a drawer or modal that is no longer active.
        $('.ss-wip').removeClass('ss-wip');
        document.querySelectorAll('#ship-plus-wip').forEach(function (n) { n.remove(); });
    }

    // Renews the safety-net timeout while a long rate-shop is still making progress.
    function keepWipAlive() {
        if (wipTimer) armWipTimeout();
    }

    function clearCheapest(showWip) {
        $('#cheapest-service').remove();
        $('#cheapest-service-icon').remove();
        if (showWip) setWip(); else removeWip();
    }

    function showCheckmark(container) {
        $('#cheapest-service-icon').remove();
        container.find('.get-quote').after(
            '<a id="cheapest-service-icon" style="vertical-align:bottom;margin-left:5px;">' +
            ' <i class="icon-check text-success" style="font-size:20px;"></i></a>'
        );
    }

    function showProcessing() {
        $('.col-sm-9.form-control-static').hide();
        $('.rating').find('.processing-icon').remove();
        setWip();
        $('.form-group.shipping-rate').append(
            '<div class="processing-icon" style="height:30px;width:30px;margin-left:100px;margin-bottom:10px;">' +
            '<img style="max-width:100%;max-height:100%;margin:auto;display:block;" ' +
            'src="https://media.giphy.com/media/sSgvbe1m3n93G/giphy.gif"></div>'
        );
    }

    function hideProcessing() {
        $('.rating').find('.processing-icon').remove();
        $('.col-sm-9.form-control-static').show();
    }

    function showCheapestBanner(container, service) {
        container.find('.shipping-rate').after(
            '<fieldset class="rating" id="cheapest-service">' +
            '<div class="form-group"><label class="control-label col-sm-3">Cheapest</label>' +
            '<div class="col-sm-9" style="color:#6ba03a;padding:7px 9px;">' +
            '<span>$' + parseFloat(service.price).toFixed(2) + ' (' + service.service + ', ' + service.package +
            ', ' + (service.length || service.order.Length) + 'x' + (service.width || service.order.Width) +
            'x' + (service.height || service.order.Height) + ')</span></div></div></fieldset>'
        );
    }

    function getDimensions(container) {
        return {
            length: container.find('[name="LengthIn"]').val(),
            width:  container.find('[name="WidthIn"]').val(),
            height: container.find('[name="HeightIn"]').val(),
        };
    }

    function readValue(container, selectors) {
        for (var i = 0; i < selectors.length; i++) {
            var node = container.find(selectors[i]).first();
            if (!node.length) continue;

            var value = node.val();
            if (value == null || value === '') value = node.text();
            value = (value == null) ? '' : String(value).trim();
            if (value) return value;
        }
        return '';
    }

    function getCurrentShipmentState(container) {
        container = container || getContainer();

        return {
            StoreName: readValue(container, [
                '[name="StoreName"]',
                '[name="storeName"]',
                '[data-role="store-name"]',
            ]),
            RequestedShippingService: readValue(container, [
                '[name="RequestedShippingService"]',
                '[name="requestedShippingService"]',
                '[name="RequestedService"]',
                '[data-role="requested-service"]',
            ]),
            ServiceID: readValue(container, ['[name="ServiceID"]']),
            RequestedPackageTypeID: readValue(container, ['[name="RequestedPackageTypeID"]']),
            ProviderID: readValue(container, ['[name="ProviderID"]']),
            CarrierID: readValue(container, ['[name="CarrierID"]']),
            Length: readValue(container, ['[name="LengthIn"]']),
            Width: readValue(container, ['[name="WidthIn"]']),
            Height: readValue(container, ['[name="HeightIn"]']),
            SellerProviderID: container.find('select.billToSelect option:selected').data('sellerproviderid'),
        };
    }

    function currentlyViewingSameOrder(orderNumber) {
        var text = (($('.modal.order-detail .order-num a').text() ||
            $('.modal.order-detail .order-num').text() ||
            $('#order-drawer .order-title h2').text()) || '').trim();
        var same = !!(text && orderNumber && text.includes(orderNumber));
        if (!same) console.error('Viewing ' + text + ' but response was for Order: ' + orderNumber);
        return same;
    }

    return {
        getContainer: getContainer,
        setWip: setWip,
        removeWip: removeWip,
        keepWipAlive: keepWipAlive,
        clearCheapest: clearCheapest,
        showCheckmark: showCheckmark,
        showProcessing: showProcessing,
        hideProcessing: hideProcessing,
        showCheapestBanner: showCheapestBanner,
        getDimensions: getDimensions,
        getCurrentShipmentState: getCurrentShipmentState,
        currentlyViewingSameOrder: currentlyViewingSameOrder,
    };

})(Backbone.$);
