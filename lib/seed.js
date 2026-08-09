export const DEMO_USERS = {
  ownerA: {
    id: "usr_owner_a",
    displayName: "Asha Patel",
    email: "asha@devinsights.example",
    orgId: "org_dev_insights",
    role: "owner"
  },
  editorA: {
    id: "usr_editor_a",
    displayName: "Maya Chen",
    email: "maya@devinsights.example",
    orgId: "org_dev_insights",
    role: "editor"
  },
  viewerA: {
    id: "usr_viewer_a",
    displayName: "Noah Singh",
    email: "noah@devinsights.example",
    orgId: "org_dev_insights",
    role: "viewer"
  },
  ownerB: {
    id: "usr_owner_b",
    displayName: "Jordan Lee",
    email: "jordan@otherco.example",
    orgId: "org_other_company",
    role: "owner"
  }
};

export const DEFAULT_WORKFLOW = {
  id: "wf_content_research",
  organization_id: "org_dev_insights",
  name: "Content Research Pipeline",
  description: "Research a topic, validate it, request approval, then notify the editorial team.",
  is_active: true,
  steps: [
    {
      id: "step_llm",
      position: 1,
      type: "llm_call",
      name: "LLM prompt",
      config: {
        prompt: "Assess whether the research topic is ready for editorial review. Return a recommendation and confidence.",
        model: "stubbed-llm (450ms intentional demo delay)"
      }
    },
    {
      id: "step_http",
      position: 2,
      type: "http_request",
      name: "HTTP research request",
      config: { method: "GET", url: "https://api.github.com/zen", retries: 1 }
    },
    {
      id: "step_branch",
      position: 3,
      type: "conditional_branch",
      name: "Quality check",
      config: { expression: "previous.confidence >= 0.7", true_label: "Review", false_label: "Stop" }
    },
    {
      id: "step_approval",
      position: 4,
      type: "approval_gate",
      name: "Editorial approval",
      config: { required_role: "editor", reason: "Research recommendation is ready for editorial review." }
    },
    {
      id: "step_notify",
      position: 5,
      type: "notify",
      name: "Notify editorial channel",
      config: { channel: "#research-updates", message: "Research pipeline completed" }
    }
  ],
  triggers: [
    { id: "trigger_manual", type: "manual", label: "Manual run", enabled: true },
    {
      id: "trigger_webhook",
      type: "webhook",
      label: "Inbound webhook",
      slug: "content-research",
      enabled: true,
      secret_hint: "demo-webhook-key"
    }
  ]
};

export const ORGANIZATIONS = [
  { id: "org_dev_insights", name: "Dev Insights Inc.", calls_used: 82, calls_allowed: 200 },
  { id: "org_other_company", name: "Other Company Ltd.", calls_used: 12, calls_allowed: 50 }
];

export function seededPausedRun() {
  // Keep the server-rendered and browser-hydrated initial state byte-for-byte stable.
  // Live runs receive fresh timestamps from the client execution engine.
  const reference = new Date("2026-08-09T10:00:00.000Z").getTime();
  const timestamp = (milliseconds) => new Date(reference + milliseconds).toISOString();
  return {
    id: "run_demo_paused",
    workflow_id: DEFAULT_WORKFLOW.id,
    organization_id: DEFAULT_WORKFLOW.organization_id,
    initiated_by: DEMO_USERS.ownerA.id,
    trigger_type: "manual",
    status: "paused",
    created_at: timestamp(-72_000),
    started_at: timestamp(-70_000),
    completed_at: null,
    step_runs: [
      {
        id: "sr_demo_1",
        workflow_step_id: "step_llm",
        position: 1,
        type: "llm_call",
        name: "LLM prompt",
        status: "succeeded",
        attempt_count: 1,
        input: { prompt: DEFAULT_WORKFLOW.steps[0].config.prompt },
        output: { recommendation: "proceed", confidence: 0.82, model: "stubbed-llm" },
        error: null,
        started_at: timestamp(-69_000),
        completed_at: timestamp(-68_400)
      },
      {
        id: "sr_demo_2",
        workflow_step_id: "step_http",
        position: 2,
        type: "http_request",
        name: "HTTP research request",
        status: "succeeded",
        attempt_count: 1,
        input: { url: DEFAULT_WORKFLOW.steps[1].config.url, method: "GET" },
        output: { source: "GitHub Zen", response: "Keep it logically awesome." },
        error: null,
        started_at: timestamp(-68_000),
        completed_at: timestamp(-67_400)
      },
      {
        id: "sr_demo_3",
        workflow_step_id: "step_branch",
        position: 3,
        type: "conditional_branch",
        name: "Quality check",
        status: "succeeded",
        attempt_count: 1,
        input: { confidence: 0.82 },
        output: { branch: "true", expression: "previous.confidence >= 0.7" },
        error: null,
        started_at: timestamp(-67_000),
        completed_at: timestamp(-66_800)
      },
      {
        id: "sr_demo_4",
        workflow_step_id: "step_approval",
        position: 4,
        type: "approval_gate",
        name: "Editorial approval",
        status: "paused",
        attempt_count: 1,
        input: { reason: DEFAULT_WORKFLOW.steps[3].config.reason },
        output: null,
        error: null,
        approved_by: null,
        approved_at: null,
        started_at: timestamp(-66_500),
        completed_at: null
      },
      {
        id: "sr_demo_5",
        workflow_step_id: "step_notify",
        position: 5,
        type: "notify",
        name: "Notify editorial channel",
        status: "pending",
        attempt_count: 0,
        input: null,
        output: null,
        error: null,
        started_at: null,
        completed_at: null
      }
    ]
  };
}
