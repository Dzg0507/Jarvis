/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { marked } from 'marked';

// DOM elements
const chatContainer = document.getElementById('chat-container')!;
const chatHistory = document.getElementById('chat-history')!;
const chatForm = document.getElementById('chat-form')!;
const chatInput = document.getElementById('chat-input') as HTMLInputElement;
const loadingIndicator = document.getElementById('loading-indicator')!;

// Local server endpoints
const LOCAL_EXEC_URL = 'http://localhost:3000/execute';
const CHAT_URL = 'http://localhost:3000/chat';
const TTS_URL = 'http://localhost:3000/tts';
const DIRECT_VIDEO_URL = 'http://localhost:3000/direct-video-search';

// TTS state and settings
let isTtsEnabled = true;
let selectedVoice = 'en-US-Wavenet-D';
let selectedSpeed = 1.0;
let currentAudio: HTMLAudioElement | null = null;

const voices = [
    { name: 'Jarvis (Default)', id: 'en-US-Wavenet-D' },
    { name: 'Female 1', id: 'en-US-Wavenet-F' },
    { name: 'Male News 1', id: 'en-US-News-M' },
    { name: 'Female News 1', id: 'en-US-News-K' },
    { name: 'Female Standard 1', id: 'en-US-Standard-E' },
];

