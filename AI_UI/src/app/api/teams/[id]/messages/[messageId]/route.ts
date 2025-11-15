import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

export async function DELETE(req: NextRequest, { params }: { params: { id: string; messageId: string } }) {
  const teamId = params.id
  const messageId = params.messageId

  if (!teamId || !messageId) {
    return NextResponse.json({ error: 'Missing teamId or messageId' }, { status: 400 })
  }

  let requesterEmail: string | undefined
  try {
    const body = await req.json()
    requesterEmail = body?.requesterEmail ? String(body.requesterEmail).toLowerCase() : undefined
  } catch {
    requesterEmail = undefined
  }

  try {
    const { data: message, error } = await supabaseAdmin
      .from('messages')
      .select('id, team_id, sender_email')
      .eq('id', messageId)
      .single()

    if (error || !message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    if (message.team_id !== teamId) {
      return NextResponse.json({ error: 'Message does not belong to this team' }, { status: 400 })
    }

    if (
      requesterEmail &&
      message.sender_email &&
      requesterEmail !== message.sender_email.toLowerCase()
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error: deleteError } = await supabaseAdmin
      .from('messages')
      .delete()
      .eq('id', messageId)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to delete message' }, { status: 500 })
  }
}
