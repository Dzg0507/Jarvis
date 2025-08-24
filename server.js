// server.js
require('dotenv').config();
const express = require('express');
const { execFile } = require('child_process');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const PaperGenerator = require('./public/paper_generator.js');
const textToSpeech = require('@google-cloud/text-to-speech');

const app = express();
const PORT = 3000;
const fsPromises = fs.promises;

// --- Helper Functions ---

/**
 * Lists files and directories in a given path.
 * @param {string} dirPath - The directory path to list.
 * @returns {Promise<string>} A string containing the list of files or an error message.
 */
async function listFiles(dirPath) {
    try {
        const resolvedPath = path.resolve(dirPath);
        if (!resolvedPath.startsWith(process.cwd())) {
            return "Error: Access denied. You can only access files within the project directory.";
        }
        const files = await fsPromises.readdir(resolvedPath, { withFileTypes: true });
        return files.map(file => file.isDirectory() ? `${file.name}/` : file.name).join('\n');
    } catch (error) {
        return `Error listing files: ${error.message}`;
    }
}

/**
 * Reads the content of a file.
 * @param {string} filePath - The path to the file to read.
 * @returns {Promise<string>} The file content or an error message.
 */
async function readFile(filePath) {
    try {
        const resolvedPath = path.resolve(filePath);
        if (!resolvedPath.startsWith(process.cwd())) {
            return "Error: Access denied. You can only access files within the project directory.";
        }
        return await fsPromises.readFile(resolvedPath, 'utf-8');
    } catch (error) {
        return `Error reading file: ${error.message}`;
    }
}


// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// --- AI Configuration ---
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const ttsClient = new textToSpeech.TextToSpeechClient();

// In-memory store for conversation history
let conversationHistory = [];

const MPC_CONTEXT = `You are Jarvis, a specialized AI assistant with expertise in Multi-Party Computation (MPC) and other complex topics. Your purpose is to help users understand and work with MPC protocols.

**What is MPC?**
Multi-Party Computation (MPC or SMPC) is a subfield of cryptography that allows multiple parties to jointly compute a function over their inputs while keeping those inputs private. For example, a group of people could calculate their average salary without revealing their individual salaries to each other.

**Key Concepts:**
*   **Privacy:** Each party's input data remains private and is not revealed to other parties.
*   **Correctness:** The output of the computation is guaranteed to be correct.
*   **Independence of Inputs:** Parties cannot learn anything more about other parties' inputs than what can be inferred from the output.
*   **Common Protocols:** Some common MPC protocols include Yao's Garbled Circuits (for two parties) and GMW (for multiple parties).

When a user asks a question, provide a clear, helpful response related to MPC. If the user asks for code, provide it in Python. You can also suggest Python code to be executed to demonstrate MPC concepts.

**AVAILABLE TOOLS:**
You have access to the following tools to help you answer user questions. You can use tools sequentially if needed.

1.  **'fs_list'**: Lists the files and directories in a given path.
    *   **Usage:** To use this tool, you must output a JSON object with the following format AND NOTHING ELSE:
        \`\`\`json
        {
          "tool": "fs_list",
          "path": "<directory_path>"
        }
        \`\`\`

2.  **'fs_read'**: Reads the content of a file.
    *   **Usage:** To use this tool, you must output a JSON object with the following format AND NOTHING ELSE:
        \`\`\`json
        {
          "tool": "fs_read",
          "path": "<file_path>"
        }
        \`\`\`
3.  **'web_search'**: Searches the web for a given query.
    *   **Usage:** To use this tool, you must output a JSON object with the following format AND NOTHING ELSE:
        \`\`\`json
        {
          "tool": "web_search",
          "query": "<search_query>"
        }
        \`\`\`

4.  **'web_read'**: Reads the content of a webpage.
    *   **Usage:** To use this tool, you must output a JSON object with the following format AND NOTHING ELSE:
        \`\`\`json
        {
          "tool": "web_read",
          "url": "<url_to_read>"
        }
        \`\`\`

5.  **'paper_generator'**: Generates a research paper on a given topic.
    *   **Usage:** To use this tool, you must output a JSON object with the following format AND NOTHING ELSE:
        \`\`\`json
        {
          "tool": "paper_generator",
          "topic": "<topic_of_the_paper>"
        }
        \`\`\`
When you use a tool, the system will execute it and provide you with the output. You can then use this output to formulate your final response to the user.

**How to Perform Deep Research:**
To find and summarize academic papers on a topic, you should follow these steps:
1.  Use the 'web_search' tool to search for the topic on academic sites like 'arxiv.org' or 'scholar.google.com'. For example: '{"tool": "web_search", "query": "your_topic site:arxiv.org"}'
2.  Review the search results to identify promising papers.
3.  Use the 'web_read' tool to read the abstracts of the most relevant papers.
4.  Synthesize the information from the abstracts into a summary for the user.

**Conversation Management:**
*   To reset the conversation and start fresh, send the message: `/reset`
`;


