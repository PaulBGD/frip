var s = document.createElement('script');
s.src = chrome.extension.getURL('actual-script.js');
(document.head||document.documentElement).appendChild(s);
s.onload = function() {
    s.remove();
};

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    if (req.start) {
        const script = document.createElement("script");
        script.innerHTML = `window._fr()`;
        document.head.appendChild(script);
        script.onload = () => script.remove();
    }
});
