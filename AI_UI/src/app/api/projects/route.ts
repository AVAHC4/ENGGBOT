import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET /api/projects
// List all projects for the user
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const email = searchParams.get('email')?.toLowerCase();

        if (!email) {
            return NextResponse.json({ error: 'Missing email' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('projects')
            .select('id, name, description, created_at, updated_at')
            .eq('user_email', email)
            .order('updated_at', { ascending: false });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ projects: data || [] });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Failed to list projects' }, { status: 500 });
    }
}

// POST /api/projects
// Create a new project
// Body: { email: string, name: string, description?: string }
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const email = (body?.email || '').toLowerCase();
        const name = body?.name || 'New Project';
        const description = body?.description || null;
        const id = body?.id; // Accept ID from client

        if (!email) {
            return NextResponse.json({ error: 'Missing email' }, { status: 400 });
        }

        if (!name.trim()) {
            return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
        }

        // Prepare insert data
        const insertData: any = {
            user_email: email,
            name: name.trim(),
            description,
        };

        // If ID is provided, use it; otherwise let database generate one
        if (id) {
            insertData.id = id;
        }

        const { data, error } = await supabaseAdmin
            .from('projects')
            .insert(insertData)
            .select('id, name, description, created_at, updated_at')
            .single();

        if (error) {
            console.error('[API] Supabase insert error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ project: data });
    } catch (e: any) {
        console.error('[API] Exception in POST /api/projects:', e);
        return NextResponse.json({ error: e?.message || 'Failed to create project' }, { status: 500 });
    }
}
