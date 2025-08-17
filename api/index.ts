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
import multer from "multer";

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
  origin: [
    process.env.CLIENT_URL || "http://localhost:3000",
    "http://localhost:5173",
    "https://enggbot.vercel.app",
    "http://localhost:3001",
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));
app.use(express.json());

// Removed test cookie middleware to reduce header writes on every request

// Session configuration with improved settings
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,           // Do not save session if unmodified
    saveUninitialized: false, // Do not create sessions until something stored
    rolling: false,          // Only reset expiration when session is modified
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

// Removed per-request session touch/logging to avoid unnecessary writes

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

// Initialize Google auth
initGoogleAuth(app);

// Initialize test auth routes
initTestAuth(app);

// Multer configuration for file uploads (in-memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 10,
  },
});

// Helper: extract text from a limited set of file types
const extractTextFromBuffer = async (
  file: Express.Multer.File
): Promise<{ text: string; truncated: boolean }> => {
  try {
    const name = file.originalname?.toLowerCase() || "file";
    const mime = file.mimetype || "";

    // Direct text formats
    const textLike =
      mime.startsWith("text/") ||
      name.endsWith(".txt") ||
      name.endsWith(".md") ||
      name.endsWith(".csv") ||
      name.endsWith(".json") ||
      name.endsWith(".log");

    if (textLike) {
      const raw = file.buffer.toString("utf-8");
      const maxPerFile = 8000;
      if (raw.length > maxPerFile) {
        return { text: raw.slice(0, maxPerFile) + "\n...[truncated]", truncated: true };
      }
      return { text: raw, truncated: false };
    }

    // Try PDF via dynamic import to avoid hard dependency if not installed
    const isPdf = mime === "application/pdf" || name.endsWith(".pdf");
    if (isPdf) {
      try {
        // Lazy import; if missing, we'll catch and return a helpful note
        const mod = await import('pdf-parse');
        const pdfParse: any = (mod as any).default || (mod as any);
        const parsed = await pdfParse(file.buffer);
        const raw = (parsed?.text || '').toString();
        const maxPerFile = 8000;
        if (raw.length > maxPerFile) {
          return { text: raw.slice(0, maxPerFile) + "\n...[truncated]", truncated: true };
        }
        return { text: raw, truncated: false };
      } catch (e) {
        return {
          text: `\n[Note] A PDF was uploaded (\"${file.originalname}\"), but PDF parsing isn't available. Install 'pdf-parse' to enable PDF text extraction.`,
          truncated: false,
        };
      }
    }

    // Unsupported types for now (DOCX etc.)
    return {
      text: `\n[Note] Skipped unsupported file type for "${file.originalname}" (type: ${mime}).`,
      truncated: false,
    };
  } catch (e) {
    return { text: "", truncated: false };
  }
};

// POST /api/files/process — process attachments and return combined text
app.post("/api/files/process", upload.any(), async (req, res) => {
  try {
    const files = (req.files as Express.Multer.File[]) || [];
    if (!files.length) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const results: { name: string; truncated: boolean }[] = [];
    let combinedText = "";
    for (const f of files) {
      const { text, truncated } = await extractTextFromBuffer(f);
      results.push({ name: f.originalname, truncated });
      if (text) {
        combinedText += `\n\n--- ${f.originalname} ---\n` + text;
      }
    }

    // Global cap to keep prompts manageable
    const maxCombined = 20000;
    if (combinedText.length > maxCombined) {
      combinedText = combinedText.slice(0, maxCombined) + "\n...[truncated overall]";
    }

    return res.json({ files: results, combinedText });
  } catch (error) {
    console.error("/api/files/process error:", error);
    return res.status(500).json({ error: "Failed to process files" });
  }
});

