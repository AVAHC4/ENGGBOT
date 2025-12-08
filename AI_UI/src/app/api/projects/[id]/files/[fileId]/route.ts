import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string; fileId: string } }
) {
    const { id, fileId } = params;
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');

    if (!email) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    try {
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

        const { error } = await supabaseAdmin
            .from('project_files')
            .delete()
            .eq('id', fileId)
            .eq('project_id', id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting project file:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
