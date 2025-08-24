// server.js
require('dotenv').config();
const express = require('express');
const { execFile } = require('child_process');
const cors = require('cors');
const path = require('path');
const fs = require('fs'); // Corrected this line
const os = require('os');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors()); // Allow requests from the frontend
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies, increase limit for larger code
app.use(express.static('public')); // Serve static files from 'public' directory

// Initialize the Gemini AI model on the server
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

// API endpoint to execute code
app.post('/execute', (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'No code provided.' });
  }

  // Create a temporary file to run the code safely
  const tempFilePath = path.join(os.tmpdir(), `script_${Date.now()}.py`);

  fs.writeFile(tempFilePath, code, (writeErr) => {
    if (writeErr) {
      console.error('Error writing temp file:', writeErr);
      return res.status(500).json({ error: 'Failed to write script to disk.' });
    }

    // Execute the python script
    execFile('python', [tempFilePath], (execErr, stdout, stderr) => {
      // Clean up the temporary file immediately after execution
      fs.unlink(tempFilePath, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting temp file:', unlinkErr);
      });

      if (execErr) {
        console.error(`execFile error: ${execErr}`);
        // Return stdout and stderr even if there's an error, as they can contain useful info
        return res.json({ output: stdout, error: stderr || execErr.message });
      }

      res.json({ output: stdout, error: stderr });
    });
  });
});

// API endpoint to handle chat
app.post('/chat', async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'No prompt provided.' });
    }

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        res.json({ response: text });
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Failed to get response from AI.' });
    }
});


// Serve the main HTML file for the root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`
  ******************************************************************
  * *
  * SECURITY WARNING: Local Code Execution Server is RUNNING!     *
  * This server will execute any Python code it receives.         *
  * DO NOT expose this port (${PORT}) to the internet.               *
  * Only run code from sources you trust completely.              *
  * *
  ******************************************************************
  `);
  console.log(`Server listening on http://localhost:${PORT}`);
});