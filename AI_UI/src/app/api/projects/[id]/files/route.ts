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
        // Check access first? Or just rely on join?
        // RLS relies on user email, but we are admin.
        // Let's check project ownership.
        const { data: project } = await supabaseAdmin
            .from('projects')
            .select('id')
            .eq('id', id)
            .eq('user_email', email)
            .single();

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        const { data: files, error } = await supabaseAdmin
            .from('project_files')
            .select('*')
            .eq('project_id', id)
            .order('upload_date', { ascending: false });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Map to frontend expected format
        const formattedFiles = files.map(f => ({
            id: f.id,
            projectId: f.project_id,
            name: f.name,
            type: f.type,
            size: f.size,
            content: f.content,
            uploadDate: f.upload_date
        }));

        return NextResponse.json({ files: formattedFiles });
    } catch (error) {
        console.error('Error fetching project files:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const { id } = params;
    try {
        const body = await request.json();
        const { email, name, type, size, content } = body;

        if (!email || !name) {
            return NextResponse.json({ error: 'Email and filename are required' }, { status: 400 });
        }

        // Verify project ownership
        const { data: project } = await supabaseAdmin
            .from('projects')
            .select('id')
            .eq('id', id)
            .eq('user_email', email)
            .single();

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        const { data: file, error } = await supabaseAdmin
            .from('project_files')
            .insert({
                project_id: id,
                name,
                type,
                size,
                content
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            file: {
                id: file.id,
                projectId: file.project_id,
                name: file.name,
                type: file.type,
                size: file.size,
                content: file.content,
                uploadDate: file.upload_date
            }
        });
    } catch (error) {
        console.error('Error creating project file:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
