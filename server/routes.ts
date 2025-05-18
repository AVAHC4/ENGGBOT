import express, { Request, Response } from 'express';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';
import { createServer, type Server } from "http";
import { storage } from "./storage";
import axios from 'axios';

// Load environment variables
dotenv.config();

const execAsync = promisify(exec);
const router = express.Router();

// Configure multer for file uploads with specific destination for audio files
const upload = multer({ 
  dest: path.join(__dirname, '../uploads/'),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  }
});

// Define a request type with file property for multer
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

// Sample route
router.get('/hello', (_req: Request, res: Response) => {
  res.json({ message: 'Hello, world!' });
});

// Transcribe endpoint using NVIDIA Riva
router.post('/transcribe', upload.single('audio'), async (req: MulterRequest, res: Response) => {
  console.log('Transcribe endpoint called');
  
  try {
    // Check if file was provided
    if (!req.file) {
      console.error('No audio file uploaded');
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    console.log(`Received audio file: ${req.file.originalname}, saved at: ${req.file.path}`);
    
    const audioFilePath = req.file.path;
    
    // Get the NVIDIA API key from environment variables
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      console.error('NVIDIA API key not configured');
      return res.status(500).json({ error: 'NVIDIA API key not configured' });
    }

    // Ensure clients directory exists
    const rootDir = path.resolve(__dirname, '..');
    const pythonClientsPath = path.join(rootDir, 'python-clients');
    
    // Check if python-clients directory exists, if not clone it
    if (!fs.existsSync(pythonClientsPath)) {
      console.log('Cloning NVIDIA Riva Python clients repository...');
      try {
        await execAsync(`git clone https://github.com/nvidia-riva/python-clients.git ${pythonClientsPath}`);
        console.log('Repository cloned successfully');
      } catch (cloneError) {
        console.error('Failed to clone repository:', cloneError);
        return res.status(500).json({ error: 'Failed to setup speech recognition dependencies' });
      }
    }

    // Check if nvidia-riva-client is installed
    try {
      await execAsync('pip list | grep nvidia-riva-client');
      console.log('NVIDIA Riva client is installed');
    } catch (pipError) {
      console.log('Installing NVIDIA Riva client...');
      try {
        await execAsync('pip install nvidia-riva-client');
        console.log('NVIDIA Riva client installed successfully');
      } catch (installError) {
        console.error('Failed to install NVIDIA Riva client:', installError);
        return res.status(500).json({ error: 'Failed to install NVIDIA Riva client' });
      }
    }

    // Run the transcription command
    console.log('Running transcription with NVIDIA Riva...');
    
    const transcribeCommand = `python ${pythonClientsPath}/scripts/asr/transcribe_file_offline.py \
      --server grpc.nvcf.nvidia.com:443 --use-ssl \
      --metadata function-id "b702f636-f60c-4a3d-a6f4-f3568c13bd7d" \
      --metadata "authorization" "Bearer ${apiKey}" \
      --language-code en \
      --input-file "${audioFilePath}"`;
    
    console.log('Executing command:', transcribeCommand);
    
    try {
      const { stdout, stderr } = await execAsync(transcribeCommand);
      
      if (stderr && stderr.includes('error')) {
        console.error('Transcription error:', stderr);
        throw new Error(stderr);
      }
      
      console.log('Transcription successful:', stdout);
      
      // Parse the output to extract the transcription text
      let text = stdout.trim();
      
      // Clean up the temporary audio file
      fs.unlink(audioFilePath, err => {
        if (err) console.error('Error deleting temporary file:', err);
        else console.log(`Deleted temporary file: ${audioFilePath}`);
      });
      
      return res.json({ text });
    } catch (execError) {
      console.error('Transcription execution error:', execError);
      
      // Fallback to mock transcription if NVIDIA Riva fails
      console.log('Falling back to mock transcription...');
      const text = "I couldn't connect to the NVIDIA Riva service. This is a fallback transcription.";
      
      return res.json({
        text,
        fallback: true,
        error: execError instanceof Error ? execError.message : 'Unknown error'
      });
    }
  } catch (error: unknown) {
    console.error('Transcribe endpoint error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ 
      error: 'Failed to process audio',
      details: errorMessage
    });
  }
});

