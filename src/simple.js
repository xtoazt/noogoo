// Gmailnator API Configuration
const API_BASE_URL = 'https://gmailnator.p.rapidapi.com';
let currentEmail = null;
let currentApiKey = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Load saved API key
    const savedApiKey = localStorage.getItem('gmailnator_api_key');
    if (savedApiKey) {
        document.getElementById('apiKey').value = savedApiKey;
    }
    
    // Set default API key
    currentApiKey = document.getElementById('apiKey').value;
    
    // Event listeners
    document.getElementById('generateBtn').addEventListener('click', generateEmail);
    document.getElementById('refreshInboxBtn').addEventListener('click', refreshInbox);
    document.getElementById('copyEmailBtn').addEventListener('click', copyEmail);
    document.getElementById('apiKey').addEventListener('change', (e) => {
        currentApiKey = e.target.value;
        localStorage.setItem('gmailnator_api_key', e.target.value);
    });
});

// Generate Email
async function generateEmail() {
    const generateBtn = document.getElementById('generateBtn');
    const resultSection = document.getElementById('resultSection');
    const statusText = document.getElementById('status');
    
    // Get selected options
    const checkboxes = document.querySelectorAll('.email-options input[type="checkbox"]:checked');
    const options = Array.from(checkboxes).map(cb => parseInt(cb.value));
    
    if (options.length === 0) {
        alert('Please select at least one email option');
        return;
    }
    
    // Update API key
    currentApiKey = document.getElementById('apiKey').value;
    if (!currentApiKey || currentApiKey.trim() === '') {
        alert('Please enter your RapidAPI key');
        return;
    }
    
    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';
    statusText.textContent = 'Generating email...';
    updateApiStatus('API: Connecting...');
    
    try {
        const response = await fetch(`${API_BASE_URL}/generate-email`, {
            method: 'POST',
            headers: {
                'x-rapidapi-key': currentApiKey,
                'x-rapidapi-host': 'gmailnator.p.rapidapi.com',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                options: options
            })
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data && data.email) {
            currentEmail = data.email;
            displayEmail(currentEmail);
            resultSection.style.display = 'block';
            statusText.textContent = 'Email generated successfully!';
            updateApiStatus('API: Connected');
            
            // Auto-refresh inbox after a delay
            setTimeout(() => {
                refreshInbox();
            }, 2000);
        } else {
            throw new Error('Invalid response from API');
        }
        
    } catch (error) {
        console.error('Error generating email:', error);
        statusText.textContent = `Error: ${error.message}`;
        updateApiStatus('API: Error');
        alert(`Failed to generate email: ${error.message}`);
    } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate Email';
    }
}

// Display Email
function displayEmail(email) {
    document.getElementById('emailText').textContent = email;
    document.getElementById('statusText').textContent = 'Active';
    document.getElementById('statusText').className = 'status-badge';
    document.getElementById('statusText').style.background = '#28a745';
    
    // Clear previous messages
    const inboxMessages = document.getElementById('inboxMessages');
    inboxMessages.innerHTML = '<p class="empty-state">No messages yet. Check back soon!</p>';
}

// Refresh Inbox
async function refreshInbox() {
    if (!currentEmail) {
        alert('Please generate an email first');
        return;
    }
    
    const refreshBtn = document.getElementById('refreshInboxBtn');
    const inboxMessages = document.getElementById('inboxMessages');
    const statusText = document.getElementById('status');
    
    refreshBtn.disabled = true;
    refreshBtn.textContent = '🔄 Refreshing...';
    statusText.textContent = 'Refreshing inbox...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/inbox`, {
            method: 'POST',
            headers: {
                'x-rapidapi-key': currentApiKey,
                'x-rapidapi-host': 'gmailnator.p.rapidapi.com',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: currentEmail,
                limit: 20
            })
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data && Array.isArray(data)) {
            displayMessages(data);
            statusText.textContent = `Found ${data.length} message(s)`;
        } else if (data && data.data && Array.isArray(data.data)) {
            displayMessages(data.data);
            statusText.textContent = `Found ${data.data.length} message(s)`;
        } else {
            inboxMessages.innerHTML = '<p class="empty-state">No messages yet. Check back soon!</p>';
            statusText.textContent = 'No new messages';
        }
        
    } catch (error) {
        console.error('Error refreshing inbox:', error);
        statusText.textContent = `Error: ${error.message}`;
        inboxMessages.innerHTML = `<p class="empty-state" style="color: #dc3545;">Error loading inbox: ${error.message}</p>`;
    } finally {
        refreshBtn.disabled = false;
        refreshBtn.textContent = '🔄 Refresh Inbox';
    }
}

// Display Messages
function displayMessages(messages) {
    const inboxMessages = document.getElementById('inboxMessages');
    
    if (!messages || messages.length === 0) {
        inboxMessages.innerHTML = '<p class="empty-state">No messages yet. Check back soon!</p>';
        return;
    }
    
    inboxMessages.innerHTML = messages.map((message, index) => {
        const messageId = message.id || message.messageID || index;
        const subject = message.subject || 'No Subject';
        const from = message.from || 'Unknown Sender';
        const preview = message.preview || message.body || 'No preview available';
        const time = message.time || message.date || 'Unknown time';
        
        return `
            <div class="message-item" data-id="${messageId}">
                <div class="message-header">
                    <div class="message-subject">${escapeHtml(subject)}</div>
                    <div class="message-time">${formatTime(time)}</div>
                </div>
                <div class="message-from">From: ${escapeHtml(from)}</div>
                <div class="message-preview">${escapeHtml(preview.substring(0, 150))}${preview.length > 150 ? '...' : ''}</div>
            </div>
        `;
    }).join('');
}

// Copy Email to Clipboard
function copyEmail() {
    if (!currentEmail) {
        alert('No email to copy');
        return;
    }
    
    navigator.clipboard.writeText(currentEmail).then(() => {
        const copyBtn = document.getElementById('copyEmailBtn');
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✓ Copied!';
        copyBtn.style.background = '#28a745';
        
        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.style.background = '#667eea';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy email to clipboard');
    });
}

// Update API Status
function updateApiStatus(status) {
    document.getElementById('apiStatus').textContent = status;
}

// Utility Functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTime(timeString) {
    if (!timeString) return 'Unknown';
    
    try {
        const date = new Date(timeString);
        if (isNaN(date.getTime())) {
            return timeString;
        }
        return date.toLocaleString();
    } catch (e) {
        return timeString;
    }
}

// Auto-refresh inbox every 30 seconds if email is generated
let inboxRefreshInterval = null;

function startAutoRefresh() {
    if (inboxRefreshInterval) {
        clearInterval(inboxRefreshInterval);
    }
    
    if (currentEmail) {
        inboxRefreshInterval = setInterval(() => {
            refreshInbox();
        }, 30000); // Refresh every 30 seconds
    }
}

function stopAutoRefresh() {
    if (inboxRefreshInterval) {
        clearInterval(inboxRefreshInterval);
        inboxRefreshInterval = null;
    }
}

// Start auto-refresh when email is generated
const originalDisplayEmail = displayEmail;
displayEmail = function(email) {
    originalDisplayEmail(email);
    startAutoRefresh();
};

// Stop auto-refresh when page is hidden
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopAutoRefresh();
    } else if (currentEmail) {
        startAutoRefresh();
    }
});
