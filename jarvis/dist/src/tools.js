"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.view_text_website = exports.google_search = exports.readFile = exports.listFiles = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const fsPromises = fs_1.default.promises;
const listFiles = async (dirPath) => {
    try {
        const resolvedPath = path_1.default.resolve(dirPath);
        if (!resolvedPath.startsWith(process.cwd())) {
            return "Error: Access denied. You can only access files within the project directory.";
        }
        const files = await fsPromises.readdir(resolvedPath, { withFileTypes: true });
        return files.map(file => file.isDirectory() ? `${file.name}/` : file.name).join('\n');
    }
    catch (error) {
        return `Error listing files: ${error.message}`;
    }
};
exports.listFiles = listFiles;
const readFile = async (filePath) => {
    try {
        const resolvedPath = path_1.default.resolve(filePath);
        if (!resolvedPath.startsWith(process.cwd())) {
            return "Error: Access denied. You can only access files within the project directory.";
        }
        return await fsPromises.readFile(resolvedPath, 'utf-8');
    }
    catch (error) {
        return `Error reading file: ${error.message}`;
    }
};
exports.readFile = readFile;
const google_search = async (query) => {
    // This is a placeholder. In a real implementation, you would use a search API.
    return `Search results for "${query}"`;
};
exports.google_search = google_search;
const view_text_website = async (url) => {
    try {
        const response = await (0, node_fetch_1.default)(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.text();
    }
    catch (error) {
        return `Error reading website: ${error.message}`;
    }
};
exports.view_text_website = view_text_website;
