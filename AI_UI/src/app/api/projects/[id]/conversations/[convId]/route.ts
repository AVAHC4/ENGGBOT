import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET /api/projects/[id]/conversations/[convId]
// Get a specific project conversation with all its messages
export async function GET(req: NextRequest, { params }: { params: { id: string; convId: string } }) {
    try {
        const projectId = params.id;
        const conversationId = params.convId;
        const { searchParams } = new URL(req.url);
        const email = searchParams.get('email')?.toLowerCase();

        if (!projectId || !conversationId) {
            return NextResponse.json({ error: 'Missing project ID or conversation ID' }, { status: 400 });
        }

        if (!email) {
            return NextResponse.json({ error: 'Missing email' }, { status: 400 });
        }

        // Get conversation and verify it belongs to the project
        const { data: conversation, error: convError } = await supabaseAdmin
            .from('project_conversations')
            .select('id, title, created_at, updated_at, user_email, project_id')
            .eq('id', conversationId)
            .single();

        if (convError || !conversation) {
            return NextResponse.json({ exists: false, messages: [] }, { status: 200 });
        }

        // Verify ownership and project membership
        if (conversation.user_email !== email || conversation.project_id !== projectId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Get all messages for this conversation
        const { data: messages, error: msgError } = await supabaseAdmin
            .from('project_conversation_messages')
            .select('id, content, is_user, timestamp, attachments, reply_to_id, metadata, is_streaming')
            .eq('conversation_id', conversationId)
            .order('timestamp', { ascending: true });

        if (msgError) {
            return NextResponse.json({ error: msgError.message }, { status: 500 });
        }

        // Transform messages from database format to frontend format
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

// PUT /api/projects/[id]/conversations/[convId]
// Update a project conversation (e.g., rename)
export async function PUT(req: NextRequest, { params }: { params: { id: string; convId: string } }) {
    try {
        const projectId = params.id;
        const conversationId = params.convId;
        const body = await req.json();
        const email = (body?.email || '').toLowerCase();
        const title = body?.title;

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

        // Update conversation
        const updates: any = { updated_at: new Date().toISOString() };
        if (title !== undefined) {
            updates.title = title;
        }

        const { data, error } = await supabaseAdmin
            .from('project_conversations')
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

// DELETE /api/projects/[id]/conversations/[convId]
// Delete a project conversation and all its messages
export async function DELETE(req: NextRequest, { params }: { params: { id: string; convId: string } }) {
    try {
        const projectId = params.id;
        const conversationId = params.convId;
        const { searchParams } = new URL(req.url);
        const email = searchParams.get('email')?.toLowerCase();

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

        // Delete conversation (messages will cascade delete)
        const { error } = await supabaseAdmin
            .from('project_conversations')
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
