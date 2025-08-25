import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from 'zod';
import { GoogleGenerativeAI } from "@google/generative-ai";
import textToSpeech from '@google-cloud/text-to-speech';
import PaperGenerator from '../tools/paper-generator.js';
import { listFiles, readFile, google_search, view_text_website, save_speech_to_file, video_search } from '../tools/index.js';
import { config } from '../config.js';

interface McpToolDefinition {
    title: string;
    description: string;
    inputSchema: any;
}

export const toolDefinitions: { [key: string]: McpToolDefinition } = {};

export function registerTools(mcpServer: McpServer, genAI: GoogleGenerativeAI, ttsClient: textToSpeech.TextToSpeechClient) {
    const model = genAI.getGenerativeModel({ model: config.ai.modelName });

    const registerAndDefineTool = (name: string, definition: McpToolDefinition, implementation: (input: any) => Promise<any>) => {
        toolDefinitions[name] = definition;
        mcpServer.registerTool(name, definition, implementation);
    };

    registerAndDefineTool(
        "fs_list", { title: "List Files", description: "Lists files and directories.", inputSchema: { path: z.string() } },
        async ({ path }: { path: string }) => ({ content: [{ type: "text", text: await listFiles(path) }] })
    );

    registerAndDefineTool(
        "fs_read", { title: "Read File", description: "Reads the content of a file.", inputSchema: { path: z.string() } },
        async ({ path }: { path: string }) => ({ content: [{ type: "text", text: await readFile(path) }] })
    );

    registerAndDefineTool(
        "web_search", { title: "Web Search", description: "Searches the web.", inputSchema: { query: z.string() } },
        async ({ query }: { query: string }) => ({ content: [{ type: "text", text: await google_search(query) }] })
    );

    registerAndDefineTool(
        "web_read", { title: "Web Read", description: "Reads a webpage.", inputSchema: { url: z.string() } },
        async ({ url }: { url: string }) => ({ content: [{ type: "text", text: await view_text_website(url) }] })
    );

    registerAndDefineTool(
        "paper_generator", { title: "Paper Generator", description: "Generates a research paper.", inputSchema: { topic: z.string() } },
        async ({ topic }: { topic: string }) => {
            const paperGenerator = new PaperGenerator({ model, google_search, view_text_website });
            const paper = await paperGenerator.generate(topic);
            return { content: [{ type: "text", text: paper }] };
        }
    );

    registerAndDefineTool(
        "save_speech_to_file", { title: "Save Speech to File", description: "Synthesizes text and saves it as an MP3 file.", inputSchema: { text: z.string(), filename: z.string() } },
        async ({ text, filename }: { text: string, filename: string }) => ({ content: [{ type: "text", text: await save_speech_to_file(text, filename, ttsClient) }] })
    );

    registerAndDefineTool(
        "video_search", { title: "Video Search", description: "Searches for videos and returns a list of results.", inputSchema: { query: z.string() } },
        async ({ query }: { query: string }) => ({ content: [{ type: "text", text: await video_search(query) }] })
    );
}
