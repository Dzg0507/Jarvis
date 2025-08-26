import { z } from 'zod';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { web_search } from '../index.js';
import { config } from '../../config.js';

const genAI = new GoogleGenerativeAI(config.ai.apiKey as string);
const model = genAI.getGenerativeModel({ model: config.ai.modelName as string });

export default {
  name: 'web_search',
  definition: {
    title: 'Web Search',
    description: 'Searches the web and returns a summary of the top results.',
    inputSchema: {
      query: z.string(),
    },
  },
  implementation: async ({ query }: { query: string }) => {
    return {
      content: [
        {
          type: 'text',
          text: await web_search(query, model),
        },
      ],
    };
  },
};