// POST /api/chat/stream — stream mock response via SSE
app.post("/api/chat/stream", async (req, res) => {
  try {
    const { message, model, thinkingMode, filesText } = req.body || {};

    // SSE headers
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Keep-Alive", "timeout=60, max=1000");
    // Disable proxy buffering (nginx, etc.)
    res.setHeader("X-Accel-Buffering", "no");
    // @ts-ignore flushHeaders may not exist in some types but is present in Node
    if (typeof res.flushHeaders === "function") res.flushHeaders();
    // Enable TCP keep-alive at the socket level
    // @ts-ignore
    if (res.socket && typeof res.socket.setKeepAlive === "function") {
      // @ts-ignore
      res.socket.setKeepAlive(true, 10000);
    }

    // Send an initial comment and heartbeat to prime the stream
    console.log("/api/chat/stream: client connected, priming stream");
    try {
      // Large initial padding comment to force flush in some environments
      res.write(`: ${' '.repeat(2048)}\n`);
      res.write(`: connected\n\n`);
      // Client hint: reconnection retry
      res.write(`retry: 10000\n\n`);
      res.write(`data: ${JSON.stringify({ text: "" })}\n\n`);
    } catch (e) {
      console.error("/api/chat/stream: write error on prime", e);
    }

    const base =
      `Here is a helpful ${thinkingMode ? "reasoned " : ""}answer using the selected model (${model || "default"}).\n\n` +
      (message ? "" : "") +
      "I can integrate external models for real-time generation once the API key is configured.\n\n";

    const responseText = base + (message || "");
    const chunks: string[] = [];
    const step = 60; // characters per chunk
    for (let i = 0; i < responseText.length; i += step) {
      chunks.push(responseText.slice(i, i + step));
    }
    if (!chunks.length) chunks.push("(no content)");

    let index = 0;
    // Heartbeat every 15s to keep connection alive
    const heartbeat = setInterval(() => {
      try { res.write(": keep-alive\n\n"); } catch {}
    }, 15000);

    // Send the first chunk immediately so clients see incremental output
    if (chunks.length > 0) {
      const first = chunks[index++];
      try {
        res.write(`data: ${JSON.stringify({ text: first })}\n\n`);
        console.log(`/api/chat/stream: wrote first chunk 1/${chunks.length} (len=${first.length})`);
      } catch (e) {
        console.error("/api/chat/stream: write error (first chunk)", e);
      }
    }

    const interval = setInterval(() => {
      if (index >= chunks.length) {
        console.log("/api/chat/stream: sending [DONE]");
        res.write(`data: [DONE]\n\n`);
        clearInterval(interval);
        clearInterval(heartbeat);
        // End the response so fetch() stream finishes on the client
        try { res.end(); console.log("/api/chat/stream: res.end() called"); } catch {}
        return;
      }
      const next = chunks[index++];
      const payload = JSON.stringify({ text: next });
      try {
        res.write(`data: ${payload}\n\n`);
        console.log(`/api/chat/stream: wrote chunk ${index}/${chunks.length} (len=${next.length})`);
      } catch (e) {
        console.error("/api/chat/stream: write error", e);
      }
    }, 80);

    req.on("close", () => {
      clearInterval(interval);
      clearInterval(heartbeat);
      try { res.end(); } catch {}
      console.log("/api/chat/stream: client disconnected");
    });
  } catch (error) {
    console.error("/api/chat/stream error:", error);
    // On error, send a single chunk and close
    try {
      res.setHeader("Content-Type", "text/event-stream");
      res.write(`data: ${JSON.stringify({ text: "Sorry, an error occurred while streaming." })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    } catch {}
  }
});

// --- Chat persistence routes ---
// Ensure the user is authenticated via session
const ensureAuthenticated: express.RequestHandler = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  return res.status(401).json({ error: "Not authenticated" });
};

// List conversations for the current user
app.get("/api/chat/conversations", ensureAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const { data, error } = await supabase
      .from("conversations")
      .select("id, title, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    res.json({ conversations: data || [] });
  } catch (e) {
    console.error("GET /api/chat/conversations error", e);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// Create or upsert a conversation for the current user
app.post("/api/chat/conversations", ensureAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const { id, title } = req.body || {};

    const payload: any = {
      user_id: user.id,
      title: title || (id ? `Conversation ${String(id).slice(0, 6)}` : "New Conversation"),
    };
    if (id) payload.id = id;

    const { data, error } = await supabase
      .from("conversations")
      .upsert(payload, { onConflict: "id" })
      .select("id, title, created_at, updated_at")
      .single();
    if (error) throw error;
    res.json({ conversation: data });
  } catch (e) {
    console.error("POST /api/chat/conversations error", e);
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

// Delete a conversation (and its messages via FK cascade)
app.delete("/api/chat/conversations/:id", ensureAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const { id } = req.params;

    // Verify ownership
    const { data: conv, error: convErr } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    if (convErr || !conv) return res.status(404).json({ error: "Conversation not found" });

    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/chat/conversations/:id error", e);
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

// Get messages for a conversation
app.get("/api/chat/conversations/:id/messages", ensureAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const { id } = req.params;

    // Verify conversation ownership
    const { data: conv, error: convErr } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    if (convErr || !conv) return res.status(404).json({ error: "Conversation not found" });

    const { data, error } = await supabase
      .from("messages")
      .select("id, role, content, attachments, reply_to_id, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });
    if (error) throw error;

    res.json({ messages: data || [] });
  } catch (e) {
    console.error("GET /api/chat/conversations/:id/messages error", e);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Upsert a message for a conversation
app.post("/api/chat/conversations/:id/messages", ensureAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const { id } = req.params;
    const { message } = req.body || {};
    // message: { id, role: 'user'|'assistant', content, attachments?, reply_to_id?, created_at? }

    if (!message || !message.id || !message.content || !message.role) {
      return res.status(400).json({ error: "message.id, message.role and message.content are required" });
    }

    // Ensure conversation exists and belongs to user; create if absent
    const { data: existing, error: existingErr } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingErr) throw existingErr;

    if (!existing) {
      // Create with a generic title using first user message content if available
      const defaultTitle = message.role === 'user' ? (message.content?.slice(0, 30) || "New Conversation") : "New Conversation";
      const { error: createErr } = await supabase
        .from("conversations")
        .insert({ id, user_id: user.id, title: defaultTitle });
      if (createErr) throw createErr;
    }

    const payload: any = {
      id: message.id,
      conversation_id: id,
      role: message.role,
      content: message.content,
      attachments: message.attachments ?? null,
      reply_to_id: message.reply_to_id ?? null,
      created_at: message.created_at ?? new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("messages")
      .upsert(payload, { onConflict: "id" })
      .select("id, role, content, attachments, reply_to_id, created_at")
      .single();
    if (error) throw error;
    res.json({ message: data });
  } catch (e) {
    console.error("POST /api/chat/conversations/:id/messages error", e);
    res.status(500).json({ error: "Failed to upsert message" });
  }
});

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