import { z } from 'zod';
import { listFiles } from '../index.js';

export default {
  name: 'fs_list',
  definition: {
    title: 'List Files',
    description: 'Lists files and directories.',
    inputSchema: {
      path: z.string(),
    },
  },
  implementation: async ({ path }: { path: string }) => {
    return {
      content: [
        {
          type: 'text',
          text: await listFiles(path),
        },
      ],
    };
  },
};
