"use client";

import { useState } from "react";
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
  Database,
  FileText,
  GitBranch,
  Globe2,
  GripVertical,
  HelpCircle,
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
  UserRoundCheck,
  Users,
  Webhook,
  Workflow,
  X
} from "lucide-react";
import { DEFAULT_WORKFLOW, ORGANIZATIONS, seededPausedRun } from "../lib/seed";

const WORKFLOW_ID = "wf_content_research";

const identities = [
  { id: "usr_owner_a", label: "Asha Patel", caption: "Dev Insights Inc. · Owner", role: "owner" },
  { id: "usr_editor_a", label: "Maya Chen", caption: "Dev Insights Inc. · Editor", role: "editor" },
  { id: "usr_viewer_a", label: "Noah Singh", caption: "Dev Insights Inc. · Viewer", role: "viewer" },
  { id: "usr_owner_b", label: "Jordan Lee", caption: "Other Company Ltd. · Owner", role: "owner" }
];

const navigation = [
  [Workflow, "Workflows", true],
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

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

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
  return status === "paused" ? "Awaiting approval" : status === "queued" ? "Queued" : status;
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
  if (status === "failed") return <span className="status-dot failed"><X size={12} /></span>;
  return <span className="status-dot pending"><Clock3 size={12} /></span>;
}

function StepNode({ step, index, editable, onMove, onAdd }) {
  const meta = stepMeta[step.type] || stepMeta.llm_call;
  return (
    <div className="node-wrap">
      <article className={`workflow-node ${meta.accent}`}>
        <div className="node-main">
          {editable && <GripVertical className="drag-grip" size={17} />}
          <NodeIcon type={step.type} />
          <div className="node-copy">
            <div className="node-title-row"><span className="node-number">{index + 1}</span><strong>{step.name}</strong></div>
            <p>{detailForStep(step)}</p>
          </div>
        </div>
        <div className="node-controls">
          {editable && index > 0 && <button title="Move up" className="icon-button tiny" onClick={() => onMove(index, -1)}>↑</button>}
          {editable && index < 99 && <button title="Move down" className="icon-button tiny" onClick={() => onMove(index, 1)}>↓</button>}
          <button title="More node options" className="icon-button tiny"><MoreHorizontal size={18} /></button>
        </div>
      </article>
      <div className="connector"><span /><button onClick={onAdd} disabled={!editable} className="add-between" title="Add a step"><Plus size={16} /></button><span /></div>
    </div>
  );
}

