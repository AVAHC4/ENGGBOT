import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

// POST /api/teams/[id]/members
// { email: string, role?: 'admin' | 'moderator' | 'member' }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const teamId = params.id
    const body = await req.json()
    const email = (body?.email || '').toLowerCase()
    const role = body?.role || 'member'

    if (!teamId || !email) {
      return NextResponse.json({ error: 'Missing teamId or email' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('team_members')
      .upsert({ team_id: teamId, member_email: email, role }, { onConflict: 'team_id,member_email' })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to add member' }, { status: 500 })
  }
}
