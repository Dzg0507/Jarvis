import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { registerTools } from './tool-registrar.js';
import { config } from '../config.js';
export function setupMcpServer(ttsClient) {
    const genAI = new GoogleGenerativeAI(config.ai.apiKey);
    const mcpServer = new McpServer({
        name: "jarvis-mcp-server-consolidated",
        version: "1.1.0",
    });
    registerTools(mcpServer, genAI, ttsClient);
    return mcpServer;
}
