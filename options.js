document.addEventListener('DOMContentLoaded', () => {
    const apiUrlInput = document.getElementById('apiUrl');
    const testMessage = "Test message from BeanScanner extension";

    // Load saved settings
    chrome.storage.sync.get(['apiUrl'], (result) => {
        if (result.apiUrl) {
            apiUrlInput.value = result.apiUrl;
        }
    });

    // Save settings
    document.getElementById('saveSettings').addEventListener('click', () => {
        const apiUrl = apiUrlInput.value;
        chrome.storage.sync.set({ apiUrl }, () => {
            alert('Settings saved');
        });
    });

    // Test webhook
    document.getElementById('testWebhook').addEventListener('click', () => {
        const apiUrl = apiUrlInput.value;
        if (apiUrl) {
            fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content: testMessage })
            })
            .then(response => {
                if (response.ok) {
                    alert('Test message sent successfully');
                } else {
                    alert('Failed to send test message');
                }
            })
            .catch(error => {
                alert('Error: ' + error.message);
            });
        } else {
            alert('Please enter a Discord webhook URL');
        }
    });
});
