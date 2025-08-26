/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { marked } from 'marked';
// DOM elements
const chatContainer = document.getElementById('chat-container');
const chatHistory = document.getElementById('chat-history');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const loadingIndicator = document.getElementById('loading-indicator');
// Application state
let isInSettingsMode = false;
let settingsScreen = null;
// Local server endpoints
const LOCAL_EXEC_URL = 'http://localhost:3000/execute';
const CHAT_URL = 'http://localhost:3000/chat';
const TTS_URL = 'http://localhost:3000/tts';
// TTS state and settings
let isTtsEnabled = true;
let selectedVoice = 'en-US-Wavenet-D';
let selectedSpeed = 1.0;
const voices = [
    { name: 'Jarvis (Default)', id: 'en-US-Wavenet-D' },
    { name: 'Female 1', id: 'en-US-Wavenet-F' },
    { name: 'Male News 1', id: 'en-US-News-M' },
    { name: 'Female News 1', id: 'en-US-News-K' },
    { name: 'Female Standard 1', id: 'en-US-Standard-E' },
];
/**
 * Creates and manages the TTS and settings UI.
 */
function createHeaderUI() {
    const header = document.createElement('div');
    header.className = 'header-ui';
    // Settings Panel
    const settingsPanel = document.createElement('div');
    settingsPanel.id = 'settings-panel';
    settingsPanel.className = 'hidden';
    // Voice selection
    const voiceLabel = document.createElement('label');
    voiceLabel.htmlFor = 'voice-select';
    voiceLabel.textContent = 'Voice:';
    const voiceSelect = document.createElement('select');
    voiceSelect.id = 'voice-select';
    voices.forEach(voice => {
        const option = document.createElement('option');
        option.value = voice.id;
        option.textContent = voice.name;
        voiceSelect.appendChild(option);
    });
    voiceSelect.onchange = () => {
        selectedVoice = voiceSelect.value;
    };
    settingsPanel.appendChild(voiceLabel);
    settingsPanel.appendChild(voiceSelect);
    // Speed control
    const speedLabel = document.createElement('label');
    speedLabel.htmlFor = 'speed-slider';
    speedLabel.textContent = 'Speed:';
    const speedSlider = document.createElement('input');
    speedSlider.type = 'range';
    speedSlider.id = 'speed-slider';
    speedSlider.min = '0.5';
    speedSlider.max = '2.0';
    speedSlider.step = '0.1';
    speedSlider.value = '1.0';
    const speedValue = document.createElement('span');
    speedValue.id = 'speed-value';
    speedValue.textContent = '1.0x';
    speedSlider.oninput = () => {
        selectedSpeed = parseFloat(speedSlider.value);
        speedValue.textContent = `${selectedSpeed.toFixed(1)}x`;
    };
    settingsPanel.appendChild(speedLabel);
    settingsPanel.appendChild(speedSlider);
    settingsPanel.appendChild(speedValue);
    // Settings Button
    const settingsButton = document.createElement('button');
    settingsButton.id = 'settings-button';
    settingsButton.title = 'Voice Settings';
    settingsButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59-1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"></path></svg>`;
    settingsButton.onclick = () => {
        if (isInSettingsMode) {
            exitSettingsMode();
        }
        else {
            enterSettingsMode();
        }
    };
    // TTS Toggle Button
    const ttsButton = document.createElement('button');
    ttsButton.id = 'tts-button';
    ttsButton.title = 'Toggle Voice';
    ttsButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></path></svg>`;
    ttsButton.onclick = () => {
        isTtsEnabled = !isTtsEnabled;
        ttsButton.classList.toggle('disabled', !isTtsEnabled);
    };
    header.appendChild(settingsButton);
    header.appendChild(ttsButton);
    header.appendChild(settingsPanel);
    chatContainer.prepend(header);
}
/**
 * Creates the full settings screen interface.
 */
function createSettingsScreen() {
    const settingsScreen = document.createElement('div');
    settingsScreen.className = 'settings-screen';
    settingsScreen.innerHTML = `
        <div class="settings-header">
            <h1>⚙️ Jarvis Settings</h1>
            <button class="back-to-chat">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.42-1.41L7.83 13H20v-2z"/>
                </svg>
                Back to Chat
            </button>
        </div>
        
        <div class="settings-grid">
            <div class="settings-card">
                <h3>🎤 Voice Settings</h3>
                <div class="setting-group">
                    <label for="settings-voice-select">Voice Model:</label>
                    <select id="settings-voice-select">
                        ${voices.map(voice => `<option value="${voice.id}" ${voice.id === selectedVoice ? 'selected' : ''}>${voice.name}</option>`).join('')}
                    </select>
                </div>
                
                <div class="setting-group">
                    <label for="settings-speed-slider">Speaking Speed:</label>
                    <div class="slider-container">
                        <input type="range" id="settings-speed-slider" min="0.5" max="2.0" step="0.1" value="${selectedSpeed}">
                        <span id="settings-speed-value">${selectedSpeed.toFixed(1)}x</span>
                    </div>
                </div>
                
                <div class="setting-group">
                    <label class="toggle-container">
                        <input type="checkbox" id="settings-tts-enabled" ${isTtsEnabled ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                        Enable Text-to-Speech
                    </label>
                </div>
                
                <button id="test-voice-btn" class="action-button">Test Voice</button>
            </div>
            
            <div class="settings-card">
                <h3>🎨 Appearance</h3>
                <div class="setting-group">
                    <label>Theme:</label>
                    <div class="theme-selector">
                        <button class="theme-option active" data-theme="neon-green">Neon Green</button>
                        <button class="theme-option" data-theme="neon-blue">Neon Blue</button>
                        <button class="theme-option" data-theme="neon-purple">Neon Purple</button>
                    </div>
                </div>
                
                <div class="setting-group">
                    <label for="chat-opacity">Chat Bubble Opacity:</label>
                    <div class="slider-container">
                        <input type="range" id="chat-opacity" min="0.7" max="1.0" step="0.1" value="0.9">
                        <span id="opacity-value">90%</span>
                    </div>
                </div>
            </div>
            
            <div class="settings-card">
                <h3>💬 Chat Settings</h3>
                <div class="setting-group">
                    <label class="toggle-container">
                        <input type="checkbox" id="auto-scroll" checked>
                        <span class="toggle-slider"></span>
                        Auto-scroll to new messages
                    </label>
                </div>
                
                <div class="setting-group">
                    <label class="toggle-container">
                        <input type="checkbox" id="show-timestamps">
                        <span class="toggle-slider"></span>
                        Show message timestamps
                    </label>
                </div>
                
                <div class="setting-group">
                    <label for="max-messages">Max chat history:</label>
                    <select id="max-messages">
                        <option value="50">50 messages</option>
                        <option value="100" selected>100 messages</option>
                        <option value="200">200 messages</option>
                        <option value="unlimited">Unlimited</option>
                    </select>
                </div>
            </div>
            
            <div class="settings-card">
                <h3>🖥️ System</h3>
                <div class="setting-group">
                    <button id="clear-chat-btn" class="action-button danger">Clear Chat History</button>
                </div>
                
                <div class="setting-group">
                    <button id="reset-settings-btn" class="action-button danger">Reset All Settings</button>
                </div>
                
                <div class="setting-group">
                    <label>Local Server Status:</label>
                    <div id="server-status" class="status-indicator">
                        <div class="status-dot"></div>
                        <span>Checking...</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    return settingsScreen;
}
/**
 * Enters settings mode with smooth animation.
 */
function enterSettingsMode() {
    console.log('GUI: Entering settings mode.');
    isInSettingsMode = true;
    chatContainer.classList.add('morphing-to-settings');
    // Create settings screen if it doesn't exist
    if (!settingsScreen) {
        console.log('GUI: Creating settings screen.');
        settingsScreen = createSettingsScreen();
        chatContainer.appendChild(settingsScreen);
        setupSettingsEventListeners();
    }
    // Animate transition
    setTimeout(() => {
        chatContainer.classList.remove('morphing-to-settings');
        chatContainer.classList.add('settings-mode');
        settingsScreen.classList.add('active');
        checkServerStatus();
    }, 300);
}
/**
 * Exits settings mode and returns to chat.
 */
function exitSettingsMode() {
    if (!isInSettingsMode)
        return;
    console.log('GUI: Exiting settings mode.');
    isInSettingsMode = false;
    chatContainer.classList.add('morphing-to-settings');
    settingsScreen.classList.remove('active');
    setTimeout(() => {
        chatContainer.classList.remove('morphing-to-settings', 'settings-mode');
        chatInput.focus();
    }, 300);
}
/**
 * Sets up event listeners for settings screen controls.
 */
function setupSettingsEventListeners() {
    console.log('GUI: Setting up settings event listeners.');
    if (!settingsScreen)
        return;
    // Back button
    const backBtn = settingsScreen.querySelector('.back-to-chat');
    backBtn.onclick = exitSettingsMode;
    // Voice settings
    const voiceSelect = settingsScreen.querySelector('#settings-voice-select');
    voiceSelect.onchange = () => {
        selectedVoice = voiceSelect.value;
        // Update header voice select too
        const headerVoiceSelect = document.getElementById('voice-select');
        if (headerVoiceSelect)
            headerVoiceSelect.value = selectedVoice;
        console.log('GUI: Voice changed to', selectedVoice);
    };
    const speedSlider = settingsScreen.querySelector('#settings-speed-slider');
    const speedValue = settingsScreen.querySelector('#settings-speed-value');
    speedSlider.oninput = () => {
        selectedSpeed = parseFloat(speedSlider.value);
        speedValue.textContent = `${selectedSpeed.toFixed(1)}x`;
        // Update header speed slider too
        const headerSpeedSlider = document.getElementById('speed-slider');
        const headerSpeedValue = document.getElementById('speed-value');
        if (headerSpeedSlider)
            headerSpeedSlider.value = selectedSpeed.toString();
        if (headerSpeedValue)
            headerSpeedValue.textContent = `${selectedSpeed.toFixed(1)}x`;
        console.log('GUI: Speed changed to', selectedSpeed);
    };
    const ttsToggle = settingsScreen.querySelector('#settings-tts-enabled');
    ttsToggle.onchange = () => {
        isTtsEnabled = ttsToggle.checked;
        // Update header TTS button
        const ttsButton = document.getElementById('tts-button');
        if (ttsButton)
            ttsButton.classList.toggle('disabled', !isTtsEnabled);
        console.log('GUI: TTS enabled state changed to', isTtsEnabled);
    };
    // Test voice button
    const testVoiceBtn = settingsScreen.querySelector('#test-voice-btn');
    testVoiceBtn.onclick = () => {
        console.log('GUI: Testing voice.');
        speakText("Hello! This is a test of the selected voice settings. How do I sound?");
    };
    // Clear chat button
    const clearChatBtn = settingsScreen.querySelector('#clear-chat-btn');
    clearChatBtn.onclick = () => {
        console.log('GUI: Clear chat button clicked.');
        if (confirm('Are you sure you want to clear the chat history? This cannot be undone.')) {
            chatHistory.innerHTML = '';
            addMessage('ai', 'Chat history cleared. Hello again! How can I help you today?');
            console.log('GUI: Chat history cleared.');
        }
    };
    // Reset settings button
    const resetSettingsBtn = settingsScreen.querySelector('#reset-settings-btn');
    resetSettingsBtn.onclick = () => {
        console.log('GUI: Reset settings button clicked.');
        if (confirm('Are you sure you want to reset all settings to default? This cannot be undone.')) {
            resetToDefaults();
            console.log('GUI: All settings reset to defaults.');
        }
    };
    // Theme selector
    const themeOptions = settingsScreen.querySelectorAll('.theme-option');
    themeOptions.forEach(option => {
        option.onclick = () => {
            themeOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            // Theme switching logic would go here
            console.log('GUI: Theme changed to', option.dataset.theme);
        };
    });
    // Opacity slider
    const opacitySlider = settingsScreen.querySelector('#chat-opacity');
    const opacityValue = settingsScreen.querySelector('#opacity-value');
    opacitySlider.oninput = () => {
        const value = parseFloat(opacitySlider.value);
        opacityValue.textContent = `${Math.round(value * 100)}%`;
        document.documentElement.style.setProperty('--bubble-opacity', value.toString());
        console.log('GUI: Opacity changed to', value);
    };
}
/**
 * Resets all settings to their default values.
 */
function resetToDefaults() {
    isTtsEnabled = true;
    selectedVoice = 'en-US-Wavenet-D';
    selectedSpeed = 1.0;
    // Update all UI elements
    const ttsButton = document.getElementById('tts-button');
    if (ttsButton)
        ttsButton.classList.remove('disabled');
    const headerVoiceSelect = document.getElementById('voice-select');
    if (headerVoiceSelect)
        headerVoiceSelect.value = selectedVoice;
    const headerSpeedSlider = document.getElementById('speed-slider');
    const headerSpeedValue = document.getElementById('speed-value');
    if (headerSpeedSlider)
        headerSpeedSlider.value = selectedSpeed.toString();
    if (headerSpeedValue)
        headerSpeedValue.textContent = `${selectedSpeed.toFixed(1)}x`;
    // Update settings screen elements if they exist
    if (settingsScreen) {
        const settingsVoiceSelect = settingsScreen.querySelector('#settings-voice-select');
        const settingsSpeedSlider = settingsScreen.querySelector('#settings-speed-slider');
        const settingsSpeedValue = settingsScreen.querySelector('#settings-speed-value');
        const settingsTtsToggle = settingsScreen.querySelector('#settings-tts-enabled');
        if (settingsVoiceSelect)
            settingsVoiceSelect.value = selectedVoice;
        if (settingsSpeedSlider)
            settingsSpeedSlider.value = selectedSpeed.toString();
        if (settingsSpeedValue)
            settingsSpeedValue.textContent = `${selectedSpeed.toFixed(1)}x`;
        if (settingsTtsToggle)
            settingsTtsToggle.checked = isTtsEnabled;
    }
    document.documentElement.style.setProperty('--bubble-opacity', '0.9');
}
/**
 * Checks the local server status.
 */
async function checkServerStatus() {
    console.log('GUI: Checking server status.');
    const statusIndicator = settingsScreen?.querySelector('#server-status');
    if (!statusIndicator) {
        console.log('GUI: Status indicator not found.');
        return;
    }
    const statusDot = statusIndicator.querySelector('.status-dot');
    const statusText = statusIndicator.querySelector('span');
    try {
        const response = await fetch('http://localhost:3000/health', {
            method: 'GET',
            signal: AbortSignal.timeout(3000)
        });
        if (response.ok) {
            statusDot.className = 'status-dot online';
            statusText.textContent = 'Server Online';
            console.log('GUI: Server status is ONLINE.');
        }
        else {
            statusDot.className = 'status-dot warning';
            statusText.textContent = 'Server Issues';
            console.log('GUI: Server status is WARNING (responding with errors).');
        }
    }
    catch (error) {
        statusDot.className = 'status-dot offline';
        statusText.textContent = 'Server Offline';
        console.log('GUI: Server status is OFFLINE.');
    }
}
/**
 * Fetches audio from the server and plays it.
 * @param text - The text to synthesize.
 */
async function speakText(text) {
    if (!isTtsEnabled)
        return;
    console.log('GUI: Attempting to speak text:', text);
    const plainText = text
        .replace(/```[^`]+```/g, 'code snippet')
        .replace(/`[^`]+`/g, 'code')
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
    try {
        const response = await fetch(TTS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: plainText,
                voice: selectedVoice,
                speakingRate: selectedSpeed
            }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`TTS server error: ${response.status} ${errorText}`);
        }
        const { audioContent } = await response.json();
        if (audioContent) {
            console.log('GUI: Successfully received audio content. Playing audio.');
            const audio = new Audio(`data:audio/mp3;base64,${audioContent}`);
            audio.play();
        }
    }
    catch (error) {
        console.error('GUI: Failed to speak text:', error);
    }
}
/**
 * Appends a message to the chat history and adds run buttons to code blocks.
 * @param sender - 'user' or 'ai'.
 * @param message - The message content (can be markdown).
 */
