chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "buy",
    title: "Buy",
    contexts: ["selection"]
  });

  chrome.contextMenus.create({
    id: "openOnBeanScanner",
    title: "Open on BeanScanner",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "buy") {
    handleAnalyzeOrOpen(info.selectionText, "buy", tab.id);
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
  } else if (url.hostname === 'birdeye.so' && url.pathname.includes('/token/') && url.searchParams.get('chain') === 'solana') {
    console.log(url.pathname.split('/token/')[1].split('?')[0]);
    return url.pathname.split('/token/')[1].split('?')[0];
  }  else if (url.hostname === 'www.pump.fun') {
    return url.pathname.split('/')[1];
  }
  return null;
}

async function analyzeToken(token) {
  try {
    const response = await fetch(`https://api.beanscanner.xyz/api/analyze/${token}`);
    const data = await response.json();
    const payload = JSON.stringify(data.payload);
    const headers = { 'Content-Type': 'application/json' };
    const webhookUrl = await getWebhookUrl();
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: headers,
      body: payload
    });

    console.log('Webhook response status:', webhookResponse.status);

    if (webhookResponse.ok) {
      console.log('Analysis sent to Discord.');
    } else {
      const errorText = await webhookResponse.text();
      console.error('Error sending analysis to Discord:', webhookResponse.status, errorText);
    }
  } catch (error) {
    console.error('Error during analysis:', error);
  }
}

async function handleAnalyzeOrOpen(token, action, tabId) {
  token = token.trim();
  if (token.length >= 32 && token.length <= 44) {
    if (action === "analyze") {
      const beanScannerUrl = `https://beanscanner.xyz/token/${token}`;
      chrome.tabs.create({ url: beanScannerUrl });
      analyzeToken(token); // Perform analysis asynchronously without waiting
    } else if (action === "buy") {
      const tokenData = await fetchTokenData(token);
      if (tokenData) {
        const pairAddress = tokenData.pairAddress;
        const baseTokenAddress = tokenData.baseToken.address;
        chrome.storage.sync.get(['selectedBot'], (result) => {
          let botUrl;
          switch (result.selectedBot) {
            case 'Photon':
              botUrl = `https://photon-sol.tinyastro.io/en/r/@nhdxyz/${baseTokenAddress}`;
              break;
            case 'BonkBot':
              botUrl = `https://t.me/bonkbot_bot?start=ref_r3ka6_ca_${baseTokenAddress}`;
              break;
            default:
              botUrl = `https://beanscanner.xyz/token/${baseTokenAddress}`;
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

async function getWebhookUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['apiUrl'], (result) => {
      resolve(result.apiUrl);
    });
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "analyze" || message.action === "buy") {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const activeTab = tabs[0];
      const url = new URL(activeTab.url);
      const token = extractTokenFromURL(url);
      console.log(token);
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
    console.log(token);
    if (token) {
      await handleAnalyzeOrOpen(token, command, activeTab.id);
    } else {
      showAlert(activeTab.id, 'No valid token found in the URL.');
    }
  });
});
