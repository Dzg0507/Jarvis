"use strict";
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
const marked_1 = require("marked");
// DOM elements
const chatContainer = document.getElementById('chat-container');
const chatHistory = document.getElementById('chat-history');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const loadingIndicator = document.getElementById('loading-indicator');
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
        settingsPanel.classList.toggle('hidden');
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
 * Fetches audio from the server and plays it.
 * @param text - The text to synthesize.
 */
async function speakText(text) {
    if (!isTtsEnabled)
        return;
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
            const audio = new Audio(`data:audio/mp3;base64,${audioContent}`);
            audio.play();
        }
    }
    catch (error) {
        console.error('Failed to speak text:', error);
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
    const rawHtml = await marked_1.marked.parse(message, { breaks: true, gfm: true });
    messageElement.innerHTML = rawHtml;
    chatHistory.appendChild(messageElement);
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
        }
    });
}
/**
 * Sends code to the local server for execution and displays the result.
 * @param code - The Python code to execute.
 *param preElement - The <pre> element containing the code, used for placing the result.
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
    try {
        const response = await fetch(LOCAL_EXEC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server error: ${response.status} ${errorText}`);
        }
        const result = await response.json();
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
        const errorElement = document.createElement('div');
        errorElement.className = 'code-result';
        let errorMessage = 'Failed to execute code. Is your local server running? Check browser console for details.';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        errorElement.innerHTML = `<strong>Execution Error:</strong><br><pre class="error">${errorMessage}</pre>`;
        container.appendChild(errorElement);
        console.error('Local execution error:', error);
    }
    finally {
        runButton.disabled = false;
        runButton.innerText = 'Run Code Locally';
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }
}
/**
 * Handles the chat form submission.
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
    try {
        const response = await fetch(CHAT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server error: ${response.status} ${errorText}`);
        }
        const result = await response.json();
        addMessage('ai', result.response);
    }
    catch (error) {
        console.error('API Error:', error);
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
// Initial welcome message
addMessage('ai', 'Hello! I am Jarvis, your assistant for Multi-Party Computation. How can I help you today?');
