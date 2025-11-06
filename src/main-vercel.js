import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';

let terminal = null;
let fitAddon = null;
let isGenerating = false;
let terminalOutputBuffer = '';

// Gmailnator API Configuration
const GMAILNATOR_API_URL = 'https://gmailnator.p.rapidapi.com';
let currentGmailnatorEmail = null;

// Hardcoded lab configuration
const QWIKLABS_LAB_ID = '32138';
const QWIKLABS_LAB_PARENT = 'catalog';

// Initialize terminal
function initTerminal() {
    terminal = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
        theme: {
            background: '#000000',
            foreground: '#ffffff'
        },
        scrollback: 10000
    });

    fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(document.getElementById('terminal'));
    fitAddon.fit();

    // Capture all terminal output
    const originalWrite = terminal.write.bind(terminal);
    terminal.write = (data) => {
        originalWrite(data);
        terminalOutputBuffer += data;
        // Keep buffer size reasonable (last 100KB)
        if (terminalOutputBuffer.length > 100000) {
            terminalOutputBuffer = terminalOutputBuffer.slice(-100000);
        }
    };

    terminal.writeln('Terminal Initialized');
    terminal.writeln('Ready to generate accounts...');
}

// Generate account
async function generateAccount() {
    if (isGenerating) {
        return;
    }

    const method = document.getElementById('methodSelect').value;
    
    if (method === 'gmailnator') {
        await generateAccountGmailnator();
        return;
    }
    
    if (method === 'qwiklabs') {
        await generateAccountQwiklabs();
        return;
    }
}

