import 'dotenv/config';
export const config = {
    server: {
        port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
    },
    ai: {
        apiKey: process.env.API_KEY,
        // An example of a powerful, uncensored model from Together.ai
        modelName: process.env.AI_MODEL_NAME || 'NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO',
        // The base URL for the API provider
        baseURL: 'https://api.together.xyz/v1',
    },
    mcp: {
        serverUrl: process.env.MCP_SERVER_URL || 'http://localhost:3000/mcp',
    }
};
if (!config.ai.apiKey) {
    throw new Error("API_KEY environment variable not set. Please add it to your .env file.");
}
