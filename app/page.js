"use client";

import { useEffect, useRef, useState } from "react";
import {
  BellRing,
  BookOpen,
  Bot,
  Braces,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDotDashed,
  Clock3,
  Code2,
  Copy,
  Database,
  FileText,
  GitBranch,
  Globe2,
  GripVertical,
  HelpCircle,
  KeyRound,
  LayoutTemplate,
  LockKeyhole,
  MoreHorizontal,
  Network,
  PanelRightClose,
  Play,
  Plus,
  RotateCcw,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Trash2,
  UserRoundCheck,
  Users,
  Variable,
  Webhook,
  Workflow,
  X,
  Zap
} from "lucide-react";
import { DEFAULT_WORKFLOW, ORGANIZATIONS, seededPausedRun } from "../lib/seed";

const STORAGE_KEY = "flowpilot.workspace.v1";
const WORKFLOW_ID = "wf_content_research";
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const identities = [
  { id: "usr_owner_a", label: "Asha Patel", caption: "Dev Insights Inc. · Owner", role: "owner" },
  { id: "usr_editor_a", label: "Maya Chen", caption: "Dev Insights Inc. · Editor", role: "editor" },
  { id: "usr_viewer_a", label: "Noah Singh", caption: "Dev Insights Inc. · Viewer", role: "viewer" },
  { id: "usr_owner_b", label: "Jordan Lee", caption: "Other Company Ltd. · Owner", role: "owner" }
];

const navigation = [
  [Workflow, "Workflows"],
  [CircleDotDashed, "Runs"],
  [LayoutTemplate, "Templates"],
  [Bot, "Agents"],
  [Network, "Connections"],
  [Braces, "Variables"],
  [Settings, "Settings"]
];

const stepMeta = {
  llm_call: { icon: Sparkles, accent: "mint", label: "LLM call" },
  http_request: { icon: Globe2, accent: "blue", label: "HTTP request" },
  conditional_branch: { icon: GitBranch, accent: "violet", label: "Conditional branch" },
  approval_gate: { icon: UserRoundCheck, accent: "amber", label: "Approval gate" },
  notify: { icon: BellRing, accent: "green", label: "Notify" },
  db_write: { icon: Database, accent: "rose", label: "Database write" }
};

function createClientSnapshot() {
  return {
    workflow: structuredClone(DEFAULT_WORKFLOW),
    organization: structuredClone(ORGANIZATIONS.find((organization) => organization.id === "org_dev_insights")),
    runs: [seededPausedRun()]
  };
}

function createClientRun(workflow, actorId, triggerType) {
  const now = new Date().toISOString();
  return {
    id: `run_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`,
    workflow_id: workflow.id,
    organization_id: workflow.organization_id,
    initiated_by: actorId,
    trigger_type: triggerType,
    status: "queued",
    created_at: now,
    started_at: now,
    completed_at: null,
    step_runs: workflow.steps.map((step) => ({
      id: `sr_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`,
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
    }))
  };
}

function fallbackLlmResult() {
  return {
    recommendation: "proceed",
    confidence: 0.82,
    summary: "The topic is sufficiently defined for editorial review.",
    provider: "fallback",
    model: "deterministic-fallback",
    fallback: true,
    note: "The secure LLM service was unavailable, so the disclosed demo fallback was used."
  };
}

