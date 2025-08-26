import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as textToSpeech from '@google-cloud/text-to-speech';
import { getToolConfig } from './tool-registrar.js';
import { config } from '../config.js';

interface ToolImplementation {
    name: string;
    definition: any;
    implementation: (input: any) => Promise<any>;
}

export async function setupMcpServer(ttsClient: textToSpeech.TextToSpeechClient): Promise<McpServer> {
    const genAI = new GoogleGenerativeAI(config.ai.apiKey as string);

    // Get the tool configurations and implementations
    const { toolDefinitions, toolImplementations } = await getToolConfig(genAI, ttsClient);

    // Create the server with the complete tool definitions
    const mcpServer = new McpServer({
        name: "jarvis-mcp-server-consolidated",
        version: "1.1.0",
        tools: toolDefinitions,
    });

    // Register the tool implementations with the server instance
    toolImplementations.forEach(({ name, definition, implementation }: ToolImplementation) => {
        mcpServer.registerTool(name, definition, implementation);
    });

    return mcpServer;
}