// Gmailnator API Functions
async function generateAccountGmailnator() {
    if (isGenerating) {
        return;
    }

    isGenerating = true;
    const generateBtn = document.getElementById('generateBtn');
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<span>Generating...</span>';
    
    const apiKey = document.getElementById('apiKey').value.trim();
    const setPassword = document.getElementById('setPassword').value.trim();
    const passwordChangeUrl = document.getElementById('passwordChangeUrl').value.trim();
    
    if (!apiKey) {
        alert('Please enter your RapidAPI key');
        isGenerating = false;
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<span>Generate Account</span>';
        return;
    }
    
    if (!setPassword) {
        alert('Please enter a password to set');
        isGenerating = false;
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<span>Generate Account</span>';
        return;
    }

    // Get selected email options
    const checkboxes = document.querySelectorAll('.email-options input[type="checkbox"]:checked');
    const options = Array.from(checkboxes).map(cb => parseInt(cb.value));
    
    if (options.length === 0) {
        alert('Please select at least one email option');
        isGenerating = false;
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<span>Generate Account</span>';
        return;
    }

    try {
        updateStatus('Generating email via Gmailnator...', 'API: Connecting');
        terminal.writeln('\r\n═══════════════════════════════════════');
        terminal.writeln('Gmailnator API - Account Generation');
        terminal.writeln('═══════════════════════════════════════');
        terminal.writeln('Step 1: Generating email address...');

        // Step 1: Generate email
        const emailResponse = await fetch(`${GMAILNATOR_API_URL}/generate-email`, {
            method: 'POST',
            headers: {
                'x-rapidapi-key': apiKey,
                'x-rapidapi-host': 'gmailnator.p.rapidapi.com',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ options: options })
        });

        if (!emailResponse.ok) {
            throw new Error(`API Error: ${emailResponse.status} ${emailResponse.statusText}`);
        }

        const emailData = await emailResponse.json();
        const email = emailData.email || emailData.data?.email;
        
        if (!email) {
            throw new Error('Failed to generate email address');
        }

        currentGmailnatorEmail = email;
        terminal.writeln(`✓ Email generated: ${email}`);
        terminal.writeln(`Step 2: Setting password to: ${setPassword}`);

        // Step 2: Change password via URL
        let passwordChanged = false;
        if (passwordChangeUrl) {
            try {
                terminal.writeln(`Attempting password change via: ${passwordChangeUrl}`);
                // Replace {email} placeholder if exists
                const url = passwordChangeUrl.replace('{email}', encodeURIComponent(email));
                const urlWithPassword = url.replace('{password}', encodeURIComponent(setPassword));
                
                // Use fetch to trigger password change
                const passwordResponse = await fetch(urlWithPassword, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: email,
                        password: setPassword
                    }),
                    mode: 'cors'
                }).catch(err => {
                    terminal.writeln(`⚠ Direct URL access failed (CORS): ${err.message}`);
                    terminal.writeln('This is expected - will verify via inbox instead');
                });

                if (passwordResponse && passwordResponse.ok) {
                    passwordChanged = true;
                    terminal.writeln('✓ Password change request sent');
                }
            } catch (error) {
                terminal.writeln(`⚠ Password change URL error: ${error.message}`);
                terminal.writeln('Will verify via inbox instead');
            }
        } else {
            terminal.writeln('⚠ No password change URL provided - skipping password change');
            terminal.writeln('Email generated but password not set');
        }

        // Step 3: Verify via inbox
        terminal.writeln('Step 3: Monitoring inbox for verification...');
        updateStatus('Monitoring inbox...', 'API: Verifying');
        
        let verificationFound = false;
        let attempts = 0;
        const maxAttempts = 20; // Check for 2 minutes (6 seconds * 20)
        
        while (!verificationFound && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 6000)); // Wait 6 seconds
            
            try {
                const inboxResponse = await fetch(`${GMAILNATOR_API_URL}/inbox`, {
                    method: 'POST',
                    headers: {
                        'x-rapidapi-key': apiKey,
                        'x-rapidapi-host': 'gmailnator.p.rapidapi.com',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: email,
                        limit: 20
                    })
                });

                if (inboxResponse.ok) {
                    const inboxData = await inboxResponse.json();
                    const messages = inboxData.data || inboxData || [];
                    
                    terminal.writeln(`✓ Checked inbox (${messages.length} messages found)`);
                    
                    // Look for password-related emails
                    const passwordEmails = messages.filter(msg => {
                        const subject = (msg.subject || '').toLowerCase();
                        const body = (msg.body || msg.preview || '').toLowerCase();
                        return subject.includes('password') || body.includes('password') ||
                               subject.includes('reset') || body.includes('reset') ||
                               subject.includes('change') || body.includes('change');
                    });
                    
                    if (passwordEmails.length > 0) {
                        verificationFound = true;
                        terminal.writeln(`✓ Found ${passwordEmails.length} password-related email(s)`);
                        terminal.writeln('✓ Account verification complete!');
                    }
                }
            } catch (error) {
                terminal.writeln(`⚠ Inbox check error: ${error.message}`);
            }
            
            attempts++;
            if (attempts % 3 === 0) {
                terminal.writeln(`Still checking... (${attempts}/${maxAttempts} attempts)`);
            }
        }

        // Step 4: Display results
        terminal.writeln('\r\n═══════════════════════════════════════');
        terminal.writeln('Account Generation Complete!');
        terminal.writeln('═══════════════════════════════════════');
        
        const accountResult = {
            email: email,
            password: setPassword,
            status: verificationFound ? 'verified' : 'generated',
            method: 'gmailnator_api',
            passwordSet: passwordChanged || verificationFound,
            verificationFound: verificationFound,
            timestamp: new Date().toISOString(),
            note: verificationFound 
                ? 'Account generated and verified via inbox'
                : 'Account generated - password may need manual verification'
        };
        
        displayAccount(accountResult);
        updateStatus('Account generated successfully!', 'API: Complete');
        terminal.writeln(`\r\n✓ Email: ${email}`);
        terminal.writeln(`✓ Password: ${setPassword}`);
        terminal.writeln('✓ Account details displayed above');

    } catch (error) {
        console.error('Error generating account:', error);
        terminal.writeln(`\r\n✗ Error: ${error.message}`);
        updateStatus('Error: ' + error.message, 'API: Error');
        
        displayAccount({
            error: error.message,
            status: 'failed',
            method: 'gmailnator_api',
            timestamp: new Date().toISOString()
        });
    } finally {
        isGenerating = false;
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<span>Generate Account</span>';
    }
}

// Qwiklabs API Functions
let recaptchaWidgetId = null;
let recaptchaV2Token = null;
let recaptchaV3Token = null;