async function requestLlm(prompt) {
  try {
    const response = await fetch("/api/llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    const payload = await response.json();
    if (!response.ok || !payload.result) throw new Error("LLM request rejected");
    return payload.result;
  } catch {
    return fallbackLlmResult();
  }
}

function roleLabel(role) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function statusLabel(status) {
  if (status === "paused") return "Awaiting approval";
  if (status === "queued") return "Queued";
  if (status === "cancelled") return "Cancelled";
  return status;
}

function time(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", timeZone: "UTC", timeZoneName: "short" }).format(new Date(value));
}

function detailForStep(step) {
  if (step.type === "llm_call") return step.config.model;
  if (step.type === "http_request") return `${step.config.method} ${new URL(step.config.url).host}`;
  if (step.type === "conditional_branch") return step.config.expression;
  if (step.type === "approval_gate") return "Human approval required";
  if (step.type === "notify") return step.config.channel;
  return "Writes an execution artifact";
}

function NodeIcon({ type, size = 20 }) {
  const meta = stepMeta[type] || stepMeta.llm_call;
  const Icon = meta.icon;
  return <span className={`node-icon ${meta.accent}`}><Icon size={size} strokeWidth={1.9} /></span>;
}

function StatusDot({ status }) {
  if (status === "succeeded" || status === "completed") return <span className="status-dot success"><Check size={12} /></span>;
  if (status === "paused") return <span className="status-dot paused"><Clock3 size={12} /></span>;
  if (status === "running") return <span className="status-dot running" />;
  if (status === "failed" || status === "cancelled") return <span className="status-dot failed"><X size={12} /></span>;
  return <span className="status-dot pending"><Clock3 size={12} /></span>;
}

function Sidebar({ activeIdentity, activeSection, onIdentityChange, onNavigate }) {
  return (
    <aside className="sidebar">
      <button className="brand" onClick={() => onNavigate("Workflows")} aria-label="Open workflows"><span className="brand-mark"><Workflow size={27} /></span><span>FlowPilot</span></button>
      <nav className="main-nav" aria-label="Primary navigation">
        {navigation.map(([Icon, label]) => <button className={activeSection === label ? "nav-item active" : "nav-item"} onClick={() => onNavigate(label)} key={label}><Icon size={19} /><span>{label}</span></button>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="nav-divider" />
        <button className={activeSection === "Docs" ? "nav-item active" : "nav-item"} onClick={() => onNavigate("Docs")}><BookOpen size={19} /><span>Docs</span></button>
        <button className={activeSection === "Help" ? "nav-item active" : "nav-item"} onClick={() => onNavigate("Help")}><HelpCircle size={19} /><span>Help</span></button>
        <div className="nav-divider" />
        <label className="identity-switcher">
          <span className="avatar">{activeIdentity.label.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span>
          <span className="identity-copy"><strong>{activeIdentity.label}</strong><small>{roleLabel(activeIdentity.role)}</small></span>
          <ChevronDown size={15} />
          <select value={activeIdentity.id} onChange={(event) => onIdentityChange(event.target.value)} aria-label="Switch demo identity">
            {identities.map((identity) => <option key={identity.id} value={identity.id}>{identity.label} — {identity.caption}</option>)}
          </select>
        </label>
      </div>
    </aside>
  );
}

function QuotaMeter({ organization }) {
  const percentage = Math.round((organization.calls_used / organization.calls_allowed) * 100);
  return <div className="quota-meter"><span>Usage</span><strong>{organization.calls_used} / {organization.calls_allowed} calls</strong><i><b style={{ width: `${percentage}%` }} /></i></div>;
}

function StepNode({ step, index, count, editable, selected, onMove, onAdd, onSelect }) {
  const meta = stepMeta[step.type] || stepMeta.llm_call;
  return (
    <div className="node-wrap">
      <article className={`workflow-node ${meta.accent} ${selected ? "selected" : ""}`} onClick={() => onSelect(step.id)}>
        <div className="node-main">
          {editable && <GripVertical className="drag-grip" size={17} />}
          <NodeIcon type={step.type} />
          <div className="node-copy"><div className="node-title-row"><span className="node-number">{index + 1}</span><strong>{step.name}</strong></div><p>{detailForStep(step)}</p></div>
        </div>
        <div className="node-controls" onClick={(event) => event.stopPropagation()}>
          {editable && index > 0 && <button title="Move up" className="icon-button tiny" onClick={() => onMove(index, -1)}>↑</button>}
          {editable && index < count - 1 && <button title="Move down" className="icon-button tiny" onClick={() => onMove(index, 1)}>↓</button>}
          <button title="Inspect step" className="icon-button tiny" onClick={() => onSelect(step.id)}><MoreHorizontal size={18} /></button>
        </div>
      </article>
      <div className="connector"><span /><button onClick={onAdd} disabled={!editable} className="add-between" title="Add a step"><Plus size={16} /></button><span /></div>
    </div>
  );
}

function AddStepMenu({ onSelect, onClose, owner }) {
  const choices = ["llm_call", "http_request", "conditional_branch", "approval_gate", "notify", "db_write"];
  return <div className="add-menu"><div className="add-menu-head"><strong>Add a step</strong><button className="icon-button" onClick={onClose}><X size={15} /></button></div>{choices.map((type) => {
    const meta = stepMeta[type];
    const restricted = ["notify", "db_write"].includes(type) && !owner;
    return <button key={type} onClick={() => onSelect(type)} disabled={restricted}><NodeIcon type={type} size={17} /><span>{meta.label}</span>{restricted && <LockKeyhole size={13} />}</button>;
  })}<p>Owner-only: notify, database write, and webhook triggers.</p></div>;
}

function RunPanel({ run, actor, panelTab, selectedStep, busy, onTab, onApprove, onCancel, onClose, onCopyRunId, onDeleteStep, editable }) {
  const canApprove = ["owner", "editor"].includes(actor.role);
  const logs = run ? [
    { label: `Run ${run.status}`, time: run.created_at, type: "run" },
    ...run.step_runs.filter((stepRun) => stepRun.started_at).map((stepRun) => ({ label: `${stepRun.name} ${stepRun.status}`, time: stepRun.completed_at || stepRun.started_at, type: stepRun.status }))
  ] : [];
  return <aside className="run-panel">
    <div className="panel-heading"><h2>{panelTab === "details" ? "Step details" : "Execution"}</h2><button className="icon-button" onClick={onClose} title="Close panel"><PanelRightClose size={19} /></button></div>
    {!run ? <div className="empty-run"><CircleDotDashed size={25} /><p>Select or start a run to see live execution.</p></div> : <>
      <dl className="run-meta"><div><dt>Run ID</dt><dd>{run.id}<button className="copy-button" onClick={onCopyRunId} title="Copy run ID"><Copy size={14} /></button></dd></div><div><dt>Started</dt><dd>{time(run.started_at || run.created_at)}</dd></div><div><dt>Status</dt><dd><span className={`run-state ${run.status}`}><StatusDot status={run.status} />{statusLabel(run.status)}</span></dd></div></dl>
      <div className="panel-tabs"><button className={panelTab === "steps" ? "selected" : ""} onClick={() => onTab("steps")}>Steps</button><button className={panelTab === "logs" ? "selected" : ""} onClick={() => onTab("logs")}>Logs</button><button className={panelTab === "details" ? "selected" : ""} onClick={() => onTab("details")}>Details</button></div>
      {panelTab === "logs" && <div className="run-logs">{logs.map((log, index) => <div className="log-line" key={`${log.label}-${index}`}><StatusDot status={log.type} /><div><strong>{log.label}</strong><small>{time(log.time)}</small></div></div>)}</div>}
      {panelTab === "details" && <StepDetails step={selectedStep} editable={editable} onDelete={onDeleteStep} onBack={() => onTab("steps")} />}
      {panelTab === "steps" && <div className="run-steps">{run.step_runs.map((stepRun) => <article className={`run-step ${stepRun.status}`} key={stepRun.id}><div className="run-step-top"><StatusDot status={stepRun.status} /><span className="run-step-number">{stepRun.position}</span><div><strong>{stepRun.name}</strong><p>{stepRun.status === "paused" ? "Awaiting approval" : `${statusLabel(stepRun.status)}${stepRun.completed_at ? ` · ${time(stepRun.completed_at)}` : ""}`}</p></div><ChevronRight size={17} /></div>{stepRun.status === "succeeded" && stepRun.type === "llm_call" && <div className="output-box"><span>Decision:</span> <b>{stepRun.output?.recommendation || "proceed"}</b><small>{stepRun.output?.summary} · {stepRun.output?.model}</small></div>}{stepRun.status === "succeeded" && stepRun.type === "conditional_branch" && <div className="output-box"><span>Path taken:</span> <b>{stepRun.output?.branch || "true"}</b></div>}{stepRun.status === "paused" && <div className="approval-box"><p><span>Requested by</span> system</p><p><span>Reason</span> {stepRun.input?.reason}</p>{canApprove ? <button onClick={() => onApprove(run.id, stepRun.id)} disabled={busy} className="approve-button"><ShieldCheck size={15} />{busy ? "Approving…" : "Review & approve"}</button> : <div className="blocked-approval"><LockKeyhole size={14} /> Viewer cannot approve</div>}</div>}</article>)}</div>}
      {run.status !== "completed" && run.status !== "cancelled" && <button className="cancel-run" onClick={() => onCancel(run.id)}><X size={16} /> Cancel run</button>}
    </>}
  </aside>;
}

function StepDetails({ step, editable, onDelete, onBack }) {
  if (!step) return <div className="empty-run"><FileText size={25} /><p>Select a workflow node to inspect its configuration.</p></div>;
  return <div className="step-details"><NodeIcon type={step.type} size={22} /><h3>{step.name}</h3><p>{stepMeta[step.type]?.label}</p><dl>{Object.entries(step.config || {}).map(([key, value]) => <div key={key}><dt>{key.replaceAll("_", " ")}</dt><dd>{String(value)}</dd></div>)}</dl><button className="text-button" onClick={onBack}>Back to execution</button>{editable && <button className="danger-button" onClick={() => onDelete(step.id)}><Trash2 size={15} /> Remove step</button>}</div>;
}

function UtilityPage({ section, snapshot, variables, onNavigate, onSelectRun, onAddVariable, onTestConnection, connectionTested }) {
  const title = section === "Docs" ? "Documentation" : section === "Help" ? "Help center" : section;
  if (section === "Runs") return <section className="utility-page"><div className="page-heading"><div><p className="eyebrow">Execution history</p><h1>Runs</h1><span>Inspect every manual and webhook workflow run.</span></div><button className="primary-button" onClick={() => onNavigate("Workflows")}><Play size={16} /> Run workflow</button></div><div className="data-card"><div className="data-table-head"><span>Run</span><span>Trigger</span><span>Status</span><span>Started</span></div>{snapshot.runs.map((run) => <button className="data-row" onClick={() => onSelectRun(run.id)} key={run.id}><span>{run.id}</span><span>{run.trigger_type}</span><span className={`status-pill ${run.status}`}><StatusDot status={run.status} />{statusLabel(run.status)}</span><span>{time(run.created_at)}</span></button>)}</div></section>;
  if (section === "Templates") return <section className="utility-page"><div className="page-heading"><div><p className="eyebrow">Reusable automation</p><h1>Templates</h1><span>Start quickly with a tested workflow layout.</span></div></div><div className="template-grid"><article><Sparkles /><h3>Content research</h3><p>Research, quality-check, approve, and notify an editorial team.</p><button className="primary-button" onClick={() => onNavigate("Workflows")}>Use template <ChevronRight size={15} /></button></article><article><Webhook /><h3>Webhook triage</h3><p>Validate inbound data, enrich it, then route it to the right team.</p><button className="soft-button" onClick={() => onNavigate("Workflows")}>Open builder</button></article></div></section>;
  if (section === "Agents") return <section className="utility-page"><div className="page-heading"><div><p className="eyebrow">AI workers</p><h1>Agents</h1><span>Agent capabilities used by your workflows.</span></div></div><div className="agent-card"><div className="agent-avatar"><Bot size={23} /></div><div><h3>Research assessor</h3><p>Uses the secure OpenAI workflow node to return a decision, confidence, and concise summary.</p></div><span className="status-pill completed"><Check size={13} /> Ready</span></div></section>;
  if (section === "Connections") return <section className="utility-page"><div className="page-heading"><div><p className="eyebrow">Integrations</p><h1>Connections</h1><span>Verify the services your workflow can call.</span></div></div><div className="connection-card"><div><Globe2 size={22} /><h3>GitHub Zen</h3><p>Public HTTP request used by the example workflow.</p></div><button className="soft-button" onClick={onTestConnection}>{connectionTested ? <><Check size={16} /> Connected</> : "Test connection"}</button></div></section>;
  if (section === "Variables") return <section className="utility-page"><div className="page-heading"><div><p className="eyebrow">Workflow configuration</p><h1>Variables</h1><span>Reusable values available to every step.</span></div><button className="primary-button" onClick={onAddVariable}><Plus size={16} /> Add variable</button></div><div className="data-card"><div className="data-table-head"><span>Name</span><span>Value</span><span>Scope</span><span /></div>{variables.map((item) => <div className="data-row static" key={item.id}><span>{item.name}</span><span>{item.value}</span><span>Workflow</span><span><KeyRound size={15} /></span></div>)}</div></section>;
  if (section === "Settings") return <section className="utility-page"><div className="page-heading"><div><p className="eyebrow">Organization</p><h1>Settings</h1><span>Workspace defaults, retention, and quota controls.</span></div></div><div className="settings-card"><h3>Execution defaults</h3><label><span>Retain run history</span><input type="checkbox" defaultChecked /></label><label><span>Pause on approval gates</span><input type="checkbox" defaultChecked /></label><p>All workflow actions are scoped to the selected organization.</p></div></section>;
  if (section === "Docs") return <section className="utility-page"><div className="page-heading"><div><p className="eyebrow">FlowPilot guide</p><h1>{title}</h1><span>Build, run, approve, and inspect workflows.</span></div></div><div className="guide-card"><h3>Quick start</h3><ol><li>Edit the workflow to arrange steps or add new actions.</li><li>Run it manually or trigger the configured webhook.</li><li>Review the approval gate, then inspect steps and logs in Execution.</li></ol></div></section>;
  return <section className="utility-page"><div className="page-heading"><div><p className="eyebrow">Need a hand?</p><h1>{title}</h1><span>Everything is available directly in the workspace.</span></div></div><div className="guide-card"><h3>Helpful actions</h3><p>Use Reset demo to restore the starting workflow, or switch roles to verify owner, editor, viewer, and organization boundaries.</p><button className="primary-button" onClick={() => onNavigate("Workflows")}>Open workflow</button></div></section>;
}

export default function FlowPilot() {
  const [snapshot, setSnapshot] = useState(createClientSnapshot);
  const [variables, setVariables] = useState([{ id: "topic", name: "research_topic", value: "AI agent workflows" }]);
  const [actorId, setActorId] = useState(identities[0].id);
  const [activeSection, setActiveSection] = useState("Workflows");
  const [workspaceTab, setWorkspaceTab] = useState("Builder");
  const [panelTab, setPanelTab] = useState("steps");
  const [activeRunId, setActiveRunId] = useState("run_demo_paused");
  const [selectedStepId, setSelectedStepId] = useState("step_llm");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [canvasLocked, setCanvasLocked] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [connectionTested, setConnectionTested] = useState(false);
  const [notice, setNotice] = useState("Ready. Your workspace is saved automatically in this browser.");
  const [storageReady, setStorageReady] = useState(false);
  const cancelledRuns = useRef(new Set());

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.snapshot?.workflow && Array.isArray(parsed.snapshot?.runs)) setSnapshot(parsed.snapshot);
        if (Array.isArray(parsed.variables)) setVariables(parsed.variables);
        if (identities.some((identity) => identity.id === parsed.actorId)) setActorId(parsed.actorId);
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setStorageReady(true);
    }
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ snapshot, variables, actorId }));
  }, [actorId, snapshot, storageReady, variables]);

  const actor = identities.find((identity) => identity.id === actorId) || identities[0];
  const activeRun = snapshot.runs.find((run) => run.id === activeRunId) || snapshot.runs[0];
  const selectedStep = snapshot.workflow.steps.find((step) => step.id === selectedStepId) || null;
  const canEdit = ["owner", "editor"].includes(actor.role);
  const editable = canEdit && editing && !canvasLocked;

  function updateRun(runId, updater) {
    setSnapshot((current) => {
      const next = structuredClone(current);
      const run = next.runs.find((entry) => entry.id === runId);
      if (run) updater(run, next);
      return next;
    });
  }

  function updateWorkflow(updater) {
    setSnapshot((current) => {
      const next = structuredClone(current);
      updater(next.workflow, next);
      return next;
    });
  }

  async function executeRun(runId, workflow, afterPosition = 0) {
    const remainingSteps = workflow.steps.filter((step) => step.position > afterPosition).sort((first, second) => first.position - second.position);
    for (const step of remainingSteps) {
      if (cancelledRuns.current.has(runId)) return;
      if (step.type === "approval_gate") {
        updateRun(runId, (run) => {
          const stepRun = run.step_runs.find((entry) => entry.workflow_step_id === step.id);
          if (!stepRun) return;
          stepRun.status = "paused";
          stepRun.attempt_count = 1;
          stepRun.input = { reason: step.config.reason, required_role: step.config.required_role };
          stepRun.started_at = new Date().toISOString();
          run.status = "paused";
        });
        setNotice("Run paused at Editorial approval. An owner or editor can continue it.");
        return;
      }
      updateRun(runId, (run) => {
        const stepRun = run.step_runs.find((entry) => entry.workflow_step_id === step.id);
        if (!stepRun) return;
        run.status = "running";
        stepRun.status = "running";
        stepRun.attempt_count = step.type === "http_request" ? 2 : 1;
        stepRun.input = step.type === "llm_call" ? { prompt: step.config.prompt } : step.type === "http_request" ? { method: step.config.method, url: step.config.url } : { expression: step.config.expression || step.config.message || step.config.channel };
        stepRun.started_at = new Date().toISOString();
      });
      const llmResult = step.type === "llm_call" ? await requestLlm(step.config.prompt) : null;
      if (step.type !== "llm_call") await wait(step.type === "http_request" ? 550 : step.type === "notify" ? 300 : 180);
      if (cancelledRuns.current.has(runId)) return;
      updateRun(runId, (run) => {
        const stepRun = run.step_runs.find((entry) => entry.workflow_step_id === step.id);
        if (!stepRun) return;
        stepRun.status = "succeeded";
        stepRun.completed_at = new Date().toISOString();
        if (step.type === "llm_call") stepRun.output = llmResult || fallbackLlmResult();
        if (step.type === "http_request") stepRun.output = { source: "GitHub Zen", status_code: 200, response: "Keep it logically awesome.", retried_once: true };
        if (step.type === "conditional_branch") {
          const previous = run.step_runs.find((entry) => entry.workflow_step_id === "step_llm")?.output;
          stepRun.output = { branch: (previous?.confidence ?? 0) >= 0.7 ? "true" : "false", expression: step.config.expression };
        }
        if (step.type === "notify") stepRun.output = { delivered: true, channel: step.config.channel, provider: "event-trigger demo" };
        if (step.type === "db_write") stepRun.output = { written: true, table: "workflow_artifacts" };
      });
    }
    if (cancelledRuns.current.has(runId)) return;
    updateRun(runId, (run, next) => {
      run.status = "completed";
      run.completed_at = new Date().toISOString();
      next.organization.calls_used += 1;
    });
    setNotice("Workflow completed successfully. Usage quota was updated.");
  }

  async function launchRun(triggerType) {
    if (busy || !canEdit || forbidden || !snapshot.workflow.is_active) return;
    if (snapshot.organization.calls_used >= snapshot.organization.calls_allowed) {
      setNotice("This organization has exhausted its workflow call quota.");
      return;
    }
    const workflow = structuredClone(snapshot.workflow);
    const run = createClientRun(workflow, actor.id, triggerType);
    setBusy(true);
    setPanelOpen(true);
    setPanelTab("steps");
    setSnapshot((current) => ({ ...current, runs: [run, ...current.runs] }));
    setActiveRunId(run.id);
    setNotice(`${triggerType === "webhook" ? "Webhook" : "Manual"} run started. Steps are progressing live.`);
    await executeRun(run.id, workflow);
    setBusy(false);
  }

  async function approveRun(runId, stepRunId) {
    if (busy || !canEdit || forbidden) return;
    const workflow = structuredClone(snapshot.workflow);
    const approval = activeRun?.step_runs.find((stepRun) => stepRun.id === stepRunId);
    if (!approval) return;
    setBusy(true);
    updateRun(runId, (run) => {
      const stepRun = run.step_runs.find((entry) => entry.id === stepRunId);
      if (!stepRun) return;
      stepRun.status = "succeeded";
      stepRun.output = { approved: true };
      stepRun.approved_by = actor.id;
      stepRun.approved_at = new Date().toISOString();
      stepRun.completed_at = stepRun.approved_at;
      run.status = "running";
    });
    setNotice("Approval accepted. Resuming the next queued step now.");
    await executeRun(runId, workflow, approval.position);
    setBusy(false);
  }

  function cancelRun(runId) {
    cancelledRuns.current.add(runId);
    updateRun(runId, (run) => {
      run.status = "cancelled";
      run.completed_at = new Date().toISOString();
      const currentStep = run.step_runs.find((stepRun) => stepRun.status === "running");
      if (currentStep) {
        currentStep.status = "cancelled";
        currentStep.completed_at = run.completed_at;
      }
    });
    setBusy(false);
    setNotice("Run cancelled. Its completed steps remain in the execution history.");
  }

  function resetDemo() {
    cancelledRuns.current.clear();
    setSnapshot(createClientSnapshot());
    setVariables([{ id: "topic", name: "research_topic", value: "AI agent workflows" }]);
    setActiveRunId("run_demo_paused");
    setSelectedStepId("step_llm");
    setBusy(false);
    setEditing(false);
    setCanvasLocked(false);
    setNotice("Workspace reset to the paused approval scenario.");
  }

  function saveDraft() {
    setEditing(false);
    setWorkspaceMenuOpen(false);
    setNotice("Workflow saved. Your changes persist in this browser and are ready to run.");
  }

  function moveStep(index, direction) {
    if (!editable) return;
    const steps = [...snapshot.workflow.steps];
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    [steps[index], steps[target]] = [steps[target], steps[index]];
    updateWorkflow((workflow) => { workflow.steps = steps.map((step, position) => ({ ...step, position: position + 1 })); });
    setNotice("Step order updated.");
  }

  function addStep(type) {
    if (!editable) return;
    const meta = stepMeta[type];
    const step = {
      id: `step_${Date.now()}`,
      position: snapshot.workflow.steps.length + 1,
      type,
      name: meta.label.replace(/\b\w/g, (letter) => letter.toUpperCase()),
      config: type === "llm_call" ? { prompt: "Draft a response", model: "OpenAI Responses (secure server call)" } : type === "http_request" ? { method: "GET", url: "https://api.github.com/zen" } : type === "conditional_branch" ? { expression: "previous.confidence >= 0.7" } : type === "approval_gate" ? { required_role: "editor", reason: "A teammate must review this output." } : type === "notify" ? { channel: "#research-updates", message: "Workflow completed" } : { table: "workflow_artifacts" }
    };
    updateWorkflow((workflow) => { workflow.steps.push(step); });
    setSelectedStepId(step.id);
    setPanelOpen(true);
    setPanelTab("details");
    setAddMenuOpen(false);
    setNotice(`${meta.label} added to the workflow.`);
  }

  function deleteStep(stepId) {
    if (!editable || snapshot.workflow.steps.length <= 1) return;
    updateWorkflow((workflow) => { workflow.steps = workflow.steps.filter((step) => step.id !== stepId).map((step, index) => ({ ...step, position: index + 1 })); });
    setSelectedStepId(snapshot.workflow.steps.find((step) => step.id !== stepId)?.id || null);
    setPanelTab("steps");
    setNotice("Step removed from the workflow.");
  }

  function selectStep(stepId) {
    setSelectedStepId(stepId);
    setPanelOpen(true);
    setPanelTab("details");
  }

  function selectIdentity(nextActorId) {
    const nextActor = identities.find((identity) => identity.id === nextActorId) || identities[0];
    const crossOrg = nextActor.id === "usr_owner_b";
    setActorId(nextActorId);
    setForbidden(crossOrg);
    setEditing(false);
    setAddMenuOpen(false);
    setNotice(crossOrg ? "Cross-org request blocked: this user cannot discover Org A’s workflow by ID." : `Switched to ${nextActor.label} (${roleLabel(nextActor.role)}).`);
  }

  function copyRunId() {
    if (!activeRun) return;
    void navigator.clipboard?.writeText(activeRun.id);
    setNotice("Run ID copied to your clipboard.");
  }

  function addVariable() {
    const id = `variable_${Date.now()}`;
    setVariables((current) => [...current, { id, name: `new_variable_${current.length + 1}`, value: "Set a value" }]);
    setNotice("Variable added. Select it from the Variables workspace to review it.");
  }

  function setWorkflowActive(isActive) {
    updateWorkflow((workflow) => { workflow.is_active = isActive; });
    setNotice(isActive ? "Workflow activated." : "Workflow paused. New runs are disabled.");
  }

  if (forbidden) return <main className="app-shell"><Sidebar activeIdentity={actor} activeSection={activeSection} onIdentityChange={selectIdentity} onNavigate={setActiveSection} /><section className="workspace-shell"><div className="notice-bar"><span className="notice-icon blocked"><LockKeyhole size={14} /></span><span>{notice}</span><button onClick={resetDemo} className="reset-link"><RotateCcw size={13} /> Reset demo</button></div><section className="access-denied"><div className="denied-icon"><LockKeyhole size={27} /></div><h1>Organization boundary enforced</h1><p><strong>{actor.label}</strong> belongs to Other Company Ltd. This workspace is unavailable because workflow and run data are scoped to Dev Insights Inc.</p><div><span><Check size={15} /> Query denied</span><span><Check size={15} /> Trigger denied</span><span><Check size={15} /> Approval denied</span></div><button onClick={() => selectIdentity("usr_owner_a")} className="primary-recover">Return as Org A owner</button></section></section></main>;

  if (activeSection !== "Workflows") return <main className="app-shell"><Sidebar activeIdentity={actor} activeSection={activeSection} onIdentityChange={selectIdentity} onNavigate={setActiveSection} /><section className="workspace-shell"><header className="topbar"><div className="org-switch"><Users size={18} /><strong>{snapshot.organization.name}</strong><ChevronDown size={16} /></div><div className="topbar-actions"><QuotaMeter organization={snapshot.organization} /><button className="run-button" onClick={() => { setActiveSection("Workflows"); void launchRun("manual"); }} disabled={!canEdit}><Play size={17} fill="currentColor" /> Run workflow</button></div></header><div className="notice-bar"><span className="notice-icon"><ShieldCheck size={14} /></span><span>{notice}</span><button onClick={resetDemo} className="reset-link"><RotateCcw size={13} /> Reset demo</button></div><UtilityPage section={activeSection} snapshot={snapshot} variables={variables} onNavigate={setActiveSection} onSelectRun={(runId) => { setActiveRunId(runId); setActiveSection("Workflows"); setPanelOpen(true); }} onAddVariable={addVariable} onTestConnection={() => { setConnectionTested(true); setNotice("GitHub Zen connection verified."); }} connectionTested={connectionTested} /></section></main>;

  return <main className="app-shell">
    <Sidebar activeIdentity={actor} activeSection={activeSection} onIdentityChange={selectIdentity} onNavigate={setActiveSection} />
    <section className="workspace-shell">
      <header className="topbar"><div className="org-switch"><Users size={18} /><strong>{snapshot.organization.name}</strong><ChevronDown size={16} /></div><div className="topbar-actions"><QuotaMeter organization={snapshot.organization} /><button className="run-button" onClick={() => void launchRun("manual")} disabled={busy || !canEdit || !snapshot.workflow.is_active}><Play size={17} fill="currentColor" /> Run workflow</button><button className="run-caret" disabled={busy || !canEdit || !snapshot.workflow.is_active} onClick={() => void launchRun("webhook")} title="Trigger webhook run"><ChevronDown size={17} /></button></div></header>
      <div className="notice-bar"><span className="notice-icon"><ShieldCheck size={14} /></span><span>{notice}</span><button onClick={resetDemo} className="reset-link"><RotateCcw size={13} /> Reset demo</button></div>
      <section className="workflow-header"><div><div className="title-line">{editing ? <input className="title-input" value={snapshot.workflow.name} onChange={(event) => updateWorkflow((workflow) => { workflow.name = event.target.value; })} aria-label="Workflow name" /> : <h1>{snapshot.workflow.name}</h1>}<button className="edit-title" onClick={() => setEditing(true)} disabled={!canEdit} title="Edit workflow title"><FileText size={15} /></button></div><div className="workspace-tabs">{["Builder", "Settings", "Variables", "History"].map((tab) => <button className={workspaceTab === tab ? "selected" : ""} onClick={() => setWorkspaceTab(tab)} key={tab}>{tab}</button>)}</div></div><div className="workflow-actions"><button className={editing ? "soft-button selected" : "soft-button"} onClick={() => setEditing(!editing)} disabled={!canEdit}>{editing ? "Finish editing" : "Edit workflow"}</button><button className="soft-button" onClick={saveDraft} disabled={!canEdit}><Save size={16} /> Save</button><button className="icon-button bordered" onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)} title="Workflow options"><MoreHorizontal size={19} /></button>{workspaceMenuOpen && <div className="workspace-menu"><button onClick={() => { setWorkspaceTab("Settings"); setWorkspaceMenuOpen(false); }}>Workflow settings</button><button onClick={() => { setActiveSection("Templates"); setWorkspaceMenuOpen(false); }}>Save as template</button><button onClick={resetDemo}>Reset workflow</button></div>}</div></section>
      {workspaceTab === "Builder" && <section className={`builder-layout ${panelOpen ? "" : "panel-closed"}`}><div className="canvas-region"><div className="canvas-toolbar"><button className="canvas-tool active" onClick={() => { setEditing(true); setAddMenuOpen(true); }} title="Add step"><Plus size={17} /></button><button className="canvas-tool" onClick={() => { setZoom(Math.min(1.2, zoom + .1)); setNotice("Canvas zoomed in."); }} title="Zoom in"><span>+</span></button><button className="canvas-tool" onClick={() => { setZoom(Math.max(.8, zoom - .1)); setNotice("Canvas zoomed out."); }} title="Zoom out"><span>−</span></button><button className="canvas-tool" onClick={() => { updateWorkflow((workflow) => { workflow.steps.sort((a, b) => a.position - b.position); }); setZoom(1); setNotice("Workflow layout aligned."); }} title="Auto-layout"><span>⌁</span></button><button className={canvasLocked ? "canvas-tool active" : "canvas-tool"} onClick={() => { setCanvasLocked(!canvasLocked); setNotice(canvasLocked ? "Canvas unlocked." : "Canvas locked. Editing controls are disabled."); }} title="Lock canvas"><LockKeyhole size={15} /></button></div>{addMenuOpen && <AddStepMenu owner={actor.role === "owner"} onClose={() => setAddMenuOpen(false)} onSelect={addStep} />}<div className="flow-canvas"><div className="nodes-column" style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}>{snapshot.workflow.steps.map((step, index) => <StepNode key={step.id} step={step} index={index} count={snapshot.workflow.steps.length} editable={editable} selected={step.id === selectedStepId} onMove={moveStep} onAdd={() => { if (editable) setAddMenuOpen(true); }} onSelect={selectStep} />)}<button className="end-add" onClick={() => { setEditing(true); setAddMenuOpen(true); }} disabled={!canEdit || canvasLocked}><Plus size={17} /> Add step</button></div></div><button className="minimap" onClick={() => { setZoom(1); setNotice("Canvas fit to workflow."); }} title="Fit workflow"><div className="mini-node one" /><div className="mini-node two" /><div className="mini-node three" /><div className="mini-node four" /><div className="mini-frame" /></button></div>{panelOpen ? <RunPanel run={activeRun} actor={actor} panelTab={panelTab} selectedStep={selectedStep} busy={busy} editable={editable} onTab={setPanelTab} onApprove={approveRun} onCancel={cancelRun} onClose={() => setPanelOpen(false)} onCopyRunId={copyRunId} onDelete={deleteStep} /> : <button className="open-panel" onClick={() => setPanelOpen(true)}><TerminalSquare size={18} /> Open execution</button>}</section>}
      {workspaceTab === "Settings" && <section className="workspace-content"><div className="settings-card"><div><p className="eyebrow">Workflow status</p><h2>Execution settings</h2></div><label className="toggle-row"><span><strong>Workflow active</strong><small>Allow new manual and webhook runs.</small></span><input type="checkbox" checked={snapshot.workflow.is_active} onChange={(event) => setWorkflowActive(event.target.checked)} disabled={!canEdit} /></label><label className="form-label">Webhook endpoint<input readOnly value={`/api/webhook/${snapshot.workflow.triggers.find((trigger) => trigger.type === "webhook")?.slug || "workflow"}`} /></label><button className="primary-button" onClick={saveDraft} disabled={!canEdit}>Save settings</button></div></section>}
      {workspaceTab === "Variables" && <section className="workspace-content"><div className="page-heading compact"><div><p className="eyebrow">Workflow configuration</p><h2>Variables</h2></div><button className="primary-button" onClick={addVariable} disabled={!canEdit}><Plus size={16} /> Add variable</button></div><div className="data-card">{variables.map((item) => <div className="data-row static" key={item.id}><span>{item.name}</span><span>{item.value}</span><span>Workflow</span><Variable size={15} /></div>)}</div></section>}
      {workspaceTab === "History" && <section className="workspace-content"><div className="page-heading compact"><div><p className="eyebrow">Execution history</p><h2>Recent runs</h2></div><button className="soft-button" onClick={() => { setPanelOpen(true); setPanelTab("logs"); }}>Open logs</button></div><div className="data-card"><div className="data-table-head"><span>Run</span><span>Trigger</span><span>Status</span><span>Started</span></div>{snapshot.runs.map((run) => <button className="data-row" onClick={() => { setActiveRunId(run.id); setPanelOpen(true); setPanelTab("steps"); setWorkspaceTab("Builder"); }} key={run.id}><span>{run.id}</span><span>{run.trigger_type}</span><span className={`status-pill ${run.status}`}><StatusDot status={run.status} />{statusLabel(run.status)}</span><span>{time(run.created_at)}</span></button>)}</div></section>}
      <section className="workflow-footer"><div><Webhook size={16} /><strong>Webhook trigger:</strong> POST <code>/api/webhook/content-research</code> with <code>x-webhook-secret</code></div><button onClick={() => void launchRun("webhook")} disabled={busy || !canEdit || !snapshot.workflow.is_active}>Test webhook trigger <ChevronRight size={15} /></button></section>
    </section>
  </main>;
}
