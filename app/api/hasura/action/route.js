import { NextResponse } from "next/server";
import { DEMO_USERS } from "../../../../lib/seed";
import { apiError } from "../../../../lib/authorization";
import { approveStep, createRun } from "../../../../lib/engine";

// Local Action-compatible handler. In an Nhost deployment, replace the demo actor
// lookup with the Hasura session variable x-hasura-user-id and persist via GraphQL.
export async function POST(request) {
  try {
    const body = await request.json();
    const userId = body.session_variables?.["x-hasura-user-id"];
    const actor = Object.values(DEMO_USERS).find((user) => user.id === userId) || DEMO_USERS.ownerA;
    if (body.action?.name === "triggerWorkflowRun") {
      const run = createRun({ actor, workflowId: body.input.workflow_id, triggerType: body.input.trigger_type || "manual" });
      return NextResponse.json({ run_id: run.id, status: run.status });
    }
    if (body.action?.name === "approveStep") {
      const run = approveStep({ actor, runId: body.input.workflow_run_id, stepRunId: body.input.step_run_id });
      return NextResponse.json({ run_id: run.id, status: run.status });
    }
    return NextResponse.json({ error: "Unsupported Action." }, { status: 400 });
  } catch (error) {
    const payload = apiError(error);
    return NextResponse.json(payload, { status: payload.status });
  }
}
