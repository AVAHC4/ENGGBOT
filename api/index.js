// Main API server file
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import compileRoutes from './routes/compile.js';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api/compile', compileRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'API server is running' });
});

// Judge0 Extra CE info endpoint
app.get('/api/judge0-info', async (req, res) => {
  try {
    const response = await fetch('https://judge0-extra-ce.p.rapidapi.com/about', {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'judge0-extra-ce.p.rapidapi.com',
        'x-rapidapi-key': '***REMOVED***',
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching Judge0 Extra CE info:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});

export default app;