// --- API Endpoints ---

// API endpoint to execute code
app.post('/execute', (req, res) => {
    const { code } = req.body;
    if (!code) {
        return res.status(400).json({ error: 'No code provided.' });
    }
    const tempFilePath = path.join(os.tmpdir(), `script_${Date.now()}.py`);
    fs.writeFile(tempFilePath, code, (writeErr) => {
        if (writeErr) {
            console.error('Error writing temp file:', writeErr);
            return res.status(500).json({ error: 'Failed to write script to disk.' });
        }
        execFile('python', [tempFilePath], (execErr, stdout, stderr) => {
            fs.unlink(tempFilePath, (unlinkErr) => {
                if (unlinkErr) console.error('Error deleting temp file:', unlinkErr);
            });
            if (execErr) {
                console.error(`execFile error: ${execErr}`);
                return res.json({ output: stdout, error: stderr || execErr.message });
            }
            res.json({ output: stdout, error: stderr });
        });
    });
});

// API endpoint to handle chat
app.post('/chat', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'No prompt provided.' });
    }

    // Handle reset command
    if (prompt === '/reset') {
        conversationHistory = [];
        return res.json({ response: "Memory cleared. I'm ready for a new conversation." });
    }

    try {
        // Add user's prompt to history
        conversationHistory.push(`User Question: "${prompt}"`);

        let fullPrompt = `${MPC_CONTEXT}\n\n--- Conversation History ---\n${conversationHistory.join('\n')}\n\nJarvis's Response:`;
        let finalResponse = "";
        let keepReasoning = true;
        const maxTurns = 10;
        let turns = 0;

        while (keepReasoning && turns < maxTurns) {
            turns++;
            const result = await model.generateContent(fullPrompt);
            const response = await result.response;
            const text = response.text().trim();

            let toolResult = "";
            try {
                const toolCall = JSON.parse(text);
                if (toolCall.tool) {
                    // Add AI's tool request to the prompt for the next turn
                    fullPrompt += text;
                    switch (toolCall.tool) {
                        case 'fs_list':
                            toolResult = await listFiles(toolCall.path);
                            break;
                        case 'fs_read':
                            toolResult = await readFile(toolCall.path);
                            break;
                        case 'web_search':
                            toolResult = await google_search(toolCall.query);
                            break;
                        case 'web_read':
                            toolResult = await view_text_website(toolCall.url);
                            break;
                        case 'paper_generator':
                            const paperGenerator = new PaperGenerator({ model, google_search, view_text_website });
                            toolResult = await paperGenerator.generate(toolCall.topic);
                            break;
                        default:
                            toolResult = `Unknown tool: ${toolCall.tool}`;
                    }
                    // Add tool result to the prompt
                    fullPrompt += `\n\nTool Result:\n${toolResult}\n\nJarvis's Response:`;
                } else {
                    finalResponse = text;
                    keepReasoning = false;
                }
            } catch (e) {
                finalResponse = text;
                keepReasoning = false;
            }
        }

        if (turns >= maxTurns) {
            finalResponse = "Sorry, I got stuck in a loop trying to figure that out. Can you rephrase your question?";
        }

        // Add final AI response to history
        if (finalResponse) {
            conversationHistory.push(`Jarvis's Response: ${finalResponse}`);
        }

        res.json({ response: finalResponse });

    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Failed to get response from AI.' });
    }
});

// API endpoint to handle text-to-speech
app.post('/tts', async (req, res) => {
    const { text, voice, speakingRate } = req.body;
    if (!text) {
        return res.status(400).json({ error: 'No text provided.' });
    }

    try {
        const request = {
            input: { text: text },
            voice: {
                languageCode: 'en-US',
                name: voice || 'en-US-Wavenet-D', // Default voice
            },
            audioConfig: {
                audioEncoding: 'MP3',
                speakingRate: speakingRate || 1.0, // Default speed
            },
        };

        const [response] = await ttsClient.synthesizeSpeech(request);
        const audioContent = response.audioContent.toString('base64');
        res.json({ audioContent: audioContent });
    } catch (error) {
        console.error('TTS Error:', error);
        res.status(500).json({ error: 'Failed to synthesize speech.' });
    }
});

// Serve the main HTML file for the root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Server Start ---
app.listen(PORT, () => {
    console.log(`
  ******************************************************************
  *                                                                *
  * SECURITY WARNING: Local Code Execution Server is RUNNING!      *
  * This server will execute any Python code it receives.          *
  * DO NOT expose this port (${PORT}) to the internet.                *
  * Only run code from sources you trust completely.               *
  *                                                                *
  ******************************************************************
  `);
    console.log(`Server listening on http://localhost:${PORT}`);
});