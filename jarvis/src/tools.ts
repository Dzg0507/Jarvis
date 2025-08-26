import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

const fsPromises = fs.promises;

export const listFiles = async (dirPath: string): Promise<string> => {
  try {
    const resolvedPath = path.resolve(dirPath);
    if (!resolvedPath.startsWith(process.cwd())) {
      return "Error: Access denied. You can only access files within the project directory.";
    }
    const files = await fsPromises.readdir(resolvedPath, { withFileTypes: true });
    return files.map(file => file.isDirectory() ? `${file.name}/` : file.name).join('\n');
  } catch (error: any) {
    return `Error listing files: ${error.message}`;
  }
}

export const readFile = async (filePath: string): Promise<string> => {
  try {
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(process.cwd())) {
      return "Error: Access denied. You can only access files within the project directory.";
    }
    return await fsPromises.readFile(resolvedPath, 'utf-8');
  } catch (error: any) {
    return `Error reading file: ${error.message}`;
  }
}

export const google_search = async (query: string): Promise<string> => {
  // This is a placeholder. In a real implementation, you would use a search API.
  return `Search results for "${query}"`;
}

export const view_text_website = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.text();
  } catch (error: any) {
    return `Error reading website: ${error.message}`;
  }
}
