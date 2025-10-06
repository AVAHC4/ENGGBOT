import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { supabaseAdmin } from '@/lib/supabase-admin';

const BUCKET = 'user-conversations';

function normalizeEmail(email: string) {
  return String(email || '').trim().toLowerCase();
}

function prefixFromEmail(email: string) {
  const normalized = normalizeEmail(email);
  const base64 = Buffer.from(encodeURIComponent(normalized), 'utf-8').toString('base64');
  return base64.replace(/[^a-z0-9]/gi, '_');
}

function userSessionPath(prefix: string) {
  return `users/${prefix}/session.json`;
}

async function ensureBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = !!buckets?.find((b: any) => b.name === BUCKET);
  if (!exists) {
    await supabaseAdmin.storage.createBucket(BUCKET, { public: false });
  }
}

async function readJsonFromStorage(path: string): Promise<any | null> {
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(path);
  if (error || !data) return null;
  try {
    const anyData: any = data as any;
    let text = '';
    if (typeof anyData.text === 'function') {
      text = await anyData.text();
    } else if (typeof anyData.arrayBuffer === 'function') {
      const ab = await anyData.arrayBuffer();
      text = Buffer.from(ab).toString('utf-8');
    } else {
      text = String(anyData ?? '');
    }
    return JSON.parse(text || '{}');
  } catch {
    return null;
  }
}

async function writeJsonToStorage(path: string, payload: any) {
  const content = Buffer.from(JSON.stringify(payload ?? {}), 'utf-8');
  return await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, content, { upsert: true, contentType: 'application/json' });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 });

    await ensureBucket();
    const prefix = prefixFromEmail(email);
    const path = userSessionPath(prefix);
    const json = (await readJsonFromStorage(path)) || { sessionId: null };
    return NextResponse.json(json, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ sessionId: null }, { status: 200 });
  }
}

// Body: { email: string, sessionId: string }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body?.email;
    const sessionId = body?.sessionId;

    if (!email || !sessionId) {
      return NextResponse.json({ error: 'Missing email or sessionId' }, { status: 400 });
    }

    await ensureBucket();
    const prefix = prefixFromEmail(email);
    const path = userSessionPath(prefix);

    const existing = (await readJsonFromStorage(path)) || {};
    existing.sessionId = String(sessionId);
    existing.updatedAt = new Date().toISOString();

    const { error } = await writeJsonToStorage(path, existing);
    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to persist session' }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
