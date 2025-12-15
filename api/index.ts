// IMPORTANT: dotenv MUST be loaded before any other imports that need env vars
// This file uses a two-phase approach:
// 1. Load dotenv synchronously at the very top
// 2. Then dynamically import modules that depend on env vars

import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Load env vars FIRST, before anything else
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

// Now that env vars are loaded, we can import other modules dynamically
async function main() {
  // Dynamic imports - these run AFTER dotenv.config()
  const express = (await import("express")).default;
  const cors = (await import("cors")).default;
  const session = (await import("express-session")).default;
  const passport = (await import("passport")).default;

  // Import our modules that need env vars
  const { initGoogleAuth } = await import("./auth/google.js");
  const { initEmailAuth } = await import("./auth/email.js");
  const { supabase } = await import("./lib/supabase");
  const { initTestAuth } = await import("./auth/test.js");
  const { initPasswordAuth } = await import("./auth/password.js");

  // Log environment variables for debugging
  console.log("Environment Variables:");
  console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID || "Not set");
  console.log("GOOGLE_CLIENT_SECRET:", process.env.GOOGLE_CLIENT_SECRET ? "Set (length: " + process.env.GOOGLE_CLIENT_SECRET.length + ")" : "Not set");
  console.log("SUPABASE_URL:", process.env.SUPABASE_URL || "Not set");
  console.log("CLIENT_URL:", process.env.CLIENT_URL || "Not set");

  // Fix any formatting issues in environment variables
  if (process.env.GOOGLE_CLIENT_ID) {
    const originalId = process.env.GOOGLE_CLIENT_ID;
    process.env.GOOGLE_CLIENT_ID = originalId
      .replace(/\r?\n|\r/g, '')
      .replace(/\s+/g, '')
      .trim();

    if (!process.env.GOOGLE_CLIENT_ID.endsWith('.apps.googleusercontent.com')) {
      process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID.split('.apps.googleuser')[0] + '.apps.googleusercontent.com';
    }

    console.log("Original Client ID:", JSON.stringify(originalId));
    console.log("Fixed Client ID:", JSON.stringify(process.env.GOOGLE_CLIENT_ID));
  }

  const app = express();

  // Determine if we're in production
  const isProduction = process.env.NODE_ENV === 'production';
  console.log("Environment:", isProduction ? "production" : "development");

  // Middleware
  app.use(cors({
    origin: [
      process.env.CLIENT_URL || "http://localhost:3000",
      "http://localhost:5173",
      "https://www.enggbot.me",
      "http://localhost:3001",
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  }));
  app.use(express.json());

  // Session configuration
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "your-secret-key",
      resave: false,
      saveUninitialized: false,
      rolling: false,
      cookie: {
        secure: isProduction,
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: isProduction ? 'none' : 'lax'
      },
      name: 'enggbot.sid',
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  // API routes
  const apiRouter = express.Router();

  apiRouter.get("/hello", (req: any, res: any) => {
    console.log("Hello endpoint hit");
    res.json({ message: "Hello from the API!" });
  });

  apiRouter.get("/check-google-config", (req: any, res: any) => {
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

  apiRouter.get("/test-connection", async (req: any, res: any) => {
    console.log("Test connection endpoint hit");
    try {
      const { data, error } = await supabase.from('users').select('count');
      if (error) throw error;
      res.json({ status: "success", message: "Connected to Supabase!", data });
    } catch (error) {
      console.error("Supabase connection error:", error);
      res.status(500).json({ status: "error", message: "Failed to connect to Supabase" });
    }
  });

  apiRouter.get("/health", (req: any, res: any) => {
    res.json({ status: "ok" });
  });

  apiRouter.get("/user", (req: any, res: any) => {
    console.log("User endpoint hit. User authenticated:", !!req.user);
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ error: "Not authenticated" });
    }
  });

  app.use("/api", apiRouter);

  // Initialize auth modules
  initGoogleAuth(app);
  initEmailAuth(app);
  initTestAuth(app);
  initPasswordAuth(app);

  // Database check function
  const checkDatabaseStructure = async () => {
    console.log("Checking database structure...");
    try {
      console.log("Testing Supabase connection and permissions...");
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('count')
        .limit(1);

      if (usersError) {
        console.error("❌ Error reading from users table:", usersError);
      } else {
        console.log("✓ Successfully read from users table");
      }

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
      } else {
        console.log("✓ Successfully inserted test user");
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

  // Start the server
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    checkDatabaseStructure();
  });

  return app;
}

// Run the main function
main().catch(console.error);