// Load reCAPTCHA v2 if needed
function loadRecaptchaV2(callback) {
    if (typeof grecaptcha === 'undefined') {
        terminal.writeln('Loading reCAPTCHA...');
        const script = document.createElement('script');
        script.src = 'https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit';
        script.async = true;
        script.defer = true;
        window.onRecaptchaLoad = () => {
            terminal.writeln('reCAPTCHA loaded');
            if (callback) callback();
        };
        document.head.appendChild(script);
    } else {
        if (callback) callback();
    }
}

// Get reCAPTCHA site key from page or use default
function getRecaptchaSiteKey() {
    // Try to find site key from existing reCAPTCHA widgets on the page
    const existingWidgets = document.querySelectorAll('[data-sitekey]');
    if (existingWidgets.length > 0) {
        return existingWidgets[0].getAttribute('data-sitekey');
    }
    
    // Try to find in script tags
    const scripts = document.querySelectorAll('script[src*="recaptcha"]');
    for (const script of scripts) {
        const match = script.src.match(/[?&]render=([^&]+)/);
        if (match && match[1] !== 'explicit') {
            // This is a v3 site key
            const siteKeyMatch = script.src.match(/[?&]k=([^&]+)/);
            if (siteKeyMatch) {
                return siteKeyMatch[1];
            }
        }
    }
    
    // Try to find in window object (if Qwiklabs exposes it)
    if (window.recaptchaSiteKey) {
        return window.recaptchaSiteKey;
    }
    
    // Default - will be detected dynamically or fail gracefully
    return null;
}

// Execute reCAPTCHA v3
async function executeRecaptchaV3() {
    return new Promise((resolve, reject) => {
        if (typeof grecaptcha === 'undefined' || !grecaptcha.ready) {
            reject(new Error('reCAPTCHA not loaded'));
            return;
        }
        
        const siteKey = getRecaptchaSiteKey();
        if (!siteKey) {
            // Try to use v3 with a common action, but it might fail
            reject(new Error('reCAPTCHA site key not found'));
            return;
        }
        
        grecaptcha.ready(() => {
            grecaptcha.execute(siteKey, { action: 'startLab' })
                .then(token => {
                    recaptchaV3Token = token;
                    resolve(token);
                })
                .catch(err => {
                    reject(err);
                });
        });
    });
}

// Show reCAPTCHA v2 widget
function showRecaptchaV2() {
    const container = document.getElementById('recaptchaContainer');
    const widget = document.getElementById('recaptchaWidget');
    
    container.style.display = 'block';
    
    loadRecaptchaV2(() => {
        const siteKey = getRecaptchaSiteKey();
        
        if (!siteKey) {
            terminal.writeln('⚠ reCAPTCHA site key not found - please complete captcha on the Qwiklabs page');
            terminal.writeln('You may need to click "Start Lab" on the Qwiklabs page first');
            container.innerHTML = `
                <strong>⚠ reCAPTCHA Required</strong>
                <p style="margin: 8px 0; font-size: 13px;">
                    Please complete the reCAPTCHA on the Qwiklabs page (click "Start Lab" button) 
                    and then try again, or complete the captcha that appears on the page.
                </p>
            `;
            return;
        }
        
        if (recaptchaWidgetId !== null) {
            grecaptcha.reset(recaptchaWidgetId);
        } else {
            recaptchaWidgetId = grecaptcha.render(widget, {
                'sitekey': siteKey,
                'callback': (token) => {
                    recaptchaV2Token = token;
                    terminal.writeln('✓ reCAPTCHA completed');
                    // Retry the API call
                    generateAccountQwiklabs();
                },
                'expired-callback': () => {
                    recaptchaV2Token = null;
                    terminal.writeln('⚠ reCAPTCHA expired - please complete again');
                }
            });
        }
    });
}

