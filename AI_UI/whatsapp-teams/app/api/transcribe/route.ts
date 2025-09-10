export const runtime = "nodejs";

import type { NextRequest } from "next/server";

function parseBytezStream(text: string): string | null {
  try {
    const lines = text.split(/\r?\n/);
    let collected = "";
    let lastOutput: string | null = null;
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const json = JSON.parse(payload);
        if (typeof json?.output === "string" && json.output) lastOutput = json.output;
        const delta = json?.choices?.[0]?.delta?.content;
        if (typeof delta === "string") collected += delta;
      } catch {}
    }
    if (lastOutput) return lastOutput;
    if (collected) return collected;
    try {
      const maybe = JSON.parse(text);
      if (typeof maybe?.output === "string") return maybe.output;
    } catch {}
    return null;
  } catch {
    return null;
  }
}

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

    // Convert to base64 for Bytez API
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const modelId = "openai/whisper-large-v3";
    const url = `https://api.bytez.com/models/v2/${encodeURIComponent(modelId)}`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Key ${BYTEZ_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      // Ask Bytez to return non-streaming JSON
      body: JSON.stringify({ base64, stream: false, json: true }),
    });

    // Read once as text
    const text = await res.text();
    let data: any | undefined;
    try {
      data = JSON.parse(text);
    } catch {}

    if (!res.ok) {
      return Response.json(
        { error: data?.error || `Bytez error (status ${res.status})`, raw: data ?? text },
        { status: res.status }
      );
    }

    if (data) {
      // Normalize to { error:null, output }
      let output: string | null = null;
      if (typeof data?.output === "string") output = data.output;
      else if (data?.output && typeof data.output?.text === "string") output = data.output.text;
      else if (typeof data?.text === "string") output = data.text;
      else if (typeof data?.transcript === "string") output = data.transcript;
      else if (typeof data?.result === "string") output = data.result;
      if (output) return Response.json({ error: null, output }, { status: 200 });
    }

    const parsed = parseBytezStream(text);
    if (parsed) return Response.json({ error: null, output: parsed }, { status: 200 });

    return Response.json({ error: "Invalid JSON from Bytez", raw: text }, { status: 200 });
  } catch (err: any) {
    return Response.json({ error: err?.message || "Unexpected server error" }, { status: 500 });
  }
}
