import { Request, Response } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { supabase } from "../lib/supabase.js";
import { eq } from "drizzle-orm";

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn('Google OAuth credentials not found. Authentication will not work.');
} else {
  // Configure Google Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "http://localhost:3000/api/auth/google/callback",
        proxy: true
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          console.log("Google OAuth callback received profile:", profile.id, profile.displayName);
          
          // Check if user exists in Supabase
          const { data: existingUser, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('google_id', profile.id)
            .single();

          if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError;
          }

          if (existingUser) {
            return done(null, existingUser);
          }

          // Create new user in Supabase
          const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert({
              email: profile.emails?.[0]?.value || "",
              name: profile.displayName || "",
              google_id: profile.id,
              avatar: profile.photos?.[0]?.value || "",
            })
            .select()
            .single();

          if (insertError) {
            throw insertError;
          }

          return done(null, newUser);
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );
}

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
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn('Google OAuth routes not initialized due to missing credentials');
    return;
  }

  // Google auth route
  app.get("/api/auth/google", (req: Request, res: Response) => {
    console.log("Google auth route hit - redirecting to Google");
    
    // Construct the Google OAuth URL manually
    const googleAuthUrl = "https://accounts.google.com/o/oauth2/v2/auth";
    const redirectUri = "http://localhost:3000/api/auth/google/callback";
    
    // Generate URL with parameters
    const url = new URL(googleAuthUrl);
    url.searchParams.append("client_id", process.env.GOOGLE_CLIENT_ID || "");
    url.searchParams.append("redirect_uri", redirectUri);
    url.searchParams.append("response_type", "code");
    url.searchParams.append("scope", "profile email");
    url.searchParams.append("prompt", "select_account");
    
    console.log("Redirecting to:", url.toString());
    
    // Redirect to Google OAuth
    res.redirect(url.toString());
  });

  // Google callback route
  app.get(
    "/api/auth/google/callback",
    (req: Request, res: Response, next: any) => {
      console.log("Google callback route hit with query params:", req.query);
      console.log("Attempting to authenticate with Google...");
      
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
      passport.authenticate("google", (err: any, user: any, info: any) => {
        console.log("Passport authenticate callback executed");
        
        if (err) {
          console.error("Authentication error:", err);
          return res.redirect('/login?error=auth_error');
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
          
          console.log("User logged in, redirecting to loading page");
          return res.redirect('/auth-loading');
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