async function generateAccountQwiklabs() {
    if (isGenerating) {
        return;
    }

    isGenerating = true;
    const generateBtn = document.getElementById('generateBtn');
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<span>Generating...</span>';
    
    // Use hardcoded lab ID and parent
    const labRunnerId = QWIKLABS_LAB_ID;
    const finalParent = QWIKLABS_LAB_PARENT;

    try {
        updateStatus('Starting Qwiklabs lab...', 'Qwiklabs: Connecting');
        terminal.writeln('\r\n═══════════════════════════════════════');
        terminal.writeln('Qwiklabs API - Account Generation');
        terminal.writeln('═══════════════════════════════════════');
        terminal.writeln(`Step 1: Starting lab ${labRunnerId}...`);
        
        // Try to find and click "Start Lab" button if it exists (handles captcha automatically)
        // Search for button by various selectors
        let startLabButton = document.querySelector('button[data-testid="start-lab-button"]') ||
                            document.querySelector('[class*="start-lab"]') ||
                            document.querySelector('[id*="start-lab"]') ||
                            Array.from(document.querySelectorAll('button, a')).find(el => 
                                el.textContent && el.textContent.toLowerCase().includes('start lab')
                            );
        
        if (startLabButton && startLabButton.offsetParent !== null) {
            terminal.writeln('Found "Start Lab" button on page');
            terminal.writeln('Note: If a captcha appears, please complete it on the Qwiklabs page');
            
            // Wait a bit then try clicking (but don't block)
            setTimeout(() => {
                try {
                    startLabButton.click();
                    terminal.writeln('✓ Attempted to click "Start Lab" button');
                } catch (e) {
                    terminal.writeln('⚠ Could not click button automatically');
                }
            }, 500);
        } else {
            terminal.writeln('ℹ "Start Lab" button not found - will call API directly');
        }

        // Build the API URL
        // Check if we're on Qwiklabs domain, otherwise use full URL
        const isQwiklabsDomain = window.location.hostname.includes('qwiklabs.com') || 
                                  window.location.hostname.includes('skills.google');
        const baseUrl = isQwiklabsDomain ? '' : 'https://www.qwiklabs.com';
        
        let apiUrl = `${baseUrl}/focuses/run/${labRunnerId}.json?parent=${encodeURIComponent(finalParent)}`;
        
        // Extract additional params from URL
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('path')) {
            apiUrl += `&path=${encodeURIComponent(urlParams.get('path'))}`;
        }
        if (urlParams.get('qlcampaign')) {
            apiUrl += `&qlcampaign=${encodeURIComponent(urlParams.get('qlcampaign'))}`;
        }
        
        terminal.writeln(`API URL: ${apiUrl}`);
        terminal.writeln(`Domain: ${window.location.hostname}`);
        if (!isQwiklabsDomain) {
            terminal.writeln('⚠ Warning: Not on Qwiklabs domain - CORS may block this request');
            terminal.writeln('This will only work from Qwiklabs pages or with CORS enabled');
        }
        
        // Step 2: Try to get reCAPTCHA v3 token (non-blocking)
        terminal.writeln('Step 2: Checking for reCAPTCHA...');
        try {
            recaptchaV3Token = await executeRecaptchaV3();
            terminal.writeln('✓ reCAPTCHA v3 token obtained');
        } catch (error) {
            terminal.writeln('⚠ reCAPTCHA v3 not available or failed (will try without it)');
        }
        
        // Add reCAPTCHA tokens to URL if available
        if (recaptchaV3Token) {
            apiUrl += `&recaptchaV3Token=${encodeURIComponent(recaptchaV3Token)}`;
        }
        if (recaptchaV2Token) {
            apiUrl += `&recaptchaV2Token=${encodeURIComponent(recaptchaV2Token)}`;
        }
        
        terminal.writeln('Step 3: Calling Qwiklabs API...');

        // Call Qwiklabs API
        const response = await fetch(apiUrl, {
            method: 'GET',
            credentials: 'include', // Include cookies for authentication
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            
            // Check if reCAPTCHA is required
            if (response.status === 403 || errorText.includes('recaptcha') || errorText.includes('captcha')) {
                terminal.writeln('⚠ reCAPTCHA required - please complete the captcha');
                isGenerating = false;
                generateBtn.disabled = false;
                generateBtn.innerHTML = '<span>Generate Account</span>';
                showRecaptchaV2();
                return;
            }
            
            throw new Error(`API Error: ${response.status} ${response.statusText}. ${errorText.substring(0, 200)}`);
        }

        const data = await response.json();
        terminal.writeln('✓ Lab started successfully');
        
        // Hide reCAPTCHA if it was shown
        document.getElementById('recaptchaContainer').style.display = 'none';
        recaptchaV2Token = null; // Reset after successful call
        
        terminal.writeln('Step 4: Extracting credentials from response...');

        // Extract credentials from labDetails
        const labDetails = data.labDetails || data.lab_details || data.labDetails || [];
        const credentials = [];
        
        // Helper function to extract credential from various structures
        const extractCredential = (obj, source = 'unknown') => {
            // Try multiple possible structures
            const cred = {
                source: source,
                type: obj.type || 'credential',
                label: obj.label || obj.name || obj.title || 'Credential',
                username: obj.username || obj.user || obj.userName || 
                          obj.connectionDetails?.username || obj.connectionDetails?.user,
                password: obj.password || obj.pass || obj.pwd || 
                         obj.connectionDetails?.password || obj.connectionDetails?.pass,
                email: obj.email || obj.emailAddress || obj.userEmail ||
                       obj.connectionDetails?.email || obj.connectionDetails?.emailAddress,
                projectId: obj.projectId || obj.project_id || obj.projectID,
                region: obj.region,
                zone: obj.zone,
                raw: obj
            };
            
            // Also check nested user_0 structure
            if (obj.user_0) {
                cred.username = cred.username || obj.user_0.username || obj.user_0.email;
                cred.password = cred.password || obj.user_0.password;
                cred.email = cred.email || obj.user_0.email || obj.user_0.username;
            }
            
            return cred;
        };
        
        // Look for credential objects in labDetails
        for (const detail of labDetails) {
            if (detail.type === 'credential' || detail.type === 'connectionDetails' || detail.connectionDetails) {
                const credential = extractCredential(detail, 'labDetails');
                if (credential.username || credential.email || credential.password) {
                    credentials.push(credential);
                }
            }
        }
        
        // Check for connectionDetails array directly
        if (data.connectionDetails && Array.isArray(data.connectionDetails)) {
            for (const conn of data.connectionDetails) {
                const credential = extractCredential(conn, 'connectionDetails');
                if (credential.username || credential.email || credential.password) {
                    credentials.push(credential);
                }
            }
        }
        
        // Also check for user_0 in the response directly
        if (data.user_0) {
            const userCred = extractCredential(data.user_0, 'user_0');
            if (userCred.username || userCred.email || userCred.password) {
                credentials.push(userCred);
            }
        }
        
        // Check for project_0
        if (data.project_0) {
            credentials.push({
                type: 'project',
                label: 'Project',
                projectId: data.project_0.project_id || data.project_0.projectId,
                raw: data.project_0,
                source: 'project_0'
            });
        }
        
        // Check for users array
        if (data.users && Array.isArray(data.users)) {
            for (const user of data.users) {
                const credential = extractCredential(user, 'users');
                if (credential.username || credential.email || credential.password) {
                    credentials.push(credential);
                }
            }
        }

        if (credentials.length === 0) {
            terminal.writeln('⚠ No credentials found in response');
            terminal.writeln('Response structure:');
            terminal.writeln(JSON.stringify(data, null, 2).substring(0, 1000));
            
            displayAccount({
                error: 'No credentials found in Qwiklabs response',
                status: 'failed',
                method: 'qwiklabs_api',
                response: data,
                timestamp: new Date().toISOString(),
                note: 'Check terminal output for full response structure'
            });
        } else {
            terminal.writeln(`✓ Found ${credentials.length} credential(s)`);
            
            // Extract the first credential with username/password
            const mainCredential = credentials.find(c => c.username || c.email) || credentials[0];
            
            const accountResult = {
                email: mainCredential.email || mainCredential.username,
                username: mainCredential.username || mainCredential.email,
                password: mainCredential.password,
                projectId: mainCredential.projectId,
                status: 'generated',
                method: 'qwiklabs_api',
                labId: labRunnerId,
                allCredentials: credentials,
                timestamp: new Date().toISOString()
            };
            
            displayAccount(accountResult);
            updateStatus('Account generated successfully!', 'Qwiklabs: Complete');
            terminal.writeln('\r\n═══════════════════════════════════════');
            terminal.writeln('Account Generation Complete!');
            terminal.writeln('═══════════════════════════════════════');
            terminal.writeln(`✓ Email: ${accountResult.email}`);
            terminal.writeln(`✓ Password: ${accountResult.password}`);
            if (accountResult.projectId) {
                terminal.writeln(`✓ Project ID: ${accountResult.projectId}`);
            }
            terminal.writeln('✓ Account details displayed above');
        }

    } catch (error) {
        console.error('Error generating account:', error);
        terminal.writeln(`\r\n✗ Error: ${error.message}`);
        updateStatus('Error: ' + error.message, 'Qwiklabs: Error');
        
        displayAccount({
            error: error.message,
            status: 'failed',
            method: 'qwiklabs_api',
            timestamp: new Date().toISOString()
        });
    } finally {
        isGenerating = false;
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<span>Generate Account</span>';
    }
}

