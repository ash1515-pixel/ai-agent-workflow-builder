import { NextResponse } from "next/server";
import { actorFromRequest, apiError, assertOrgAccess, assertStepPermission } from "../../../../lib/authorization";
import { store } from "../../../../lib/demo-store";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const { workflowId } = await params;
    const workflow = store.workflowById(workflowId);
    if (!workflow) return NextResponse.json({ error: "Workflow not found." }, { status: 404 });
    const actor = actorFromRequest(request);
    assertOrgAccess(actor, workflow.organization_id, "view");
    return NextResponse.json({ actor, ...store.snapshot(workflowId) });
  } catch (error) {
    const payload = apiError(error);
    return NextResponse.json(payload, { status: payload.status });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { workflowId } = await params;
    const workflow = store.workflowById(workflowId);
    if (!workflow) return NextResponse.json({ error: "Workflow not found." }, { status: 404 });
    const actor = actorFromRequest(request);
    assertOrgAccess(actor, workflow.organization_id, "editWorkflow");
    const body = await request.json();
    if (Array.isArray(body.steps)) {
      for (const step of body.steps) assertStepPermission(actor, step.type);
      workflow.steps = body.steps.map((step, index) => ({ ...step, position: index + 1 }));
    }
    if (Array.isArray(body.triggers)) {
      if (body.triggers.some((trigger) => trigger.type === "webhook") && actor.role !== "owner") {
        const error = new Error("Webhook triggers may only be configured by an organization owner.");
        error.status = 403;
        throw error;
      }
      workflow.triggers = body.triggers;
    }
    if (typeof body.name === "string" && body.name.trim()) workflow.name = body.name.trim();
    return NextResponse.json({ workflow });
  } catch (error) {
    const payload = apiError(error);
    return NextResponse.json(payload, { status: payload.status });
  }
}
