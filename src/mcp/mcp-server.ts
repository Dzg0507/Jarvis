import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import textToSpeech from '@google-cloud/text-to-speech';
import { registerTools, toolDefinitions } from './tool-registrar.js';
import { config } from '../config.js';

export function setupMcpServer(ttsClient: textToSpeech.TextToSpeechClient): McpServer {
    const genAI = new GoogleGenerativeAI(config.ai.apiKey as string);

    const mcpServer = new McpServer({
        name: "jarvis-mcp-server-consolidated",
        version: "1.1.0",
        tools: toolDefinitions,
    });

    registerTools(mcpServer, genAI, ttsClient);

    return mcpServer;
}
