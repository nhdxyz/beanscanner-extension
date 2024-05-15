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
    handleAnalyzeOrOpen(info.selectionText, "analyze", tab.id);
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

function extractTokenFromURL(url) {
  if (url.hostname === 'dexscreener.com' && url.pathname.includes('/solana/')) {
    return url.pathname.split('/solana/')[1];
  } else if (url.hostname === 'photon-sol.tinyastro.io' && url.pathname.includes('/en/lp/')) {
    let token = url.pathname.split('/en/lp/')[1];
    const queryIndex = token.indexOf('?');
    if (queryIndex !== -1) {
      token = token.substring(0, queryIndex);
    }
    return token;
  }
  return null;
}

async function handleAnalyzeOrOpen(token, action, tabId) {
  token = token.trim();
  if (token.length >= 32 && token.length <= 44) {
    const beanScannerUrl = `http://localhost:3000/token/${token}`;
    if (action === "analyze") {
      chrome.tabs.create({ url: beanScannerUrl });
    } else if (action === "buy") {
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
            default:
              botUrl = `http://localhost:3000/token/${baseTokenAddress}`;
          }
          chrome.tabs.create({ url: botUrl });
        });
      } else {
        showAlert(tabId, 'No valid token data found.');
      }
    }
  } else {
    showAlert(tabId, 'The selected text is not a valid token (must be between 32 and 44 characters long).');
  }
}

function showAlert(tabId, message) {
  chrome.scripting.executeScript({
    target: { tabId },
    function: (message) => alert(message),
    args: [message]
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "analyze" || message.action === "buy") {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const activeTab = tabs[0];
      const url = new URL(activeTab.url);
      const token = extractTokenFromURL(url);
      if (token) {
        await handleAnalyzeOrOpen(token, message.action, activeTab.id);
      } else {
        showAlert(activeTab.id, 'No valid token found in the URL.');
      }
    });
  }
});

chrome.commands.onCommand.addListener((command) => {
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const activeTab = tabs[0];
    const url = new URL(activeTab.url);
    const token = extractTokenFromURL(url);
    if (token) {
      await handleAnalyzeOrOpen(token, command, activeTab.id);
    } else {
      showAlert(activeTab.id, 'No valid token found in the URL.');
    }
  });
});
