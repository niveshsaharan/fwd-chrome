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
    var files = ['src/config.js', 'src/ui.js', 'src/engine.js', 'src/main.js'];
    for (var i = 0; i < files.length; i++) {
        await injectScript(chrome.runtime.getURL(files[i]), 'body');
    }
}

window.addEventListener('message', function (event) {
    if (event.source !== window) return;
    if (event.data.type === 'GET_SETTINGS') {
        chrome.storage.sync.get(['enabled', 'autorun'], function (result) {
            window.postMessage({
                type: 'SETTINGS_RESPONSE',
                settings: { enabled: result.enabled || false, autorun: result.autorun || false }
            }, '*');
        });
    }
});

chrome.storage.onChanged.addListener(function (changes, namespace) {
    if (namespace === 'sync' && (changes.autorun || changes.enabled)) {
        var data = {};
        if (changes.autorun) data.autorun = changes.autorun.newValue;
        if (changes.enabled) data.enabled = changes.enabled.newValue;
        window.postMessage({ type: 'SETTING_CHANGED', changes: data }, '*');
    }
});

injectAll();