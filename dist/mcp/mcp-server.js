import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getToolConfig } from './tool-registrar.js';
import { config } from '../config.js';
export async function setupMcpServer(ttsClient) {
    const genAI = new GoogleGenerativeAI(config.ai.apiKey);
    // Get the tool configurations and implementations
    const { toolDefinitions, toolImplementations } = await getToolConfig(genAI, ttsClient);
    // Create the server with the complete tool definitions
    const mcpServer = new McpServer({
        name: "jarvis-mcp-server-consolidated",
        version: "1.1.0",
        tools: toolDefinitions,
    });
    // Register the tool implementations with the server instance
    toolImplementations.forEach(({ name, definition, implementation }) => {
        mcpServer.registerTool(name, definition, implementation);
    });
    return mcpServer;
}
