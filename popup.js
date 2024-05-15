document.getElementById('openSettings').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
});

document.getElementById('analyzeButton').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: "analyze" });
});

document.getElementById('buyButton').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: "buy" });
});
