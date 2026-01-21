import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';




export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const conversationId = params.id;
        const body = await req.json();
        const email = (body?.email || '').toLowerCase();
        const messages = body?.messages || [];

        if (!conversationId || !email) {
            return NextResponse.json({ error: 'Missing conversation ID or email' }, { status: 400 });
        }

        if (!Array.isArray(messages)) {
            return NextResponse.json({ error: 'Messages must be an array' }, { status: 400 });
        }


        const { data: conversation, error: checkError } = await supabaseAdmin
            .from('conversations')
            .select('user_email')
            .eq('id', conversationId)
            .single();

        if (checkError || !conversation) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }

        if (conversation.user_email !== email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }


        const dbMessages = messages.map((msg: any) => ({
            id: msg.id,
            conversation_id: conversationId,
            content: msg.content || '',
            is_user: msg.isUser || false,
            timestamp: msg.timestamp || new Date().toISOString(),
            attachments: msg.attachments || null,
            reply_to_id: msg.replyToId || null,
            metadata: msg.metadata || null,
            is_streaming: msg.isStreaming || false,
        }));


        const { data, error } = await supabaseAdmin
            .from('conversation_messages')
            .upsert(dbMessages, { onConflict: 'id' })
            .select('id');

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, count: data?.length || 0 });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Failed to save messages' }, { status: 500 });
    }
}




export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const conversationId = params.id;
        const url = new URL(req.url);
        const email = (url.searchParams.get('email') || '').toLowerCase();

        if (!conversationId || !email) {
            return NextResponse.json({ error: 'Missing conversation ID or email' }, { status: 400 });
        }


        const { data: conversation, error: checkError } = await supabaseAdmin
            .from('conversations')
            .select('user_email')
            .eq('id', conversationId)
            .single();

        if (checkError || !conversation) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }

        if (conversation.user_email !== email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }


        const { error } = await supabaseAdmin
            .from('conversation_messages')
            .delete()
            .eq('conversation_id', conversationId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Failed to delete messages' }, { status: 500 });
    }
}