// Speech to text endpoint (original)
router.post('/speech-to-text', upload.single('audio'), async (req: MulterRequest, res: Response) => {
  console.log('Speech-to-text endpoint called');
  
  try {
    // Check if file was provided
    if (!req.file) {
      console.error('No audio file uploaded');
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    console.log(`Received audio file: ${req.file.originalname}, saved at: ${req.file.path}`);
    
    const audioFilePath = req.file.path;
    const apiKey = process.env.NVIDIA_API_KEY;

    if (!apiKey) {
      console.error('NVIDIA API key not configured');
      return res.status(500).json({ error: 'NVIDIA API key not configured' });
    }
    
    console.log('API key found, length:', apiKey.length);

    // Root directory of the project
    const rootDir = path.resolve(__dirname, '..');
    const pythonScriptPath = path.join(rootDir, 'AI_UI', 'speech_recognition.py');
    const clientRepoPath = path.join(rootDir, 'AI_UI', 'python-clients');
    
    console.log('Python script path:', pythonScriptPath);
    console.log('Client repo path:', clientRepoPath);
    
    // Check if speech recognition script exists
    if (!fs.existsSync(pythonScriptPath)) {
      console.error(`Speech recognition script not found at: ${pythonScriptPath}`);
      return res.status(500).json({ error: 'Speech recognition script not found' });
    }

    // Check if python client repo was cloned
    if (!fs.existsSync(clientRepoPath)) {
      try {
        console.log('Cloning NVIDIA Riva Python clients repository...');
        await execAsync(`git clone https://github.com/nvidia-riva/python-clients.git ${clientRepoPath}`);
      } catch (cloneError) {
        console.error('Failed to clone repository:', cloneError);
        return res.status(500).json({ error: 'Failed to setup speech recognition dependencies' });
      }
    }

    // Test if python is available
    try {
      const { stdout: pythonVersion } = await execAsync('python --version');
      console.log('Python version:', pythonVersion);
    } catch (pythonError) {
      console.error('Python not available:', pythonError);
      return res.status(500).json({ error: 'Python not available on the server' });
    }

    // Run the speech recognition script
    console.log(`Processing audio file: ${audioFilePath}`);
    console.log(`Command: python ${pythonScriptPath} --input-file ${audioFilePath} --language en`);
    
    const { stdout, stderr } = await execAsync(
      `python ${pythonScriptPath} --input-file "${audioFilePath}" --language en`
    );

    console.log('Speech recognition stdout:', stdout);
    if (stderr) console.log('Speech recognition stderr:', stderr);

    // Check for errors
    if (stderr && stderr.includes('error')) {
      console.error('Speech recognition error:', stderr);
      return res.status(500).json({ error: 'Speech recognition failed', details: stderr });
    }

    // Extract the transcribed text from the output
    const transcriptionResult = stdout.trim();
    console.log('Transcription result:', transcriptionResult);
    
    const text = transcriptionResult.includes('Transcription result:') 
      ? transcriptionResult.split('Transcription result:').pop()?.trim() || ''
      : transcriptionResult;
    
    console.log('Extracted text:', text);

    // Delete the temporary audio file
    fs.unlink(audioFilePath, (err) => {
      if (err) console.error('Error deleting temporary file:', err);
      else console.log(`Deleted temporary file: ${audioFilePath}`);
    });

    return res.json({ text });
  } catch (error: unknown) {
    console.error('Speech-to-text error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ 
      error: 'Failed to process speech recognition',
      details: errorMessage
    });
  }
});

// Add a test endpoint for the speech recognition script
router.get('/test-speech-recognition', async (_req: Request, res: Response) => {
  try {
    const rootDir = path.resolve(__dirname, '..');
    const pythonScriptPath = path.join(rootDir, 'AI_UI', 'speech_recognition.py');
    
    if (!fs.existsSync(pythonScriptPath)) {
      return res.status(500).json({ error: 'Speech recognition script not found' });
    }
    
    const { stdout, stderr } = await execAsync(`python ${pythonScriptPath} --help`);
    
    return res.json({
      status: 'success',
      message: 'Speech recognition script executed successfully',
      stdout,
      stderr
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: errorMessage });
  }
});

