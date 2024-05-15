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
    if (token.length >= 32 && token.length <= 44) {
      const url = `https://beanscanner.xyz/token/${token}`;
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

async function fetchTokenData(token) {
  const endpoints = [
    `https://api.dexscreener.com/latest/dex/tokens/${token}`,
    `https://api.dexscreener.com/latest/dex/pairs/solana/${token}`
  ];

  for (const endpoint of endpoints) {
    const response = await fetch(endpoint);
    const data = await response.json();
    if (data && data.pairs && data.pairs.length > 0) {
      return data.pairs[0];
    }
  }
  return null;
}

chrome.commands.onCommand.addListener((command) => {
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
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
        const beanScannerUrl = `https://beanscanner.xyz/token/${token}`;
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
        const tokenData = await fetchTokenData(token);
        if (tokenData) {
          const pairAddress = tokenData.pairAddress;
          const baseTokenAddress = tokenData.baseToken.address;

          chrome.storage.sync.get(['selectedBot'], (result) => {
            let botUrl;
            switch (result.selectedBot) {
              case 'Photon':
                botUrl = `https://photon-sol.tinyastro.io/en/lp/${pairAddress}`;
                break;
              case 'BonkBot':
                botUrl = `https://t.me/bonkbot_bot?start=ref_r3ka6_ca_${baseTokenAddress}`;
                break;
              case 'Bean':
                botUrl = `https://beanscanner.xyz/token/${pairAddress}`;
                break;
              default:
                botUrl = `https://beanscanner.xyz/token/${baseTokenAddress}`;
            }

            chrome.tabs.create({ url: botUrl });
          });
        } else {
          chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            function: () => {
              alert('No valid token data found.');
            }
          });
        }
      } else {
        chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          function: () => {
            alert('The extracted token is not valid (must be between 32 and 44 characters long).');
          }
        });
      }
    }
  });
});