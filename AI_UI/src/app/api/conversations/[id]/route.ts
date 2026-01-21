import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';



export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const conversationId = params.id;
        const { searchParams } = new URL(req.url);
        const email = searchParams.get('email')?.toLowerCase();

        if (!conversationId) {
            return NextResponse.json({ error: 'Missing conversation ID' }, { status: 400 });
        }

        if (!email) {
            return NextResponse.json({ error: 'Missing email' }, { status: 400 });
        }


        const { data: conversation, error: convError } = await supabaseAdmin
            .from('conversations')
            .select('id, title, created_at, updated_at, user_email')
            .eq('id', conversationId)
            .single();

        console.log('[API GE /conversations/[id]] conversationId:', conversationId, 'email:', email, 'found:', !!conversation, 'convEmail:', conversation?.user_email);

        if (convError || !conversation) {

            console.log('[API GET /conversations/[id]] NOT FOUND - error:', convError?.message);
            return NextResponse.json({ exists: false, messages: [] }, { status: 200 });
        }


        if (conversation.user_email !== email) {
            console.log('[API GET /conversations/[id]] UNAUTHORIZED - convEmail:', conversation.user_email, 'requestEmail:', email);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }


        const { data: messages, error: msgError } = await supabaseAdmin
            .from('conversation_messages')
            .select('id, content, is_user, timestamp, attachments, reply_to_id, metadata, is_streaming')
            .eq('conversation_id', conversationId)
            .order('timestamp', { ascending: true });

        if (msgError) {
            return NextResponse.json({ error: msgError.message }, { status: 500 });
        }


        const transformedMessages = (messages || []).map((msg: any) => ({
            id: msg.id,
            content: msg.content,
            isUser: msg.is_user,
            timestamp: msg.timestamp,
            attachments: msg.attachments,
            replyToId: msg.reply_to_id,
            metadata: msg.metadata,
            isStreaming: msg.is_streaming,
        }));

        return NextResponse.json({
            conversation: {
                id: conversation.id,
                title: conversation.title,
                createdAt: conversation.created_at,
                updatedAt: conversation.updated_at,
            },
            messages: transformedMessages,
        });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Failed to get conversation' }, { status: 500 });
    }
}


export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const conversationId = params.id;
        const body = await req.json();
        const email = (body?.email || '').toLowerCase();
        const title = body?.title;

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


        const updates: any = { updated_at: new Date().toISOString() };
        if (title !== undefined) {
            updates.title = title;
        }

        const { data, error } = await supabaseAdmin
            .from('conversations')
            .update(updates)
            .eq('id', conversationId)
            .select('id, title, created_at, updated_at')
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ conversation: data });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Failed to update conversation' }, { status: 500 });
    }
}



export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const conversationId = params.id;
        const { searchParams } = new URL(req.url);
        const email = searchParams.get('email')?.toLowerCase();

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
            .from('conversations')
            .delete()
            .eq('id', conversationId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Failed to delete conversation' }, { status: 500 });
    }
}
