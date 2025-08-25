// --- Imports ---
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { execFile } from 'child_process';
import { fileURLToPath } from 'url';
import textToSpeech from '@google-cloud/text-to-speech';
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
// My local modules
import { handleChat } from './chat/chathandler.js';
import { setupMcpServer } from './mcp/mcp-server.js';
import { config } from './config.js';
// --- Basic Setup ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
// --- Middleware ---
// Using a more open CORS for MCP compatibility
app.use(cors({
    origin: '*',
    exposedHeaders: ['Mcp-Session-Id'],
    allowedHeaders: ['Content-Type', 'mcp-session-id'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));
// --- AI and MCP Configuration ---
const mcpServer = setupMcpServer();
const ttsClient = new textToSpeech.TextToSpeechClient();
// --- API Endpoints ---
// MCP Endpoint
app.post('/mcp', async (req, res) => {
    try {
        const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
        res.on('close', () => transport.close());
        await mcpServer.connect(transport);
        await transport.handleRequest(req, res, req.body);
    }
    catch (error) {
        console.error('Error handling MCP request:', error);
        if (!res.headersSent) {
            res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null });
        }
    }
});
// Original API endpoints
app.post('/execute', (req, res) => {
    const { code } = req.body;
    if (!code)
        return res.status(400).json({ error: 'No code provided.' });
    const tempFilePath = path.join(os.tmpdir(), `script_${Date.now()}.py`);
    fs.writeFile(tempFilePath, code, (writeErr) => {
        if (writeErr)
            return res.status(500).json({ error: 'Failed to write script.' });
        execFile('python', [tempFilePath], (execErr, stdout, stderr) => {
            fs.unlink(tempFilePath, () => { });
            if (execErr)
                return res.json({ output: stdout, error: stderr || execErr.message });
            res.json({ output: stdout, error: stderr });
        });
    });
});
app.post('/chat', handleChat);
app.post('/tts', async (req, res) => {
    const { text, voice, speakingRate } = req.body;
    if (!text)
        return res.status(400).json({ error: 'No text provided.' });
    try {
        const request = {
            input: { text },
            voice: { languageCode: 'en-US', name: voice || 'en-US-Wavenet-D' },
            audioConfig: { audioEncoding: 'MP3', speakingRate: speakingRate || 1.0 },
        };
        const [response] = await ttsClient.synthesizeSpeech(request);
        if (response.audioContent) {
            res.json({ audioContent: response.audioContent.toString('base64') });
        }
        else {
            res.status(500).json({ error: 'Failed to synthesize speech, no audio content received.' });
        }
    }
    catch (error) {
        console.error('TTS Error:', error);
        res.status(500).json({ error: 'Failed to synthesize speech.' });
    }
});
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
// --- Server Start ---
app.listen(config.server.port, () => {
    console.log(`
  ******************************************************************
  *                                                                *
  *  Unified Server is RUNNING on http://localhost:${config.server.port}             *
  *  This server provides static files, chat, TTS, and MCP tools.  *
  *  The /execute endpoint remains a SECURITY RISK.                *
  *                                                                *
  ******************************************************************
  `);
});
