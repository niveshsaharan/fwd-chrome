document.addEventListener('DOMContentLoaded', function () {
    var serviceCatalog = window.FWD && window.FWD.serviceCatalog;
    var enabledCheckboxNode = document.getElementById('enabledCheckbox');
    var autorunCheckboxNode = document.getElementById('autorunCheckbox');
    var serviceGroupsNode = document.getElementById('serviceGroups');
    var state = {
        enabled: false,
        autorun: false,
        enabledServices: serviceCatalog.getDefaultEnabledServices(),
    };

    function renderServiceGroups() {
        serviceGroupsNode.innerHTML = '';

        function setTooltipDirection(infoNode) {
            var listRect = serviceGroupsNode.getBoundingClientRect();
            var infoRect = infoNode.getBoundingClientRect();
            var spaceAbove = infoRect.top - listRect.top;

            infoNode.classList.toggle('service-info-below', spaceAbove < 92);
        }

        serviceCatalog.getGroupedEntries().forEach(function (group) {
            var groupNode = document.createElement('div');
            var headerNode = document.createElement('div');
            var titleNode = document.createElement('h5');
            var countNode = document.createElement('span');
            var servicesNode = document.createElement('div');

            groupNode.className = 'carrier-group';
            headerNode.className = 'carrier-header';
            titleNode.className = 'carrier-title';
            titleNode.textContent = group.carrier;
            countNode.className = 'carrier-count';
            countNode.textContent = group.services.length + ' service' + (group.services.length === 1 ? '' : 's');
            servicesNode.className = 'carrier-services';
            headerNode.appendChild(titleNode);
            headerNode.appendChild(countNode);
            groupNode.appendChild(headerNode);

            group.services.forEach(function (service) {
                var itemNode = document.createElement('div');
                var checkboxNode = document.createElement('input');
                var labelNode = document.createElement('label');
                var infoNode = document.createElement('span');

                itemNode.className = 'setting-item service-setting';
                checkboxNode.type = 'checkbox';
                checkboxNode.className = 'service-checkbox';
                checkboxNode.id = 'service-' + service.id;
                checkboxNode.dataset.serviceId = service.id;
                checkboxNode.checked = serviceCatalog.isServiceEnabled(service.id, state.enabledServices);
                labelNode.setAttribute('for', checkboxNode.id);
                labelNode.textContent = service.label;

                itemNode.appendChild(checkboxNode);
                itemNode.appendChild(labelNode);
                if (service.info) {
                    infoNode.className = 'service-info';
                    infoNode.textContent = 'i';
                    infoNode.tabIndex = 0;
                    infoNode.title = service.info;
                    infoNode.setAttribute('aria-label', service.info);
                    infoNode.setAttribute('data-tooltip', service.info);
                    infoNode.addEventListener('mouseenter', function () {
                        setTooltipDirection(infoNode);
                    });
                    infoNode.addEventListener('focus', function () {
                        setTooltipDirection(infoNode);
                    });
                    itemNode.appendChild(infoNode);
                }
                servicesNode.appendChild(itemNode);
            });

            groupNode.appendChild(servicesNode);
            serviceGroupsNode.appendChild(groupNode);
        });

        syncControlState();
    }

    function syncControlState() {
        var serviceNodes = serviceGroupsNode.querySelectorAll('.service-checkbox');

        enabledCheckboxNode.checked = state.enabled;
        autorunCheckboxNode.checked = state.autorun;
        autorunCheckboxNode.disabled = !state.enabled;
        serviceGroupsNode.classList.toggle('is-disabled', !state.enabled);

        serviceNodes.forEach(function (node) {
            node.disabled = !state.enabled;
            node.checked = serviceCatalog.isServiceEnabled(node.dataset.serviceId, state.enabledServices);
        });
    }

    chrome.storage.sync.get(['enabled', 'autorun', 'enabledServices'], function (result) {
        state.enabled = !!result.enabled;
        state.autorun = !!result.autorun;
        state.enabledServices = serviceCatalog.normalizeEnabledServices(result.enabledServices);

        renderServiceGroups();
    });

    enabledCheckboxNode.addEventListener('change', function () {
        state.enabled = enabledCheckboxNode.checked;
        syncControlState();

        chrome.storage.sync.set({
            enabled: state.enabled
        }, function () {
            console.log('Enabled Setting saved:', state.enabled);
        });
    });

    autorunCheckboxNode.addEventListener('change', function () {
        state.autorun = autorunCheckboxNode.checked;

        chrome.storage.sync.set({
            autorun: state.autorun
        }, function () {
            console.log('Autorun Setting saved:', state.autorun);
        });
    });

    serviceGroupsNode.addEventListener('change', function (event) {
        var target = event.target;

        if (!target.classList.contains('service-checkbox')) {
            return;
        }

        state.enabledServices[target.dataset.serviceId] = target.checked;
        state.enabledServices = serviceCatalog.normalizeEnabledServices(state.enabledServices);

        chrome.storage.sync.set({
            enabledServices: state.enabledServices
        }, function () {
            console.log('Enabled services saved.');
        });
    });
});
