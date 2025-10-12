import { Request, Response, NextFunction } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { supabase } from "../lib/supabase.js";

// Configure Google Strategy - always register the strategy
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "***REMOVED***";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "***REMOVED***";

// Update the way we handle the callback and include the BASE_URL
const BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://www.enggbot.me'
  : (process.env.BASE_URL || process.env.CLIENT_URL || 'http://localhost:3000');
  
// Define callback URL explicitly
const CALLBACK_URL = process.env.NODE_ENV === 'production'
  ? 'https://www.enggbot.me/api/auth/google/callback'
  : (process.env.CALLBACK_URL || `${BASE_URL}/api/auth/google/callback`);

// Define auth redirect URL 
const AUTH_REDIRECT_URL = process.env.NODE_ENV === 'production'
  ? `${BASE_URL}/AI_UI/?auth_success=true`
  : (process.env.AUTH_REDIRECT_URL || 'http://localhost:3001/?auth_success=true');

console.log("Using BASE_URL for redirection:", BASE_URL);
console.log("Using CALLBACK_URL for Google OAuth:", CALLBACK_URL);
console.log("Using AUTH_REDIRECT_URL for redirecting after auth:", AUTH_REDIRECT_URL);
console.log("Current NODE_ENV:", process.env.NODE_ENV);
console.log("Using CLIENT_ID:", CLIENT_ID.substring(0, 8) + "...");

// Extend session type
declare module 'express-session' {
  interface SessionData {
    oauthState?: string;
    authenticated?: boolean;
  }
}

// Always register the strategy with the correct callback URL
passport.use(
  new GoogleStrategy(
    {
      clientID: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      callbackURL: CALLBACK_URL,
      scope: ["profile", "email"],
      proxy: true
    },
    async (accessToken, refreshToken, profile, done) => {
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
        eturn res.redirect('/login?error=no_code');
      }
      
      // Log critical values for debugging
      console.log("Callback URL being used:", CALLBACK_URL);
      console.log("Session state:", req.session.oauthState);
      console.log("Query state:", req.query.state);
      
      next();
    },
    (req: Request, res: Response, next: NextFunction) => {
      // Custom token exchange with explicit error handling
      passport.authenticate('google', { session: true }, (err, user, info) => {
        console.log("Passport authenticate callback triggered");
        
        if (err) {
          console.error("Authentication error:", err);
          if (err.name === 'TokenError') {
            console.error("Token exchange failed. This could be due to:");
            console.error("- Mismatched redirect URI");
            console.error("- Invalid client ID/secret");
            console.error("- Authorization code already used");
            console.error("- Session/cookie issues");
            console.error("Error details:", err.message);
            
            return res.send(`
              <html>
                <head><title>Authentication Error</title></head>
                <body>
                  <h1>Authentication Error</h1>
                  <p>Token exchange failed: ${err.message}</p>
                  <p>Please <a href="/api/auth/google">try again</a> or contact support.</p>
                  <p>Debug info:</p>
                  <pre>
                  Callback URL: ${CALLBACK_URL}
                  Client ID: ${CLIENT_ID.substring(0, 10)}...
                  </pre>
                </body>
              </html>
            `);
          }
          return res.redirect('/login?error=auth_error');
        }
        
        if (!user) {
          console.error("No user returned from authentication");
          return res.redirect('/login?error=no_user');
        }
        
        // Log successful authentication
        console.log("Authentication successful, user object received");
        
        // Log in the user to the session
        req.login(user, (loginErr) => {
          if (loginErr) {
            console.error("Session login error:", loginErr);
            return res.redirect('/login?error=session_error');
          }
          
          // Continue to the success handler
          next();
        });
      })(req, res, next);
    },
    (req: Request, res: Response) => {
      console.log("Authentication successful, attempting redirect to AI_UI chat interface");
      
      // For optimal performance, use a minimal HTML response that focuses on speed
      // The AI_UI chat interface runs on port 3001 in development
      const redirectUrl = process.env.NODE_ENV === 'production'
        ? `${BASE_URL}/AI_UI/?auth_success=true`
        : AUTH_REDIRECT_URL;
      
      console.log("Redirecting authenticated user to:", redirectUrl);
      
      // Set multiple cookies for redundancy but keep it lightweight
      res.cookie('auth_success', 'true', {
        maxAge: 10000,
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/'
      });
      
      // Set session flag and additional auth cookies
      if (req.session) {
        req.session.authenticated = true;
        console.log("Session authenticated flag set");
      }
      
      // Prepare user data for redirect
      const userData = req.user ? JSON.stringify(req.user) : '';
      const encodedUserData = req.user ? encodeURIComponent(JSON.stringify(req.user)) : '';
      
      if (req.user) {
        // Use a safer way to log user info to avoid TypeScript errors
        const userObj = req.user as Record<string, any>;
        console.log("User data available for redirect:", {
          id: userObj.id,
          name: userObj.name,
          email: userObj.email
        });
      }
      
      // Build the redirect URL with user data
      let finalRedirectUrl = redirectUrl;
      if (encodedUserData) {
        // Add the user parameter to the URL
        finalRedirectUrl += (finalRedirectUrl.includes('?') ? '&' : '?') + `user=${encodedUserData}`;
      }
      
      console.log("Final redirect URL (params only):", finalRedirectUrl.split('?')[1] || 'No params');
      
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
              
              // Store user data if available
              const userData = ${userData ? `'${encodedUserData}'` : 'null'};
              if (userData) {
                try {
                  const user = JSON.parse(decodeURIComponent(userData));
                  localStorage.setItem("user", JSON.stringify(user));
                  localStorage.setItem("user_data", JSON.stringify(user));
                  console.log("User data stored in localStorage:", user);
                } catch (e) {
                  console.error("Failed to parse user data", e);
                }
              }
              
              // Log redirect
              console.log("Redirecting to:", "${finalRedirectUrl}");
              
              // Immediately redirect - don't wait
              window.location.replace("${finalRedirectUrl}");
            </script>
          </head>
          <body>
            <p>Authentication successful! Redirecting to AI chat interface...</p>
            <p>If you are not redirected automatically, <a href="${finalRedirectUrl}">click here</a>.</p>
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