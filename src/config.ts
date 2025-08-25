import 'dotenv/config';

export const config = {
    server: {
        port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
    },
    ai: {
        apiKey: process.env.API_KEY,
        modelName: process.env.AI_MODEL_NAME || 'gemini-1.5-flash',
    },
    mcp: {
        serverUrl: process.env.MCP_SERVER_URL || 'http://localhost:3000/mcp',
    }
};

if (!config.ai.apiKey) {
    throw new Error("API_KEY environment variable not set");
}
