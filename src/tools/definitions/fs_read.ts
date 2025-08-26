import { z } from 'zod';
import { readFile } from '../index.js';

export default {
  name: 'fs_read',
  definition: {
    title: 'Read File',
    description: 'Reads the content of a file.',
    inputSchema: {
      path: z.string(),
    },
  },
  implementation: async ({ path }: { path: string }) => {
    return {
      content: [
        {
          type: 'text',
          text: await readFile(path),
        },
      ],
    };
  },
};
