import { z } from 'zod';
import { GoogleGenerativeAI } from "@google/generative-ai";
import PaperGenerator from '../paper-generator.js';
import { web_search, view_text_website } from '../index.js';
import { config } from '../../config.js';

const genAI = new GoogleGenerativeAI(config.ai.apiKey as string);
const model = genAI.getGenerativeModel({ model: config.ai.modelName as string });

export default {
  name: 'paper_generator',
  definition: {
    title: 'Paper Generator',
    description: 'Generates a research paper.',
    inputSchema: {
      topic: z.string(),
    },
  },
  implementation: async ({ topic }: { topic:string }) => {
    const paperGenerator = new PaperGenerator({ model, web_search: (q) => web_search(q, model), view_text_website });
    const paper = await paperGenerator.generate(topic);
    return {
      content: [
        {
          type: 'text',
          text: paper,
        },
      ],
    };
  },
};
