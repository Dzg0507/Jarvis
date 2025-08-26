import { z } from 'zod';
import { save_note } from '../index.js';

export default {
  name: 'save_note',
  definition: {
    title: 'Save Note',
    description: 'Saves a note to the notepad.',
    inputSchema: {
      note_content: z.string(),
    },
  },
  implementation: async ({ note_content }: { note_content: string }) => {
    return {
      content: [
        {
          type: 'text',
          text: await save_note(note_content),
        },
      ],
    };
  },
};
