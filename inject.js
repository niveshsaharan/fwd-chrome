var serviceCatalog = window.FWD && window.FWD.serviceCatalog;

function injectScript(filePath, tag) {
    return new Promise(function (resolve) {
        var node = document.getElementsByTagName(tag)[0];
        var script = document.createElement('script');
        script.setAttribute('type', 'text/javascript');
        script.setAttribute('src', filePath);
        script.onload = resolve;
        node.appendChild(script);
    });
}

async function injectAll() {
    var files = ['src/serviceCatalog.js', 'src/config.js', 'src/ui.js', 'src/engine.js', 'src/main.js'];
    for (var i = 0; i < files.length; i++) {
        await injectScript(chrome.runtime.getURL(files[i]), 'body');
    }
}

window.addEventListener('message', function (event) {
    if (event.source !== window) return;
    if (event.data.type === 'GET_SETTINGS') {
        chrome.storage.sync.get(['enabled', 'autorun', 'enabledServices', 'skipAlreadySelected'], function (result) {
            window.postMessage({
                type: 'SETTINGS_RESPONSE',
                settings: {
                    enabled: !!result.enabled,
                    autorun: !!result.autorun,
                    enabledServices: serviceCatalog.normalizeEnabledServices(result.enabledServices),
                    skipAlreadySelected: result.skipAlreadySelected !== false,
                }
            }, '*');
        });
    }
});

chrome.storage.onChanged.addListener(function (changes, namespace) {
    if (namespace === 'sync' && (changes.autorun || changes.enabled || changes.enabledServices || changes.skipAlreadySelected)) {
        var data = {};
        if (changes.autorun) data.autorun = changes.autorun.newValue;
        if (changes.enabled) data.enabled = changes.enabled.newValue;
        if (changes.skipAlreadySelected) data.skipAlreadySelected = changes.skipAlreadySelected.newValue !== false;
        if (changes.enabledServices) {
            data.enabledServices = serviceCatalog.normalizeEnabledServices(changes.enabledServices.newValue);
        }
        window.postMessage({ type: 'SETTING_CHANGED', changes: data }, '*');
    }
});

injectAll();