async function addMessage(sender, message) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', sender);
    const rawHtml = await marked.parse(message, { breaks: true, gfm: true });
    messageElement.innerHTML = rawHtml;
    chatHistory.appendChild(messageElement);
    console.log(`GUI: Added message from ${sender}: ${message}`);
    if (sender === 'ai') {
        addRunButtons(messageElement);
        speakText(message);
    }
    chatHistory.scrollTop = chatHistory.scrollHeight;
}
/**
 * Finds Python code blocks within a given element and appends a "Run" button.
 * @param scopeElement - The HTML element to search within.
 */
function addRunButtons(scopeElement) {
    const codeBlocks = scopeElement.querySelectorAll('pre code.language-python');
    codeBlocks.forEach((codeBlock) => {
        const preElement = codeBlock.parentElement;
        if (preElement instanceof HTMLPreElement &&
            !preElement.nextElementSibling?.classList.contains('run-button-container')) {
            const code = codeBlock.innerText;
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'run-button-container';
            const runButton = document.createElement('button');
            runButton.className = 'run-button';
            runButton.innerText = 'Run Code Locally';
            runButton.onclick = () => executeCodeLocally(code, preElement);
            buttonContainer.appendChild(runButton);
            preElement.insertAdjacentElement('afterend', buttonContainer);
            console.log('GUI: Added "Run Code Locally" button to a Python code block.');
        }
    });
}
/**
 * Sends code to the local server for execution and displays the result.
 * @param code - The Python code to execute.
 * @param preElement - The <pre> element containing the code, used for placing the result.
 */
