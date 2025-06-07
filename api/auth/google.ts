import { Request, Response, NextFunction } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { supabase } from "../lib/supabase.js";

// Configure Google Strategy using environment variables
if (!process.env.GOOGLE_CLIENT_ID) {
  console.error("ERROR: GOOGLE_CLIENT_ID environment variable is not set!");
}
if (!process.env.GOOGLE_CLIENT_SECRET) {
  console.error("ERROR: GOOGLE_CLIENT_SECRET environment variable is not set!");
}

// Provide default values for TypeScript (these won't be used in production)
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

// Update the way we handle the callback and include the BASE_URL
const BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://enggbot.vercel.app'
  : (process.env.CLIENT_URL || 'http://localhost:3000');

// Only log in development
const isDev = process.env.NODE_ENV !== 'production';
if (isDev) {
  console.log("Using BASE_URL for redirection:", BASE_URL);
  console.log("Current NODE_ENV:", process.env.NODE_ENV);
}

// Extend session type
declare module 'express-session' {
  interface SessionData {
    oauthState?: string;
    authenticated?: boolean;
  }
}

// Define types for the Google Strategy callback
type GoogleProfile = {
  id: string;
  displayName: string;
  emails?: Array<{value: string}>;
  photos?: Array<{value: string}>;
};

type DoneCallback = (err: Error | null, user?: any) => void;

// Configure cache control headers for faster responses
const setCacheControlHeaders = (res: Response) => {
  // For static resources
  res.setHeader('Cache-Control', 'public, max-age=86400');
};

// Minimize user data to reduce serialization size
const minimizeUserData = (user: any) => ({
  id: user.id,
  google_id: user.google_id,
  name: user.name,
  // Only include essential fields
});

// Initialize Google Strategy with optimizations
passport.use(
  new GoogleStrategy(
    {
      clientID: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      callbackURL: `${BASE_URL}/api/auth/google/callback`,
      scope: ["profile", "email"],
      proxy: true,
      // Add performance optimizations
      passReqToCallback: false, // Reduce function arguments
    },
    async (accessToken: string, refreshToken: string, profile: GoogleProfile, done: DoneCallback) => {
      try {
        // Optimize user data structure to only include necessary fields
        const userData = {
          google_id: profile.id,
          email: profile.emails?.[0]?.value,
          name: profile.displayName,
          avatar: profile.photos?.[0]?.value,
          last_login: new Date().toISOString()
        };
        
        const { data, error } = await supabase
          .from('users')
          .upsert(userData, { 
            onConflict: 'google_id'
          })
          .select('id, google_id, name'); // Only select required fields
        
        if (error) {
          if (isDev) console.error("Error upserting user:", error);
          return done(error);
        }
        
        // Return minimal user data
        return done(null, data[0]);
      } catch (error) {
        if (isDev) console.error("Error in Google Strategy callback:", error);
        return done(error as Error);
      }
    }
  )
);

// Serialize user for the session - only store minimal information
passport.serializeUser((user: any, done) => {
  // Only store the ID to minimize session size
  done(null, user.id);
});

// Deserialize user from the session - only fetch required fields
passport.deserializeUser(async (id: string, done) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, google_id, name, email, avatar')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    done(null, user);
  } catch (error) {
    done(error);
  }
});

// Initialize Google auth routes
export const initGoogleAuth = (app: any) => {
  if (isDev) console.log("Initializing Google Auth routes");

  // Google auth route - streamlined for performance
  app.get("/api/auth/google", (req: Request, res: Response, next: any) => {
    // Use the state parameter from the client if provided
    const state = req.query.state as string || Math.random().toString(36).substring(2, 15);
    
    // Store state in session for verification during callback
    req.session.oauthState = state;
    
    // Set optimized passport authenticate options
    passport.authenticate("google", { 
      scope: ["profile", "email"],
      prompt: req.query.prompt as string || "select_account",
      state: state,
      // Add performance options
      session: true,
      failWithError: true
    })(req, res, next);
  });

  // Google callback route with optimizations
  app.get(
    "/api/auth/google/callback",
    (req: Request, res: Response, next: NextFunction) => {
      // Skip state verification if there's an error (faster path)
      if (req.query.error) {
        return res.redirect('/login?error=' + encodeURIComponent(req.query.error as string));
      }
      
      // Only verify state if both values are present
      if (req.query.state && req.session.oauthState && req.query.state !== req.session.oauthState) {
        return res.redirect('/login?error=invalid_state');
      }
      
      if (!req.query.code) {
        return res.redirect('/login?error=no_code');
      }
      
      next();
    },
    passport.authenticate("google", { 
      session: true,
      failureRedirect: '/login?error=auth_failed',
    }),
    (req: Request, res: Response) => {
      // Set session flag
      if (req.session) {
        req.session.authenticated = true;
        // Save session explicitly to ensure it's stored
        req.session.save(() => {
          // Set fast response headers
          res.setHeader('Connection', 'keep-alive');
          
          // Set authentication cookie (keep for compatibility)
          res.cookie('auth_success', 'true', {
            maxAge: 10000,
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            path: '/'
          });
          
          // Direct redirect for faster response
          const redirectUrl = `http://localhost:3001/?auth_success=true`;
          res.redirect(302, redirectUrl);
        });
      } else {
        // Direct redirect if session not available
        const redirectUrl = `http://localhost:3001/?auth_success=true`;
        res.redirect(302, redirectUrl);
      }
    }
  );

  // Fast auth status check endpoint
  app.get("/api/auth/status", (req: Request, res: Response) => {
    if (req.isAuthenticated()) {
      res.json({ authenticated: true, user: req.user });
    } else {
      res.json({ authenticated: false });
    }
  });

  // Logout route
  app.get("/api/auth/logout", (req: Request, res: Response) => {
    req.logout(() => {
      res.redirect("/");
    });
  });
}; 