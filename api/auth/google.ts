import { Request, Response, NextFunction } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { supabase } from "../lib/supabase.js";

// Configure Google Strategy - always register the strategy
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "1024340638661-6vdanilktc200ddpj3h1e6vj3tqlrt67.apps.googleusercontent.com";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "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";

// Update the way we handle the callback and include the BASE_URL
const BASE_URL = process.env.CLIENT_URL || 'http://localhost:3000';
console.log("Using BASE_URL for redirection:", BASE_URL);

// Extend session type
declare module 'express-session' {
  interface SessionData {
    oauthState?: string;
  }
}

// Always register the strategy with the correct callback URL
passport.use(
  new GoogleStrategy(
    {
      clientID: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      callbackURL: `${BASE_URL}/api/auth/google/callback`,
      scope: ["profile", "email"],
      proxy: true
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log("Google auth callback received profile:", profile);
        
        // Create or update user in your database here
        const user = {
          id: profile.id,
          email: profile.emails?.[0]?.value,
          name: profile.displayName,
          picture: profile.photos?.[0]?.value,
        };
        
        return done(null, user);
      } catch (error) {
        console.error("Error in Google Strategy callback:", error);
        return done(error as Error);
      }
    }
  )
);

// Serialize user for the session
passport.serializeUser((user: any, done) => {
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

// Initialize Google auth routes
export const initGoogleAuth = (app: any) => {
  console.log("Initializing Google Auth routes");

  // Google auth route
  app.get("/api/auth/google", (req: Request, res: Response, next: any) => {
    console.log("Google auth route hit - redirecting to Google");
    
    // Generate a random state parameter for security
    const state = Math.random().toString(36).substring(2, 15);
    req.session.oauthState = state;
    
    passport.authenticate("google", { 
      scope: ["profile", "email"],
      prompt: "select_account",
      state: state
    })(req, res, next);
  });

  // Google callback route
  app.get(
    "/api/auth/google/callback",
    (req: Request, res: Response, next: NextFunction) => {
      console.log("Google callback route hit with query params:", req.query);
      
      // Verify state parameter to prevent CSRF
      if (req.query.state && req.session.oauthState && req.query.state !== req.session.oauthState) {
        console.error("OAuth state mismatch - possible CSRF attack");
        return res.redirect('/login?error=invalid_state');
      }
      
      if (req.query.error) {
        console.error("Error in Google callback:", req.query.error);
        return res.redirect('/login?error=auth_failed');
      }
      
      if (!req.query.code) {
        console.error("No authorization code received from Google");
        return res.redirect('/login?error=no_code');
      }
      
      next();
    },
    passport.authenticate("google", { 
      session: true,
      failureRedirect: '/login?error=auth_failed',
    }),
    (req: Request, res: Response) => {
      console.log("Authentication successful, redirecting to chat interface");
      
      // Set auth success cookie
      res.cookie('auth_success', 'true', {
        maxAge: 5000,
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
      });
      
      // Use window.location.replace in a script for client-side navigation
      const script = `
        <script>
          document.cookie = "auth_success=true; max-age=5; path=/";
          window.location.replace("${BASE_URL}/chat");
        </script>
      `;
      
      // Send HTML with script for client-side navigation
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Redirecting...</title>
            <meta http-equiv="refresh" content="0;url=${BASE_URL}/chat">
          </head>
          <body>
            <p>Authentication successful! Redirecting to chat interface...</p>
            ${script}
          </body>
        </html>
      `);
    }
  );

  // Test route to check authentication
  app.get("/api/auth/status", (req: Request, res: Response) => {
    console.log("Auth status route hit");
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