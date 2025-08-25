import { z } from 'zod';
import PaperGenerator from '../tools/paper-generator.js';
import { listFiles, readFile, view_text_website, save_speech_to_file, video_search, web_search, save_note, read_notes } from '../tools/index.js';
import { config } from '../config.js';
export const toolDefinitions = {};
export function registerTools(mcpServer, genAI, ttsClient) {
    const model = genAI.getGenerativeModel({ model: config.ai.modelName });
    const registerAndDefineTool = (name, definition, implementation) => {
        toolDefinitions[name] = definition;
        mcpServer.registerTool(name, definition, implementation);
    };
    registerAndDefineTool("fs_list", { title: "List Files", description: "Lists files and directories.", inputSchema: { path: z.string() } }, async ({ path }) => ({ content: [{ type: "text", text: await listFiles(path) }] }));
    registerAndDefineTool("fs_read", { title: "Read File", description: "Reads the content of a file.", inputSchema: { path: z.string() } }, async ({ path }) => ({ content: [{ type: "text", text: await readFile(path) }] }));
    registerAndDefineTool("web_search", { title: "Web Search", description: "Searches the web and returns a summary of the top results.", inputSchema: { query: z.string() } }, async ({ query }) => ({ content: [{ type: "text", text: await web_search(query, model) }] }));
    registerAndDefineTool("web_read", { title: "Web Read", description: "Reads a webpage.", inputSchema: { url: z.string() } }, async ({ url }) => ({ content: [{ type: "text", text: await view_text_website(url) }] }));
    registerAndDefineTool("save_note", { title: "Save Note", description: "Saves a note to the notepad.", inputSchema: { note_content: z.string() } }, async ({ note_content }) => ({ content: [{ type: "text", text: await save_note(note_content) }] }));
    registerAndDefineTool("read_notes", { title: "Read Notes", description: "Reads all notes from the notepad.", inputSchema: {} }, async () => ({ content: [{ type: "text", text: await read_notes() }] }));
    registerAndDefineTool("paper_generator", { title: "Paper Generator", description: "Generates a research paper.", inputSchema: { topic: z.string() } }, async ({ topic }) => {
        const paperGenerator = new PaperGenerator({ model, web_search, view_text_website });
        const paper = await paperGenerator.generate(topic);
        return { content: [{ type: "text", text: paper }] };
    });
    registerAndDefineTool("save_speech_to_file", { title: "Save Speech to File", description: "Synthesizes text and saves it as an MP3 file.", inputSchema: { text: z.string(), filename: z.string() } }, async ({ text, filename }) => ({ content: [{ type: "text", text: await save_speech_to_file(text, filename, ttsClient) }] }));
    registerAndDefineTool("video_search", {
        title: "Video Search",
        description: "Searches for videos and returns a list of results.",
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
    }, async ({ query, options }) => ({ content: [{ type: "text", text: await video_search(query, options) }] }));
}
