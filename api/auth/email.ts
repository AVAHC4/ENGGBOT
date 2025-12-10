import { Request, Response } from "express";
import { supabase, supabaseAnon } from "../lib/supabase.js";

// Determine redirect URLs based on environment
const BASE_URL = process.env.NODE_ENV === 'production'
    ? 'https://www.enggbot.me'
    : (process.env.BASE_URL || process.env.CLIENT_URL || 'http://localhost:3000');

const AUTH_REDIRECT_URL = process.env.NODE_ENV === 'production'
    ? `${BASE_URL}/AI_UI/?auth_success=true`
    : (process.env.AUTH_REDIRECT_URL || 'http://localhost:3001/?auth_success=true');

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface OtpSendBody {
    email: string;
    firstname?: string;
    lastname?: string;
    type?: 'signup' | 'login';
}

interface OtpVerifyBody {
    email: string;
    token: string;
    firstname?: string;
    lastname?: string;
}

export const initEmailAuth = (app: any) => {
    console.log("Initializing Email OTP Auth routes");

    // Send OTP endpoint
    app.post("/api/auth/otp/send", async (req: Request, res: Response) => {
        try {
            // ... variables ...
            const { email, firstname, lastname, type } = req.body as OtpSendBody;

            console.log(`OTP send request for email: ${email}, type: ${type}`);

            // Validate email
            if (!email || !EMAIL_REGEX.test(email)) {
                return res.status(400).json({ error: "Invalid email address" });
            }

            // For signup, ensure we don't overwrite an existing user
            if (type === 'signup') {
                const { data: existingUser } = await supabase
                    .from('users')
                    .select('id')
                    .eq('email', email.toLowerCase())
                    .single();

                if (existingUser) {
                    return res.status(409).json({ error: "User already exists. Please sign in." });
                }
            }

            // Send OTP via Supabase (Use Anon client for auth flow)
            // For login, we set shouldCreateUser: false to prevent silent account creation without name
            const { error } = await supabaseAnon.auth.signInWithOtp({
                email: email.toLowerCase(),
                options: {
                    shouldCreateUser: type === 'signup',
                }
            });

            if (error) {
                console.error("Supabase OTP send error:", error);
                return res.status(400).json({ error: error.message });
            }

            console.log("OTP sent successfully to:", email);
            return res.status(200).json({
                success: true,
                message: "OTP sent to your email"
            });

        } catch (error) {
            console.error("OTP send error:", error);
            return res.status(500).json({ error: "An unexpected error occurred" });
        }
    });

    // Verify OTP endpoint
    app.post("/api/auth/otp/verify", async (req: Request, res: Response) => {
        try {
            const { email, token, firstname, lastname } = req.body as OtpVerifyBody;

            console.log(`OTP verify request for email: ${email}`);

            if (!email || !token) {
                return res.status(400).json({ error: "Email and code are required" });
            }

            // Verify OTP via Supabase (Use Anon client to avoid checking out session on Admin client)
            const { data: authData, error: authError } = await supabaseAnon.auth.verifyOtp({
                email: email.toLowerCase(),
                token,
                type: 'email',
            });

            if (authError || !authData.user) {
                console.error("Supabase OTP verify error:", authError);
                return res.status(401).json({ error: "Invalid code or expired" });
            }

            console.log("Supabase auth successful for:", authData.user.id);

            // Upsert user in our public.users table
            // We do this to ensure we have a local record of the user (mirroring Supabase auth user)
            // and to store extra fields like name.

            const updates: any = {
                email: email.toLowerCase(),
                // Map Supabase auth ID to our user ID if we want them consistent, 
                // OR we just use the email matching if we already have a record.
                // Usually, 'id' in public.users is UUID. 
                // Let's try to find by email first.
            };

            // Only update name fields if provided (e.g. during signup)
            if (firstname) updates.firstname = firstname;
            if (lastname) updates.lastname = lastname;
            if (firstname && lastname) updates.name = `${firstname} ${lastname}`;

            // Upsert user in our public.users table (Non-fatal if it fails)
            try {
                // Check if user exists in public.users (use maybeSingle to avoid error on no match)
                const { data: existingUser, error: selectError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('email', email.toLowerCase())
                    .maybeSingle();

                console.log("Checking for existing user:", email.toLowerCase());
                console.log("existingUser:", existingUser);
                console.log("selectError:", selectError);

                let publicUser;

                if (existingUser) {
                    console.log("Updating existing user:", existingUser.id);
                    // Update existing
                    const { data: updated, error: updateError } = await supabase
                        .from('users')
                        .update(updates)
                        .eq('id', existingUser.id)
                        .select()
                        .single();

                    if (updateError) throw updateError;
                    publicUser = updated;
                    console.log("Updated user:", publicUser);
                } else {
                    console.log("Creating new user with:", updates);
                    // Create new

                    const { data: created, error: createError } = await supabase
                        .from('users')
                        .insert(updates)
                        .select()
                        .single();

                    if (createError) {
                        console.error("Insert error:", createError);
                        throw createError;
                    }
                    publicUser = created;
                    console.log("Created new user:", publicUser);
                }

                // Log the user into the Express session
                req.login(publicUser, (loginErr) => {
                    if (loginErr) {
                        console.error("Session login error:", loginErr);
                        return res.status(500).json({ error: "Failed to create session" });
                    }

                    console.log("Session created for user:", publicUser.id);
                    return res.status(200).json({
                        success: true,
                        user: publicUser,
                        message: "Login successful",
                        redirectUrl: AUTH_REDIRECT_URL
                    });
                });
                return; // Stop execution here as response is sent in callback

            } catch (dbError: any) {
                console.error("Database upsert error (Login proceeded via Auth only):", dbError);
                // If DB fails (e.g. columns missing), we can still fallback to a basic session 
                // using the authData.user or fail gracefully.
                // However, without a public user record, our app might break elsewhere.
                // But for now, let's report the error clearly to the user if it's a 500.

                if (dbError.code === '42703') { // Undefined column
                    return res.status(500).json({ error: "Database needs migration. Please run the email_auth_migration.sql script." });
                }

                throw dbError; // Re-throw to be caught by outer catch
            }

        } catch (error: any) {
            console.error("OTP verify error:", error);
            // Return detailed error for debugging (remove in production if sensitive)
            return res.status(500).json({
                error: `Verification failed: ${error.message || String(error)}`
            });
        }
    });

    console.log("Email OTP Auth routes initialized");
};
