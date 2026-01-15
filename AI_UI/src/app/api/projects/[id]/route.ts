import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

 
 
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const projectId = params.id;
        const { searchParams } = new URL(req.url);
        const email = searchParams.get('email')?.toLowerCase();

        if (!projectId) {
            return NextResponse.json({ error: 'Missing project ID' }, { status: 400 });
        }

        if (!email) {
            return NextResponse.json({ error: 'Missing email' }, { status: 400 });
        }

         
        const { data: project, error: projError } = await supabaseAdmin
            .from('projects')
            .select('id, name, description, created_at, updated_at, user_email')
            .eq('id', projectId)
            .single();

        if (projError || !project) {
            return NextResponse.json({ exists: false }, { status: 200 });
        }

         
        if (project.user_email !== email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

         
        const { data: conversations, error: convError } = await supabaseAdmin
            .from('project_conversations')
            .select('id, title, created_at, updated_at')
            .eq('project_id', projectId)
            .order('updated_at', { ascending: false });

        if (convError) {
            return NextResponse.json({ error: convError.message }, { status: 500 });
        }

        return NextResponse.json({
            project: {
                id: project.id,
                name: project.name,
                description: project.description,
                createdAt: project.created_at,
                updatedAt: project.updated_at,
            },
            conversations: conversations || [],
        });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Failed to get project' }, { status: 500 });
    }
}

 
 
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const projectId = params.id;
        const body = await req.json();
        const email = (body?.email || '').toLowerCase();
        const name = body?.name;
        const description = body?.description;

        if (!projectId || !email) {
            return NextResponse.json({ error: 'Missing project ID or email' }, { status: 400 });
        }

         
        const { data: project, error: checkError } = await supabaseAdmin
            .from('projects')
            .select('user_email')
            .eq('id', projectId)
            .single();

        if (checkError || !project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        if (project.user_email !== email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

         
        const updates: any = { updated_at: new Date().toISOString() };
        if (name !== undefined) {
            updates.name = name;
        }
        if (description !== undefined) {
            updates.description = description;
        }

        const { data, error } = await supabaseAdmin
            .from('projects')
            .update(updates)
            .eq('id', projectId)
            .select('id, name, description, created_at, updated_at')
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ project: data });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Failed to update project' }, { status: 500 });
    }
}

 
 
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const projectId = params.id;
        const { searchParams } = new URL(req.url);
        const email = searchParams.get('email')?.toLowerCase();

        if (!projectId || !email) {
            return NextResponse.json({ error: 'Missing project ID or email' }, { status: 400 });
        }

         
        const { data: project, error: checkError } = await supabaseAdmin
            .from('projects')
            .select('user_email')
            .eq('id', projectId)
            .single();

        if (checkError || !project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        if (project.user_email !== email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

         
        const { error } = await supabaseAdmin
            .from('projects')
            .delete()
            .eq('id', projectId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Failed to delete project' }, { status: 500 });
    }
}
