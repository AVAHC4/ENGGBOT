import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const runtime = "nodejs"

export async function DELETE(_req: NextRequest, context: { params: { id: string } }) {
  const teamId = context.params?.id

  if (!teamId) {
    return NextResponse.json({ error: "Missing team id" }, { status: 400 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("teams")
      .delete()
      .eq("id", teamId)
      .select("id")
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

    return NextResponse.json({ success: true, id: data.id })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to delete team" }, { status: 500 })
  }
}
