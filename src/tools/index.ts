import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

const fsPromises = fs.promises;

// Allow dependency injection for testing
type FsPromises = typeof fs.promises;

export const listFiles = async (
  dirPath: string,
  fsPromisesOverride: FsPromises | null = null
): Promise<string> => {
  const fsToUse = fsPromisesOverride || fs.promises;
  try {
    const resolvedPath = path.resolve(dirPath);
    if (!resolvedPath.startsWith(process.cwd())) {
      return "Error: Access denied. You can only access files within the project directory.";
    }
    const files = await fsToUse.readdir(resolvedPath, { withFileTypes: true });
    return files.map(file => file.isDirectory() ? `${file.name}/` : file.name).join('\n');
  } catch (error: any) {
    return `Error listing files: ${error.message}`;
  }
}

export const readFile = async (filePath: string): Promise<string> => {
  try {
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(process.cwd())) {
      return "Error: Access denied. You can only access files within the project directory.";
    }
    return await fsPromises.readFile(resolvedPath, 'utf-8');
  } catch (error: any) {
    return `Error reading file: ${error.message}`;
  }
}

export const google_search = async (query: string): Promise<string> => {
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  return `I cannot browse the web directly, but you can see the search results for "${query}" here: ${searchUrl}`;
}

export const view_text_website = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.text();
  } catch (error: any) {
    return `Error reading website: ${error.message}`;
  }
}

export const video_search = async (query: string): Promise<string> => {
    // In a real application, this would call the YouTube API.
    // For now, we'll return a mock list of videos.
    const mockVideos = [
        { title: 'Never Gonna Give You Up', thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
        { title: 'The Ultimate Dog Tease', thumbnail: 'https://i.ytimg.com/vi/nGeKSiCQkPw/hqdefault.jpg', url: 'https://www.youtube.com/watch?v=nGeKSiCQkPw' },
        { title: 'Keyboard Cat', thumbnail: 'https://i.ytimg.com/vi/J---aiyznGQ/hqdefault.jpg', url: 'https://www.youtube.com/watch?v=J---aiyznGQ' }
    ];
    return JSON.stringify(mockVideos);
};

import textToSpeech from '@google-cloud/text-to-speech';

export const save_speech_to_file = async (
    text: string,
    filename: string,
    ttsClient: textToSpeech.TextToSpeechClient
): Promise<string> => {
    try {
        const request = {
            input: { text },
            voice: { languageCode: 'en-US', name: 'en-US-Wavenet-D' },
            audioConfig: { audioEncoding: 'MP3' as const },
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
    } catch (error: any) {
        return `Error saving speech to file: ${error.message}`;
    }
};
