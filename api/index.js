import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(express.json());

// Serve static files
app.use(express.static(join(__dirname, '../dist')));

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('Client connected');
  
  ws.on('message', (message) => {
    console.log('received: %s', message);
    ws.send(`Server received: ${message}`);
  });
  
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// API routes
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from the API!' });
});

// Handle SPA routing
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../dist/index.html'));
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 