"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  UserRoundCheck,
  Users,
  Webhook,
  Workflow,
  X
} from "lucide-react";

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

function roleLabel(role) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function statusLabel(status) {
  return status === "paused" ? "Awaiting approval" : status === "queued" ? "Queued" : status;
}

function time(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
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
          {editable && <button title="Move down" className="icon-button tiny" onClick={() => onMove(index, 1)}>↓</button>}
          <button title="More node options" className="icon-button tiny"><MoreHorizontal size={18} /></button>
        </div>
      </article>
      <div className="connector"><span /><button onClick={onAdd} className="add-between" title="Add a step"><Plus size={16} /></button><span /></div>
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
  const pausedStep = run?.step_runs?.find((entry) => entry.status === "paused");
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
  const [snapshot, setSnapshot] = useState(null);
  const [activeRunId, setActiveRunId] = useState("run_demo_paused");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("Live local demo · API authorization is enforced for every request.");
  const [forbidden, setForbidden] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const actor = identities.find((identity) => identity.id === actorId) || identities[0];
  const headers = useMemo(() => ({ "Content-Type": "application/json", "x-demo-actor": actorId }), [actorId]);
  const activeRun = snapshot?.runs?.find((run) => run.id === activeRunId) || snapshot?.runs?.[0];
  const editable = ["owner", "editor"].includes(actor.role);

  const refresh = useCallback(async (quiet = false) => {
    try {
      const response = await fetch(`/api/workflows/${WORKFLOW_ID}`, { headers: { "x-demo-actor": actorId }, cache: "no-store" });
      if (!response.ok) {
        const body = await response.json();
        if (response.status === 403) {
          setForbidden(true);
          setSnapshot(null);
          if (!quiet) setNotice("Cross-org request blocked: this user cannot discover Org A’s workflow by ID.");
          return;
        }
        throw new Error(body.error || "Could not load workflow");
      }
      const data = await response.json();
      setSnapshot(data);
      setForbidden(false);
      setActiveRunId((previous) => data.runs.some((run) => run.id === previous) ? previous : data.runs[0]?.id);
    } catch (error) {
      if (!quiet) setNotice(error.message);
    }
  }, [actorId]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const poll = setInterval(() => { if (!forbidden) void refresh(true); }, 650);
    return () => clearInterval(poll);
  }, [forbidden, refresh]);

  async function callApi(path, body, successMessage) {
    setBusy(true);
    try {
      const response = await fetch(path, { method: "POST", headers, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Request was rejected.");
      if (data.run?.id) setActiveRunId(data.run.id);
      if (data.workflow_run_id) setActiveRunId(data.workflow_run_id);
      setNotice(successMessage);
      await refresh(true);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  }

  function startRun() {
    void callApi("/api/execute", { workflowId: WORKFLOW_ID }, "Manual run accepted. Watch each step progress live in the execution panel.");
  }

  function approveRun(runId, stepRunId) {
    void callApi("/api/approve", { runId, stepRunId }, "Approval accepted. The runner is resuming the next queued step.");
  }

  async function runWebhook() {
    setBusy(true);
    try {
      const response = await fetch("/api/webhook/content-research", { method: "POST", headers: { "x-webhook-secret": "demo-webhook-key" } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Webhook was rejected.");
      setActiveRunId(data.workflow_run_id);
      setNotice("Webhook accepted with its shared secret. It started the same protected workflow without a UI button.");
      await refresh(true);
    } catch (error) { setNotice(error.message); } finally { setBusy(false); }
  }

  async function resetDemo() {
    await fetch("/api/demo/reset", { method: "POST" });
    setActiveRunId("run_demo_paused");
    setNotice("Demo reset to the paused approval scenario.");
    await refresh(true);
  }

  async function moveStep(index, direction) {
    if (!snapshot || !editable) return;
    const updated = [...snapshot.workflow.steps];
    const target = index + direction;
    if (target < 0 || target >= updated.length) return;
    [updated[index], updated[target]] = [updated[target], updated[index]];
    await saveSteps(updated);
  }

  async function addStep(type) {
    if (!snapshot) return;
    const meta = stepMeta[type];
    const step = {
      id: `step_${Date.now()}`,
      type,
      name: meta.label.replace(/\b\w/g, (letter) => letter.toUpperCase()),
      config: type === "llm_call" ? { prompt: "Draft a response", model: "stubbed-llm" } : type === "http_request" ? { method: "GET", url: "https://api.github.com/zen" } : type === "conditional_branch" ? { expression: "previous.confidence >= 0.7" } : type === "approval_gate" ? { required_role: "editor", reason: "A teammate must review this output." } : type === "notify" ? { channel: "#research-updates", message: "Workflow completed" } : { table: "workflow_artifacts" }
    };
    setAddMenuOpen(false);
    await saveSteps([...snapshot.workflow.steps, step]);
  }

  async function saveSteps(steps) {
    try {
      const response = await fetch(`/api/workflows/${WORKFLOW_ID}`, { method: "PATCH", headers, body: JSON.stringify({ steps }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setNotice("Workflow draft saved. The API applied role and step-level checks before updating it.");
      await refresh(true);
    } catch (error) { setNotice(error.message); }
  }

  return <main className="app-shell">
    <Sidebar activeIdentity={actor} onIdentityChange={(next) => { setActorId(next); setNotice("Identity switched. The application will re-query through the API under the new org scope."); }} />
    <section className="workspace-shell">
      <header className="topbar">
        <div className="org-switch"><Users size={18} /><strong>{forbidden ? "Other Company Ltd." : snapshot?.organization?.name || "Loading organization…"}</strong><ChevronDown size={16} /></div>
        <div className="topbar-actions">
          {!forbidden && snapshot?.organization && <QuotaMeter organization={snapshot.organization} />}
          <button className="run-button" onClick={startRun} disabled={busy || forbidden || !editable}><Play size={17} fill="currentColor" /> Run workflow</button>
          <button className="run-caret" disabled={busy || forbidden || !editable} onClick={runWebhook} title="Trigger via configured webhook"><ChevronDown size={17} /></button>
        </div>
      </header>
      <div className="notice-bar"><span className={forbidden ? "notice-icon blocked" : "notice-icon"}>{forbidden ? <LockKeyhole size={14} /> : <ShieldCheck size={14} />}</span><span>{notice}</span><button onClick={resetDemo} className="reset-link"><RotateCcw size={13} /> Reset demo</button></div>
      {forbidden ? <section className="access-denied"><div className="denied-icon"><LockKeyhole size={27} /></div><h1>Organization boundary enforced</h1><p><strong>{actor.label}</strong> belongs to Other Company Ltd. The API returned 403 before any workflow, run, or approval data could be read — even though this screen requested Org A’s exact workflow ID.</p><div><span><Check size={15} /> Query denied</span><span><Check size={15} /> Trigger denied</span><span><Check size={15} /> Approval denied</span></div><button onClick={() => setActorId("usr_owner_a")} className="primary-recover">Return as Org A owner</button></section> : <>
        <section className="workflow-header">
          <div><div className="title-line"><h1>{snapshot?.workflow?.name || "Content Research Pipeline"}</h1><button className="edit-title"><FileText size={15} /></button></div><div className="workspace-tabs"><button className="selected">Builder</button><button>Settings</button><button>Variables</button><button>History</button></div></div>
          <div className="workflow-actions"><button className={editing ? "soft-button selected" : "soft-button"} onClick={() => setEditing(!editing)} disabled={!editable}>{editing ? "Finish editing" : "Edit workflow"}</button><button className="soft-button"><Save size={16} /> Save</button><button className="icon-button bordered"><MoreHorizontal size={19} /></button></div>
        </section>
        <section className="builder-layout">
          <div className="canvas-region">
            <div className="canvas-toolbar"><button className="canvas-tool active"><Plus size={17} /></button><button className="canvas-tool"><span>⛶</span></button><button className="canvas-tool"><span>−</span></button><button className="canvas-tool"><span>⌁</span></button><button className="canvas-tool"><LockKeyhole size={15} /></button></div>
            {addMenuOpen && <AddStepMenu owner={actor.role === "owner"} onClose={() => setAddMenuOpen(false)} onSelect={addStep} />}
            <div className="flow-canvas">
              <div className="nodes-column">
                {(snapshot?.workflow?.steps || []).map((step, index) => <StepNode key={step.id} step={step} index={index} editable={editing && editable} onMove={moveStep} onAdd={() => setAddMenuOpen(true)} />)}
                <button className="end-add" onClick={() => setAddMenuOpen(true)} disabled={!editable}><Plus size={17} /> Add step</button>
              </div>
            </div>
            <div className="minimap"><div className="mini-node one" /><div className="mini-node two" /><div className="mini-node three" /><div className="mini-node four" /><div className="mini-frame" /></div>
          </div>
          <RunPanel run={activeRun} actor={actor} busy={busy} onApprove={approveRun} />
        </section>
        <section className="workflow-footer">
          <div><Webhook size={16} /><strong>Second trigger is wired:</strong> POST <code>/api/webhook/content-research</code> with <code>x-webhook-secret</code></div>
          <button onClick={runWebhook} disabled={busy || !editable}>Test webhook trigger <ChevronRight size={15} /></button>
        </section>
      </>}
    </section>
  </main>;
}