function createHeaderUI() {
    const header = document.createElement('div');
    header.className = 'header-ui';
    const settingsPanel = document.createElement('div');
    settingsPanel.id = 'settings-panel';
    settingsPanel.className = 'hidden';
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
    voiceSelect.onchange = () => { selectedVoice = voiceSelect.value; };
    settingsPanel.appendChild(voiceLabel);
    settingsPanel.appendChild(voiceSelect);
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
    const settingsButton = document.createElement('button');
    settingsButton.id = 'settings-button';
    settingsButton.title = 'Voice Settings';
    settingsButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61-.25-1.17.59-1.69-.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19-.15-.24.42-.12-.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69-.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"></path></svg>`;
    settingsButton.onclick = () => { settingsPanel.classList.toggle('hidden'); };
    const ttsButton = document.createElement('button');
    ttsButton.id = 'tts-button';
    ttsButton.title = 'Toggle Voice';
    ttsButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></path></svg>`;
    ttsButton.onclick = () => {
        isTtsEnabled = !isTtsEnabled;
        ttsButton.classList.toggle('disabled', !isTtsEnabled);
        if (!isTtsEnabled && currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
        }
    };
    header.appendChild(settingsButton);
    header.appendChild(ttsButton);
    header.appendChild(settingsPanel);
    chatContainer.prepend(header);
}

async function speakText(text: string) {
    if (!isTtsEnabled) return;
    if (currentAudio) currentAudio.pause();
    const plainText = text.replace(/```[^`]+```/g, 'code snippet').replace(/`[^`]+`/g, 'code').replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
    try {
        const response = await fetch(TTS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: plainText, voice: selectedVoice, speakingRate: selectedSpeed }),
        });
        if (!response.ok) throw new Error(`TTS server error: ${response.status} ${await response.text()}`);
        const { audioContent } = await response.json();
        if (audioContent) {
            currentAudio = new Audio(`data:audio/mp3;base64,${audioContent}`);
            currentAudio.play();
        }
    } catch (error) { console.error('Failed to speak text:', error); }
}

function renderVideoCarousel(videos: any[]) {
    const carouselContainer = document.createElement('div');
    carouselContainer.className = 'video-carousel-container';
    videos.forEach(video => {
        const videoItem = document.createElement('div');
        videoItem.className = 'video-item';
        videoItem.innerHTML = `<a href="${video.url}" target="_blank" rel="noopener noreferrer" title="${video.title}"><img src="${video.thumbnail}" alt="${video.title}" onerror="this.style.display='none'"><div class="video-title">${video.title}</div></a>`;
        carouselContainer.appendChild(videoItem);
    });
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', 'ai', 'video-carousel-message');
    messageElement.appendChild(carouselContainer);
    chatHistory.appendChild(messageElement);
}

async function addMessage(sender: 'user' | 'ai', message: string) {
    console.log(`[DEBUG] addMessage called by '${sender}' with content:`, message);
    if (sender === 'ai') {
        const cleanedMessage = message.trim().replace(/^```json\s*|```\s*$/g, '');
        try {
            const parsed = JSON.parse(cleanedMessage);
            if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.thumbnail) {
                console.log("[DEBUG] Detected video JSON. Rendering carousel.");
                renderVideoCarousel(parsed);
                speakText("Here are the video results I found for you.");
                chatHistory.scrollTop = chatHistory.scrollHeight;
                return;
            }
        } catch (e) { /* Not video JSON, proceed as normal message */ }
    }
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', sender);
    messageElement.innerHTML = await marked.parse(message, { breaks: true, gfm: true });
    chatHistory.appendChild(messageElement);
    if (sender === 'ai') {
        addRunButtons(messageElement);
        speakText(message);
    }
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function addRunButtons(scopeElement: HTMLElement) {
    scopeElement.querySelectorAll('pre code.language-python').forEach(codeBlock => {
        const preElement = codeBlock.parentElement;
        if (preElement instanceof HTMLPreElement && !preElement.nextElementSibling?.classList.contains('run-button-container')) {
            const code = (codeBlock as HTMLElement).innerText;
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

async function executeCodeLocally(code: string, preElement: HTMLPreElement) {
    const container = preElement.nextElementSibling;
    if (!container) return;
    const runButton = container.querySelector('.run-button') as HTMLButtonElement;
    runButton.disabled = true;
    runButton.innerText = 'Running...';
    if (container.querySelector('.code-result')) container.querySelector('.code-result')!.remove();
    try {
        const response = await fetch(LOCAL_EXEC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
        });
        if (!response.ok) throw new Error(`Server error: ${response.status} ${await response.text()}`);
        const result = await response.json();
        const resultElement = document.createElement('div');
        resultElement.className = 'code-result';
        let outputHtml = '<strong>Execution Result:</strong>';
        if (result.output) outputHtml += `<pre>${result.output}</pre>`;
        if (result.error) outputHtml += `<pre class="error">${result.error}</pre>`;
        if (!result.output && !result.error) outputHtml += `<pre>(No output)</pre>`;
        resultElement.innerHTML = outputHtml;
        container.appendChild(resultElement);
    } catch (error) {
        const errorElement = document.createElement('div');
        errorElement.className = 'code-result';
        errorElement.innerHTML = `<strong>Execution Error:</strong><br><pre class="error">${error instanceof Error ? error.message : 'Unknown error'}</pre>`;
        container.appendChild(errorElement);
        console.error('Local execution error:', error);
    } finally {
        runButton.disabled = false;
        runButton.innerText = 'Run Code Locally';
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }
}

async function handleFormSubmit(e: Event) {
    e.preventDefault();
    const prompt = chatInput.value.trim();
    if (!prompt) return;
    addMessage('user', prompt);
    chatInput.value = '';
    chatInput.disabled = true;
    (chatForm.querySelector('button') as HTMLButtonElement).disabled = true;
    loadingIndicator.classList.remove('hidden');
    try {
        if (prompt.startsWith('/video ')) {
            const query = prompt.substring(7);
            console.log(`[DEBUG] Detected /video command. Query: "${query}". Calling direct endpoint.`);
            const response = await fetch(DIRECT_VIDEO_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query }),
            });
            console.log("[DEBUG] Received response from direct endpoint:", response);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Direct search error: ${errorData.error || response.statusText}`);
            }
            const videoData = await response.json();
            console.log("[DEBUG] Parsed video data:", videoData);
            addMessage('ai', JSON.stringify(videoData));
        } else {
            console.log("[DEBUG] Standard chat prompt. Calling /chat endpoint.");
            const response = await fetch(CHAT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
            });
            if (!response.ok) throw new Error(`Server error: ${response.status} ${await response.text()}`);
            const result = await response.json();
            addMessage('ai', result.response);
        }
    } catch (error) {
        console.error('API Error:', error);
        addMessage('ai', `Sorry, something went wrong: ${error instanceof Error ? error.message : "An unknown error occurred."}`);
    } finally {
        chatInput.disabled = false;
        (chatForm.querySelector('button') as HTMLButtonElement).disabled = false;
        loadingIndicator.classList.add('hidden');
        chatInput.focus();
    }
}

createHeaderUI();
chatForm.addEventListener('submit', handleFormSubmit);
addMessage('ai', 'Hello! I am Jarvis! How can I help you today? You can use the `/video <query>` command for a direct, unfiltered video search.');