function Sidebar({ activeIdentity, onIdentityChange }) {
  return (
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><Workflow size={27} /></span><span>FlowPilot</span></div>
      <nav className="main-nav">
        {navigation.map(([Icon, label, active]) => <button className={active ? "nav-item active" : "nav-item"} key={label}><Icon size={19} /><span>{label}</span></button>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="nav-divider" />
        <button className="nav-item"><BookOpen size={19} /><span>Docs</span></button>
        <button className="nav-item"><HelpCircle size={19} /><span>Help</span></button>
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
  return (
    <div className="quota-meter">
      <span>Usage</span>
      <strong>{organization.calls_used} / {organization.calls_allowed} calls</strong>
      <i><b style={{ width: `${percentage}%` }} /></i>
    </div>
  );
}

function RunPanel({ run, actor, onApprove, busy }) {
  const canApprove = ["owner", "editor"].includes(actor.role);
  return (
    <aside className="run-panel">
      <div className="panel-heading"><h2>Execution</h2><button className="icon-button"><PanelRightClose size={19} /></button></div>
      {!run ? <div className="empty-run"><CircleDotDashed size={25} /><p>Select or start a run to see live execution.</p></div> : <>
        <dl className="run-meta">
          <div><dt>Run ID</dt><dd>{run.id}<button className="copy-button" title="Copy run ID"><Code2 size={14} /></button></dd></div>
          <div><dt>Started</dt><dd>{time(run.started_at || run.created_at)}</dd></div>
          <div><dt>Status</dt><dd><span className={`run-state ${run.status}`}><StatusDot status={run.status} />{statusLabel(run.status)}</span></dd></div>
        </dl>
        <div className="panel-tabs"><button className="selected">Steps</button><button>Logs</button></div>
        <div className="run-steps">
          {run.step_runs.map((stepRun) => <article className={`run-step ${stepRun.status}`} key={stepRun.id}>
            <div className="run-step-top"><StatusDot status={stepRun.status} /><span className="run-step-number">{stepRun.position}</span><div><strong>{stepRun.name}</strong><p>{stepRun.status === "paused" ? "Awaiting approval" : `${statusLabel(stepRun.status)}${stepRun.completed_at ? ` · ${time(stepRun.completed_at)}` : ""}`}</p></div><ChevronRight size={17} /></div>
            {stepRun.status === "succeeded" && stepRun.type === "llm_call" && <div className="output-box"><span>Decision:</span> <b>{stepRun.output?.recommendation || "proceed"}</b><br /><small>{stepRun.output?.summary} · {stepRun.output?.model}</small></div>}
            {stepRun.status === "succeeded" && stepRun.type === "conditional_branch" && <div className="output-box"><span>Path taken:</span> <b>{stepRun.output?.branch || "true"}</b></div>}
            {stepRun.status === "paused" && <div className="approval-box"><p><span>Requested by</span> system</p><p><span>Reason</span> {stepRun.input?.reason}</p>{canApprove ? <button onClick={() => onApprove(run.id, stepRun.id)} disabled={busy} className="approve-button"><ShieldCheck size={15} />{busy ? "Approving…" : "Review & approve"}</button> : <div className="blocked-approval"><LockKeyhole size={14} /> Viewer cannot approve</div>}</div>}
          </article>)}
        </div>
        <button className="cancel-run" disabled={run.status === "completed"}><X size={16} /> Cancel run</button>
      </>}
    </aside>
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

export default function FlowPilot() {
  const [actorId, setActorId] = useState(identities[0].id);
  const [snapshot, setSnapshot] = useState(createClientSnapshot);
  const [activeRunId, setActiveRunId] = useState("run_demo_paused");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("Fast interactive demo · no background polling or loading delays.");
  const [forbidden, setForbidden] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const actor = identities.find((identity) => identity.id === actorId) || identities[0];
  const activeRun = snapshot.runs.find((run) => run.id === activeRunId) || snapshot.runs[0];
  const editable = ["owner", "editor"].includes(actor.role);

  function updateRun(runId, updater) {
    setSnapshot((current) => {
      const next = structuredClone(current);
      const run = next.runs.find((entry) => entry.id === runId);
      if (run) updater(run, next);
      return next;
    });
  }

  async function executeRun(runId, workflow, afterPosition = 0) {
    const remainingSteps = workflow.steps
      .filter((step) => step.position > afterPosition)
      .sort((first, second) => first.position - second.position);

    for (const step of remainingSteps) {
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
        setNotice("Run paused at Editorial approval. An owner or editor can now continue it.");
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

    updateRun(runId, (run, next) => {
      run.status = "completed";
      run.completed_at = new Date().toISOString();
      next.organization.calls_used += 1;
    });
    setNotice("Workflow completed successfully. Usage quota was updated.");
  }

  async function launchRun(triggerType) {
    if (busy || !editable) return;
    const workflow = structuredClone(snapshot.workflow);
    const run = createClientRun(workflow, actor.id, triggerType);
    setBusy(true);
    setSnapshot((current) => ({ ...current, runs: [run, ...current.runs] }));
    setActiveRunId(run.id);
    setNotice(`${triggerType === "webhook" ? "Webhook" : "Manual"} run started. Steps are progressing live.`);
    await executeRun(run.id, workflow);
    setBusy(false);
  }

  async function approveRun(runId, stepRunId) {
    if (busy || !editable) return;
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

  function resetDemo() {
    setSnapshot(createClientSnapshot());
    setActiveRunId("run_demo_paused");
    setBusy(false);
    setNotice("Demo reset to the paused approval scenario.");
  }

  function moveStep(index, direction) {
    if (!editable) return;
    const updated = [...snapshot.workflow.steps];
    const target = index + direction;
    if (target < 0 || target >= updated.length) return;
    [updated[index], updated[target]] = [updated[target], updated[index]];
    saveSteps(updated);
  }

  function addStep(type) {
    if (!editable) return;
    const meta = stepMeta[type];
    const step = {
      id: `step_${Date.now()}`,
      type,
      name: meta.label.replace(/\b\w/g, (letter) => letter.toUpperCase()),
      config: type === "llm_call" ? { prompt: "Draft a response", model: "OpenAI Responses (secure server call)" } : type === "http_request" ? { method: "GET", url: "https://api.github.com/zen" } : type === "conditional_branch" ? { expression: "previous.confidence >= 0.7" } : type === "approval_gate" ? { required_role: "editor", reason: "A teammate must review this output." } : type === "notify" ? { channel: "#research-updates", message: "Workflow completed" } : { table: "workflow_artifacts" }
    };
    setAddMenuOpen(false);
    saveSteps([...snapshot.workflow.steps, step]);
  }

  function saveSteps(steps) {
    if (!editable) return;
    const orderedSteps = steps.map((step, index) => ({ ...step, position: index + 1 }));
    setSnapshot((current) => ({ ...current, workflow: { ...current.workflow, steps: orderedSteps } }));
    setNotice("Workflow draft saved instantly. Owner-only nodes remain protected in the builder.");
  }

  function selectIdentity(nextActorId) {
    const nextActor = identities.find((identity) => identity.id === nextActorId) || identities[0];
    const isCrossOrg = nextActor.id === "usr_owner_b";
    setActorId(nextActorId);
    setForbidden(isCrossOrg);
    setEditing(false);
    setAddMenuOpen(false);
    setNotice(isCrossOrg ? "Cross-org request blocked: this user cannot discover Org A’s workflow by ID." : `Switched to ${nextActor.label} (${roleLabel(nextActor.role)}).`);
  }

  return <main className="app-shell">
    <Sidebar activeIdentity={actor} onIdentityChange={selectIdentity} />
    <section className="workspace-shell">
      <header className="topbar">
        <div className="org-switch"><Users size={18} /><strong>{forbidden ? "Other Company Ltd." : snapshot.organization.name}</strong><ChevronDown size={16} /></div>
        <div className="topbar-actions">
          {!forbidden && <QuotaMeter organization={snapshot.organization} />}
          <button className="run-button" onClick={() => void launchRun("manual")} disabled={busy || forbidden || !editable}><Play size={17} fill="currentColor" /> Run workflow</button>
          <button className="run-caret" disabled={busy || forbidden || !editable} onClick={() => void launchRun("webhook")} title="Trigger via configured webhook"><ChevronDown size={17} /></button>
        </div>
      </header>
      <div className="notice-bar"><span className={forbidden ? "notice-icon blocked" : "notice-icon"}>{forbidden ? <LockKeyhole size={14} /> : <ShieldCheck size={14} />}</span><span>{notice}</span><button onClick={resetDemo} className="reset-link"><RotateCcw size={13} /> Reset demo</button></div>
      {forbidden ? <section className="access-denied"><div className="denied-icon"><LockKeyhole size={27} /></div><h1>Organization boundary enforced</h1><p><strong>{actor.label}</strong> belongs to Other Company Ltd. The API policy denies this known Org A workflow ID before any workflow, run, or approval data can be used.</p><div><span><Check size={15} /> Query denied</span><span><Check size={15} /> Trigger denied</span><span><Check size={15} /> Approval denied</span></div><button onClick={() => selectIdentity("usr_owner_a")} className="primary-recover">Return as Org A owner</button></section> : <>
        <section className="workflow-header">
          <div><div className="title-line"><h1>{snapshot.workflow.name}</h1><button className="edit-title"><FileText size={15} /></button></div><div className="workspace-tabs"><button className="selected">Builder</button><button>Settings</button><button>Variables</button><button>History</button></div></div>
          <div className="workflow-actions"><button className={editing ? "soft-button selected" : "soft-button"} onClick={() => setEditing(!editing)} disabled={!editable}>{editing ? "Finish editing" : "Edit workflow"}</button><button className="soft-button"><Save size={16} /> Save</button><button className="icon-button bordered"><MoreHorizontal size={19} /></button></div>
        </section>
        <section className="builder-layout">
          <div className="canvas-region">
            <div className="canvas-toolbar"><button className="canvas-tool active"><Plus size={17} /></button><button className="canvas-tool"><span>⛶</span></button><button className="canvas-tool"><span>−</span></button><button className="canvas-tool"><span>⌁</span></button><button className="canvas-tool"><LockKeyhole size={15} /></button></div>
            {addMenuOpen && <AddStepMenu owner={actor.role === "owner"} onClose={() => setAddMenuOpen(false)} onSelect={addStep} />}
            <div className="flow-canvas">
              <div className="nodes-column">
                {snapshot.workflow.steps.map((step, index) => <StepNode key={step.id} step={step} index={index} editable={editing && editable} onMove={moveStep} onAdd={() => setAddMenuOpen(true)} />)}
                <button className="end-add" onClick={() => setAddMenuOpen(true)} disabled={!editable}><Plus size={17} /> Add step</button>
              </div>
            </div>
            <div className="minimap"><div className="mini-node one" /><div className="mini-node two" /><div className="mini-node three" /><div className="mini-node four" /><div className="mini-frame" /></div>
          </div>
          <RunPanel run={activeRun} actor={actor} busy={busy} onApprove={approveRun} />
        </section>
        <section className="workflow-footer">
          <div><Webhook size={16} /><strong>Second trigger is wired:</strong> POST <code>/api/webhook/content-research</code> with <code>x-webhook-secret</code></div>
          <button onClick={() => void launchRun("webhook")} disabled={busy || !editable}>Test webhook trigger <ChevronRight size={15} /></button>
        </section>
      </>}
    </section>
  </main>;
}
