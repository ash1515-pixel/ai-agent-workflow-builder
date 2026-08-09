import { NextResponse } from "next/server";
import { actorFromRequest, apiError } from "../../../lib/authorization";
import { createRun } from "../../../lib/engine";

export async function POST(request) {
  try {
    const { workflowId } = await request.json();
    const run = createRun({ actor: actorFromRequest(request), workflowId, triggerType: "manual" });
    return NextResponse.json({ run }, { status: 202 });
  } catch (error) {
    const payload = apiError(error);
    return NextResponse.json(payload, { status: payload.status });
  }
}
