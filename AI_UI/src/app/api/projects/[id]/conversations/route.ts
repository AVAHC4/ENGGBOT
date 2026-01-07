import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET /api/projects/[id]/conversations
// Returns all conversations for a project with metadata in a single call
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const projectId = params.id;
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email')?.toLowerCase();

    if (!email) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!projectId) {
        return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    try {
        // Verify project ownership
        const { data: project, error: projectError } = await supabaseAdmin
            .from('projects')
            .select('id, name, emoji, user_email')
            .eq('id', projectId)
            .single();

        if (projectError || !project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        if (project.user_email !== email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Fetch all conversations for this project in one query
        const { data: conversations, error: convError } = await supabaseAdmin
            .from('conversations')
            .select('id, title, created_at, updated_at')
            .eq('project_id', projectId)
            .eq('user_email', email)
            .order('updated_at', { ascending: false });

        if (convError) {
            console.error('[API] Error fetching project conversations:', convError);
            return NextResponse.json({ error: convError.message }, { status: 500 });
        }

        // Transform to frontend format
        const formattedConversations = (conversations || []).map((conv) => ({
            id: conv.id,
            title: conv.title || 'Untitled',
            createdAt: conv.created_at,
            updatedAt: conv.updated_at,
        }));

        return NextResponse.json({
            project: {
                id: project.id,
                name: project.name,
                emoji: project.emoji,
            },
            conversations: formattedConversations,
        });
    } catch (error: any) {
        console.error('[API] Error in project conversations endpoint:', error);
        return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
    }
}
