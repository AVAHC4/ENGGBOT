import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const runtime = "nodejs"


export async function PATCH(req: NextRequest, context: { params: { id: string } }) {
  const teamId = context.params?.id

  if (!teamId) {
    return NextResponse.json({ error: "Missing team id" }, { status: 400 })
  }

  try {
    const body = await req.json()
    const { name, description, allow_member_invites } = body

    const updates: any = {}
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (allow_member_invites !== undefined) updates.allow_member_invites = allow_member_invites

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from("teams")
      .update(updates)
      .eq("id", teamId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, team: data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to update team" }, { status: 500 })
  }
}

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
