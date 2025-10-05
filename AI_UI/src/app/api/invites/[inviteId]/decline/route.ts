import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

// POST /api/invites/[inviteId]/decline
// { email?: string }
export async function POST(req: NextRequest, { params }: { params: { inviteId: string } }) {
  try {
    const inviteId = params.inviteId
    // optional email may be passed for auditing later
    if (!inviteId) {
      return NextResponse.json({ error: 'Missing inviteId' }, { status: 400 })
    }

    const { data: invite, error: iErr } = await supabaseAdmin
      .from('team_invites')
      .select('id, status')
      .eq('id', inviteId)
      .single()

    if (iErr || !invite) {
      return NextResponse.json({ error: iErr?.message || 'Invite not found' }, { status: 404 })
    }

    if (invite.status !== 'pending') {
      return NextResponse.json({ error: 'Invite is not pending' }, { status: 400 })
    }

    const { error: uErr } = await supabaseAdmin
      .from('team_invites')
      .update({ status: 'declined', acted_at: new Date().toISOString() })
      .eq('id', inviteId)

    if (uErr) {
      return NextResponse.json({ error: uErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to decline invite' }, { status: 500 })
  }
}
