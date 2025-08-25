import 'dotenv/config';
import express from 'express';
import { execFile } from 'child_process';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import os from 'os';
import textToSpeech from '@google-cloud/text-to-speech';
import { fileURLToPath } from 'url';
import { handleChat } from './mcp-chathandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// --- AI Configuration ---
const ttsClient = new textToSpeech.TextToSpeechClient();

// --- API Endpoints ---

// API endpoint to execute code
app.post('/execute', (req, res) => {
    const { code } = req.body;
    if (!code) {
        return res.status(400).json({ error: 'No code provided.' });
    }
    const tempFilePath = path.join(os.tmpdir(), `script_${Date.now()}.py`);
    fs.writeFile(tempFilePath, code, (writeErr) => {
        if (writeErr) {
            console.error('Error writing temp file:', writeErr);
            return res.status(500).json({ error: 'Failed to write script to disk.' });
        }
        execFile('python', [tempFilePath], (execErr, stdout, stderr) => {
            fs.unlink(tempFilePath, (unlinkErr) => {
                if (unlinkErr) console.error('Error deleting temp file:', unlinkErr);
            });
            if (execErr) {
                console.error(`execFile error: ${execErr}`);
                return res.json({ output: stdout, error: stderr || execErr.message });
            }
            res.json({ output: stdout, error: stderr });
        });
    });
});

// API endpoint to handle chat
app.post('/chat', handleChat);

// API endpoint to handle text-to-speech
app.post('/tts', async (req, res) => {
    const { text, voice, speakingRate } = req.body;
    if (!text) {
        return res.status(400).json({ error: 'No text provided.' });
    }

    try {
        const request = {
            input: { text: text },
            voice: {
                languageCode: 'en-US',
                name: voice || 'en-US-Wavenet-D', // Default voice
            },
            audioConfig: {
                audioEncoding: 'MP3',
                speakingRate: speakingRate || 1.0, // Default speed
            },
        };

        const [response] = await ttsClient.synthesizeSpeech(request);
        const audioContent = response.audioContent.toString('base64');
        res.json({ audioContent: audioContent });
    } catch (error) {
        console.error('TTS Error:', error);
        res.status(500).json({ error: 'Failed to synthesize speech.' });
    }
});

// Serve the main HTML file for the root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Server Start ---
app.listen(PORT, () => {
    console.log(`
  ******************************************************************
  *                                                                *
  * SECURITY WARNING: Local Code Execution Server is RUNNING!      *
  * This server will execute any Python code it receives.          *
  * DO NOT expose this port (${PORT}) to the internet.                *
  * Only run code from sources you trust completely.               *
  *                                                                *
  ******************************************************************
  `);
    console.log(`Server listening on http://localhost:${PORT}`);
});