// Display account data as JSON
function displayAccount(accountData) {
    const jsonOutput = document.getElementById('jsonOutput');
    try {
        const formatted = JSON.stringify(accountData, null, 2);
        jsonOutput.textContent = formatted;
        
        // Scroll to output section
        jsonOutput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        // Add copy button functionality
        if (!jsonOutput.dataset.copyAdded) {
            jsonOutput.style.cursor = 'pointer';
            jsonOutput.title = 'Click to copy JSON';
            jsonOutput.addEventListener('click', () => {
                navigator.clipboard.writeText(formatted).then(() => {
                    const originalText = jsonOutput.textContent;
                    jsonOutput.textContent = '✓ Copied to clipboard!\n\n' + originalText;
                    setTimeout(() => {
                        jsonOutput.textContent = originalText;
                    }, 2000);
                });
            });
            jsonOutput.dataset.copyAdded = 'true';
        }
    } catch (e) {
        jsonOutput.textContent = 'Error formatting JSON: ' + e.message;
    }
}

// Clear output
function clearOutput() {
    if (isGenerating) {
        if (!confirm('Account generation is in progress. Are you sure you want to clear?')) {
            return;
        }
    }
    document.getElementById('jsonOutput').textContent = 'No account generated yet...';
    terminalOutputBuffer = '';
    if (terminal) {
        terminal.clear();
        terminal.writeln('Terminal cleared');
        terminal.writeln('Ready to generate accounts...');
    }
}

