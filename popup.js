// Load the saved setting when popup opens
document.addEventListener('DOMContentLoaded', function() {
    const enabledCheckboxNode = document.getElementById('enabledCheckbox');
    const autorunCheckboxNode = document.getElementById('autorunCheckbox');

    // Load saved setting
    chrome.storage.sync.get(['enabled', 'autorun'], function(result) {
        enabledCheckboxNode.checked = result.enabled || false;
        autorunCheckboxNode.checked = result.autorun || false;

        if(! enabledCheckboxNode.checked){
            autorunCheckboxNode.disabled = true;
        }else{
            autorunCheckboxNode.disabled = false;
        }
    });

    // Save setting when enabledCheckboxNode is toggled
    enabledCheckboxNode.addEventListener('change', function() {
        chrome.storage.sync.set({
            enabled: enabledCheckboxNode.checked
        }, function() {
            console.log('Enabled Setting saved:', enabledCheckboxNode.checked);

            if(! enabledCheckboxNode.checked){
                autorunCheckboxNode.disabled = true;
            }else{
                autorunCheckboxNode.disabled = false;
            }
        });
    });

    // Save setting when autorunCheckboxNode is toggled
    autorunCheckboxNode.addEventListener('change', function() {
        chrome.storage.sync.set({
            autorun: autorunCheckboxNode.checked
        }, function() {
            console.log('Autorun Setting saved:', autorunCheckboxNode.checked);
        });
    });
});