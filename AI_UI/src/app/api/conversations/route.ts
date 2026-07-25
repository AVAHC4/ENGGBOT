import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const isMissingPinnedColumn = (error: any) =>
    error?.code === '42703' || /pinned/i.test(error?.message || '');


export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const email = searchParams.get('email')?.toLowerCase();

        if (!email) {
            return NextResponse.json({ error: 'Missing email' }, { status: 400 });
        }

         
        let { data, error } = await supabaseAdmin
            .from('conversations')
            .select('id, title, pinned, created_at, updated_at')
            .eq('user_email', email)
            .order('updated_at', { ascending: false });

        // Keep existing conversation history accessible until the optional
        // pinning migration has been deployed.
        if (error && isMissingPinnedColumn(error)) {
            const fallback = await supabaseAdmin
                .from('conversations')
                .select('id, title, created_at, updated_at')
                .eq('user_email', email)
                .order('updated_at', { ascending: false });
            data = (fallback.data || []).map((conversation: any) => ({ ...conversation, pinned: false }));
            error = fallback.error;
        }

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ conversations: data || [] });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Failed to list conversations' }, { status: 500 });
    }
}

 
 
 
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const email = (body?.email || '').toLowerCase();
        const title = body?.title || 'New Conversation';
        const id = body?.id;  
        const pinned = body?.pinned === true;

        console.log('[API] POST /api/conversations - Creating conversation:', { email, title, id: id?.substring(0, 8) });

        if (!email) {
            return NextResponse.json({ error: 'Missing email' }, { status: 400 });
        }

         
        const insertData: any = {
            user_email: email,
            title,
            pinned,
        };

         
        if (id) {
            insertData.id = id;
        }

        console.log('[API] Inserting into conversations table:', insertData);
        let { data, error } = await supabaseAdmin
            .from('conversations')
            .insert(insertData)
            .select('id, title, pinned, created_at, updated_at')
            .single();

        if (error && isMissingPinnedColumn(error)) {
            const { pinned: _pinned, ...legacyInsertData } = insertData;
            const fallback = await supabaseAdmin
                .from('conversations')
                .insert(legacyInsertData)
                .select('id, title, created_at, updated_at')
                .single();
            data = fallback.data ? { ...fallback.data, pinned: false } : fallback.data;
            error = fallback.error;
        }

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
