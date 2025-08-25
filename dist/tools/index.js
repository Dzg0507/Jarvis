import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
const fsPromises = fs.promises;
export const listFiles = async (dirPath, fsPromisesOverride = null) => {
    const fsToUse = fsPromisesOverride || fs.promises;
    try {
        const resolvedPath = path.resolve(dirPath);
        if (!resolvedPath.startsWith(process.cwd())) {
            return "Error: Access denied. You can only access files within the project directory.";
        }
        const files = await fsToUse.readdir(resolvedPath, { withFileTypes: true });
        return files.map(file => file.isDirectory() ? `${file.name}/` : file.name).join('\n');
    }
    catch (error) {
        return `Error listing files: ${error.message}`;
    }
};
export const readFile = async (filePath) => {
    try {
        const resolvedPath = path.resolve(filePath);
        if (!resolvedPath.startsWith(process.cwd())) {
            return "Error: Access denied. You can only access files within the project directory.";
        }
        return await fsPromises.readFile(resolvedPath, 'utf-8');
    }
    catch (error) {
        return `Error reading file: ${error.message}`;
    }
};
export const google_search = async (query) => {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    return `I cannot browse the web directly, but you can see the search results for "${query}" here: ${searchUrl}`;
};
export const view_text_website = async (url) => {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.text();
    }
    catch (error) {
        return `Error reading website: ${error.message}`;
    }
};
export const save_speech_to_file = async (text, filename, ttsClient) => {
    try {
        const request = {
            input: { text },
            voice: { languageCode: 'en-US', name: 'en-US-Wavenet-D' },
            audioConfig: { audioEncoding: 'MP3' },
        };
        const [response] = await ttsClient.synthesizeSpeech(request);
        if (!response.audioContent) {
            return "Error: Failed to synthesize speech, no audio content received.";
        }
        const audioDir = path.join(process.cwd(), 'public', 'audio');
        if (!fs.existsSync(audioDir)) {
            fs.mkdirSync(audioDir, { recursive: true });
        }
        const filePath = path.join(audioDir, `${filename}.mp3`);
        await fsPromises.writeFile(filePath, response.audioContent, 'binary');
        return `Successfully saved speech to public/audio/${filename}.mp3`;
    }
    catch (error) {
        return `Error saving speech to file: ${error.message}`;
    }
};
