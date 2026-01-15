import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

 
 
export async function POST(req: NextRequest, { params }: { params: { inviteId: string } }) {
  try {
    const inviteId = params.inviteId
    const body = await req.json()
    const email = (body?.email || body?.acceptorEmail || '').toLowerCase()

    if (!inviteId || !email) {
      return NextResponse.json({ error: 'Missing inviteId or email' }, { status: 400 })
    }

    const { data: invite, error: iErr } = await supabaseAdmin
      .from('team_invites')
      .select('id, team_id, invitee_email, role, status')
      .eq('id', inviteId)
      .single()

    if (iErr || !invite) {
      return NextResponse.json({ error: iErr?.message || 'Invite not found' }, { status: 404 })
    }

    if (invite.status !== 'pending') {
      return NextResponse.json({ error: 'Invite is not pending' }, { status: 400 })
    }

    if (invite.invitee_email.toLowerCase() !== email) {
      return NextResponse.json({ error: 'Invite email does not match user' }, { status: 403 })
    }

    const { error: uErr } = await supabaseAdmin
      .from('team_invites')
      .update({ status: 'accepted', acted_at: new Date().toISOString() })
      .eq('id', inviteId)

    if (uErr) {
      return NextResponse.json({ error: uErr.message }, { status: 500 })
    }

    const { error: mErr } = await supabaseAdmin
      .from('team_members')
      .upsert({ team_id: invite.team_id, member_email: email, role: invite.role }, { onConflict: 'team_id,member_email' })

    if (mErr) {
      return NextResponse.json({ error: mErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, team_id: invite.team_id })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to accept invite' }, { status: 500 })
  }
}
