import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const teamId = params.id
  if (!teamId) {
    return new Response('Missing team id', { status: 400 })
  }

  let heartbeat: ReturnType<typeof setInterval> | null = null
  let channel: ReturnType<typeof supabaseAdmin.channel> | null = null

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      const send = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

       
      heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: ping\n\n`))
      }, 25000)

      channel = supabaseAdmin
        .channel(`messages-team-${teamId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `team_id=eq.${teamId}` },
          (payload) => {
            try {
              const row = payload.new as any
              send({
                id: row.id,
                team_id: row.team_id,
                sender_email: row.sender_email,
                sender_name: row.sender_name,
                content: row.content,
                created_at: row.created_at,
              })
            } catch (e) {
               
            }
          }
        )
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
             
            controller.enqueue(encoder.encode(`event: open\n` + `data: subscribed\n\n`))
          }
        })
    },
    cancel() {
      if (heartbeat) {
        clearInterval(heartbeat)
        heartbeat = null
      }
      if (channel) {
        try { supabaseAdmin.removeChannel(channel) } catch {}
        channel = null
      }
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
