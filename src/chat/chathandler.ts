import OpenAI from 'openai';
import fetch from 'node-fetch';
import { Request, Response } from 'express';
import { dynamicJarvisContextPromise } from './mcp-client.js';
import { config } from '../config.js';

// Initialize the OpenAI client to connect to the new provider
const openai = new OpenAI({
    apiKey: config.ai.apiKey as string,
    baseURL: config.ai.baseURL,
});

const MCP_SERVER_URL = config.mcp.serverUrl;

let conversationHistory: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
let dynamicJarvisContext: string | null = null;

dynamicJarvisContextPromise.then((context: string) => {
    dynamicJarvisContext = context;
});

export async function handleChat(req: Request, res: Response) {
    if (!dynamicJarvisContext) {
        return res.status(503).json({ error: 'Jarvis is still initializing. Please try again in a moment.' });
    }

    const { prompt }: { prompt: string } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'No prompt provided.' });
    }

    if (prompt.toLowerCase() === 'reset conversation') {
        conversationHistory = [];
        return res.json({ response: "Memory cleared. I'm ready for a new conversation." });
    }

    try {
        conversationHistory.push({ role: 'user', content: prompt });

        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
            { role: 'system', content: dynamicJarvisContext },
            ...conversationHistory
        ];

        let finalResponse = "";
        let keepReasoning = true;
        const maxTurns = 10;
        let turns = 0;

        while (keepReasoning && turns < maxTurns) {
            turns++;
            
            const chatCompletion = await openai.chat.completions.create({
                messages: messages,
                model: config.ai.modelName as string,
            });

            const text = chatCompletion.choices[0]?.message?.content?.trim() || "";
            let jsonString: string | null = null;

            const jsonMatch = text.match(/```json\s*\n([\s\S]+?)\n```/i);
            if (jsonMatch && jsonMatch[1]) {
                jsonString = jsonMatch[1];
            } else if (text.startsWith('{') && text.endsWith('}')) {
                jsonString = text;
            }

            if (jsonString) {
                try {
                    const toolCall = JSON.parse(jsonString);

                    if (toolCall.tool === "error") {
                        finalResponse = `CMD ERROR: Tool call failed. The AI refused to generate a tool call for the prompt, likely due to internal safety filters.`;
                        keepReasoning = false;
                    } else if (toolCall.tool) {
                        messages.push({ role: 'assistant', content: text });

                        const { tool: toolName, ...args } = toolCall;
                        const jsonRpcRequest = {
                            jsonrpc: "2.0",
                            method: "tools/call",
                            params: { name: toolName, arguments: args },
                            id: `chat_${Date.now()}`
                        };

                        const mcpResponse = await fetch(MCP_SERVER_URL, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' },
                            body: JSON.stringify(jsonRpcRequest),
                        });

                        if (!mcpResponse.ok) {
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
                                    } catch (e) {
                                        console.error("Error parsing SSE data chunk:", e);
                                    }
                                }
                            }
                        }
                        
                        messages.push({ role: 'user', content: `Tool Result:\n${toolResult}` });

                    } else {
                        finalResponse = text;
                        keepReasoning = false;
                    }
                } catch (e) {
                    finalResponse = text;
                    keepReasoning = false;
                }
            } else {
                finalResponse = text;
                keepReasoning = false;
            }
        }

        if (turns >= maxTurns) {
            finalResponse = "Sorry, I got stuck in a loop trying to figure that out. Can you rephrase your question?";
        }

        if (finalResponse) {
            conversationHistory.push({ role: 'assistant', content: finalResponse });
        }

        res.json({ response: finalResponse });

    } catch (error) {
        console.error('Error in handleChat:', error);
        res.status(500).json({ error: 'Failed to get response from AI.' });
    }
}