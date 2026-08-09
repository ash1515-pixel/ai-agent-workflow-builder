CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE public.org_role AS ENUM ('owner', 'editor', 'viewer');
CREATE TYPE public.workflow_step_type AS ENUM ('llm_call', 'http_request', 'db_write', 'notify', 'conditional_branch', 'approval_gate');
CREATE TYPE public.workflow_trigger_type AS ENUM ('manual', 'webhook', 'scheduled', 'database_event');
CREATE TYPE public.workflow_run_status AS ENUM ('queued', 'running', 'paused', 'completed', 'failed', 'cancelled');
CREATE TYPE public.step_run_status AS ENUM ('pending', 'running', 'paused', 'succeeded', 'failed', 'skipped');

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  calls_used integer NOT NULL DEFAULT 0 CHECK (calls_used >= 0),
  calls_allowed integer NOT NULL DEFAULT 200 CHECK (calls_allowed >= 0),
  quota_period_start timestamptz NOT NULL DEFAULT date_trunc('month', now()),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.org_members (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.org_role NOT NULL DEFAULT 'viewer',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);
CREATE INDEX org_members_user_organization_idx ON public.org_members(user_id, organization_id);

CREATE TABLE public.workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
  description text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX workflows_organization_idx ON public.workflows(organization_id, updated_at DESC);

CREATE TABLE public.workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position > 0),
  type public.workflow_step_type NOT NULL,
  name text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workflow_id, position)
);
CREATE INDEX workflow_steps_workflow_position_idx ON public.workflow_steps(workflow_id, position);

CREATE TABLE public.workflow_triggers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  type public.workflow_trigger_type NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  webhook_secret_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workflow_id, type)
);

CREATE TABLE public.workflow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  trigger_type public.workflow_trigger_type NOT NULL,
  status public.workflow_run_status NOT NULL DEFAULT 'queued',
  initiated_by uuid,
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);
CREATE INDEX workflow_runs_workflow_created_idx ON public.workflow_runs(workflow_id, created_at DESC);
CREATE INDEX workflow_runs_organization_created_idx ON public.workflow_runs(organization_id, created_at DESC);

CREATE TABLE public.step_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id uuid NOT NULL REFERENCES public.workflow_runs(id) ON DELETE CASCADE,
  workflow_step_id uuid NOT NULL REFERENCES public.workflow_steps(id) ON DELETE RESTRICT,
  position integer NOT NULL CHECK (position > 0),
  status public.step_run_status NOT NULL DEFAULT 'pending',
  input jsonb,
  output jsonb,
  error text,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  approved_by uuid,
  approved_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  UNIQUE (workflow_run_id, workflow_step_id)
);
CREATE INDEX step_runs_run_position_idx ON public.step_runs(workflow_run_id, position);

CREATE TABLE public.workflow_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workflow_run_id uuid NOT NULL REFERENCES public.workflow_runs(id) ON DELETE CASCADE,
  step_run_id uuid REFERENCES public.step_runs(id) ON DELETE SET NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE VIEW public.organization_usage_current_month AS
SELECT
  o.id AS organization_id,
  o.calls_allowed,
  count(r.id) FILTER (WHERE r.created_at >= date_trunc('month', now()) AND r.status = 'completed')::integer AS completed_calls_this_month,
  round(avg(extract(epoch FROM (r.completed_at - r.started_at))) FILTER (WHERE r.status = 'completed' AND r.completed_at IS NOT NULL), 2) AS average_completed_run_seconds
FROM public.organizations o
LEFT JOIN public.workflow_runs r ON r.organization_id = o.id
GROUP BY o.id, o.calls_allowed;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER workflows_set_updated_at BEFORE UPDATE ON public.workflows FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER workflow_steps_set_updated_at BEFORE UPDATE ON public.workflow_steps FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
