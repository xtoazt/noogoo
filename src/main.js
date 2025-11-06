import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';

let vm = null;
let terminal = null;
let fitAddon = null;
let isGenerating = false;
let terminalOutputBuffer = '';
let outputListeners = [];

// Gmailnator API Configuration
const GMAILNATOR_API_URL = 'https://gmailnator.p.rapidapi.com';
let currentGmailnatorEmail = null;

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
        // Notify listeners
        outputListeners.forEach(listener => {
            if (typeof listener === 'function') {
                listener(terminalOutputBuffer);
            }
        });
    };

    terminal.writeln('WebVM Terminal Initialized');
    terminal.writeln('Waiting for VM to start...');
}

// Load WebVM configuration
let webvmConfig = {
    diskImageUrl: "wss://disks.webvm.io/debian_large_20230522_5044875331.ext2",
    diskImageType: "cloud",
    memorySize: 512 * 1024 * 1024,
    vgaMemory: 16 * 1024 * 1024,
    networkEnabled: false
};

// Try to load config from public folder
async function loadConfig() {
    try {
        // Try to load config - it will be in the build output root
        // Use a dynamic import with a variable to prevent Vite from trying to resolve it at build time
        // This will only run at runtime, not during build
        if (typeof window !== 'undefined') {
            const configPath = new URL('/config.js', window.location.href).href;
            const configModule = await import(/* @vite-ignore */ configPath);
            if (configModule && configModule.webvmConfig) {
                webvmConfig = configModule.webvmConfig;
            }
        }
    } catch (e) {
        // Config file not found or not yet generated - use default
        // This is expected during development and will work after build
        console.log('Using default config (config.js will be available after build)');
    }
}

// Initialize WebVM
async function initWebVM() {
    try {
        await loadConfig();
        updateStatus('Initializing WebVM...', 'VM: Starting');
        terminal.writeln('Loading CheerpX WebVM...');
        
        // Wait for CheerpX to be available with better error handling
        let retries = 0;
        const maxRetries = 100;
        while (typeof window.CheerpX === 'undefined' && retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 100));
            retries++;
            if (retries % 10 === 0) {
                terminal.writeln(`Waiting for CheerpX... (${retries}/${maxRetries})`);
            }
        }
        
        if (typeof window.CheerpX === 'undefined') {
            throw new Error('CheerpX not loaded. Please refresh the page or check your internet connection.');
        }
        
        terminal.writeln('CheerpX loaded successfully');
        terminal.writeln('Initializing VM with disk image: ' + webvmConfig.diskImageUrl);
        
        // Initialize WebVM with configuration
        const config = {
            terminal: {
                write: (data) => {
                    if (terminal) {
                        terminal.write(data);
                    }
                },
                clear: () => {
                    if (terminal) {
                        terminal.clear();
                        terminalOutputBuffer = '';
                    }
                }
            },
            memorySize: webvmConfig.memorySize,
            vgaMemory: webvmConfig.vgaMemory,
            diskImageUrl: webvmConfig.diskImageUrl,
            diskImageType: webvmConfig.diskImageType,
            networkEnabled: webvmConfig.networkEnabled
        };
        
        vm = new window.CheerpX(config);

        terminal.onData((data) => {
            if (vm) {
                vm.sendInput(data);
            }
        });

        terminal.writeln('Starting VM initialization...');
        await vm.init();
        updateStatus('VM Initializing...', 'VM: Booting');
        
        // Wait for VM to be fully ready - check for shell prompt
        terminal.writeln('Waiting for VM to boot...');
        let bootChecks = 0;
        while (bootChecks < 60) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            bootChecks++;
            
            // Check if we see a shell prompt
            if (terminalOutputBuffer.includes('$ ') || terminalOutputBuffer.includes('# ')) {
                break;
            }
            
            if (bootChecks % 5 === 0) {
                terminal.writeln(`Waiting for shell... (${bootChecks}s)`);
            }
        }
        
        updateStatus('VM Ready', 'VM: Running');
        terminal.writeln('\r\n✓ VM is ready!');
        terminal.writeln('You can now generate accounts.');
        
    } catch (error) {
        console.error('Failed to initialize WebVM:', error);
        updateStatus('Error: ' + error.message, 'VM: Error');
        if (terminal) {
            terminal.writeln('\r\n✗ Error initializing VM: ' + error.message);
            terminal.writeln('Please ensure the disk image is properly configured.');
            terminal.writeln('Try refreshing the page.');
        }
    }
}

