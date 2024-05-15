chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "sendToBeanScanner",
    title: "Send to BeanScanner",
    contexts: ["selection"]
  });

  chrome.contextMenus.create({
    id: "openOnBeanScanner",
    title: "Open on BeanScanner",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "sendToBeanScanner") {
    chrome.tabs.sendMessage(tab.id, { action: "sendToBeanScanner", text: info.selectionText });
  } else if (info.menuItemId === "openOnBeanScanner") {
    const token = info.selectionText.trim();
    console.log(`Selected text: ${token}`);
    console.log(`Token length: ${token.length}`);
    if (token.length >= 32 && token.length <= 44) {
      const url = `http://localhost:3000/token/${token}`;
      chrome.tabs.create({ url });
    } else {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => {
          alert('The selected text is not a valid token (must be between 32 and 44 characters long).');
        }
      });
    }
  }
});

chrome.commands.onCommand.addListener((command) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    const url = new URL(activeTab.url);

    if (command === "analyze") {
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
        chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          function: () => {
            alert('The extracted token is not valid (must be between 32 and 44 characters long).');
          }
        });
      }
    } else if (command === "buy") {
      chrome.storage.sync.get(['selectedBot'], (result) => {
        let baseUrl;
        switch (result.selectedBot) {
          case 'Photon':
            baseUrl = 'https://photon-sol.tinyastro.io/en/lp/';
            break;
          case 'BonkBot':
            baseUrl = 'https://bonkbot.com/token/';
            break;
          case 'Bean':
            baseUrl = 'https://beanscanner.xyz/token/';
            break;
          default:
            baseUrl = 'https://beanscanner.xyz/token/';
        }

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
          const fullUrl = `${baseUrl}${token}`;
          chrome.tabs.create({ url: fullUrl });
        } else {
          chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            function: () => {
              alert('The extracted token is not valid (must be between 32 and 44 characters long).');
            }
          });
        }
      });
    }
  });
});
