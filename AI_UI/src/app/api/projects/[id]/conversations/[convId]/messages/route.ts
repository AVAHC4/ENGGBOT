import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// POST /api/projects/[id]/conversations/[convId]/messages
// Save/update messages for a project conversation (batch operation)
// Body: { email: string, messages: Array<{id, content, isUser, timestamp, attachments?, replyToId?, metadata?, isStreaming?}> }
export async function POST(req: NextRequest, { params }: { params: { id: string; convId: string } }) {
    try {
        const projectId = params.id;
        const conversationId = params.convId;
        const body = await req.json();
        const email = (body?.email || '').toLowerCase();
        const messages = body?.messages || [];

        if (!projectId || !conversationId || !email) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (!Array.isArray(messages)) {
            return NextResponse.json({ error: 'Messages must be an array' }, { status: 400 });
        }

        // Verify ownership
        const { data: conversation, error: checkError } = await supabaseAdmin
            .from('project_conversations')
            .select('user_email, project_id')
            .eq('id', conversationId)
            .single();

        if (checkError || !conversation) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }

        if (conversation.user_email !== email || conversation.project_id !== projectId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Transform messages to database format
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

        // Use upsert to handle both insert and update
        const { data, error } = await supabaseAdmin
            .from('project_conversation_messages')
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

// DELETE /api/projects/[id]/conversations/[convId]/messages
// Clear all messages from a project conversation
export async function DELETE(req: NextRequest, { params }: { params: { id: string; convId: string } }) {
    try {
        const projectId = params.id;
        const conversationId = params.convId;
        const url = new URL(req.url);
        const email = (url.searchParams.get('email') || '').toLowerCase();

        if (!projectId || !conversationId || !email) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Verify ownership
        const { data: conversation, error: checkError } = await supabaseAdmin
            .from('project_conversations')
            .select('user_email, project_id')
            .eq('id', conversationId)
            .single();

        if (checkError || !conversation) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }

        if (conversation.user_email !== email || conversation.project_id !== projectId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Delete all messages for this conversation
        const { error } = await supabaseAdmin
            .from('project_conversation_messages')
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
