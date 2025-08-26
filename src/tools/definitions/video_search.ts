import { z } from 'zod';
import { video_search } from '../index.js';

export default {
  name: 'video_search',
  definition: {
    title: 'Video Search',
    description: 'Searches for videos and returns a list of results with thumbnails.',
    inputSchema: {
        query: z.string(),
        options: z.object({
            maxResults: z.number().optional(),
            sortBy: z.string().optional(),
            uploadedAfter: z.string().optional().nullable(),
            duration: z.enum(['short', 'medium', 'long', 'any']).optional(),
            quality: z.enum(['high', 'medium', 'low', 'any']).optional()
        }).optional()
    }
  },
  implementation: async ({ query, options }: { query: string, options: any }) => {
    return {
      content: [
        {
          type: 'text',
          text: await video_search(query, options),
        },
      ],
    };
  },
};
