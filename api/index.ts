import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import fs from 'fs';

// Improved dotenv loading for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
// First try to load from the project root
let envFile = join(__dirname, '../.env');

if (fs.existsSync(envFile)) {
  console.log(`Loading environment variables from: ${envFile}`);
  dotenv.config({ path: envFile });
} else {
  // Fallback to .env.local if it exists
  envFile = join(__dirname, '../.env.local');
  if (fs.existsSync(envFile)) {
    console.log(`Loading environment variables from: ${envFile}`);
    dotenv.config({ path: envFile });
  } else {
    // Finally, try a standard .env in the current directory
    console.log('No .env file found at project root, trying default locations');
    dotenv.config();
  }
}

// Now import other modules after environment variables are loaded
import express from "express";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import { initGoogleAuth } from "./auth/google.js";
import { supabase } from "./lib/supabase.js";
import { initTestAuth } from "./auth/test.js";

// Log the full environment variables for debugging
console.log("Environment Variables:");
console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID || "Not set");
console.log("GOOGLE_CLIENT_SECRET:", process.env.GOOGLE_CLIENT_SECRET ? "Set (length: " + process.env.GOOGLE_CLIENT_SECRET.length + ")" : "Not set");
console.log("CLIENT_URL:", process.env.CLIENT_URL || "Not set");

// After environment variables are loaded
// Print raw environment variables to identify any issues
console.log("==== RAW ENVIRONMENT VARIABLES ====");
console.log("GOOGLE_CLIENT_ID value:", JSON.stringify(process.env.GOOGLE_CLIENT_ID));
console.log("GOOGLE_CLIENT_SECRET value length:", process.env.GOOGLE_CLIENT_SECRET?.length);
console.log("====================================");

// Fix any formatting issues in environment variables
if (process.env.GOOGLE_CLIENT_ID) {
  // Remove any line breaks, extra spaces or unexpected characters
  const originalId = process.env.GOOGLE_CLIENT_ID;
  process.env.GOOGLE_CLIENT_ID = originalId
    .replace(/\r?\n|\r/g, '') // Remove line breaks
    .replace(/\s+/g, '') // Remove extra spaces
    .trim(); // Trim any leading/trailing whitespace
  
  // Ensure it ends with .apps.googleusercontent.com
  if (!process.env.GOOGLE_CLIENT_ID.endsWith('.apps.googleusercontent.com')) {
    process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID.split('.apps.googleuser')[0] + '.apps.googleusercontent.com';
  }
  
  console.log("Original Client ID:", JSON.stringify(originalId));
  console.log("Fixed Client ID:", JSON.stringify(process.env.GOOGLE_CLIENT_ID));
}

export const app = express();

// Determine if we're in production
const isProduction = process.env.NODE_ENV === 'production';
console.log("Environment:", isProduction ? "production" : "development");

