import { GoogleGenerativeAI } from "@google/generative-ai";
import fetch from 'node-fetch';
import { Request, Response } from 'express';
import { dynamicJarvisContextPromise } from './mcp-client.js';
import { config } from '../config.js';

const genAI = new GoogleGenerativeAI(config.ai.apiKey as string);
const model = genAI.getGenerativeModel({ model: config.ai.modelName });

const MCP_SERVER_URL = config.mcp.serverUrl;

let conversationHistory: string[] = [];
let dynamicJarvisContext: string | null = null;

// Immediately start fetching the context, but don't block.
dynamicJarvisContextPromise.then((context: string) => {
    dynamicJarvisContext = context;
});

export async function handleChat(req: Request, res: Response) {
    if (!dynamicJarvisContext) {
        // Context is not ready yet, ask user to wait.
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

                        interface McpResult { content: { text: string }[] }
                        const mcpResult: McpResult = await mcpResponse.json() as McpResult;
                        const toolResult = mcpResult.content[0].text;

                        fullPrompt += `\n\nTool Result:\n${toolResult}\n\nJarvis's Response:`;
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
            conversationHistory.push(`Jarvis's Response: ${finalResponse}`);
        }

        res.json({ response: finalResponse });

    } catch (error) {
        console.error('Error in handleChat:', error);
        res.status(500).json({ error: 'Failed to get response from AI.' });
    }
}
