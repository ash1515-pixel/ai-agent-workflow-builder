import { NextResponse } from "next/server";
import { actorFromRequest, apiError, assertOrgAccess } from "../../../../lib/authorization";
import { store } from "../../../../lib/demo-store";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const { runId } = await params;
    const run = store.runById(runId);
    if (!run) return NextResponse.json({ error: "Run not found." }, { status: 404 });
    assertOrgAccess(actorFromRequest(request), run.organization_id, "view");
    return NextResponse.json({ run });
  } catch (error) {
    const payload = apiError(error);
    return NextResponse.json(payload, { status: payload.status });
  }
}
