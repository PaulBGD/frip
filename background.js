chrome.browserAction.onClicked.addListener(function(tab) {
    chrome.debugger.attach({tabId: tab.id}, "1.0", () => {
        chrome.debugger.sendCommand({tabId: tab.id}, "Emulation.setDeviceMetricsOverride", {
            width: 1920,
            height: 1140,
            deviceScaleFactor: 1,
            mobile: true,
        }, () => {
            chrome.debugger.detach({tabId: tab.id}, () => {
                chrome.tabs.sendMessage(tab.id, {start: true});
            });
        });
    });
});
