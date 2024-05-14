document.getElementById('openSettings').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
});

document.getElementById('analyzeButton').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        const url = new URL(activeTab.url);

        let token = null;
        if (url.hostname === 'dexscreener.com' && url.pathname.includes('/solana/')) {
            token = url.pathname.split('/solana/')[1];
        } else if (url.hostname === 'photon-sol.tinyastro.io' && url.pathname.includes('/en/lp/')) {
            token = url.pathname.split('/en/lp/')[1];
            const queryIndex = token.indexOf('?');
            if (queryIndex !== -1) {
                token = token.substring(0, queryIndex);
            }
        }

        if (token && token.length >= 32 && token.length <= 44) {
            const beanScannerUrl = `http://localhost:3000/token/${token}`;
            chrome.tabs.create({ url: beanScannerUrl });
        } else {
            alert('The extracted token is not valid (must be between 32 and 44 characters long).');
        }
    });
});
