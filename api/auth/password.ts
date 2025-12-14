import { Request, Response } from "express";
import { supabase } from "../lib/supabase.js";
import bcrypt from "bcrypt";

// Determine redirect URLs based on environment
const BASE_URL = process.env.NODE_ENV === 'production'
    ? 'https://www.enggbot.me'
    : (process.env.BASE_URL || process.env.CLIENT_URL || 'http://localhost:3000');

const AUTH_REDIRECT_URL = process.env.NODE_ENV === 'production'
    ? `${BASE_URL}/AI_UI/?auth_success=true`
    : (process.env.AUTH_REDIRECT_URL || 'http://localhost:3001/?auth_success=true');

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password requirements
const MIN_PASSWORD_LENGTH = 6;

interface SignupBody {
    email: string;
    password: string;
    firstname: string;
    lastname: string;
}

interface LoginBody {
    email: string;
    password: string;
}

export const initPasswordAuth = (app: any) => {
    console.log("Initializing Password Auth routes");

    // Signup with password endpoint
    app.post("/api/auth/signup", async (req: Request, res: Response) => {
        try {
            const { email, password, firstname, lastname } = req.body as SignupBody;

            console.log(`Password signup request for email: ${email}`);

            // Validate required fields
            if (!email || !password || !firstname || !lastname) {
                return res.status(400).json({ error: "All fields are required" });
            }

            // Validate email
            if (!EMAIL_REGEX.test(email)) {
                return res.status(400).json({ error: "Invalid email address" });
            }

            // Validate password length
            if (password.length < MIN_PASSWORD_LENGTH) {
                return res.status(400).json({
                    error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
                });
            }

            // Check if user already exists
            const { data: existingUser } = await supabase
                .from('users')
                .select('id')
                .eq('email', email.toLowerCase())
                .single();

            if (existingUser) {
                return res.status(409).json({ error: "User already exists. Please sign in." });
            }

            // Hash the password
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(password, saltRounds);

            // Create user in database
            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert({
                    email: email.toLowerCase(),
                    password_hash: passwordHash,
                    firstname,
                    lastname,
                    name: `${firstname} ${lastname}`,
                })
                .select()
                .single();

            if (createError) {
                console.error("Error creating user:", createError);

                if (createError.code === '42703') { // Undefined column
                    return res.status(500).json({
                        error: "Database needs migration. Please run the email_auth_migration.sql script in Supabase."
                    });
                }

                return res.status(500).json({ error: "Failed to create account" });
            }

            console.log("User created successfully:", newUser.id);

            // Log the user into the Express session
            req.login(newUser, (loginErr) => {
                if (loginErr) {
                    console.error("Session login error:", loginErr);
                    return res.status(500).json({ error: "Account created but failed to create session" });
                }

                console.log("Session created for new user:", newUser.id);
                return res.status(201).json({
                    success: true,
                    user: {
                        id: newUser.id,
                        email: newUser.email,
                        name: newUser.name,
                        firstname: newUser.firstname,
                        lastname: newUser.lastname,
                    },
                    message: "Account created successfully",
                    redirectUrl: AUTH_REDIRECT_URL
                });
            });

        } catch (error: any) {
            console.error("Signup error:", error);
            return res.status(500).json({
                error: `Signup failed: ${error.message || String(error)}`
            });
        }
    });

    // Login with password endpoint
    app.post("/api/auth/login-password", async (req: Request, res: Response) => {
        try {
            const { email, password } = req.body as LoginBody;

            console.log(`Password login request for email: ${email}`);

            // Validate required fields
            if (!email || !password) {
                return res.status(400).json({ error: "Email and password are required" });
            }

            // Validate email
            if (!EMAIL_REGEX.test(email)) {
                return res.status(400).json({ error: "Invalid email address" });
            }

            // Find user by email
            const { data: user, error: findError } = await supabase
                .from('users')
                .select('*')
                .eq('email', email.toLowerCase())
                .single();

            if (findError || !user) {
                console.log("User not found:", email);
                return res.status(401).json({ error: "Invalid email or password" });
            }

            // Check if user has a password set
            if (!user.password_hash) {
                console.log("User has no password set, must use OTP or Google:", email);
                return res.status(401).json({
                    error: "This account uses email verification or Google sign-in. Please use those methods to log in."
                });
            }

            // Verify password
            const isValidPassword = await bcrypt.compare(password, user.password_hash);

            if (!isValidPassword) {
                console.log("Invalid password for user:", email);
                return res.status(401).json({ error: "Invalid email or password" });
            }

            console.log("Password verified successfully for:", email);

            // Log the user into the Express session
            req.login(user, (loginErr) => {
                if (loginErr) {
                    console.error("Session login error:", loginErr);
                    return res.status(500).json({ error: "Failed to create session" });
                }

                console.log("Session created for user:", user.id);
                return res.status(200).json({
                    success: true,
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        firstname: user.firstname,
                        lastname: user.lastname,
                        avatar: user.avatar,
                    },
                    message: "Login successful",
                    redirectUrl: AUTH_REDIRECT_URL
                });
            });

        } catch (error: any) {
            console.error("Login error:", error);
            return res.status(500).json({
                error: `Login failed: ${error.message || String(error)}`
            });
        }
    });

    console.log("Password Auth routes initialized");
};
