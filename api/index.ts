import express from "express";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import { initGoogleAuth } from "./auth/google.js";
import { supabase } from "./lib/supabase.js";
import dotenv from "dotenv";
import { initTestAuth } from "./auth/test.js";

// Load environment variables
dotenv.config({ path: '../.env' });

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      sameSite: 'lax'
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
    clientID: process.env.GOOGLE_CLIENT_ID ? "Set (first 5 chars: " + process.env.GOOGLE_CLIENT_ID.substring(0, 5) + "...)" : "Not set",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ? "Set (length: " + process.env.GOOGLE_CLIENT_SECRET.length + ")" : "Not set",
    callbackURL: "http://localhost:3000/api/auth/google/callback",
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 