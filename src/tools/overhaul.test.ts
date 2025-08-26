import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createTool } from './tool-utils.js';
import * as fs from 'fs';
import * as index from './index.js';

// Mock the fs module
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    readdir: vi.fn(),
  },
}));

// Mock the index module, so we can mock the functions inside it
vi.mock('./index.js', () => ({
    listFiles: vi.fn(),
    readFile: vi.fn(),
    view_text_website: vi.fn(),
    save_speech_to_file: vi.fn(),
    video_search: vi.fn(),
    web_search: vi.fn(),
    save_note: vi.fn(),
    read_notes: vi.fn(),
}));

describe('Tool Overhaul', () => {
    describe('fs_read tool', () => {
        let fsReadTool: any;

        beforeEach(async () => {
            const { default: toolDefinition } = await import('./definitions/fs_read.js');
            fsReadTool = createTool(toolDefinition);
            vi.mocked(fs.promises.readFile).mockReset();
        });

        it('should read a file successfully', async () => {
            const filePath = 'test.txt';
            const fileContent = 'hello world';
            vi.mocked(index.readFile).mockResolvedValue(fileContent);

            const result = await fsReadTool.implementation({ path: filePath });
            expect(result.success).toBe(true);
            expect(result.data.content[0].text).toBe(fileContent);
        });

        it('should handle file not found errors', async () => {
            const filePath = 'not-found.txt';
            const errorMessage = 'ENOENT: no such file or directory';
            vi.mocked(index.readFile).mockRejectedValue(new Error(errorMessage));

            const result = await fsReadTool.implementation({ path: filePath });
            expect(result.success).toBe(false);
            expect(result.error).toContain(errorMessage);
        });

        it('should return an error for invalid input', async () => {
            const result = await fsReadTool.implementation({ pth: 'test.txt' }); // intentional typo
            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid input');
        });
    });

    describe('web_search tool', () => {
        let webSearchTool: any;

        beforeEach(async () => {
            vi.stubEnv('API_KEY', 'test-api-key');
            const { default: toolDefinition } = await import('./definitions/web_search.js');
            webSearchTool = createTool(toolDefinition);
            vi.mocked(index.web_search).mockReset();
        });

        it('should perform a web search successfully', async () => {
            const query = 'test query';
            const searchResult = 'Search results for "test query"';
            vi.mocked(index.web_search).mockResolvedValue(searchResult);

            const result = await webSearchTool.implementation({ query });
            expect(result.success).toBe(true);
            expect(result.data.content[0].text).toBe(searchResult);
        });
    });
});
