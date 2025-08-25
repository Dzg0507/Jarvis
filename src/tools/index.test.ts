import { vi, describe, it, expect } from 'vitest';
import { listFiles } from './index.js';

describe('File System Tools', () => {
  describe('listFiles', () => {
    it('should list files and directories correctly', async () => {
      const mockFs = {
        readdir: vi.fn().mockResolvedValue([
          { name: 'file1.txt', isDirectory: () => false },
          { name: 'dir1', isDirectory: () => true },
        ]),
      };

      const result = await listFiles('./', mockFs as any);
      expect(result).toBe('file1.txt\ndir1/');
      expect(mockFs.readdir).toHaveBeenCalledWith(expect.any(String), { withFileTypes: true });
    });

    it('should handle errors gracefully', async () => {
      const errorMessage = 'EACCES: permission denied';
      const mockFs = {
        readdir: vi.fn().mockRejectedValue(new Error(errorMessage)),
      };

      const result = await listFiles('./', mockFs as any);
      expect(result).toBe(`Error listing files: ${errorMessage}`);
    });
  });
});
