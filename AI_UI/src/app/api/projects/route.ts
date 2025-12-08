import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');

    if (!email) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    try {
        // Fetch projects for the user
        // We get conversation_ids by joining or separate query?
        // Actually, projects table doesn't have conversation_ids array column in my schema above.
        // It's a 1-to-many from conversations -> projects.
        // But the frontend expects `conversationIds` array.
        // Let's first fetch projects, then fetch conversation IDs for each project.

        const { data: projects, error } = await supabaseAdmin
            .from('projects')
            .select('*')
            .eq('user_email', email)
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Error fetching projects:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Now fetch conversation IDs for these projects
        const projectsWithDetails = await Promise.all(projects.map(async (project) => {
            // Get conversation IDs
            const { data: conversations } = await supabaseAdmin
                .from('conversations')
                .select('id')
                .eq('project_id', project.id);

            // Get file IDs
            const { data: files } = await supabaseAdmin
                .from('project_files')
                .select('id')
                .eq('project_id', project.id);

            return {
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
            };
        }));

        return NextResponse.json({ projects: projectsWithDetails });
    } catch (error) {
        console.error('Error processing projects request:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, name, description, emoji, color, customInstructions } = body;

        if (!email || !name) {
            return NextResponse.json({ error: 'Email and name are required' }, { status: 400 });
        }

        const { data: project, error } = await supabaseAdmin
            .from('projects')
            .insert({
                user_email: email,
                name,
                description,
                emoji,
                color,
                custom_instructions: customInstructions,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating project:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

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
                conversationIds: [],
                fileIds: []
            }
        });
    } catch (error) {
        console.error('Error creating project:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
