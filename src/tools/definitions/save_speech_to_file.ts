import { z } from 'zod';
import { save_speech_to_file } from '../index.js';

export default {
  name: 'save_speech_to_file',
  definition: {
    title: 'Save Speech to File',
    description: 'Synthesizes text and saves it as an MP3 file.',
    inputSchema: {
      text: z.string(),
      filename: z.string(),
    },
  },
  implementation: async ({ text, filename }: { text: string, filename: string }, dependencies: any) => {
    const { ttsClient } = dependencies;
    if (!ttsClient) {
        throw new Error("TTS client not available");
    }
    return {
      content: [
        {
          type: 'text',
          text: await save_speech_to_file(text, filename, ttsClient),
        },
      ],
    };
  },
};
