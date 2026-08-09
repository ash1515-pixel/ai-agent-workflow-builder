import { DEFAULT_WORKFLOW, ORGANIZATIONS, seededPausedRun } from "./seed";

function clone(value) {
  return structuredClone(value);
}

const state = globalThis.__flowpilot_demo_store || {
  organizations: clone(ORGANIZATIONS),
  workflows: [clone(DEFAULT_WORKFLOW)],
  runs: [seededPausedRun()]
};

globalThis.__flowpilot_demo_store = state;

export const store = {
  reset() {
    state.organizations = clone(ORGANIZATIONS);
    state.workflows = [clone(DEFAULT_WORKFLOW)];
    state.runs = [seededPausedRun()];
  },
  get workflow() {
    return state.workflows[0];
  },
  get organizations() {
    return state.organizations;
  },
  workflowById(id) {
    return state.workflows.find((workflow) => workflow.id === id);
  },
  runById(id) {
    return state.runs.find((run) => run.id === id);
  },
  runsForWorkflow(workflowId) {
    return state.runs
      .filter((run) => run.workflow_id === workflowId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },
  addRun(run) {
    state.runs.unshift(run);
    return run;
  },
  organization(id) {
    return state.organizations.find((organization) => organization.id === id);
  },
  snapshot(workflowId) {
    const workflow = this.workflowById(workflowId);
    const organization = this.organization(workflow.organization_id);
    return clone({ workflow, organization, runs: this.runsForWorkflow(workflowId) });
  }
};
