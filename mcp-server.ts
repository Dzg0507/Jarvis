import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import PaperGenerator from './src/paper_generator.js';
import { listFiles, readFile, google_search, view_text_website } from './src/tools.js';

// AI Configuration
if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const app = express();
app.use(express.json());
app.use(cors({
  origin: '*',
  exposedHeaders: ['Mcp-Session-Id'],
  allowedHeaders: ['Content-Type', 'mcp-session-id'],
}));

const server = new McpServer({
  name: "jarvis-mcp-server",
  version: "1.0.0",
});

server.registerTool(
  "fs_list",
  {
    title: "List Files",
    description: "Lists the files and directories in a given path.",
    inputSchema: { path: z.string() },
  },
  async ({ path }: { path: string }) => {
    return {
      content: [{ type: "text", text: await listFiles(path) }],
    };
  }
);

server.registerTool(
  "fs_read",
  {
    title: "Read File",
    description: "Reads the content of a file.",
    inputSchema: { path: z.string() },
  },
  async ({ path }: { path: string }) => {
    return {
      content: [{ type: "text", text: await readFile(path) }],
    };
  }
);

server.registerTool(
  "web_search",
  {
    title: "Web Search",
    description: "Searches the web for a given query.",
    inputSchema: { query: z.string() },
  },
  async ({ query }: { query: string }) => {
    return {
      content: [{ type: "text", text: await google_search(query) }],
    };
  }
);

server.registerTool(
  "web_read",
  {
    title: "Web Read",
    description: "Reads the content of a webpage.",
    inputSchema: { url: z.string() },
  },
  async ({ url }: { url: string }) => {
    return {
      content: [{ type: "text", text: await view_text_website(url) }],
    };
  }
);

server.registerTool(
  "paper_generator",
  {
    title: "Paper Generator",
    description: "Generates a research paper on a given topic.",
    inputSchema: { topic: z.string() },
  },
  async ({ topic }: { topic: string }) => {
    const paperGenerator = new PaperGenerator({ model, google_search, view_text_website });
    const paper = await paperGenerator.generate(topic);
    return {
      content: [{ type: "text", text: paper }],
    };
  }
);

app.post('/mcp', async (req, res) => {
  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    res.on('close', () => {
      transport.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
});

app.listen(8080, () => {
  console.log('MCP Server is running on port 8080');
});
