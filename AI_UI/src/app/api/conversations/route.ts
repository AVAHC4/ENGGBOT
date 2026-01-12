import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';


export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const email = searchParams.get('email')?.toLowerCase();

        if (!email) {
            return NextResponse.json({ error: 'Missing email' }, { status: 400 });
        }

        // Get all regular conversations (project conversations are stored in project_conversations table)
        const { data, error } = await supabaseAdmin
            .from('conversations')
            .select('id, title, created_at, updated_at')
            .eq('user_email', email)
            .order('updated_at', { ascending: false });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ conversations: data || [] });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Failed to list conversations' }, { status: 500 });
    }
}

// POST /api/conversations
// Create a new conversation
// Body: { email: string, title?: string }
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const email = (body?.email || '').toLowerCase();
        const title = body?.title || 'New Conversation';
        const id = body?.id; // Accept ID from client

        console.log('[API] POST /api/conversations - Creating conversation:', { email, title, id: id?.substring(0, 8) });

        if (!email) {
            return NextResponse.json({ error: 'Missing email' }, { status: 400 });
        }

        // Prepare insert data
        const insertData: any = {
            user_email: email,
            title,
        };

        // If ID is provided, use it; otherwise let database generate one
        if (id) {
            insertData.id = id;
        }

        console.log('[API] Inserting into conversations table:', insertData);
        const { data, error } = await supabaseAdmin
            .from('conversations')
            .insert(insertData)
            .select('id, title, created_at, updated_at')
            .single();

        if (error) {
            console.error('[API] Supabase insert error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log('[API] ✅ Conversation created successfully:', data?.id);
        return NextResponse.json({ conversation: data });
    } catch (e: any) {
        console.error('[API] Exception in POST /api/conversations:', e);
        return NextResponse.json({ error: e?.message || 'Failed to create conversation' }, { status: 500 });
    }
}
