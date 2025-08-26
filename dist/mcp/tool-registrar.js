import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createTool } from '../tools/tool-utils.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export async function getToolConfig(genAI, ttsClient) {
    const toolDefinitions = {};
    const toolImplementations = [];
    const definitionsDir = path.join(__dirname, '../tools/definitions');
    const toolDefinitionFiles = fs.readdirSync(definitionsDir).filter(file => file.endsWith('.js'));
    for (const file of toolDefinitionFiles) {
        const modulePath = path.join(definitionsDir, file);
        const { default: toolDefinition } = await import(modulePath);
        let dependencies = {};
        if (toolDefinition.name === 'save_speech_to_file') {
            dependencies = { ttsClient };
        }
        const tool = createTool(toolDefinition, dependencies);
        toolDefinitions[tool.name] = tool.definition;
        toolImplementations.push(tool);
    }
    return { toolDefinitions, toolImplementations };
}