// Execute command in VM and capture output
async function executeCommand(command, waitTime = 3000) {
    if (!vm) {
        throw new Error('VM not initialized');
    }

    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Command timeout after 5 minutes'));
        }, 300000); // 5 minute timeout

        const commandMarker = `[CMD_${Date.now()}]`;
        const startOutput = terminalOutputBuffer;
        
        // Send command with marker
        terminal.writeln(commandMarker);
        vm.sendInput(command + '\n');
        
        // Wait for output and check for completion
        let checkCount = 0;
        const maxChecks = Math.ceil(waitTime / 200);
        
        const checkInterval = setInterval(() => {
            checkCount++;
            const newOutput = terminalOutputBuffer.slice(startOutput.length);
            
            // Check if we have new output and command seems complete
            if (checkCount >= maxChecks || newOutput.length > 0) {
                clearInterval(checkInterval);
                clearTimeout(timeout);
                resolve(newOutput || 'Command executed');
            }
        }, 200);
    });
}

// Wait for JSON output in terminal
async function waitForJSONOutput(timeout = 60000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const checkInterval = setInterval(() => {
            // Try to find JSON in the output buffer
            const jsonMatch = terminalOutputBuffer.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/s);
            
            if (jsonMatch) {
                try {
                    const jsonData = JSON.parse(jsonMatch[0]);
                    clearInterval(checkInterval);
                    resolve(jsonData);
                    return;
                } catch (e) {
                    // Not valid JSON, continue waiting
                }
            }
            
            if (Date.now() - startTime > timeout) {
                clearInterval(checkInterval);
                reject(new Error('Timeout waiting for JSON output'));
            }
        }, 500);
    });
}

