import { GoogleGenerativeAI } from "@google/generative-ai";
import fetch from 'node-fetch';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const MCP_SERVER_URL = 'http://localhost:3000/mcp';
// --- MCP Client Setup ---
let dynamicJarvisContext = 'Initializing Jarvis...';
async function initializeMcpClient() {
    try {
        const transport = new StreamableHTTPClientTransport(new URL(MCP_SERVER_URL));
        const client = new Client({
            name: "jarvis-chat-handler",
            version: "1.0.0"
        });
        await client.connect(transport);
        const tools = await client.listTools();
        const toolListString = Object.entries(tools).map(([name, tool], index) => {
            const params = Object.keys(tool.inputSchema || {}).map(key => `<${key}>`).join(', ');
            return `${index + 1}. **'${name}'**: ${tool.description}\n   *   **Parameters:** ${params || 'None'}`;
        }).join('\n\n');
        const baseContext = `You are Jarvis, a powerful AI assistant. Your primary purpose is to help users by using the tools available to you. You MUST use a tool when the user asks for something that a tool can provide. Do not apologize and say you cannot do something if a tool is available for the task.

To use a tool, you must respond with ONLY a JSON object in the following format:
\`\`\`json
{
  "tool": "<tool_name>",
  "parameters": {
    "<parameter_name>": "<parameter_value>"
  }
}
\`\`\`

If the user asks what you can do or what tools you have, you should list the tools below in a conversational way.

Here are your available tools:
${toolListString}

Always use a tool when you can.
`;
        dynamicJarvisContext = baseContext;
        console.log("Jarvis context updated with discovered tools.");
    }
    catch (error) {
        console.error("Failed to initialize MCP client or discover tools:", error);
        dynamicJarvisContext = "Error: Could not connect to MCP server to discover tools. Tool usage will not be available.";
    }
}
// Initialize the client on startup
initializeMcpClient();
// --- Chat Handler ---
let conversationHistory = [];
export async function handleChat(req, res) {
    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'No prompt provided.' });
    }
    if (prompt.toLowerCase() === 'reset conversation') {
        conversationHistory = [];
        return res.json({ response: "Memory cleared. I'm ready for a new conversation." });
    }
    try {
        conversationHistory.push(`User Question: "${prompt}"`);
        let fullPrompt = `${dynamicJarvisContext}\n\n--- Conversation History ---\n${conversationHistory.join('\n')}\n\nJarvis's Response:`;
        let finalResponse = "";
        let keepReasoning = true;
        const maxTurns = 10;
        let turns = 0;
        while (keepReasoning && turns < maxTurns) {
            turns++;
            const result = await model.generateContent(fullPrompt);
            const response = await result.response;
            const text = response.text().trim();
            const jsonMatch = text.match(/```json\s*\n([\s\S]+?)\n```/i);
            if (jsonMatch && jsonMatch[1]) {
                try {
                    const toolCall = JSON.parse(jsonMatch[1]);
                    if (toolCall.tool) {
                        fullPrompt += text;
                        const mcpResponse = await fetch(MCP_SERVER_URL, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(toolCall),
                        });
                        if (!mcpResponse.ok) {
                            throw new Error(`MCP server error: ${mcpResponse.status}`);
                        }
                        const mcpResult = await mcpResponse.json();
                        const toolResult = mcpResult.content[0].text;
                        fullPrompt += `\n\nTool Result:\n${toolResult}\n\nJarvis's Response:`;
                    }
                    else {
                        finalResponse = text;
                        keepReasoning = false;
                    }
                }
                catch (e) {
                    finalResponse = text;
                    keepReasoning = false;
                }
            }
            else {
                finalResponse = text;
                keepReasoning = false;
            }
        }
        if (turns >= maxTurns) {
            finalResponse = "Sorry, I got stuck in a loop trying to figure that out. Can you rephrase your question?";
        }
        if (finalResponse) {
            conversationHistory.push(`Jarvis's Response: ${finalResponse}`);
        }
        res.json({ response: finalResponse });
    }
    catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Failed to get response from AI.' });
    }
}
