# Architecture and security notes

## Schema reasoning

`organizations` owns quotas. `org_members` is the sole tenancy edge: each user is a member of one or more organizations with an organization-scoped role. Every workflow row stores `organization_id`; steps and triggers inherit scope through the workflow; runs duplicate `organization_id` for fast, direct permission filtering and operational indexes. `step_runs` is an immutable-ish execution journal attached to a workflow run, retaining each input/output/error, retry count, and approval audit fields. The `organization_usage_current_month` view supplies the aggregation requested in the brief.

## Two permission layers

Layer 1 is Hasura row permissions in `hasura/metadata`. All read filters traverse `organization → org_members` and compare `user_id` to `X-Hasura-User-Id`; writes additionally require the matching member role. The `workflow_steps` check adds an owner-only branch for `db_write` and `notify`, while all webhook-trigger writes are owner-only. This makes guessed UUIDs inert because the database returns no rows for another organization. Owners alone can manage membership. Editors can author standard workflow structure. Viewers are read-only.

Layer 2 is application authorization in the Action handler. `triggerWorkflowRun` resolves the workflow, rechecks the caller is an owner/editor member of exactly that organization, validates quota, and then creates the run. Editing code independently rejects `notify` and `db_write` for non-owners, and rejects webhook triggers for non-owners. `approveStep` rechecks the run's org membership and owner/editor role before changing the paused step. This second check is essential: mid-run approval is an orchestration decision, not simply a row update.

## Pause/resume lifecycle

The runner creates all `step_runs` as `pending`, transitions one at a time to `running`, writes output/error and an attempt count, then marks it `succeeded`. An `approval_gate` is stored as `paused`, and its parent `workflow_run` becomes `paused`; the loop exits. The subscription on `step_runs` renders that state instantly. `approveStep` records `approved_by` and `approved_at`, transitions the gate to `succeeded`, marks the run `running`, and dispatches the next queued step. Quota is incremented only after a completed run.

## Demo versus deployed adapter

The runnable app intentionally uses a no-credential browser-local runner so the hosted demo remains fast and reliable on serverless preview deployments; it does not background-poll or depend on process memory shared between functions. It uses a visibly disclosed 450ms LLM stub, which is permitted by the brief when an API key is unavailable. The repository also contains the real Hasura GraphQL documents, migrations, metadata, Actions, cron trigger, event trigger, and a server-side HTTP runner with retry. In an Nhost deployment, persist run state via Hasura mutations and use `STEP_RUN_PROGRESS`; the data model and authorization checkpoints are identical.
