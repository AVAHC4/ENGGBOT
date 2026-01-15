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
            .select('user_email')
            .eq('id', projectId)
            .single();

        if (projError || !project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        if (project.user_email !== email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

         
        const { data, error } = await supabaseAdmin
            .from('project_conversations')
            .select('id, title, created_at, updated_at')
            .eq('project_id', projectId)
            .order('updated_at', { ascending: false });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ conversations: data || [] });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Failed to list conversations' }, { status: 500 });
    }
}

 
 
 
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const projectId = params.id;
        const body = await req.json();
        const email = (body?.email || '').toLowerCase();
        const title = body?.title || 'New Conversation';
        const id = body?.id;  

        if (!projectId) {
            return NextResponse.json({ error: 'Missing project ID' }, { status: 400 });
        }

        if (!email) {
            return NextResponse.json({ error: 'Missing email' }, { status: 400 });
        }

         
        const { data: project, error: projError } = await supabaseAdmin
            .from('projects')
            .select('user_email')
            .eq('id', projectId)
            .single();

        if (projError || !project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        if (project.user_email !== email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

         
        const insertData: any = {
            project_id: projectId,
            user_email: email,
            title,
        };

         
        if (id) {
            insertData.id = id;
        }

        const { data, error } = await supabaseAdmin
            .from('project_conversations')
            .insert(insertData)
            .select('id, title, created_at, updated_at')
            .single();

        if (error) {
            console.error('[API] Supabase insert error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ conversation: data });
    } catch (e: any) {
        console.error('[API] Exception in POST /api/projects/[id]/conversations:', e);
        return NextResponse.json({ error: e?.message || 'Failed to create conversation' }, { status: 500 });
    }
}