async function executeCodeLocally(code, preElement) {
    const container = preElement.nextElementSibling;
    if (!container)
        return;
    const runButton = container.querySelector('.run-button');
    runButton.disabled = true;
    runButton.innerText = 'Running...';
    const oldResult = container.querySelector('.code-result');
    if (oldResult) {
        oldResult.remove();
    }
    console.log('GUI: Sending code to local executor:', code);
    try {
        const response = await fetch(LOCAL_EXEC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error('GUI: Server responded with an error:', errorText);
            throw new Error(`Server error: ${response.status} ${errorText}`);
        }
        const result = await response.json();
        console.log('GUI: Received execution result:', result);
        const resultElement = document.createElement('div');
        resultElement.className = 'code-result';
        let outputHtml = '<strong>Execution Result:</strong>';
        if (result.output) {
            outputHtml += `<pre>${result.output}</pre>`;
        }
        if (result.error) {
            outputHtml += `<pre class="error">${result.error}</pre>`;
        }
        if (!result.output && !result.error) {
            outputHtml += `<pre>(No output)</pre>`;
        }
        resultElement.innerHTML = outputHtml;
        container.appendChild(resultElement);
    }
    catch (error) {
        console.error('GUI: Local execution error:', error);
        const errorElement = document.createElement('div');
        errorElement.className = 'code-result';
        let errorMessage = 'Failed to execute code. Is your local server running? Check browser console for details.';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        errorElement.innerHTML = `<strong>Execution Error:</strong><br><pre class="error">${errorMessage}</pre>`;
        container.appendChild(errorElement);
    }
    finally {
        runButton.disabled = false;
        runButton.innerText = 'Run Code Locally';
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }
}
/**
 * Handles the chat form submission and detects special commands.
 * @param e - The form submission event.
 */
