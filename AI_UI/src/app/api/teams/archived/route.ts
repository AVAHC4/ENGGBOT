import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const email = searchParams.get('email')?.toLowerCase()
        if (!email) {
            return NextResponse.json({ error: 'Missing email' }, { status: 400 })
        }

        // Get team memberships for user
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

        // Get only archived teams
        const { data: teams, error: tErr } = await supabaseAdmin
            .from('teams')
            .select('id, name, created_at, created_by_email, is_archived')
            .in('id', teamIds)
            .eq('is_archived', true)
            .order('created_at', { ascending: false })

        if (tErr) {
            return NextResponse.json({ error: tErr.message }, { status: 500 })
        }

        return NextResponse.json({ teams })
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Failed to list archived teams' }, { status: 500 })
    }
}
