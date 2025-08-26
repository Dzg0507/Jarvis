import { GoogleGenerativeAI } from "@google/generative-ai";
import fetch from 'node-fetch';
import { dynamicJarvisContextPromise } from './mcp-client.js';
import { config } from '../config.js';
const genAI = new GoogleGenerativeAI(config.ai.apiKey);
const model = genAI.getGenerativeModel({ model: config.ai.modelName });
const MCP_SERVER_URL = config.mcp.serverUrl;
let conversationHistory = [];
let dynamicJarvisContext = null;
// Immediately start fetching the context, but don't block.
dynamicJarvisContextPromise.then((context) => {
    dynamicJarvisContext = context;
});
export async function handleChat(req, res) {
    if (!dynamicJarvisContext) {
        // Context is not ready yet, ask user to wait.
        return res.status(503).json({ error: 'Jarvis is still initializing. Please try again in a moment.' });
    }
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
                        // The AI doesn't always nest parameters correctly.
                        // We'll gather all keys that are not 'tool' as parameters.
                        const { tool: toolName, ...args } = toolCall;
                        // Construct a valid JSON-RPC 2.0 request
                        const jsonRpcRequest = {
                            jsonrpc: "2.0",
                            method: "tools/call",
                            params: {
                                name: toolName,
                                arguments: args
                            },
                            id: `chat_${Date.now()}`
                        };
                        const mcpResponse = await fetch(MCP_SERVER_URL, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json, text/event-stream'
                            },
                            body: JSON.stringify(jsonRpcRequest),
                        });
                        if (!mcpResponse.ok) {
                            const errorText = await mcpResponse.text();
                            console.error(`MCP server error: ${mcpResponse.status} ${mcpResponse.statusText}`, errorText);
                            throw new Error(`MCP server error: ${mcpResponse.status}`);
                        }
                        const responseText = await mcpResponse.text();
                        let toolResult = '';
                        const lines = responseText.split('\n');
                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                const data = line.substring(6);
                                if (data.trim() && data !== '[DONE]') {
                                    try {
                                        const jsonData = JSON.parse(data);
                                        if (jsonData.result && jsonData.result.content && jsonData.result.content[0].text) {
                                            toolResult = jsonData.result.content[0].text;
                                            break;
                                        }
                                    }
                                    catch (e) {
                                        console.error("Error parsing SSE data chunk:", e);
                                    }
                                }
                            }
                        }
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
        console.error('Error in handleChat:', error);
        res.status(500).json({ error: 'Failed to get response from AI.' });
    }
}
