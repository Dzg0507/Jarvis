import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { buildBasePrompt } from './prompt.js';
import { config } from '../config.js';
const MCP_SERVER_URL = config.mcp.serverUrl;
async function initializeMcpClient() {
    try {
        const transport = new StreamableHTTPClientTransport(new URL(MCP_SERVER_URL));
        const client = new Client({
            name: "jarvis-chat-handler",
            version: "1.0.0"
        });
        await client.connect(transport);
        const tools = await client.listTools();
        console.log("Discovered tools from MCP server:", JSON.stringify(tools, null, 2));
        const toolListString = Object.entries(tools).map(([name, tool], index) => {
            const params = Object.keys(tool.inputSchema || {}).map(key => `<${key}>`).join(', ');
            return `${index + 1}. **'${name}'**: ${tool.description}\n   *   **Parameters:** ${params || 'None'}`;
        }).join('\n\n');
        console.log("Formatted tool list string:", toolListString);
        const baseContext = buildBasePrompt(toolListString);
        console.log("Jarvis context updated with discovered tools.");
        return baseContext;
    }
    catch (error) {
        console.error("Failed to initialize MCP client or discover tools:", error);
        return "Error: Could not connect to MCP server to discover tools. Tool usage will not be available.";
    }
}
export const dynamicJarvisContextPromise = initializeMcpClient();
