/**
 * injectScript - Inject internal script to available access to the `window`
 *
 * @param  {type} file_path Local path of the internal script.
 * @param  {type} tag The tag as string, where the script will be append (default: 'body').
 * @see    {@link http://stackoverflow.com/questions/20499994/access-window-variable-from-content-script}
 */
function injectScript(file_path, tag) {
    var node = document.getElementsByTagName(tag)[0];
    var script = document.createElement('script');
    script.setAttribute('type', 'text/javascript');
    script.setAttribute('src', file_path);
    node.appendChild(script);
}

// Listen for messages from content_web.js requesting settings
window.addEventListener('message', function(event) {
    if (event.source !== window) return;

    if (event.data.type === 'GET_SETTINGS') {
        chrome.storage.sync.get(['enabled', 'autorun'], function(result) {
            window.postMessage({
                type: 'SETTINGS_RESPONSE',
                settings: {
                    enabled: result.enabled || false,
                    autorun: result.autorun || false,
                }
            }, '*');
        });
    }
});

// Listen for storage changes and notify content_web.js
chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === 'sync' && (changes.autorun || changes.enabled)) {

        const data = {};

        if(changes.autorun){
            data.autorun = changes.autorun.newValue;
        }

        if (changes.enabled) {
            data.enabled = changes.enabled.newValue;
        }

        window.postMessage({
            type: 'SETTING_CHANGED',
            changes: {...data},
        }, '*');
    }
});

injectScript(chrome.runtime.getURL('content_web.js'), 'body');
