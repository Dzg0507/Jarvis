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

// TTS state
let isTtsEnabled = true;

/**
 * Creates and appends a TTS toggle button to the UI.
 */
function createTtsButton() {
    const button = document.createElement('button');
    button.id = 'tts-button';
    button.title = 'Toggle Voice';
    button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></path></svg>`;

    button.onclick = () => {
        isTtsEnabled = !isTtsEnabled;
        button.classList.toggle('disabled', !isTtsEnabled);
    };

    // Prepend to chat container, so it's outside the scrolling area
    chatContainer.prepend(button);
}

/**
 * Fetches audio from the server and plays it.
 * @param text - The text to synthesize.
 */
async function speakText(text: string) {
    if (!isTtsEnabled) return;

    // Strip markdown for cleaner speech, e.g., code blocks and links
    const plainText = text
        .replace(/```[^`]+```/g, 'code snippet')
        .replace(/`[^`]+`/g, 'code')
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');

    try {
        const response = await fetch(TTS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: plainText }),
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
    } catch (error) {
        console.error('Failed to speak text:', error);
    }
}

/**
 * Appends a message to the chat history and adds run buttons to code blocks.
 * @param sender - 'user' or 'ai'.
 * @param message - The message content (can be markdown).
 */
async function addMessage(sender: 'user' | 'ai', message: string) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message', sender);

  const rawHtml = await marked.parse(message, { breaks: true, gfm: true });
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
function addRunButtons(scopeElement: HTMLElement) {
  const codeBlocks = scopeElement.querySelectorAll('pre code.language-python');
  codeBlocks.forEach((codeBlock) => { 
    const preElement = codeBlock.parentElement;
    if (
      preElement instanceof HTMLPreElement &&
      !preElement.nextElementSibling?.classList.contains('run-button-container')
    ) {
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

/**
 * Sends code to the local server for execution and displays the result.
 * @param code - The Python code to execute.
 * @param preElement - The <pre> element containing the code, used for placing the result.
 */
async function executeCodeLocally(code: string, preElement: HTMLPreElement) {
  const container = preElement.nextElementSibling;
  if (!container) return;

  const runButton = container.querySelector('.run-button') as HTMLButtonElement;
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
  } catch (error) {
    const errorElement = document.createElement('div');
    errorElement.className = 'code-result';
    let errorMessage =
      'Failed to execute code. Is your local server running? Check browser console for details.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    errorElement.innerHTML = `<strong>Execution Error:</strong><br><pre class="error">${errorMessage}</pre>`;
    container.appendChild(errorElement);
    console.error('Local execution error:', error);
  } finally {
    runButton.disabled = false;
    runButton.innerText = 'Run Code Locally';
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }
}

/**
 * Handles the chat form submission.
 * @param e - The form submission event.
 */
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

  } catch (error) {
    console.error('API Error:', error);
    addMessage('ai', `Sorry, something went wrong. Please check the console for details.`);
  } finally {
    chatInput.disabled = false;
    (chatForm.querySelector('button') as HTMLButtonElement).disabled = false;
    loadingIndicator.classList.add('hidden');
    chatInput.focus();
  }
}

// --- Initial Setup ---
createTtsButton();
chatForm.addEventListener('submit', handleFormSubmit);

// Initial welcome message
addMessage(
  'ai',
  'Hello! I am Jarvis, your assistant for Multi-Party Computation. How can I help you today?'
);