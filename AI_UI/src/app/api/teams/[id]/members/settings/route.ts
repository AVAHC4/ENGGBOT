
import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const runtime = "nodejs"

export async function PUT(req: NextRequest, context: { params: { id: string } }) {
    const teamId = context.params?.id

    if (!teamId) {
        return NextResponse.json({ error: "Missing team id" }, { status: 400 })
    }

    try {
        const body = await req.json()
        const { email, notifications_enabled } = body

        if (!email) {
            return NextResponse.json({ error: "Missing email" }, { status: 400 })
        }

        const updates: any = {}
        if (notifications_enabled !== undefined) updates.notifications_enabled = notifications_enabled

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: "No updates provided" }, { status: 400 })
        }

        const { error } = await supabaseAdmin
            .from("team_members")
            .update(updates)
            .eq("team_id", teamId)
            .eq("member_email", email)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || "Failed to update member settings" }, { status: 500 })
    }
}
