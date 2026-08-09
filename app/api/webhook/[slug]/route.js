import { NextResponse } from "next/server";
import { DEMO_USERS } from "../../../../lib/seed";
import { apiError } from "../../../../lib/authorization";
import { createRun } from "../../../../lib/engine";
import { store } from "../../../../lib/demo-store";

export async function POST(request, { params }) {
  try {
    const { slug } = await params;
    const workflow = store.workflow;
    const trigger = workflow.triggers.find((entry) => entry.type === "webhook" && entry.slug === slug && entry.enabled);
    if (!trigger) return NextResponse.json({ error: "Webhook not found." }, { status: 404 });
    const expected = process.env.WEBHOOK_SHARED_SECRET || "demo-webhook-key";
    if (request.headers.get("x-webhook-secret") !== expected) {
      return NextResponse.json({ error: "Invalid webhook secret." }, { status: 401 });
    }
    const run = createRun({ actor: DEMO_USERS.ownerA, workflowId: workflow.id, triggerType: "webhook" });
    return NextResponse.json({ accepted: true, workflow_run_id: run.id }, { status: 202 });
  } catch (error) {
    const payload = apiError(error);
    return NextResponse.json(payload, { status: payload.status });
  }
}
