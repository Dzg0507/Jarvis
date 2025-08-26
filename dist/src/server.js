"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServers = startServers;
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const child_process_1 = require("child_process");
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const text_to_speech_1 = __importDefault(require("@google-cloud/text-to-speech"));
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const streamableHttp_js_1 = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const zod_1 = require("zod");
const tools_js_1 = require("./tools.js");
const paper_generator_js_1 = __importDefault(require("./paper_generator.js"));
const generative_ai_1 = require("@google/generative-ai");
const mcp_chathandler_js_1 = require("./mcp-chathandler.js");
function startServers() {
    // AI Configuration
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set");
    }
    const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const app = (0, express_1.default)();
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use((0, cors_1.default)({
        origin: '*',
        exposedHeaders: ['Mcp-Session-Id'],
        allowedHeaders: ['Content-Type', 'mcp-session-id'],
    }));
    // --- Static file serving ---
    const staticPath = path_1.default.join(process.cwd(), './jarvis/public');
    app.use(express_1.default.static(staticPath));
    // --- Text to Speech Client ---
    const ttsClient = new text_to_speech_1.default.TextToSpeechClient();
    // --- API Endpoints ---
    app.post('/execute', (req, res) => {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ error: 'No code provided.' });
        }
        const tempFilePath = path_1.default.join(os_1.default.tmpdir(), `script_${Date.now()}.py`);
        fs_1.default.writeFile(tempFilePath, code, (writeErr) => {
            if (writeErr) {
                console.error('Error writing temp file:', writeErr);
                return res.status(500).json({ error: 'Failed to write script to disk.' });
            }
            (0, child_process_1.execFile)('python', [tempFilePath], (execErr, stdout, stderr) => {
                fs_1.default.unlink(tempFilePath, (unlinkErr) => {
                    if (unlinkErr)
                        console.error('Error deleting temp file:', unlinkErr);
                });
                if (execErr) {
                    console.error(`execFile error: ${execErr}`);
                    return res.json({ output: stdout, error: stderr || execErr.message });
                }
                res.json({ output: stdout, error: stderr });
            });
        });
    });
    app.post('/chat', mcp_chathandler_js_1.handleChat);
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
            const [response] = await ttsClient.synthesizeSpeech(request);
            if (response.audioContent instanceof Uint8Array) {
                const audioContent = response.audioContent.toString('base64');
                res.json({ audioContent: audioContent });
            }
            else {
                res.status(500).json({ error: 'Failed to synthesize speech.' });
            }
        }
        catch (error) {
            console.error('TTS Error:', error);
            res.status(500).json({ error: 'Failed to synthesize speech.' });
        }
    });
    const mainServer = app.listen(3000, () => {
        console.log('Main server listening on http://localhost:3000');
    });
    // --- MCP Server ---
    const mcpServer = new mcp_js_1.McpServer({
        name: "jarvis-mcp-server",
        version: "1.0.0",
    });
    mcpServer.registerTool("fs_list", {
        title: "List Files",
        description: "Lists the files and directories in a given path.",
        inputSchema: { path: zod_1.z.string() },
    }, async ({ path }) => {
        console.log(`Running fs_list with path: ${path}`);
        return {
            content: [{ type: "text", text: await (0, tools_js_1.listFiles)(path) }],
        };
    });
    mcpServer.registerTool("fs_read", {
        title: "Read File",
        description: "Reads the content of a file.",
        inputSchema: { path: zod_1.z.string() },
    }, async ({ path }) => {
        console.log(`Running fs_read with path: ${path}`);
        return {
            content: [{ type: "text", text: await (0, tools_js_1.readFile)(path) }],
        };
    });
    mcpServer.registerTool("web_search", {
        title: "Web Search",
        description: "Searches the web for a given query.",
        inputSchema: { query: zod_1.z.string() },
    }, async ({ query }) => {
        console.log(`Running web_.search with query: ${query}`);
        return {
            content: [{ type: "text", text: await (0, tools_js_1.google_search)(query) }],
        };
    });
    mcpServer.registerTool("web_read", {
        title: "Web Read",
        description: "Reads the content of a webpage.",
        inputSchema: { url: zod_1.z.string() },
    }, async ({ url }) => {
        console.log(`Running web_read with url: ${url}`);
        return {
            content: [{ type: "text", text: await (0, tools_js_1.view_text_website)(url) }],
        };
    });
    mcpServer.registerTool("paper_generator", {
        title: "Paper Generator",
        description: "Generates a research paper on a given topic.",
        inputSchema: { topic: zod_1.z.string() },
    }, async ({ topic }) => {
        console.log(`Running paper_generator with topic: ${topic}`);
        const paperGenerator = new paper_generator_js_1.default({ model, google_search: tools_js_1.google_search, view_text_website: tools_js_1.view_text_website });
        const paper = await paperGenerator.generate(topic);
        return {
            content: [{ type: "text", text: paper }],
        };
    });
    const mcpApp = (0, express_1.default)();
    mcpApp.use(express_1.default.json());
    mcpApp.use((0, cors_1.default)({
        origin: '*',
        exposedHeaders: ['Mcp-Session-Id'],
        allowedHeaders: ['Content-Type', 'mcp-session-id'],
    }));
    mcpApp.post('/mcp', async (req, res) => {
        try {
            const transport = new streamableHttp_js_1.StreamableHTTPServerTransport({
                sessionIdGenerator: undefined,
            });
            res.on('close', () => {
                transport.close();
            });
            await mcpServer.connect(transport);
            await transport.handleRequest(req, res, req.body);
        }
        catch (error) {
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
