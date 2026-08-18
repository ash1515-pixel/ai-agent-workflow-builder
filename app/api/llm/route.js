import { NextResponse } from "next/server";
import { runLlm } from "../../../lib/llm";

export const runtime = "nodejs";

export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.prompt !== "string" || !body.prompt.trim()) {
    return NextResponse.json({ error: "A workflow prompt is required." }, { status: 400 });
  }

  if (body.prompt.length > 6_000) {
    return NextResponse.json({ error: "The workflow prompt is too long." }, { status: 413 });
  }

  const result = await runLlm({ prompt: body.prompt });
  return NextResponse.json(
    { result },
    { headers: { "Cache-Control": "no-store" } }
  );
}
