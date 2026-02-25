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

    $('head').append(STYLES);

    function getContainer() {
        return $('.modal.order-detail').length ? $('.modal.order-detail') : $('#order-drawer');
    }

    function setWip() {
        $('html').addClass('ss-fwd-wip');
        getContainer().addClass('ss-wip');
        if (!$('#ship-plus-wip').length) {
            $('.ship-details .ship-general').append('<div id="ship-plus-wip" class="form-group">' + WIP_LABEL + '</div>');
        } else {
            $('#ship-plus-wip').html(WIP_LABEL);
        }
    }

    function removeWip() {
        $('html').removeClass('ss-fwd-wip');
        getContainer().removeClass('ss-wip');
        document.querySelectorAll('#ship-plus-wip').forEach(function (n) { n.remove(); });
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
        clearCheapest: clearCheapest,
        showCheckmark: showCheckmark,
        showProcessing: showProcessing,
        hideProcessing: hideProcessing,
        showCheapestBanner: showCheapestBanner,
        getDimensions: getDimensions,
        currentlyViewingSameOrder: currentlyViewingSameOrder,
    };

})(Backbone.$);