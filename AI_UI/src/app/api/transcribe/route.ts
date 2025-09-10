export const runtime = "nodejs";

import type { NextRequest } from "next/server";

function parseBytezStream(text: string): string | null {
  try {
    // Handle Server-Sent Events style: lines starting with "data: "
    const lines = text.split(/\r?\n/);
    let collected = "";
    let lastOutput: string | null = null;
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim(); // after 'data:'
      if (!payload || payload === "[DONE]") continue;
      try {
        const json = JSON.parse(payload);
        if (typeof json?.output === "string" && json.output) {
          lastOutput = json.output;
        }
        // Also support chat-style deltas
        const delta = json?.choices?.[0]?.delta?.content;
        if (typeof delta === "string") {
          collected += delta;
        }
      } catch {}
    }
    if (lastOutput) return lastOutput;
    if (collected) return collected;
    // Sometimes providers return plain JSON without data: prefix
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

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const candidatePaths = [
      "/models/v2/openai/whisper-large-v3-turbo",
      "/models/v2/openai/whisper-large-v3",
      "/models/v2/openai-community/whisper-large-v3-turbo",
      "/models/v2/openai-community/whisper-large-v3",
      "/models/v2/unsloth/whisper-large-v3-turbo",
    ];

    const errors: Array<{ path: string; status: number; snippet: string }> = [];
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    for (const path of candidatePaths) {
      const url = `https://api.bytez.com${path}`;
      const headers: Record<string, string> = {
        Authorization: `Key ${BYTEZ_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      // Closed-source OpenAI models usually require provider-key
      if (path.includes("/openai/") && OPENAI_API_KEY) {
        headers["provider-key"] = OPENAI_API_KEY;
      }

      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ base64, stream: false, json: true }),
      });

      const text = await res.text();
      let data: any | undefined;
      try {
        data = JSON.parse(text);
      } catch {}

      if (!res.ok) {
        errors.push({ path, status: res.status, snippet: text.slice(0, 240) });
        continue; // try next candidate
      }

      if (data) {
        let output: string | null = null;
        if (typeof data?.output === "string") output = data.output;
        else if (data?.output && typeof data.output?.text === "string") output = data.output.text;
        else if (typeof data?.text === "string") output = data.text;
        else if (typeof data?.transcript === "string") output = data.transcript;
        else if (typeof data?.result === "string") output = data.result;
        if (output) {
          return Response.json({ error: null, output }, { status: 200 });
        }
      }

      const parsed = parseBytezStream(text);
      if (parsed) {
        return Response.json({ error: null, output: parsed }, { status: 200 });
      }

      // If we reach here, parsing failed even though status was ok; record and continue
      errors.push({ path, status: res.status, snippet: text.slice(0, 240) });
    }

    return Response.json(
      {
        error: "All Bytez ASR endpoints failed",
        tried: errors,
      },
      { status: 502 }
    );
  } catch (err: any) {
    return Response.json({ error: err?.message || "Unexpected server error" }, { status: 500 });
  }
}
