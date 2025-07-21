import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import fs from 'fs';

// Improved dotenv loading for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try multiple potential paths for .env file
const envPaths = [
  '.env',
  './.env',
  join(__dirname, '.env'),
  join(__dirname, '../.env'),
];

let envFile = null;
for (const path of envPaths) {
  try {
    if (fs.existsSync(path)) {
      console.log(`Found .env file at: ${path}`);
      envFile = path;
      dotenv.config({ path });
      break;
    }
  } catch (e) {
    console.error(`Error checking .env at ${path}:`, e);
  }
}

if (!envFile) {
  console.warn("No .env file found, using environment variables as is");
  dotenv.config();
}

// Now import other modules after environment variables are loaded
import express from "express";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import { initGoogleAuth } from "./auth/google.js";
import { supabase } from "./lib/supabase.js";
import { initTestAuth } from "./auth/test.js";
import projectsRouter from "./routes/projects.js";
import ragRouter from "./routes/rag.js";

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
  origin: [process.env.CLIENT_URL || "http://localhost:3000", "https://enggbot.vercel.app", "http://localhost:3001"],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));
app.use(express.json());

// Add a pre-session middleware to ensure cookies are working
app.use((req, res, next) => {
  // Set a test cookie to verify cookie functionality
  res.cookie('session_test', 'true', {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax'
  });
  next();
});

// Session configuration with improved settings
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: true,           // Changed to true to ensure session is saved even if not changed
    saveUninitialized: true, // Ensure session is always created
    rolling: true,          // Resets the cookie expiration on each response
    cookie: {
      // Only use secure cookies in production
      secure: isProduction,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      // Use lax for local development to ensure cookies are sent
      sameSite: isProduction ? 'none' : 'lax'
    },
    name: 'enggbot.sid',    // Custom name to avoid conflicts with other apps
  })
);

// Add session debugging middleware
app.use((req, res, next) => {
  // Check if session exists and has an ID
  if (req.session) {
    console.log(`Session ID: ${req.session.id?.substring(0, 8)}... (Session exists)`);
    // Ensure session is saved on every request
    req.session.touch();
  } else {
    console.log("No session found");
  }
  next();
});

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

// Mount projects routes
app.use("/api/projects", projectsRouter);

// Mount RAG routes
app.use("/api/rag", ragRouter);

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