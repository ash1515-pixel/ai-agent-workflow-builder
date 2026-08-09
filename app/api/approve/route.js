import { NextResponse } from "next/server";
import { actorFromRequest, apiError } from "../../../lib/authorization";
import { approveStep } from "../../../lib/engine";

export async function POST(request) {
  try {
    const { runId, stepRunId } = await request.json();
    const run = approveStep({ actor: actorFromRequest(request), runId, stepRunId });
    return NextResponse.json({ run }, { status: 202 });
  } catch (error) {
    const payload = apiError(error);
    return NextResponse.json(payload, { status: payload.status });
  }
}
