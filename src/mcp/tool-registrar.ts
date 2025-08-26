import { z } from 'zod';
import { GoogleGenerativeAI } from "@google/generative-ai";
import textToSpeech from '@google-cloud/text-to-speech';
import PaperGenerator from '../tools/paper-generator.js';
import { listFiles, readFile, view_text_website, save_speech_to_file, video_search, web_search, save_note, read_notes } from '../tools/index.js';
import { config } from '../config.js';

export function getToolConfig(genAI: GoogleGenerativeAI, ttsClient: textToSpeech.TextToSpeechClient) {
    const model = genAI.getGenerativeModel({ model: config.ai.modelName as string });

    const toolDefinitions: { [key: string]: any } = {};
    const toolImplementations: { name: string, definition: any, implementation: (input: any) => Promise<any> }[] = [];

    const defineTool = (name: string, definition: any, implementation: (input: any) => Promise<any>) => {
        toolDefinitions[name] = definition;
        toolImplementations.push({ name, definition, implementation });
    };

    defineTool(
        "fs_list", { title: "List Files", description: "Lists files and directories.", inputSchema: { path: z.string() } },
        async ({ path }: { path: string }) => ({ content: [{ type: "text", text: await listFiles(path) }] })
    );

    defineTool(
        "fs_read", { title: "Read File", description: "Reads the content of a file.", inputSchema: { path: z.string() } },
        async ({ path }: { path: string }) => ({ content: [{ type: "text", text: await readFile(path) }] })
    );

    defineTool(
        "web_search", { title: "Web Search", description: "Searches the web and returns a summary of the top results.", inputSchema: { query: z.string() } },
        async ({ query }: { query: string }) => ({ content: [{ type: "text", text: await web_search(query, model) }] })
    );

    defineTool(
        "web_read", { title: "Web Read", description: "Reads a webpage.", inputSchema: { url: z.string() } },
        async ({ url }: { url: string }) => ({ content: [{ type: "text", text: await view_text_website(url) }] })
    );

    defineTool(
        "save_note", { title: "Save Note", description: "Saves a note to the notepad.", inputSchema: { note_content: z.string() } },
        async ({ note_content }: { note_content: string }) => ({ content: [{ type: "text", text: await save_note(note_content) }] })
    );

    defineTool(
        "read_notes", { title: "Read Notes", description: "Reads all notes from the notepad.", inputSchema: {} },
        async () => ({ content: [{ type: "text", text: await read_notes() }] })
    );

    defineTool(
        "paper_generator", { title: "Paper Generator", description: "Generates a research paper.", inputSchema: { topic: z.string() } },
        async ({ topic }: { topic: string }) => {
            const paperGenerator = new PaperGenerator({ model, web_search: (q) => web_search(q, model), view_text_website });
            const paper = await paperGenerator.generate(topic);
            return { content: [{ type: "text", text: paper }] };
        }
    );

    defineTool(
        "save_speech_to_file", { title: "Save Speech to File", description: "Synthesizes text and saves it as an MP3 file.", inputSchema: { text: z.string(), filename: z.string() } },
        async ({ text, filename }: { text: string, filename: string }) => ({ content: [{ type: "text", text: await save_speech_to_file(text, filename, ttsClient) }] })
    );

    defineTool(
        "video_search", {
            title: "Video Search",
            description: "Searches for videos and returns a list of results with thumbnails.",
            inputSchema: {
                query: z.string(),
                options: z.object({
                    maxResults: z.number().optional(),
                    sortBy: z.string().optional(),
                    uploadedAfter: z.string().optional().nullable(),
                    duration: z.enum(['short', 'medium', 'long', 'any']).optional(),
                    quality: z.enum(['high', 'medium', 'low', 'any']).optional()
                }).optional()
            }
        },
        async ({ query, options }: { query: string, options: any }) => ({ content: [{ type: "text", text: await video_search(query, options) }] })
    );

    return { toolDefinitions, toolImplementations };
}
