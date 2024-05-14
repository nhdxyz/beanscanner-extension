chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "sendToBeanScanner" && message.text) {
      chrome.storage.sync.get(['apiUrl'], (result) => {
        if (result.apiUrl) {
          fetch(result.apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content: message.text })
          })
          .then(response => response.json())
          .then(data => console.log(data))
          .catch(error => console.error('Error:', error));
        } else {
          console.error('Discord webhook URL is not set');
        }
      });
    }
  });
  