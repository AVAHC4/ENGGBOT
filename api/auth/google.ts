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
  
console.log("Using BASE_URL for redirection:", BASE_URL);
console.log("Current NODE_ENV:", process.env.NODE_ENV);

// Extend session type
declare module 'express-session' {
  interface SessionData {
    oauthState?: string;
    authenticated?: boolean;
  }
}

// Always register the strategy with the correct callback URL
// Define types for the Google Strategy callback
type GoogleProfile = {
  id: string;
  displayName: string;
  emails?: Array<{value: string}>;
  photos?: Array<{value: string}>;
};

type DoneCallback = (err: Error | null, user?: any) => void;

passport.use(
  new GoogleStrategy(
    {
      clientID: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      callbackURL: `${BASE_URL}/api/auth/google/callback`,
      scope: ["profile", "email"],
      proxy: true
    },
    async (accessToken: string, refreshToken: string, profile: GoogleProfile, done: DoneCallback) => {
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
  // Use the database ID, not the Google ID
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
    
    // Use the state parameter from the client if provided, or generate a new one
    const state = req.query.state as string || Math.random().toString(36).substring(2, 15);
    console.log("Using OAuth state parameter:", state);
    
    // Store state in session for verification during callback
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
      console.log("Authentication successful, attempting redirect to AI_UI chat interface");
      
      // For optimal performance, use a minimal HTML response that focuses on speed
      // The AI_UI chat interface is at the root of the AI_UI application
      const redirectUrl = `${BASE_URL.replace(':3000', '')}/AI_UI/?auth_success=true`;
      
      // Set multiple cookies for redundancy but keep it lightweight
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
      }
      
      // Send a minimal, performance-optimized HTML response
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Redirecting...</title>
            <script>
              // Store auth in multiple places for redundancy
              localStorage.setItem("authenticated", "true");
              sessionStorage.setItem("authenticated", "true");
              
              // Immediately redirect - don't wait
              window.location.replace("${redirectUrl}");
            </script>
          </head>
          <body>
            <p>Redirecting to AI chat interface...</p>
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