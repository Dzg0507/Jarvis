import { GoogleGenerativeAI } from "@google/generative-ai";
import fetch from 'node-fetch';
import { Request, Response } from 'express';

const genAI = new GoogleGenerativeAI(process.env.API_KEY as string);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const MCP_SERVER_URL = 'http://localhost:8080/mcp';

const JARVIS_CONTEXT = `You are Jarvis, a highly intelligent and versatile AI assistant. Your purpose is to help users with a wide range of tasks, from answering complex questions to generating content and using tools to interact with the digital world.

You should be helpful, knowledgeable, and have a slightly formal, but friendly, tone.

You have access to a set of tools provided by an MCP server. To use a tool, you must output a JSON object with the following format AND NOTHING ELSE:
\`\`\`json
{
  "tool": "<tool_name>",
  "parameters": {
    "<parameter_name>": "<parameter_value>"
  }
}
\`\`\`

When you use a tool, the system will execute it and provide you with the output. You can then use this output to formulate your final response to the user.
`;

let conversationHistory: string[] = [];

export async function handleChat(req: Request, res: Response) {
    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'No prompt provided.' });
    }
    
    // Server-side check for the /settings command
    if (prompt.toLowerCase().trim() === '/settings') {
        return res.json({
            response: {
                tool: "display_settings",
                parameters: {}
            }
        });
    }

    if (prompt.toLowerCase() === 'reset conversation') {
        conversationHistory = [];
        return res.json({ response: "Memory cleared. I'm ready for a new conversation." });
    }

    try {
        conversationHistory.push(`User Question: "${prompt}"`);

        let fullPrompt = `${JARVIS_CONTEXT}\n\n--- Conversation History ---\n${conversationHistory.join('\n')}\n\nJarvis's Response:`;
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
                    console.log('Tool call:', toolCall);
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

                        const mcpResult: any = await mcpResponse.json();
                        const toolResult = mcpResult.content[0].text;
                        console.log('Tool result:', toolResult);

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
        console.error('API Error:', error);
        res.status(500).json({ error: 'Failed to get response from AI.' });
    }
}