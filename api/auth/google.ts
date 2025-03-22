import { Request, Response } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { supabase } from "../lib/supabase.js";

// Configure Google Strategy - always register the strategy
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "***REMOVED***";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "***REMOVED***";

console.log("Configuring Google Strategy with clientID:", CLIENT_ID);
console.log("Redirect URI:", "http://localhost:3000/api/auth/google/callback");

// Extend session type
declare module 'express-session' {
  interface SessionData {
    oauthState?: string;
  }
}

// Always register the strategy, even with placeholder values that will be replaced
passport.use(
  new GoogleStrategy(
    {
      clientID: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      callbackURL: `${process.env.CLIENT_URL || 'http://localhost:3000'}/api/auth/google/callback`,
      scope: ["profile", "email"],
      proxy: true
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log("Google OAuth callback received profile:", profile.id, profile.displayName);
        console.log("Profile details:", {
          id: profile.id,
          displayName: profile.displayName,
          emails: profile.emails,
          photos: profile.photos
        });
        
        // Check if user exists in Supabase
        console.log("Checking if user exists in Supabase with google_id:", profile.id);
        const { data: existingUser, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('google_id', profile.id)
          .single();

        if (fetchError) {
          console.error("Error fetching user from Supabase:", fetchError);
          if (fetchError.code !== 'PGRST116') {
            throw fetchError;
          }
        }

        if (existingUser) {
          console.log("Found existing user:", existingUser.id);
          return done(null, existingUser);
        }

        const email = profile.emails?.[0]?.value || "";
        if (!email) {
          console.error("No email found in Google profile");
          throw new Error("No email found in Google profile");
        }

        console.log("User not found, creating new user with email:", email);
        
        // Create new user in Supabase
        const userData = {
          email: email,
          name: profile.displayName || "",
          google_id: profile.id,
          avatar: profile.photos?.[0]?.value || "",
        };
        
        console.log("Inserting new user with data:", userData);
        console.log("Using SERVICE ROLE KEY which should bypass RLS policies");
        
        try {
          const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert(userData)
            .select()
            .single();

          if (insertError) {
            console.error("Error inserting new user to Supabase:", insertError);
            console.error("Insert error details:", {
              code: insertError.code,
              message: insertError.message,
              details: insertError.details,
              hint: insertError.hint
            });
            
            // Try with an SQL insert as a last resort
            console.log("Attempting direct SQL insert as fallback...");
            const { data: sqlResult, error: sqlError } = await supabase.rpc('insert_user', { 
              user_email: email,
              user_name: profile.displayName || "",
              user_google_id: profile.id,
              user_avatar: profile.photos?.[0]?.value || ""
            });
            
            if (sqlError) {
              console.error("SQL insert failed:", sqlError);
              throw sqlError;
            }
            
            console.log("SQL insert succeeded:", sqlResult);
            
            // Get the inserted user
            const { data: insertedUser, error: fetchError } = await supabase
              .from('users')
              .select('*')
              .eq('email', email)
              .single();
              
            if (fetchError) {
              console.error("Error fetching newly inserted user:", fetchError);
              throw fetchError;
            }
            
            console.log("Successfully created user via SQL:", insertedUser?.id);
            return done(null, insertedUser);
          }

          console.log("Successfully created new user:", newUser?.id);
          return done(null, newUser);
        } catch (error) {
          console.error("Caught error in user creation:", error);
          return done(error as Error);
        }
      } catch (error) {
        console.error("Caught error in Google strategy callback:", error);
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
    (req: Request, res: Response, next: any) => {
      console.log("Google callback route hit with query params:", req.query);
      console.log("Attempting to authenticate with Google...");
      
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
    (req: Request, res: Response, next: any) => {
      passport.authenticate("google", { 
        session: true,
        failureRedirect: '/login?error=auth_failed',
      }, (err: any, user: any, info: any) => {
        console.log("Passport authenticate callback executed");
        
        if (err) {
          console.error("Authentication error:", err);
          console.error("Error name:", err.name);
          console.error("Error message:", err.message);
          
          // Show more details about specific errors
          if (err.name === 'TokenError' && err.message === 'Unauthorized') {
            console.error("TokenError: Unauthorized - This typically happens when:");
            console.error("1. The OAuth2 code has already been used (codes can only be used once)");
            console.error("2. The client_id or client_secret are incorrect");
            console.error("3. The redirect_uri doesn't match what's registered in Google Cloud Console");
            console.error("4. The Google OAuth client is restricted by domain or has other restrictions");
            console.error("Check that your Google Cloud Console configuration exactly matches your code");
          }
          
          if (err.code === 'invalid_client') {
            console.error("This error usually means the client ID or secret is incorrect or the client was not found in Google Cloud Console");
            console.error("Make sure your client ID and secret match exactly what's in the Google Cloud Console");
            console.error("Also check that your redirect URI is correctly configured in Google Cloud Console");
          }
          return res.redirect('/login?error=auth_error&code=' + encodeURIComponent(err.code || err.message || 'unknown'));
        }
        
        if (!user) {
          console.error("No user returned from authentication");
          return res.redirect('/login?error=no_user');
        }
        
        console.log("User authenticated successfully:", user.id);
        
        req.login(user, (loginErr) => {
          if (loginErr) {
            console.error("Error logging in:", loginErr);
            return res.redirect('/login?error=login_error');
          }
          
          console.log("User logged in, redirecting to chat page");
          return res.redirect('/chat');
        });
      })(req, res, next);
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