import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'

// POST /api/teams/[id]/invites
// { inviteeEmail: string, role?: 'admin' | 'moderator' | 'member', message?: string, invitedByEmail?: string }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const teamId = params.id
    const body = await req.json()
    const inviteeEmail = (body?.inviteeEmail || body?.email || '').toLowerCase()
    const role = (body?.role || 'member').toString()
    const message = body?.message || null
    const invitedByEmail = (body?.invitedByEmail || '').toLowerCase() || null

    if (!teamId || !inviteeEmail) {
      return NextResponse.json({ error: 'Missing teamId or inviteeEmail' }, { status: 400 })
    }

    // If a pending invite already exists, return it
    const { data: existing, error: eErr } = await supabaseAdmin
      .from('team_invites')
      .select('id, team_id, invitee_email, role, message, invited_by_email, status, created_at')
      .eq('team_id', teamId)
      .eq('invitee_email', inviteeEmail)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)

    if (eErr) {
      return NextResponse.json({ error: eErr.message }, { status: 500 })
    }

    if (existing && existing.length > 0) {
      return NextResponse.json({ invite: existing[0], deduped: true })
    }

    const token = randomUUID()

    const { data: invite, error } = await supabaseAdmin
      .from('team_invites')
      .insert({
        team_id: teamId,
        invitee_email: inviteeEmail,
        role,
        message,
        invited_by_email: invitedByEmail,
        status: 'pending',
        token,
      })
      .select('id, team_id, invitee_email, role, message, invited_by_email, status, created_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ invite })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to create invite' }, { status: 500 })
  }
}