// Middleware
app.use(cors({
  origin: [process.env.CLIENT_URL || "http://localhost:3000", "https://enggbot.vercel.app"],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));
app.use(express.json());

// Create a fast in-memory session store
import memoryStore from 'memorystore';
const MemoryStore = memoryStore(session);

app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    // Use in-memory store for faster session access
    store: new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    cookie: {
      // Only use secure cookies in production
      secure: isProduction,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      // Use lax for local development to ensure cookies are sent
      sameSite: isProduction ? 'none' : 'lax'
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

// API routes
const apiRouter = express.Router();

// Simple test endpoint
apiRouter.get("/hello", (req, res) => {
  console.log("Hello endpoint hit");
  res.json({ message: "Hello from the API!" });
});

// Google config check
apiRouter.get("/check-google-config", (req, res) => {
  console.log("Checking Google OAuth config");
  
  const config = {
    clientID: process.env.GOOGLE_CLIENT_ID || "Not set",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ? "Set (length: " + process.env.GOOGLE_CLIENT_SECRET.length + ")" : "Not set",
    callbackURL: `${process.env.CLIENT_URL || 'http://localhost:3000'}/api/auth/google/callback`,
    sessionSecret: process.env.SESSION_SECRET ? "Set (length: " + process.env.SESSION_SECRET.length + ")" : "Not set",
  };
  
  res.json({ 
    config,
    message: "If both client ID and secret are set, check that these values match your Google Cloud Console settings." 
  });
});

// Test Supabase connection
apiRouter.get("/test-connection", async (req, res) => {
  console.log("Test connection endpoint hit");
  console.log("Request headers:", req.headers);
  try {
    const { data, error } = await supabase.from('users').select('count');
    if (error) {
      console.error("Supabase error:", error);
      throw error;
    }
    console.log("Supabase response:", data);
    res.json({ status: "success", message: "Connected to Supabase!", data });
  } catch (error) {
    console.error("Supabase connection error:", error);
    res.status(500).json({ status: "error", message: "Failed to connect to Supabase" });
  }
});

// Health check endpoint
apiRouter.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Type definition for Express response with flush
interface StreamableResponse extends express.Response {
  flush?: () => void;
}

// Streaming response endpoint
apiRouter.get("/stream", (req, res: StreamableResponse) => {
  // Set headers for streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  // Prevent buffering
  res.setHeader('X-Accel-Buffering', 'no');
  // Force flush for each chunk
  res.flushHeaders();
  
  let count = 0;
  const messageIntervals = [
    "Hello", 
    "from", 
    "the", 
    "streaming", 
    "API!", 
    "This", 
    "message", 
    "is", 
    "coming", 
    "in", 
    "chunks."
  ];
  
  // Send data in chunks with an interval
  const interval = setInterval(() => {
    if (count >= messageIntervals.length) {
      // End the stream when all messages are sent
      res.write(`data: [DONE]\n\n`);
      // Try to force flush
      if (res.flush) res.flush();
      clearInterval(interval);
      res.end();
      return;
    }

    // Send a chunk of data
    const data = JSON.stringify({ 
      text: messageIntervals[count],
      chunk: count + 1,
      total: messageIntervals.length
    });

    res.write(`data: ${data}\n\n`);
    // Try to force flush
    if (res.flush) res.flush();
    count++;
  }, 300); // Send a new chunk every 300ms
  
  // Handle client disconnect
  req.on('close', () => {
    clearInterval(interval);
  });
});

// Streaming chat API endpoint
apiRouter.post("/chat/stream", (req, res: StreamableResponse) => {
  // Get message and model from POST body or query parameters
  const message = req.body.message || req.query.message;
  const model = req.body.model || req.query.model || "streaming-chat";
  
  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }
  
  // Set headers for streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  // Prevent buffering
  res.setHeader('X-Accel-Buffering', 'no');
  // Force flush for each chunk
  res.flushHeaders();
  
  // Generate a response based on the message
  let responseText = "";
  
  if (message.toLowerCase().includes("hello")) {
    responseText = "## Hello there!\n\nI'm a streaming AI assistant with **Markdown** formatting. How can I help you today?";
  } else if (message.toLowerCase().includes("weather")) {
    responseText = "# Weather Information\n\nI don't have access to real-time weather data, but I can tell you how to check the forecast for your location:\n\n1. Visit a weather website like **Weather.com**\n2. Enter your *location* in the search bar\n3. View the current conditions and forecast";
  } else if (message.toLowerCase().includes("help")) {
    responseText = "# How I Can Help\n\nI'm here to assist you with various tasks. Here are some things I can do:\n\n- Answer questions\n- Provide information\n- Format text using **Markdown**\n- Generate code examples\n\n```javascript\n// Example code\nfunction sayHello() {\n  console.log('Hello, world!');\n}\n```";
  } else {
    responseText = `# Thank You for Your Message\n\nYou said: "${message}"\n\nThis is a simulated streaming response with **Markdown** formatting. In a real implementation, this would connect to an actual AI service.\n\n## Example Features\n\n- **Bold text** for emphasis\n- *Italics* for highlighting\n- \`Code snippets\` for technical content\n\n> Important information can be highlighted like this.`;
  }
  
  // Split the response into words
  const words = responseText.split(" ");
  let wordCount = 0;
  
  // Send words with an interval
  const interval = setInterval(() => {
    if (wordCount >= words.length) {
      // End the stream when all words are sent
      res.write(`data: [DONE]\n\n`);
      // Try to force flush
      if (res.flush) res.flush();
      clearInterval(interval);
      res.end();
      return;
    }

    // Send a word
    const data = JSON.stringify({ 
      text: words[wordCount],
      chunk: wordCount + 1,
      total: words.length,
      model: model
    });

    res.write(`data: ${data}\n\n`);
    // Try to force flush
    if (res.flush) res.flush();
    wordCount++;
  }, 100); // Send a new word every 100ms
  
  // Handle client disconnect
  req.on('close', () => {
    clearInterval(interval);
  });
});

// Also add a GET endpoint for the same functionality
apiRouter.get("/chat/stream", (req, res: StreamableResponse) => {
  // Get message and model from query parameters
  const message = req.query.message as string;
  const model = (req.query.model as string) || "streaming-chat";
  
  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }
  
  // Set headers for streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  
  // Generate a response based on the message
  let responseText = "";
  
  if (message.toLowerCase().includes("hello")) {
    responseText = "## Hello there!\n\nI'm a streaming AI assistant with **Markdown** formatting. How can I help you today?";
  } else if (message.toLowerCase().includes("weather")) {
    responseText = "# Weather Information\n\nI don't have access to real-time weather data, but I can tell you how to check the forecast for your location:\n\n1. Visit a weather website like **Weather.com**\n2. Enter your *location* in the search bar\n3. View the current conditions and forecast";
  } else if (message.toLowerCase().includes("help")) {
    responseText = "# How I Can Help\n\nI'm here to assist you with various tasks. Here are some things I can do:\n\n- Answer questions\n- Provide information\n- Format text using **Markdown**\n- Generate code examples\n\n```javascript\n// Example code\nfunction sayHello() {\n  console.log('Hello, world!');\n}\n```";
  } else {
    responseText = `# Thank You for Your Message\n\nYou said: "${message}"\n\nThis is a simulated streaming response with **Markdown** formatting. In a real implementation, this would connect to an actual AI service.\n\n## Example Features\n\n- **Bold text** for emphasis\n- *Italics* for highlighting\n- \`Code snippets\` for technical content\n\n> Important information can be highlighted like this.`;
  }
  
  // Stream character by character with short delays for better streaming visualization
  const chars = responseText.split('');
  let charIndex = 0;
  
  // Function to send the next character
  const sendNextChar = () => {
    if (charIndex < chars.length) {
      const char = chars[charIndex];
      const isWordBreak = char === ' ' || char === '.' || char === ',' || char === '!';
      
      let chunk = char;
      
      // Send data
      const data = JSON.stringify({ 
        text: chunk,
        chunk: charIndex + 1,
        total: chars.length,
        model: model,
      });

      res.write(`data: ${data}\n\n`);
      if (res.flush) res.flush();
      
      charIndex++;
      
      // Delay between characters - use longer delay at word breaks for natural reading
      const delay = isWordBreak ? 100 : 40;
      setTimeout(sendNextChar, delay);
    } else {
      // End of stream
      res.write(`data: [DONE]\n\n`);
      if (res.flush) res.flush();
      res.end();
    }
  };
  
  // Start sending characters
  sendNextChar();
  
  // Handle client disconnect
  req.on('close', () => {
    charIndex = chars.length; // Stop the sequence
  });
});

