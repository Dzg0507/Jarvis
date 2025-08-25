import 'dotenv/config';
import { dynamicJarvisContextPromise } from './src/chat/mcp-client.js';
async function test() {
    console.log("--- Testing MCP Client Initialization ---");
    const context = await dynamicJarvisContextPromise;
    console.log("\n\n--- Generated Jarvis Context ---");
    console.log(context);
}
test();
