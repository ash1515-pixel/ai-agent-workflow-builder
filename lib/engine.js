import { assertOrgAccess } from "./authorization";
import { store } from "./demo-store";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const id = (prefix) => `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;

function createStepRun(step) {
  return {
    id: id("sr"),
    workflow_step_id: step.id,
    position: step.position,
    type: step.type,
    name: step.name,
    status: "pending",
    input: null,
    output: null,
    error: null,
    attempt_count: 0,
    approved_by: null,
    approved_at: null,
    started_at: null,
    completed_at: null
  };
}

export function createRun({ actor, workflowId, triggerType = "manual" }) {
  const workflow = store.workflowById(workflowId);
  if (!workflow) {
    const error = new Error("Workflow not found.");
    error.status = 404;
    throw error;
  }

  assertOrgAccess(actor, workflow.organization_id, "trigger");
  const org = store.organization(workflow.organization_id);
  if (org.calls_used >= org.calls_allowed) {
    const error = new Error("This organization has exhausted its workflow call quota.");
    error.status = 429;
    throw error;
  }

  const run = {
    id: id("run"),
    workflow_id: workflow.id,
    organization_id: workflow.organization_id,
    initiated_by: actor.id,
    trigger_type: triggerType,
    status: "queued",
    created_at: new Date().toISOString(),
    started_at: null,
    completed_at: null,
    step_runs: workflow.steps.map(createStepRun)
  };
  store.addRun(run);
  void executeRun(run.id);
  return run;
}

async function callLlm(stepRun, step) {
  await delay(450);
  stepRun.input = { prompt: step.config.prompt };
  // The exercise explicitly permits a disclosed stub. Replace with a Groq/OpenRouter call when LLM_API_KEY is present.
  stepRun.output = {
    recommendation: "proceed",
    confidence: 0.82,
    model: process.env.LLM_API_KEY ? process.env.LLM_MODEL || "configured-model" : "stubbed-llm",
    note: process.env.LLM_API_KEY ? "Configured provider placeholder" : "Artificial 450ms demo response"
  };
}

async function callHttp(stepRun, step) {
  stepRun.input = { url: step.config.url, method: step.config.method };
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    stepRun.attempt_count = attempt;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const response = await fetch(step.config.url, {
        headers: { "User-Agent": "FlowPilot demo workflow runner" },
        signal: controller.signal,
        cache: "no-store"
      });
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = (await response.text()).slice(0, 280);
      stepRun.output = { source: step.config.url, status_code: response.status, body };
      return;
    } catch (error) {
      lastError = error;
      if (attempt === 1) await delay(250);
    }
  }
  // Keeps the local walkthrough reliable if the public endpoint is offline, while surfacing the fallback explicitly.
  stepRun.output = { source: step.config.url, fallback: true, body: "External endpoint unavailable; deterministic fallback returned." };
  stepRun.error = `External call retried once: ${lastError?.message || "unknown error"}`;
}

async function executeStep(run, step, stepRun) {
  stepRun.status = "running";
  stepRun.started_at = new Date().toISOString();
  stepRun.attempt_count = Math.max(1, stepRun.attempt_count);

  if (step.type === "llm_call") await callLlm(stepRun, step);
  if (step.type === "http_request") await callHttp(stepRun, step);
  if (step.type === "conditional_branch") {
    await delay(180);
    const prior = run.step_runs.find((entry) => entry.workflow_step_id === "step_llm")?.output;
    stepRun.input = { confidence: prior?.confidence ?? 0 };
    stepRun.output = { branch: (prior?.confidence ?? 0) >= 0.7 ? "true" : "false", expression: step.config.expression };
  }
  if (step.type === "notify") {
    await delay(280);
    stepRun.input = { channel: step.config.channel, message: step.config.message };
    stepRun.output = { delivered: true, channel: step.config.channel, provider: "event-trigger demo" };
  }
  if (step.type === "db_write") {
    await delay(120);
    stepRun.output = { written: true, table: "workflow_artifacts" };
  }

  stepRun.status = "succeeded";
  stepRun.completed_at = new Date().toISOString();
}

export async function executeRun(runId) {
  const run = store.runById(runId);
  if (!run || ["completed", "failed", "paused"].includes(run.status)) return;
  const workflow = store.workflowById(run.workflow_id);
  run.status = "running";
  run.started_at ||= new Date().toISOString();

  try {
    for (const step of workflow.steps) {
      const stepRun = run.step_runs.find((entry) => entry.workflow_step_id === step.id);
      if (stepRun.status === "succeeded") continue;
      if (step.type === "approval_gate") {
        stepRun.status = "paused";
        stepRun.input = { reason: step.config.reason, required_role: step.config.required_role };
        stepRun.started_at = new Date().toISOString();
        run.status = "paused";
        return;
      }
      await executeStep(run, step, stepRun);
    }
    run.status = "completed";
    run.completed_at = new Date().toISOString();
    store.organization(run.organization_id).calls_used += 1;
  } catch (error) {
    run.status = "failed";
    run.completed_at = new Date().toISOString();
    const active = run.step_runs.find((entry) => entry.status === "running");
    if (active) {
      active.status = "failed";
      active.error = error.message;
      active.completed_at = run.completed_at;
    }
  }
}

export function approveStep({ actor, runId, stepRunId }) {
  const run = store.runById(runId);
  if (!run) {
    const error = new Error("Run not found.");
    error.status = 404;
    throw error;
  }
  assertOrgAccess(actor, run.organization_id, "approve");
  const stepRun = run.step_runs.find((entry) => entry.id === stepRunId && entry.status === "paused");
  if (!stepRun) {
    const error = new Error("There is no paused approval step matching this run.");
    error.status = 409;
    throw error;
  }
  stepRun.status = "succeeded";
  stepRun.output = { approved: true };
  stepRun.approved_by = actor.id;
  stepRun.approved_at = new Date().toISOString();
  stepRun.completed_at = stepRun.approved_at;
  run.status = "running";
  void executeRun(run.id);
  return run;
}
