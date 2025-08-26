import { z } from 'zod';
import { read_notes } from '../index.js';

export default {
  name: 'read_notes',
  definition: {
    title: 'Read Notes',
    description: 'Reads all notes from the notepad.',
    inputSchema: {},
  },
  implementation: async () => {
    return {
      content: [
        {
          type: 'text',
          text: await read_notes(),
        },
      ],
    };
  },
};