async function handleFormSubmit(e) {
    e.preventDefault();
    const prompt = chatInput.value.trim();
    if (!prompt)
        return;
    addMessage('user', prompt);
    chatInput.value = '';
    chatInput.disabled = true;
    chatForm.querySelector('button').disabled = true;
    loadingIndicator.classList.remove('hidden');
    // Check for local commands (GUI-only) first.
    if (prompt.toLowerCase() === '/settings') {
        console.log('GUI: Detected local /settings command. Skipping server call.');
        enterSettingsMode();
        // Re-enable input immediately as no server call is needed.
        chatInput.disabled = false;
        chatForm.querySelector('button').disabled = false;
        loadingIndicator.classList.add('hidden');
        chatInput.focus();
        return;
    }
    if (prompt.toLowerCase() === '/help') {
        console.log('GUI: Detected local /help command. Skipping server call.');
        const helpMessage = `**Available Commands:**
        
• \`/settings\` - Open the settings panel
• \`/help\` - Show this help message  
• \`/clear\` - Clear chat history
• \`/status\` - Check server status
        
You can also ask me anything about Multi-Party Computation or request code examples!`;
        addMessage('ai', helpMessage);
        // Re-enable input immediately as no server call is needed.
        chatInput.disabled = false;
        chatForm.querySelector('button').disabled = false;
        loadingIndicator.classList.add('hidden');
        chatInput.focus();
        return;
    }
    if (prompt.toLowerCase() === '/clear') {
        console.log('GUI: Detected local /clear command. Skipping server call.');
        chatHistory.innerHTML = '';
        addMessage('ai', 'Chat history cleared. How can I help you today?');
        // Re-enable input immediately as no server call is needed.
        chatInput.disabled = false;
        chatForm.querySelector('button').disabled = false;
        loadingIndicator.classList.add('hidden');
        chatInput.focus();
        return;
    }
    if (prompt.toLowerCase() === '/status') {
        console.log('GUI: Detected local /status command. Pinging server.');
        try {
            const response = await fetch('http://localhost:3000/health', {
                method: 'GET',
                signal: AbortSignal.timeout(3000)
            });
            if (response.ok) {
                addMessage('ai', '✅ **Server Status:** Online and ready!');
            }
            else {
                addMessage('ai', '⚠️ **Server Status:** Server responding with errors.');
            }
        }
        catch (error) {
            addMessage('ai', '❌ **Server Status:** Server appears to be offline.');
        }
        // Re-enable input after server check.
        chatInput.disabled = false;
        chatForm.querySelector('button').disabled = false;
        loadingIndicator.classList.add('hidden');
        chatInput.focus();
        return;
    }
    // --- All other prompts are sent to the server ---
    console.log('GUI: Sending prompt to server for AI processing.');
    try {
        const response = await fetch(CHAT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error('GUI: Server responded with an error:', errorText);
            throw new Error(`Server error: ${response.status} ${errorText}`);
        }
        const result = await response.json();
        console.log('GUI: Raw JSON response from server:', result);
        // Check if the response contains a tool command
        if (result.response === 'DISPLAY_SETTINGS_CMD') {
            console.log('GUI: Detected "DISPLAY_SETTINGS_CMD" from server. Calling enterSettingsMode().');
            enterSettingsMode();
        }
        else {
            console.log('GUI: Displaying AI response.');
            addMessage('ai', result.response);
        }
    }
    catch (error) {
        console.error('GUI: API Error:', error);
        addMessage('ai', `Sorry, something went wrong. Please check the console for details.`);
    }
    finally {
        chatInput.disabled = false;
        chatForm.querySelector('button').disabled = false;
        loadingIndicator.classList.add('hidden');
        chatInput.focus();
    }
}
// --- Initial Setup ---
createHeaderUI();
chatForm.addEventListener('submit', handleFormSubmit);
// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Escape key to exit settings
    if (e.key === 'Escape' && isInSettingsMode) {
        exitSettingsMode();
    }
    // Ctrl/Cmd + comma for settings
    if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        if (isInSettingsMode) {
            exitSettingsMode();
        }
        else {
            enterSettingsMode();
        }
    }
});
// Initial welcome message
addMessage('ai', 'Hello! I am Jarvis, your assistant!  How can I help you today?\n\n💡 **Tip:** Type `/settings` to customize your experience, or `/help` for more commands!');
