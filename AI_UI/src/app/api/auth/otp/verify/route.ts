import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';  
import { supabaseAdmin } from '@/lib/supabase-admin';  
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, token, firstname, lastname, password } = body;

        if (!email || !token) {
            return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
        }

         
        const { data: authData, error: authError } = await supabase.auth.verifyOtp({
            email: email.toLowerCase(),
            token,
            type: 'email',
        });

        if (authError || !authData.user) {
            console.error("Supabase OTP verify error:", authError);
            return NextResponse.json({ error: "Invalid code or expired" }, { status: 401 });
        }

         
        const updates: any = {
            email: email.toLowerCase(),
            updated_at: new Date().toISOString(),
        };
        if (firstname) updates.firstname = firstname;
        if (lastname) updates.lastname = lastname;
        if (firstname && lastname) updates.name = `${firstname} ${lastname}`;

         
        if (password) {
            const saltRounds = 10;
            updates.password_hash = await bcrypt.hash(password, saltRounds);
        }

        let publicUser;

         
        try {
             
            const { data: existingUser } = await supabaseAdmin
                .from('users')
                .select('*')
                .eq('email', email.toLowerCase())
                .maybeSingle();

            if (existingUser) {
                 
                const { data: updated, error: updateError } = await supabaseAdmin
                    .from('users')
                    .update(updates)
                    .eq('id', existingUser.id)
                    .select()
                    .single();

                if (updateError) throw updateError;
                publicUser = updated;
            } else {
                 
                 
                 
                 
                 

                const { data: created, error: createError } = await supabaseAdmin
                    .from('users')
                    .insert(updates)
                    .select()
                    .single();

                if (createError) throw createError;
                publicUser = created;
            }

        } catch (dbError: any) {
            console.error("Database upsert error:", dbError);
            if (dbError.code === '42703') {
                return NextResponse.json({ error: "Database needs migration (Undefined column)." }, { status: 500 });
            }
             
             
            return NextResponse.json({ error: "Database error during user creation." }, { status: 500 });
        }

         
         
        return NextResponse.json({
            success: true,
            user: publicUser,
            message: "Login successful",
            redirectUrl: '/AI_UI/?auth_success=true'
        });

    } catch (error: any) {
        console.error("OTP verify error: ", error);
        return NextResponse.json({ error: `Verification failed: ${error.message}` }, { status: 500 });
    }
}
