import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET /api/conversations?email=user@example.com
// List all conversations for a user
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const email = searchParams.get('email')?.toLowerCase();
        const projectId = searchParams.get('projectId'); // optional filter by project

        if (!email) {
            return NextResponse.json({ error: 'Missing email' }, { status: 400 });
        }

        let query = supabaseAdmin
            .from('conversations')
            .select('id, title, project_id, created_at, updated_at')
            .eq('user_email', email)
            .order('updated_at', { ascending: false });

        // Filter by project if specified
        if (projectId) {
            query = query.eq('project_id', projectId);
        }

        const { data, error } = await query;

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
// Body: { email: string, title?: string, projectId?: string }
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const email = (body?.email || '').toLowerCase();
        const title = body?.title || 'New Conversation';
        const projectId = body?.projectId || null;
        const id = body?.id; // Accept ID from client

        console.log('[API] POST /api/conversations - Creating conversation:', { email, title, projectId, id: id?.substring(0, 8) });

        if (!email) {
            return NextResponse.json({ error: 'Missing email' }, { status: 400 });
        }

        // Prepare insert data
        const insertData: any = {
            user_email: email,
            title,
            project_id: projectId,
        };

        // If ID is provided, use it; otherwise let database generate one
        if (id) {
            insertData.id = id;
        }

        console.log('[API] Inserting into conversations table:', insertData);
        const { data, error } = await supabaseAdmin
            .from('conversations')
            .insert(insertData)
            .select('id, title, project_id, created_at, updated_at')
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
