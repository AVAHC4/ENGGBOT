import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
        }

        // Find user by email
        const { data: user, error: findError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('email', email.toLowerCase())
            .single();

        if (findError || !user) {
            console.log("User not found:", email);
            return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
        }

        // Check if user has a password set
        if (!user.password_hash) {
            console.log("User has no password set:", email);
            return NextResponse.json({
                error: "This account uses email verification or Google sign-in. Please use those methods to log in."
            }, { status: 401 });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            console.log("Invalid password for user:", email);
            return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
        }

        console.log("Password verified successfully for:", email);

        // Return success with user data
        return NextResponse.json({
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
            redirectUrl: '/AI_UI/?auth_success=true'
        });

    } catch (error: any) {
        console.error("Login error:", error);
        return NextResponse.json({ error: `Login failed: ${error.message}` }, { status: 500 });
    }
}
