import { Request, Response, NextFunction } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { supabase } from "../lib/supabase.js";

/**
 * Specialized Google Auth implementation for Netlify deployments
 * This addresses the redirect_uri_mismatch error by ensuring consistent URL handling
 */

// Get environment variables with Netlify-specific fallbacks
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

// Netlify-specific URL handling
const NETLIFY_URL = 'https://enggbot.netlify.app';
const BASE_URL = process.env.NODE_ENV === 'production' ? NETLIFY_URL : 'http://localhost:3000';

// The exact callback URL that matches Google Cloud Console
const CALLBACK_URL = `${BASE_URL}/api/auth/google/callback`;

console.log("=== Netlify Google Auth Configuration ===");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("BASE_URL:", BASE_URL);
console.log("CALLBACK_URL:", CALLBACK_URL);
console.log("Google Client ID:", CLIENT_ID ? 'Set' : 'Missing');
console.log("Google Client Secret:", CLIENT_SECRET ? 'Set' : 'Missing');
console.log("=========================================");

// Extend session type
declare module 'express-session' {
  interface SessionData {
    oauthState?: string;
    authenticated?: boolean;
  }
}

// Configure Google strategy specifically for Netlify
passport.use(
  new GoogleStrategy(
    {
      clientID: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      callbackURL: CALLBACK_URL,
      scope: ["profile", "email"],
      proxy: true
    },
    async (accessToken: string, refreshToken: string, profile: any, done: (error: any, user?: any) => void) => {
      try {
        console.log("Google auth callback received profile:", profile);
        
        // Check if user exists in our database
        const { data: existingUser, error: findError } = await supabase
          .from('users')
          .select('*')
          .eq('google_id', profile.id)
          .single();
        
        if (findError && findError.code !== 'PGRST116') {
          console.error("Error finding user:", findError);
          throw findError;
        }
        
        let userData;
        
        if (!existingUser) {
          // User doesn't exist, create a new one
          console.log("Creating new user with Google ID:", profile.id);
          
          const newUser = {
            google_id: profile.id,
            email: profile.emails?.[0]?.value,
            name: profile.displayName,
            avatar: profile.photos?.[0]?.value,
          };
          
          const { data: insertedUser, error: insertError } = await supabase
            .from('users')
            .insert([newUser])
            .select();
          
          if (insertError) {
            console.error("Error inserting user:", insertError);
            throw insertError;
          }
          
          userData = insertedUser[0];
          console.log("Successfully created user:", userData);
        } else {
          // User exists, update their info
          console.log("User already exists, updating profile");
          
          const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update({
              email: profile.emails?.[0]?.value,
              name: profile.displayName,
              avatar: profile.photos?.[0]?.value,
            })
            .eq('google_id', profile.id)
            .select();
          
          if (updateError) {
            console.error("Error updating user:", updateError);
            // Continue with existing user data
            userData = existingUser;
          } else {
            userData = updatedUser[0];
            console.log("User data updated:", userData);
          }
        }
        
        return done(null, userData);
      } catch (error) {
        console.error("Error in Google Strategy callback:", error);
        return done(error as Error);
      }
    }
  )
);

// Serialize user for the session
passport.serializeUser((user: any, done) => {
  console.log("Serializing user:", user);
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id: string, done) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
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

// Initialize Netlify-specific Google auth routes
export const initNetlifyGoogleAuth = (app: any) => {
  console.log("Initializing Netlify Google Auth routes");

  // Google auth route - modified for Netlify
  app.get("/api/auth/google", (req: Request, res: Response, next: NextFunction) => {
    console.log("Google auth route hit - Netlify specific implementation");
    console.log("Request origin:", req.headers.origin);
    console.log("Request host:", req.get('host'));
    
    // Generate a random state parameter for security
    const state = Math.random().toString(36).substring(2, 15);
    req.session.oauthState = state;
    
    // Use the same strategy but explicitly set callbackURL to match Google Cloud Console exactly
    passport.authenticate("google", { 
      scope: ["profile", "email"],
      prompt: "select_account",
      state: state
    })(req, res, next);
  });

  // Google callback route - modified for Netlify
  app.get(
    "/api/auth/google/callback",
    (req: Request, res: Response, next: NextFunction) => {
      console.log("Netlify Google callback route hit");
      console.log("Query params:", req.query);
      console.log("Request URL:", req.originalUrl);
      console.log("Request host:", req.get('host'));
      console.log("Session state:", req.session?.oauthState);
      
      // Verify state parameter to prevent CSRF
      if (req.query.state && req.session.oauthState && req.query.state !== req.session.oauthState) {
        console.error("OAuth state mismatch - possible CSRF attack");
        return res.redirect('/login?error=invalid_state');
      }
      
      if (req.query.error) {
        console.error("Error in Google callback:", req.query.error);
        return res.redirect('/login?error=auth_failed');
      }
      
      next();
    },
    passport.authenticate("google", { 
      session: true,
      failureRedirect: '/login?error=auth_failed',
    }),
    (req: Request, res: Response) => {
      console.log("Authentication successful, redirecting to chat interface");
      
      // Set session cookie with appropriate settings for Netlify
      res.cookie('auth_success', 'true', {
        maxAge: 10000,
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/'
      });
      
      // Set session flag
      if (req.session) {
        req.session.authenticated = true;
        req.session.save((err) => {
          if (err) {
            console.error("Error saving session:", err);
          }
        });
      }
      
      // Redirect to the chat interface
      const redirectUrl = `${BASE_URL}/AI_UI/?auth_success=true`;
      console.log("Redirecting to:", redirectUrl);
      return res.redirect(redirectUrl);
    }
  );

  // User info endpoint
  app.get("/api/user", (req: Request, res: Response) => {
    if (req.isAuthenticated()) {
      res.json({ user: req.user, authenticated: true });
    } else {
      res.json({ authenticated: false });
    }
  });

  // Logout endpoint
  app.get("/api/auth/logout", (req: Request, res: Response) => {
    req.logout(() => {
      console.log("User logged out");
      res.redirect('/');
    });
  });

  console.log("Netlify Google Auth routes initialized");
};