// Get current user
apiRouter.get("/user", (req, res) => {
  console.log("User endpoint hit. User authenticated:", !!req.user);
  console.log("Session info:", req.session);
  if (req.isAuthenticated()) {
    console.log("Returning user data:", req.user);
    res.json(req.user);
  } else {
    console.log("User not authenticated");
    res.status(401).json({ error: "Not authenticated" });
  }
});

// Mount API routes under /api
app.use("/api", apiRouter);

// Initialize Google auth
initGoogleAuth(app);

// Initialize test auth routes
initTestAuth(app);

// Add this after the application is set up
const checkDatabaseStructure = async () => {
  console.log("Checking database structure...");
  
  try {
    // Check if users table exists and what permissions we have
    console.log("Testing Supabase connection and permissions...");
    
    // First check if we can read from users table
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (usersError) {
      console.error("❌ Error reading from users table:", usersError);
    } else {
      console.log("✓ Successfully read from users table");
    }
    
    // Test inserting a temporary user (we'll delete it right after)
    const testEmail = `test-${Date.now()}@example.com`;
    console.log(`Testing user insertion with email: ${testEmail}`);
    
    const { data: insertData, error: insertError } = await supabase
      .from('users')
      .insert({
        email: testEmail,
        name: 'Test User',
        google_id: `test-${Date.now()}`,
      })
      .select();
    
    if (insertError) {
      console.error("❌ Error inserting test user:", insertError);
      console.error("This may indicate permission issues with the Supabase anon key");
      console.error("Please check your Supabase settings to ensure the anon key has proper permissions");
    } else {
      console.log("✓ Successfully inserted test user");
      
      // Clean up by deleting the test user
      if (insertData && insertData[0]?.id) {
        const { error: deleteError } = await supabase
          .from('users')
          .delete()
          .eq('id', insertData[0].id);
        
        if (deleteError) {
          console.error("❌ Error deleting test user:", deleteError);
        } else {
          console.log("✓ Successfully cleaned up test user");
        }
      }
    }
  } catch (error) {
    console.error("Error checking database structure:", error);
  }
};

// Only start the server if this file is run directly (not imported)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  checkDatabaseStructure();
});

// Keep the export for serverless environments
export default app; 