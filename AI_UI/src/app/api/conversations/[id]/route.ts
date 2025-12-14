import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET /api/conversations/[id]
// Get a specific conversation with all its messages
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

        // First verify the conversation belongs to the user
        const { data: conversation, error: convError } = await supabaseAdmin
            .from('conversations')
            .select('id, title, project_id, created_at, updated_at, user_email')
            .eq('id', conversationId)
            .single();

        if (convError || !conversation) {
            // Return 200 with exists: false to prevent browser console network errors
            return NextResponse.json({ exists: false, messages: [] }, { status: 200 });
        }

        // Verify ownership
        if (conversation.user_email !== email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Get all messages for this conversation
        const { data: messages, error: msgError } = await supabaseAdmin
            .from('conversation_messages')
            .select('id, content, is_user, timestamp, attachments, reply_to_id, metadata, is_streaming')
            .eq('conversation_id', conversationId)
            .order('timestamp', { ascending: true });

        if (msgError) {
            return NextResponse.json({ error: msgError.message }, { status: 500 });
        }

        // Transform messages from database format (snake_case) to frontend format (camelCase)
        const transformedMessages = (messages || []).map((msg: any) => ({
            id: msg.id,
            content: msg.content,
            isUser: msg.is_user, // Transform is_user to isUser
            timestamp: msg.timestamp,
            attachments: msg.attachments,
            replyToId: msg.reply_to_id, // Transform reply_to_id to replyToId
            metadata: msg.metadata,
            isStreaming: msg.is_streaming, // Transform is_streaming to isStreaming
        }));

        return NextResponse.json({
            conversation: {
                id: conversation.id,
                title: conversation.title,
                projectId: conversation.project_id,
                createdAt: conversation.created_at,
                updatedAt: conversation.updated_at,
            },
            messages: transformedMessages,
        });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Failed to get conversation' }, { status: 500 });
    }
}

// PUT /api/conversations/[id]
// Update conversation metadata
// Body: { email: string, title?: string, updatedAt?: string }
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const conversationId = params.id;
        const body = await req.json();
        const email = (body?.email || '').toLowerCase();
        const title = body?.title;

        if (!conversationId || !email) {
            return NextResponse.json({ error: 'Missing conversation ID or email' }, { status: 400 });
        }

        // Verify ownership
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

        // Update conversation
        const updates: any = { updated_at: new Date().toISOString() };
        if (title !== undefined) {
            updates.title = title;
        }
        if (body?.projectId !== undefined) {
            updates.project_id = body.projectId;
        }

        const { data, error } = await supabaseAdmin
            .from('conversations')
            .update(updates)
            .eq('id', conversationId)
            .select('id, title, project_id, created_at, updated_at')
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ conversation: data });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Failed to update conversation' }, { status: 500 });
    }
}

// DELETE /api/conversations/[id]
// Delete a conversation and all its messages
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const conversationId = params.id;
        const { searchParams } = new URL(req.url);
        const email = searchParams.get('email')?.toLowerCase();

        if (!conversationId || !email) {
            return NextResponse.json({ error: 'Missing conversation ID or email' }, { status: 400 });
        }

        // Verify ownership
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

        // Delete conversation (messages will cascade delete due to FK constraint)
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