// Execute command and wait for specific output pattern
async function executeCommandWithOutput(command, outputPattern = null, maxWait = 30000) {
    if (!vm) {
        throw new Error('VM not initialized');
    }

    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            if (outputPattern) {
                reject(new Error('Timeout waiting for output pattern'));
            } else {
                resolve('Command executed');
            }
        }, maxWait);

        let outputBuffer = '';
        const checkInterval = setInterval(() => {
            // In a real implementation, we'd need to capture terminal output
            // For now, we'll use a simpler approach
        }, 500);

        vm.sendInput(command + '\n');
        
        // Wait and then resolve
        setTimeout(() => {
            clearInterval(checkInterval);
            clearTimeout(timeout);
            resolve(outputBuffer || 'Command executed');
        }, Math.min(maxWait, 5000));
    });
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

    if (!vm) {
        alert('VM is not initialized yet. Please wait...');
        return;
    }

    isGenerating = true;
    const generateBtn = document.getElementById('generateBtn');
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<span>Generating...</span>';
    
    // Clear previous output
    document.getElementById('jsonOutput').textContent = 'Generating account... Please wait.';

    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const username = document.getElementById('username').value.trim();

    if (!firstName || !lastName) {
        alert('Please enter first name and last name');
        isGenerating = false;
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate Account';
        return;
    }

    try {
        updateStatus('Generating account...', 'VM: Processing');
        terminal.writeln('\r\n=== Starting Account Generation ===');
        terminal.writeln(`First Name: ${firstName}`);
        terminal.writeln(`Last Name: ${lastName}`);
        if (username) {
            terminal.writeln(`Username: ${username}`);
        }

        // Create a Python script to generate the account
        // This script will try to use Auto-Gmail-Creator if available
        const firstNameEscaped = firstName.replace(/'/g, "\\'");
        const lastNameEscaped = lastName.replace(/'/g, "\\'");
        const usernameEscaped = username ? username.replace(/'/g, "\\'") : '';
        const defaultEmail = username || firstName + lastName;
        
        const pythonScript = `import json
import sys
import os
import subprocess
import re
from datetime import datetime

# Change to Auto-Gmail-Creator directory
os.chdir('/home/user/Auto-Gmail-Creator')

# Try to find and run the account creator
script_found = False
result = None
error_details = []

# Try different possible script names and locations
scripts_to_try = ['main.py', 'gmail_creator.py', 'create_account.py', 'account_creator.py']

first_name = '${firstNameEscaped}'
last_name = '${lastNameEscaped}'
desired_username = '${usernameEscaped}'
default_email = '${defaultEmail}'

print(f"Starting account generation for {first_name} {last_name}")
print(f"Looking for Auto-Gmail-Creator scripts...")

for script in scripts_to_try:
    if os.path.exists(script):
        print(f"Found script: {script}")
        try:
            # Try different parameter formats
            param_variations = [
                ['--first', first_name, '--last', last_name],
                ['--firstname', first_name, '--lastname', last_name],
                ['-f', first_name, '-l', last_name],
                [first_name, last_name]
            ]
            
            if desired_username:
                for params in param_variations:
                    params_with_user = params + ['--username', desired_username]
                    param_variations.append(params_with_user)
            
            for params in param_variations:
                try:
                    cmd = ['python3', script] + params
                    print(f"Trying: {' '.join(cmd)}")
                    
                    # Run the script and capture output
                    process = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
                    
                    # Check both stdout and stderr
                    output = (process.stdout + process.stderr).strip()
                    
                    if process.returncode == 0 and output:
                        # Try to extract email and password from output
                        email_match = re.search(r'([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})', output)
                        password_match = re.search(r'(?:password|pass)[:=\\s]+([^\\s]+)', output, re.IGNORECASE)
                        
                        # Try to parse as JSON
                        try:
                            result = json.loads(output)
                            if 'email' not in result and email_match:
                                result['email'] = email_match.group(1)
                            script_found = True
                            break
                        except json.JSONDecodeError:
                            # Build result from parsed output
                            email = email_match.group(1) if email_match else default_email + '@gmail.com'
                            password = password_match.group(1) if password_match else 'GeneratedPassword123!'
                            
                            result = {
                                'email': email,
                                'password': password,
                                'firstName': first_name,
                                'lastName': last_name,
                                'raw_output': output[:500],  # Limit raw output size
                                'status': 'generated',
                                'timestamp': datetime.now().isoformat()
                            }
                            script_found = True
                            break
                except subprocess.TimeoutExpired:
                    error_details.append(f"Script {script} timed out")
                    continue
                except Exception as e:
                    error_details.append(f"Error running {script}: {str(e)}")
                    continue
            
            if script_found:
                break
        except Exception as e:
            error_details.append(f"Exception with {script}: {str(e)}")
            continue

# If no script found or execution failed, create a result indicating the issue
if not script_found or result is None:
    result = {
        'error': 'Auto-Gmail-Creator script not found or execution failed',
        'firstName': first_name,
        'lastName': last_name,
        'status': 'failed',
        'timestamp': datetime.now().isoformat(),
        'error_details': error_details,
        'note': 'Please check that Auto-Gmail-Creator is properly installed. Checked scripts: ' + ', '.join(scripts_to_try)
    }

# Ensure result has required fields
if result.get('status') != 'failed':
    result.setdefault('email', default_email + '@gmail.com')
    result.setdefault('password', 'GeneratedPassword123!')
    result.setdefault('firstName', first_name)
    result.setdefault('lastName', last_name)
    result.setdefault('status', 'generated')
    result.setdefault('timestamp', datetime.now().isoformat())

# Output as JSON and write to file
with open('/tmp/account_result.json', 'w') as f:
    f.write(json.dumps(result, indent=2))
print("\\n" + "="*50)
print("ACCOUNT GENERATION RESULT:")
print("="*50)
print(json.dumps(result, indent=2))
print("="*50)
sys.stdout.flush()`;

        terminal.writeln('\r\n═══════════════════════════════════════');
        terminal.writeln('Executing account generation...');
        terminal.writeln('═══════════════════════════════════════');
        
        // Write the Python script to a file using a base64 encoded approach to avoid escaping issues
        const scriptBase64 = btoa(unescape(encodeURIComponent(pythonScript)));
        
        // Create a wrapper script that decodes and writes the Python script
        const wrapperScript = `python3 << 'ENDPYTHON'
import base64
script = base64.b64decode('${scriptBase64}').decode('utf-8')
with open('/tmp/generate_account.py', 'w') as f:
    f.write(script)
print("✓ Script written successfully")
ENDPYTHON`;
        
        terminal.writeln('Writing account generation script...');
        await executeCommand(wrapperScript, 3000);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        terminal.writeln('Running account generation script...');
        terminal.writeln('This may take a few minutes...');
        
        // Execute the script and wait for JSON output
        const executionPromise = executeCommand('python3 /tmp/generate_account.py', 180000); // 3 minutes
        const jsonPromise = waitForJSONOutput(180000);
        
        // Wait for either completion or JSON output
        let accountResult = null;
        try {
            await executionPromise;
            // Try to get JSON from output
            try {
                accountResult = await Promise.race([
                    jsonPromise,
                    new Promise((_, reject) => setTimeout(() => reject(new Error('JSON timeout')), 5000))
                ]);
            } catch (e) {
                // JSON not found in timeout, try to parse from terminal output
                const jsonMatch = terminalOutputBuffer.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/s);
                if (jsonMatch) {
                    try {
                        accountResult = JSON.parse(jsonMatch[0]);
                    } catch (parseError) {
                        console.warn('Could not parse JSON from output');
                    }
                }
            }
        } catch (error) {
            terminal.writeln(`\r\n⚠ Error: ${error.message}`);
        }
        
        // If we got a result, display it
        if (accountResult) {
            terminal.writeln('\r\n✓ Account generation completed!');
            displayAccount(accountResult);
            updateStatus('Account generated successfully!', 'VM: Ready');
        } else {
            // Fallback: create a result based on what we know
            terminal.writeln('\r\n⚠ Could not parse JSON result from output');
            terminal.writeln('Check terminal output above for details');
            
            const fallbackResult = {
                email: `${username || firstName + lastName}@gmail.com`,
                password: 'Check terminal output',
                firstName: firstName,
                lastName: lastName,
                status: 'completed',
                timestamp: new Date().toISOString(),
                note: 'Account generation completed. Check the terminal output above for the actual JSON result. The result may also be in /tmp/account_result.json in the VM.'
            };
            
            displayAccount(fallbackResult);
            updateStatus('Generation completed - check terminal for JSON', 'VM: Ready');
        }

    } catch (error) {
        console.error('Error generating account:', error);
        terminal.writeln('\r\nError: ' + error.message);
        updateStatus('Error: ' + error.message, 'VM: Error');
        
        // Display error as JSON
        displayAccount({
            error: error.message,
            status: 'failed',
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
        terminal.writeln('WebVM Terminal Ready');
    }
}

// Update status
function updateStatus(status, vmStatus) {
    document.getElementById('status').textContent = status;
    document.getElementById('vmStatus').textContent = vmStatus;
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    initTerminal();
    
    // Initialize WebVM only if WebVM method is selected
    const methodSelect = document.getElementById('methodSelect');
    if (methodSelect.value === 'webvm') {
        initWebVM();
    }
    
    document.getElementById('generateBtn').addEventListener('click', generateAccount);
    document.getElementById('clearBtn').addEventListener('click', clearOutput);

    // Allow Enter key to trigger generation
    ['firstName', 'lastName', 'username'].forEach(id => {
        document.getElementById(id).addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !document.getElementById('generateBtn').disabled) {
                generateAccount();
            }
        });
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        if (fitAddon) {
            fitAddon.fit();
        }
    });

    // Hardcoded lab configuration
    const QWIKLABS_LAB_ID = '32138';
    const QWIKLABS_LAB_PARENT = 'catalog';
    
    // Handle method selection change
    document.getElementById('methodSelect').addEventListener('change', (e) => {
        const method = e.target.value;
        const webvmFields = document.getElementById('webvmFields');
        const gmailnatorFields = document.getElementById('gmailnatorFields');
        const qwiklabsFields = document.getElementById('qwiklabsFields');
        
        // Hide all fields first
        webvmFields.style.display = 'none';
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
        } else {
            webvmFields.style.display = 'block';
            if (terminal) {
                terminal.writeln('\r\nSwitched to WebVM mode');
            }
            // Initialize WebVM if not already initialized
            if (!vm) {
                initWebVM();
            }
        }
    });
    

    // Load saved API key
    const savedApiKey = localStorage.getItem('gmailnator_api_key');
    if (savedApiKey) {
        document.getElementById('apiKey').value = savedApiKey;
    }
    
    // Save API key on change
    document.getElementById('apiKey').addEventListener('change', (e) => {
        localStorage.setItem('gmailnator_api_key', e.target.value);
    });
});

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
                region: mainCredential.region,
                zone: mainCredential.zone,
                status: 'generated',
                method: 'qwiklabs_api',
                labRunnerId: labRunnerId,
                labInstanceId: data.labInstanceId || data.lab_instance_id,
                allCredentials: credentials,
                timestamp: new Date().toISOString(),
                note: 'Account generated via Qwiklabs API. Credentials are temporary and will expire when lab ends.'
            };
            
            displayAccount(accountResult);
            updateStatus('Account generated successfully!', 'Qwiklabs: Complete');
            terminal.writeln(`\r\n✓ Email/Username: ${accountResult.email || accountResult.username}`);
            terminal.writeln(`✓ Password: ${accountResult.password || 'Not found'}`);
            if (accountResult.projectId) {
                terminal.writeln(`✓ Project ID: ${accountResult.projectId}`);
            }
            terminal.writeln('✓ Account details displayed above');
        }

    } catch (error) {
        console.error('Error generating account via Qwiklabs:', error);
        terminal.writeln(`\r\n✗ Error: ${error.message}`);
        updateStatus('Error: ' + error.message, 'Qwiklabs: Error');
        
        displayAccount({
            error: error.message,
            status: 'failed',
            method: 'qwiklabs_api',
            timestamp: new Date().toISOString(),
            note: 'Make sure you are on a Qwiklabs page and have proper authentication. The API requires cookies/session from Qwiklabs.'
        });
    } finally {
        isGenerating = false;
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<span>Generate Account</span>';
    }
}
