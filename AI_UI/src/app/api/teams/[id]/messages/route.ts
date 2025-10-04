import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

// GET /api/teams/[id]/messages?limit=200
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const teamId = params.id
    const { searchParams } = new URL(req.url)
    const limit = Number(searchParams.get('limit') || '200')

    if (!teamId) {
      return NextResponse.json({ error: 'Missing team id' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('messages')
      .select('id, team_id, sender_email, sender_name, content, created_at')
      .eq('team_id', teamId)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ messages: data || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to fetch messages' }, { status: 500 })
  }
}

// POST /api/teams/[id]/messages
// { content: string, senderEmail: string, senderName?: string }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const teamId = params.id
    const body = await req.json()
    const content = (body?.content || '').toString()
    const senderEmail = (body?.senderEmail || '').toLowerCase()
    const senderName = body?.senderName || null

    if (!teamId || !content || !senderEmail) {
      return NextResponse.json({ error: 'Missing teamId, content, or senderEmail' }, { status: 400 })
    }

    // Ensure the sender is a member of the team
    const { data: membership, error: mErr } = await supabaseAdmin
      .from('team_members')
      .select('team_id')
      .eq('team_id', teamId)
      .eq('member_email', senderEmail)
      .single()

    if (mErr || !membership) {
      return NextResponse.json({ error: 'Forbidden: not a team member' }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .from('messages')
      .insert({ team_id: teamId, content, sender_email: senderEmail, sender_name: senderName })
      .select('id, team_id, sender_email, sender_name, content, created_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to send message' }, { status: 500 })
  }
}
