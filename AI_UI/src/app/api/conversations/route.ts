import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role on the server ONLY. Do NOT import this file from the client.
const SUPABASE_URL = 'https://***REMOVED***';
const SUPABASE_SERVICE_KEY = '***REMOVED***';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('user_email') || request.headers.get('x-user-email');

    if (!userEmail) {
      return NextResponse.json({ error: 'user_email is required' }, { status: 400 });
    }

    // Find user
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single();

    if (userErr || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('id, title, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ conversations: conversations || [] });
  } catch (e) {
    console.error('GET /api/conversations error', e);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, title, user_email: userEmail } = body || {};

    if (!userEmail) {
      return NextResponse.json({ error: 'user_email is required' }, { status: 400 });
    }

    // Ensure user exists
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single();

    if (userErr || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Upsert conversation by id if provided, otherwise create new
    const payload: any = {
      user_id: user.id,
      title: title || (id ? `Conversation ${String(id).slice(0, 6)}` : 'New Conversation'),
    };

    if (id) payload.id = id; // allow client-provided UUID to match local state

    const { data: conv, error } = await supabase
      .from('conversations')
      .upsert(payload, { onConflict: 'id' })
      .select('id, title, created_at, updated_at')
      .single();

    if (error) throw error;

    return NextResponse.json({ conversation: conv });
  } catch (e) {
    console.error('POST /api/conversations error', e);
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }
}
