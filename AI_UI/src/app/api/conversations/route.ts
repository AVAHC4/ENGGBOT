export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';
import { getSessionFromCookies } from '@/lib/server/auth-session';

// GET /api/conversations?limit=20&offset=0
export async function GET(req: NextRequest) {
  try {
    const db = getSupabaseAdmin();
    const session = getSessionFromCookies();

    if (!db) return NextResponse.json({ error: 'Persistence not configured' }, { status: 503 });
    if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const { data, error } = await db
      .from('conversations')
      .select('id, title, created_at, updated_at, is_pinned, is_archived, metadata')
      .eq('user_id', session.id)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ conversations: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to list conversations' }, { status: 500 });
  }
}

// POST /api/conversations
export async function POST(req: NextRequest) {
  try {
    const db = getSupabaseAdmin();
    const session = getSessionFromCookies();

    if (!db) return NextResponse.json({ error: 'Persistence not configured' }, { status: 503 });
    if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const title: string | undefined = body?.title;
    const id: string | undefined = body?.id; // allow client-provided ID to align with local state

    const row: any = {
      id: id || crypto.randomUUID(),
      user_id: session.id,
      title: title || 'New conversation',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {},
    };

    const { data, error } = await db
      .from('conversations')
      .insert(row)
      .select('id, title, created_at, updated_at')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ conversation: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to create conversation' }, { status: 500 });
  }
}
