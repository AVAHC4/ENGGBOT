import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

// DELETE /api/teams/[id]/members/[email] - Leave or remove a team member
export async function DELETE(
    _req: NextRequest,
    { params }: { params: { id: string; email: string } }
) {
    try {
        const teamId = params.id
        const email = decodeURIComponent(params.email).toLowerCase()

        if (!teamId || !email) {
            return NextResponse.json({ error: 'Missing teamId or email' }, { status: 400 })
        }

        // Check if this is the last admin
        const { data: members, error: membersError } = await supabaseAdmin
            .from('team_members')
            .select('member_email, role')
            .eq('team_id', teamId)

        if (membersError) {
            return NextResponse.json({ error: membersError.message }, { status: 500 })
        }

        const member = members?.find(m => m.member_email.toLowerCase() === email)
        if (!member) {
            return NextResponse.json({ error: 'Member not found in team' }, { status: 404 })
        }

        // Check if this is the only admin and they're trying to leave
        if (member.role === 'admin') {
            const admins = members?.filter(m => m.role === 'admin') || []
            if (admins.length === 1) {
                return NextResponse.json(
                    { error: 'Cannot leave team. You are the only admin. Please transfer admin rights to another member first.' },
                    { status: 400 }
                )
            }
        }

        // Delete the member from the team
        const { error: deleteError } = await supabaseAdmin
            .from('team_members')
            .delete()
            .eq('team_id', teamId)
            .eq('member_email', email)

        if (deleteError) {
            return NextResponse.json({ error: deleteError.message }, { status: 500 })
        }

        return NextResponse.json({ ok: true, message: 'Successfully left the team' })
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Failed to leave team' }, { status: 500 })
    }
}