// Add a test endpoint to check if NVIDIA Riva is working
router.get('/test-riva', async (_req: Request, res: Response) => {
  console.log('Testing NVIDIA Riva connection...');
  
  try {
    // Get the NVIDIA API key from environment variables
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      console.error('NVIDIA API key not configured');
      return res.status(500).json({ error: 'NVIDIA API key not configured' });
    }
    
    console.log('API key found. Testing connection...');
    
    // Check if python is available
    let pythonVersionStr = 'unknown';
    try {
      const { stdout: pythonVersion } = await execAsync('python --version');
      pythonVersionStr = pythonVersion.trim();
      console.log('Python version:', pythonVersionStr);
    } catch (pythonError) {
      console.error('Python not available:', pythonError);
      return res.status(500).json({ error: 'Python not available on the server' });
    }
    
    // Ensure clients directory exists
    const rootDir = path.resolve(__dirname, '..');
    const pythonClientsPath = path.join(rootDir, 'python-clients');
    
    // Check if python-clients directory exists, if not clone it
    if (!fs.existsSync(pythonClientsPath)) {
      console.log('Cloning NVIDIA Riva Python clients repository...');
      try {
        await execAsync(`git clone https://github.com/nvidia-riva/python-clients.git ${pythonClientsPath}`);
        console.log('Repository cloned successfully');
      } catch (cloneError) {
        console.error('Failed to clone repository:', cloneError);
        return res.status(500).json({ error: 'Failed to setup speech recognition dependencies' });
      }
    }
    
    // Test with a simple command that just prints help information
    const testCommand = `python ${pythonClientsPath}/scripts/asr/transcribe_file_offline.py --help`;
    
    try {
      const { stdout: helpOutput } = await execAsync(testCommand);
      console.log('Successfully executed test command');
      
      // Now try to make a simple API call to verify the API key works
      // We'll use curl to make a simple request to check if the API key is valid
      const apiTestCommand = `curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer ${apiKey}" https://api.nvcf.nvidia.com/v2/endpoint`;
      
      const { stdout: statusCode } = await execAsync(apiTestCommand);
      
      if (statusCode === '200' || statusCode === '401') {
        // If we get 200 or 401, it means the API endpoint is reachable
        // 401 would mean authentication failed but the endpoint exists
        return res.json({
          status: 'success',
          toolsAvailable: true,
          apiKeyValid: statusCode === '200',
          message: statusCode === '200' 
            ? 'NVIDIA Riva is properly configured and ready to use.' 
            : 'NVIDIA Riva tools are available but the API key may be invalid.',
          statusCode,
          pythonVersion: pythonVersionStr,
          pythonClientsAvailable: true
        });
      } else {
        return res.json({
          status: 'warning',
          toolsAvailable: true,
          apiKeyValid: false,
          message: `Unexpected status code (${statusCode}) when testing API key.`,
          statusCode,
          pythonVersion: pythonVersionStr,
          pythonClientsAvailable: true
        });
      }
    } catch (execError) {
      console.error('Test command error:', execError);
      return res.status(500).json({ 
        status: 'error',
        toolsAvailable: false,
        error: execError instanceof Error ? execError.message : 'Unknown error',
        message: 'Failed to execute test command. NVIDIA Riva tools may not be properly installed.'
      });
    }
  } catch (error: unknown) {
    console.error('Test-riva endpoint error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ 
      status: 'error',
      error: 'Failed to test NVIDIA Riva',
      details: errorMessage
    });
  }
});

// Export the router for use in index.ts
export default router;

export async function registerRoutes(app: express.Express): Promise<Server> {
  // Use the router
  app.use('/api', router);
  
  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(path.resolve(__dirname, '..'), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    console.log(`Creating uploads directory at ${uploadsDir}`);
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  const server = createServer(app);
  const port = process.env.PORT || 3001;
  
  server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log(`Speech-to-text API available at http://localhost:${port}/api/speech-to-text`);
    console.log(`Transcribe API available at http://localhost:${port}/api/transcribe`);
  });
  
  return server;
}
