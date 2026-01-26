import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const runtime = "nodejs"

export async function POST(req: NextRequest, context: { params: { id: string } }) {
    const teamId = context.params?.id

    if (!teamId) {
        return NextResponse.json({ error: "Missing team id" }, { status: 400 })
    }

    try {
        const { data, error } = await supabaseAdmin
            .from("teams")
            .update({ is_archived: true })
            .eq("id", teamId)
            .select("id, name, is_archived")
            .maybeSingle()

        if (error) {
            if (error.code === "PGRST116") {
                return NextResponse.json({ error: "Team not found" }, { status: 404 })
            }
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        if (!data) {
            return NextResponse.json({ error: "Team not found" }, { status: 404 })
        }

        return NextResponse.json({ success: true, team: data })
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || "Failed to archive team" }, { status: 500 })
    }
}
