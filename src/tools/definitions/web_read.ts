import { z } from 'zod';
import { view_text_website } from '../index.js';

export default {
  name: 'web_read',
  definition: {
    title: 'Web Read',
    description: 'Reads a webpage.',
    inputSchema: {
      url: z.string(),
    },
  },
  implementation: async ({ url }: { url: string }) => {
    return {
      content: [
        {
          type: 'text',
          text: await view_text_website(url),
        },
      ],
    };
  },
};
