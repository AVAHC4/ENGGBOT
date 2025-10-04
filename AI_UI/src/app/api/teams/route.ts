import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

// GET /api/teams?email=you@example.com
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')?.toLowerCase()
    if (!email) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 })
    }

    // Find memberships
    const { data: memberships, error: mErr } = await supabaseAdmin
      .from('team_members')
      .select('team_id')
      .eq('member_email', email)

    if (mErr) {
      return NextResponse.json({ error: mErr.message }, { status: 500 })
    }

    const teamIds = (memberships || []).map((m: any) => m.team_id)
    if (teamIds.length === 0) {
      return NextResponse.json({ teams: [] })
    }

    const { data: teams, error: tErr } = await supabaseAdmin
      .from('teams')
      .select('id, name, created_at, created_by_email')
      .in('id', teamIds)
      .order('created_at', { ascending: false })

    if (tErr) {
      return NextResponse.json({ error: tErr.message }, { status: 500 })
    }

    return NextResponse.json({ teams })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to list teams' }, { status: 500 })
  }
}

// POST /api/teams
// { name: string, creatorEmail: string, creatorName?: string }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const name = (body?.name || 'New Team').toString().slice(0, 100)
    const creatorEmail = body?.creatorEmail?.toLowerCase()
    const creatorName = body?.creatorName || null

    if (!creatorEmail) {
      return NextResponse.json({ error: 'Missing creatorEmail' }, { status: 400 })
    }

    const { data: team, error: cErr } = await supabaseAdmin
      .from('teams')
      .insert({ name, created_by_email: creatorEmail, created_by_name: creatorName })
      .select('*')
      .single()

    if (cErr) {
      return NextResponse.json({ error: cErr.message }, { status: 500 })
    }

    const { error: mErr } = await supabaseAdmin
      .from('team_members')
      .insert({ team_id: team.id, member_email: creatorEmail, role: 'admin' })

    if (mErr) {
      return NextResponse.json({ error: mErr.message }, { status: 500 })
    }

    return NextResponse.json({ team })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to create team' }, { status: 500 })
  }
}
