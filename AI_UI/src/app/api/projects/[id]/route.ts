import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const { id } = params;
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email')?.toLowerCase();

    if (!email) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    console.log('[API] GET /api/projects/', id, 'email:', email);

    try {
        // Verify ownership
        const { data: project, error } = await supabaseAdmin
            .from('projects')
            .select('*')
            .eq('id', id)
            .eq('user_email', email)
            .single();

        if (error || !project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        // Get conversation IDs
        const { data: conversations } = await supabaseAdmin
            .from('conversations')
            .select('id')
            .eq('project_id', id);

        // Get file IDs
        const { data: files } = await supabaseAdmin
            .from('project_files')
            .select('id')
            .eq('project_id', id);

        return NextResponse.json({
            project: {
                id: project.id,
                name: project.name,
                description: project.description,
                emoji: project.emoji,
                color: project.color,
                customInstructions: project.custom_instructions,
                created: project.created_at,
                updated: project.updated_at,
                conversationIds: conversations?.map(c => c.id) || [],
                fileIds: files?.map(f => f.id) || []
            }
        });

    } catch (error) {
        console.error('Error fetching project:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const { id } = params;
    try {
        const body = await request.json();
        const { email, name, description, emoji, color, customInstructions, conversationIds, fileIds } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // Build update object only with provided fields
        const updateData: Record<string, any> = {
            updated_at: new Date().toISOString()
        };

        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (emoji !== undefined) updateData.emoji = emoji;
        if (color !== undefined) updateData.color = color;
        if (customInstructions !== undefined) updateData.custom_instructions = customInstructions;

        // Update project fields
        const { data: project, error } = await supabaseAdmin
            .from('projects')
            .update(updateData)
            .eq('id', id)
            .eq('user_email', email)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Update conversation links if provided
        /*
          Note: Conversation relationships are defined on the conversation table (project_id).
          So to "add" a conversation to a project, we update the conversation.
          But usually the frontend updates the conversation directly.
          However, if we pass conversationIds here, we might want to ensure they are linked.
          For now, we'll assume conversation linking happens separately or implicitly via the Conversation API.
          Wait, `addConversationToProject` in frontend storage explicitly adds it.
          So we should probably handle it here if possible, or create a separate API.
          Actually, simple approach: The frontend `addConversationToProject` should just update the conversation's `project_id`.
        */

        return NextResponse.json({
            project: {
                id: project.id,
                name: project.name,
                description: project.description,
                emoji: project.emoji,
                color: project.color,
                customInstructions: project.custom_instructions,
                created: project.created_at,
                updated: project.updated_at,
                conversationIds: conversationIds || [], // Return what was passed or fetch fresh?
                fileIds: fileIds || [] // Same
            }
        });
    } catch (error) {
        console.error('Error updating project:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const { id } = params;
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');

    if (!email) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    try {
        // 1. First, get all conversation IDs that belong to this project
        const { data: conversations, error: convError } = await supabaseAdmin
            .from('conversations')
            .select('id')
            .eq('project_id', id);

        if (convError) {
            console.error('Error fetching project conversations:', convError);
        }

        const conversationIds = conversations?.map(c => c.id) || [];

        // 2. Delete all messages for these conversations
        if (conversationIds.length > 0) {
            const { error: msgError } = await supabaseAdmin
                .from('conversation_messages')
                .delete()
                .in('conversation_id', conversationIds);

            if (msgError) {
                console.error('Error deleting conversation messages:', msgError);
            }

            // 3. Delete all conversations in this project
            const { error: delConvError } = await supabaseAdmin
                .from('conversations')
                .delete()
                .in('id', conversationIds);

            if (delConvError) {
                console.error('Error deleting conversations:', delConvError);
            }
        }

        // 4. Delete project files (should cascade, but let's be explicit)
        await supabaseAdmin
            .from('project_files')
            .delete()
            .eq('project_id', id);

        // 5. Finally delete the project itself
        const { error } = await supabaseAdmin
            .from('projects')
            .delete()
            .eq('id', id)
            .eq('user_email', email);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log(`[Delete Project] Deleted project ${id} with ${conversationIds.length} conversations`);

        return NextResponse.json({ success: true, deletedConversations: conversationIds.length });
    } catch (error) {
        console.error('Error deleting project:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
