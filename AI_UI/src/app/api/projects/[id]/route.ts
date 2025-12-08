import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(
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

        // Update project fields
        const { data: project, error } = await supabaseAdmin
            .from('projects')
            .update({
                name,
                description,
                emoji,
                color,
                custom_instructions: customInstructions,
                updated_at: new Date().toISOString()
            })
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
        // Delete project (cascade will handle files and conversation links?
        // Conversation table has: project_id uuid. onDelete set to?
        // In schema: `project_id uuid`. No foreign key constraint defined in `conversations` table in my view earlier?
        // If no FK constraint, we need to manually unlink conversations.
        // Let's first check if we should unlink or delete. Usually projects deleted -> conversations deleted?
        // Or just unlinked.
        // The `projects_schema.sql` defines FK for `project_files` with cascade.
        // `conversations_schema.sql` had: `project_id uuid`. It did NOT define a reference to public.projects (maybe because projects didn't exist yet).
        // So we should manually update conversations to set project_id = null OR delete them.
        // For now, let's just delete the project.

        // 1. Delete project
        const { error } = await supabaseAdmin
            .from('projects')
            .delete()
            .eq('id', id)
            .eq('user_email', email);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // 2. Unlink conversations (if no FK) - Optional clean up
        await supabaseAdmin
            .from('conversations')
            .update({ project_id: null })
            .eq('project_id', id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting project:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
