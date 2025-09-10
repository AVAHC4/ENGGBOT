export const runtime = "nodejs";

import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return Response.json({ error: "No audio file provided" }, { status: 400 });
    }

    const BYTEZ_API_KEY = process.env.BYTEZ_API_KEY;
    if (!BYTEZ_API_KEY) {
      return Response.json(
        { error: "Server misconfiguration: BYTEZ_API_KEY is not set" },
        { status: 500 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const modelId = "openai/whisper-large-v3";
    const url = `https://api.bytez.com/models/v2/${encodeURIComponent(modelId)}`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Key ${BYTEZ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ base64 }),
    });

    const data = await res.json().catch(() => ({ error: "Invalid JSON from Bytez" }));

    if (!res.ok) {
      return Response.json(
        { error: data?.error || `Bytez error (status ${res.status})` },
        { status: res.status }
      );
    }

    return Response.json(data, { status: 200 });
  } catch (err: any) {
    return Response.json({ error: err?.message || "Unexpected server error" }, { status: 500 });
  }
}