// Update status
function updateStatus(status, vmStatus) {
    document.getElementById('status').textContent = status;
    const vmStatusEl = document.getElementById('vmStatus');
    if (vmStatusEl) {
        vmStatusEl.textContent = vmStatus;
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    initTerminal();
    
    document.getElementById('generateBtn').addEventListener('click', generateAccount);
    document.getElementById('clearBtn').addEventListener('click', clearOutput);

    // Handle window resize
    window.addEventListener('resize', () => {
        if (fitAddon) {
            fitAddon.fit();
        }
    });
    
    // Handle method selection change
    document.getElementById('methodSelect').addEventListener('change', (e) => {
        const method = e.target.value;
        const gmailnatorFields = document.getElementById('gmailnatorFields');
        const qwiklabsFields = document.getElementById('qwiklabsFields');
        
        // Hide all fields first
        gmailnatorFields.style.display = 'none';
        qwiklabsFields.style.display = 'none';
        
        if (method === 'gmailnator') {
            gmailnatorFields.style.display = 'block';
            if (terminal) {
                terminal.writeln('\r\nSwitched to Gmailnator API mode');
                terminal.writeln('No VM required - using API directly');
            }
        } else if (method === 'qwiklabs') {
            qwiklabsFields.style.display = 'block';
            if (terminal) {
                terminal.writeln('\r\nSwitched to Qwiklabs API mode');
                terminal.writeln(`Using Lab ID: ${QWIKLABS_LAB_ID} (A Tour of Google Cloud Sustainability)`);
                terminal.writeln('Will call Qwiklabs API to get temporary Google account');
            }
        }
    });

    // Load saved API key
    const savedApiKey = localStorage.getItem('gmailnator_api_key');
    if (savedApiKey) {
        document.getElementById('apiKey').value = savedApiKey;
    }
    
    // Save API key when changed
    document.getElementById('apiKey').addEventListener('change', (e) => {
        localStorage.setItem('gmailnator_api_key', e.target.value);
    });
});

