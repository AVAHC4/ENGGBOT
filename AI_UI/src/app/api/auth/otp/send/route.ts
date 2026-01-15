import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';  
import { supabaseAdmin } from '@/lib/supabase-admin';  

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, type } = body;

         
        if (!email || !EMAIL_REGEX.test(email)) {
            return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
        }

         
        if (type === 'signup') {
            const { data: existingUser } = await supabaseAdmin
                .from('users')
                .select('id')
                .eq('email', email.toLowerCase())
                .single();  

             
             
             
             

            if (existingUser) {
                return NextResponse.json({ error: "User already exists. Please sign in." }, { status: 409 });
            }
        }

         
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
