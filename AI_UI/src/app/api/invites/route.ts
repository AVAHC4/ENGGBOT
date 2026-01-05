import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

// GET /api/invites?email=user@example.com
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')?.toLowerCase()
    if (!email) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 })
    }

    const { data: invites, error } = await supabaseAdmin
      .from('team_invites')
      .select('id, team_id, invitee_email, role, message, invited_by_email, status, created_at')
      .eq('invitee_email', email)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Attach team names
    const teamIds = Array.from(new Set((invites || []).map((i: any) => i.team_id)))
    let nameById: Record<string, string> = {}
    if (teamIds.length > 0) {
      const { data: teams, error: tErr } = await supabaseAdmin
        .from('teams')
        .select('id, name')
        .in('id', teamIds)
      if (tErr) {
        return NextResponse.json({ error: tErr.message }, { status: 500 })
      }
      nameById = Object.fromEntries((teams || []).map((t: any) => [t.id, t.name]))
    }

    const withNames = (invites || []).map((i: any) => ({ ...i, team_name: nameById[i.team_id] || 'Team' }))

    return NextResponse.json({ invites: withNames })
  } catch (e: any) {
    console.error('[GET /api/invites] Error:', e)
    return NextResponse.json({ error: e?.message || 'Failed to list invites' }, { status: 500 })
  }
}
