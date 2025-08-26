import 'dotenv/config';
import express from 'express';
import { execFile } from 'child_process';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import os from 'os';
import textToSpeech from '@google-cloud/text-to-speech';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { listFiles, readFile, google_search, view_text_website } from './tools.js';
import PaperGenerator from './paper_generator.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { handleChat } from './mcp-chathandler.js';

export function startServers() {
    // AI Configuration
    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable not set");
    }
    const genAI = new GoogleGenerativeAI(process.env.API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const app = express();
    app.use(express.json({ limit: '10mb' }));
    app.use(cors({
      origin: '*',
      exposedHeaders: ['Mcp-Session-Id'],
      allowedHeaders: ['Content-Type', 'mcp-session-id'],
    }));

    // --- Text to Speech Client ---
    const ttsClient = new textToSpeech.TextToSpeechClient();

    // --- API Endpoints ---
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

    app.post('/chat', handleChat);

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
                    name: voice || 'en-US-Wavenet-D',
                },
                audioConfig: {
                    audioEncoding: 'MP3',
                    speakingRate: speakingRate || 1.0,
                },
            };

            const [response] = await ttsClient.synthesizeSpeech(request as any);
            if (response.audioContent instanceof Uint8Array) {
                const audioContent = response.audioContent.toString('base64');
                res.json({ audioContent: audioContent });
            } else {
                res.status(500).json({ error: 'Failed to synthesize speech.' });
            }
        } catch (error) {
            console.error('TTS Error:', error);
            res.status(500).json({ error: 'Failed to synthesize speech.' });
        }
    });

    const mainServer = app.listen(3000, () => {
        console.log('Main server listening on http://localhost:3000');
    });


    // --- MCP Server ---
    const mcpServer = new McpServer({
      name: "jarvis-mcp-server",
      version: "1.0.0",
    });

    mcpServer.registerTool(
      "fs_list",
      {
        title: "List Files",
        description: "Lists the files and directories in a given path.",
        inputSchema: { path: z.string() },
      },
      async ({ path }: { path: string }) => {
        console.log(`Running fs_list with path: ${path}`);
        return {
          content: [{ type: "text", text: await listFiles(path) }],
        };
      }
    );

    mcpServer.registerTool(
      "fs_read",
      {
        title: "Read File",
        description: "Reads the content of a file.",
        inputSchema: { path: z.string() },
      },
      async ({ path }: { path: string }) => {
        console.log(`Running fs_read with path: ${path}`);
        return {
          content: [{ type: "text", text: await readFile(path) }],
        };
      }
    );

    mcpServer.registerTool(
      "web_search",
      {
        title: "Web Search",
        description: "Searches the web for a given query.",
        inputSchema: { query: z.string() },
      },
      async ({ query }: { query: string }) => {
        console.log(`Running web_.search with query: ${query}`);
        return {
          content: [{ type: "text", text: await google_search(query) }],
        };
      }
    );

    mcpServer.registerTool(
      "web_read",
      {
        title: "Web Read",
        description: "Reads the content of a webpage.",
        inputSchema: { url: z.string() },
      },
      async ({ url }: { url: string }) => {
        console.log(`Running web_read with url: ${url}`);
        return {
          content: [{ type: "text", text: await view_text_website(url) }],
        };
      }
    );

    mcpServer.registerTool(
      "paper_generator",
      {
        title: "Paper Generator",
        description: "Generates a research paper on a given topic.",
        inputSchema: { topic: z.string() },
      },
      async ({ topic }: { topic: string }) => {
        console.log(`Running paper_generator with topic: ${topic}`);
        const paperGenerator = new PaperGenerator({ model, google_search, view_text_website });
        const paper = await paperGenerator.generate(topic);
        return {
          content: [{ type: "text", text: paper }],
        };
      }
    );

    const mcpApp = express();
    mcpApp.use(express.json());
    mcpApp.use(cors({
      origin: '*',
      exposedHeaders: ['Mcp-Session-Id'],
      allowedHeaders: ['Content-Type', 'mcp-session-id'],
    }));

    mcpApp.post('/mcp', async (req, res) => {
      try {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
        });
        res.on('close', () => {
          transport.close();
        });
        await mcpServer.connect(transport);
        await transport.handleRequest(req, res, req.body);
      } catch (error) {
        console.error('Error handling MCP request:', error);
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'Internal server error',
            },
            id: null,
          });
        }
      }
    });

    const mcpAppServer = mcpApp.listen(8080, () => {
      console.log('MCP Server is running on port 8080');
    });

    return [mainServer, mcpAppServer];
}
