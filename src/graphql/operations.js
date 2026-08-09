// These operations target the tracked Hasura schema. The local demo uses its own
// API adapter so it works without credentials; swap this module into the client
// when NHOST_GRAPHQL_URL is configured.

export const GET_WORKFLOW_WITH_LATEST_RUN = /* GraphQL */ `
  query GetWorkflowWithLatestRun($workflowId: uuid!) {
    workflows_by_pk(id: $workflowId) {
      id name description is_active
      steps(order_by: { position: asc }) { id position type name config }
      triggers { id type enabled config }
      runs(limit: 1, order_by: { created_at: desc }) {
        id status trigger_type created_at started_at completed_at
        step_runs(order_by: { position: asc }) {
          id position status input output error attempt_count approved_by approved_at
        }
      }
    }
  }
`;

export const UPDATE_WORKFLOW_GRAPH = /* GraphQL */ `
  mutation UpdateWorkflowGraph($workflowId: uuid!, $set: workflows_set_input!, $steps: [workflow_steps_insert_input!]!, $triggers: [workflow_triggers_insert_input!]!) {
    update_workflows_by_pk(pk_columns: { id: $workflowId }, _set: $set) { id updated_at }
    insert_workflow_steps(objects: $steps, on_conflict: { constraint: workflow_steps_workflow_id_position_key, update_columns: [position, name, config] }) { affected_rows }
    insert_workflow_triggers(objects: $triggers, on_conflict: { constraint: workflow_triggers_workflow_id_type_key, update_columns: [enabled, config] }) { affected_rows }
  }
`;

export const TRIGGER_WORKFLOW_RUN = /* GraphQL */ `
  mutation TriggerWorkflowRun($workflowId: uuid!) {
    triggerWorkflowRun(workflow_id: $workflowId) { run_id status }
  }
`;

export const APPROVE_STEP = /* GraphQL */ `
  mutation ApproveStep($runId: uuid!, $stepRunId: uuid!) {
    approveStep(workflow_run_id: $runId, step_run_id: $stepRunId) { run_id status }
  }
`;

export const STEP_RUN_PROGRESS = /* GraphQL */ `
  subscription StepRunProgress($workflowRunId: uuid!) {
    step_runs(where: { workflow_run_id: { _eq: $workflowRunId } }, order_by: { position: asc }) {
      id position status input output error attempt_count approved_by approved_at started_at completed_at
    }
  }
`;
