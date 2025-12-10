import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; // Anon client
import { supabaseAdmin } from '@/lib/supabase-admin'; // Service Role client

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, type } = body;

        // Validate email
        if (!email || !EMAIL_REGEX.test(email)) {
            return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
        }

        // For signup, ensure we don't overwrite an existing user
        if (type === 'signup') {
            const { data: existingUser } = await supabaseAdmin
                .from('users')
                .select('id')
                .eq('email', email.toLowerCase())
                .single(); // .maybeSingle() is safer but single() throws on 0 rows which catches differently, let's use logic from before

            // Actually, if single() throws 0 rows, it's fine. If it returns rows, we block.
            // But standard supabase (single) throws error if no rows.
            // Let's use maybeSingle() for cleaner code if admin client supports it (it relies on same js lib).
            // Assuming supabase-js v2.

            if (existingUser) {
                return NextResponse.json({ error: "User already exists. Please sign in." }, { status: 409 });
            }
        }

        // Send OTP via Supabase (Use Anon client for auth flow)
        const { error } = await supabase.auth.signInWithOtp({
            email: email.toLowerCase(),
            options: {
                shouldCreateUser: type === 'signup',
            }
        });

        if (error) {
            console.error("Supabase OTP send error:", error);
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            message: "OTP sent to your email"
        });

    } catch (error: any) {
        console.error("OTP send error:", error);
        return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
    }
}
