/**
 * Complete Revised Multi-Tenant Supabase Architecture (Migrations 001 - 009)
 * Production-ready PostgreSQL migration with Custom Access Token Hook,
 * Vault Secrets integration, Task DAGs, Agent Traces, Prompt Versioning,
 * Cost Guardrails, QA Engines, App Health Checks, and Realtime Publications.
 */

export const COMPLETE_REVISED_SUPABASE_MIGRATION_SQL = `-- ==============================================================================
-- 🏗️ AETHERORCH COMPLETE REVISED MULTI-TENANT ARCHITECTURE
-- Full 9-Migration Suite: Tenancy, Vault, DAG, Traces, Prompts, Costs, QA, Health & Realtime
-- ==============================================================================

-- ============================================================
-- MIGRATION 001: Organizations & Tenancy
-- Establishes org_id as the tenant boundary for all RLS policies.
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Organizations table — one per client/business unit
create table if not exists public.organizations (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text unique not null,          -- e.g. 'geosan', 'ehi-multisystems'
  plan          text not null default 'internal' check (plan in ('internal','client','partner')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Org memberships — which users belong to which org
create table if not exists public.org_members (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            text not null default 'member' check (role in ('owner','admin','member','viewer')),
  created_at      timestamptz not null default now(),
  unique(org_id, user_id)
);

-- ============================================================
-- CUSTOM ACCESS TOKEN HOOK
-- Materializes org_id and role into the JWT so RLS is O(1).
-- Enable in Supabase Dashboard → Authentication → Hooks →
-- Custom Access Token → select this function.
-- ============================================================

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  claims        jsonb;
  v_org_id      uuid;
  v_role        text;
begin
  claims := coalesce(event->'claims', '{}'::jsonb);

  -- Pick the user's primary org (first membership)
  select om.org_id, om.role
    into v_org_id, v_role
    from public.org_members om
   where om.user_id = (claims->>'sub')::uuid
   order by om.created_at asc
   limit 1;

  if v_org_id is not null then
    claims := jsonb_set(claims, '{org_id}', to_jsonb(v_org_id));
    claims := jsonb_set(claims, '{org_role}', to_jsonb(coalesce(v_role,'member')));
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- Allow supabase_auth_admin to run the hook
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
grant usage on schema public to supabase_auth_admin;
grant select on public.org_members to supabase_auth_admin;

-- Helper: current org from JWT (used in every RLS policy)
create or replace function public.current_org_id()
returns uuid
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'org_id', '')::uuid;
$$;

create or replace function public.current_org_role()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'org_role', 'viewer');
$$;

-- ============================================================
-- MIGRATION 002: Project Registry with Vault Secrets
-- Every managed project. Secrets live in Vault, not here.
-- ============================================================

create table if not exists public.project_registry (
  id                    uuid primary key default gen_random_uuid(),
  org_id                uuid not null references public.organizations(id) on delete cascade,
  name                  text not null,
  slug                  text not null,
  vertical              text not null,          -- 'logistics','agriculture','aviation','qa','other'
  repo_url              text,                   -- GitHub repo URL
  vercel_deployment_url text,
  supabase_url          text,
  supabase_vault_secret_id uuid,                -- reference into vault.secrets, NOT the raw key
  vercel_vault_secret_id   uuid,
  github_vault_secret_id   uuid,
  status                text not null default 'planning'
                          check (status in ('planning','building','testing','production','monitoring','archived')),
  default_branch        text not null default 'main',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique(org_id, slug)
);

create index if not exists idx_project_registry_org on public.project_registry(org_id);
create index if not exists idx_project_registry_status on public.project_registry(status);

-- ============================================================
-- RPC: get_project_secrets(project_id)
-- Decrypts all Vault secrets linked to a project and returns them
-- as a jsonb object. Only service_role can execute.
-- ============================================================
create or replace function public.get_project_secrets(p_project_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_supabase_secret_id uuid;
  v_vercel_secret_id   uuid;
  v_github_secret_id   uuid;
  v_result             jsonb := '{}'::jsonb;
  v_value              text;
begin
  -- Verify the project exists and fetch its secret references
  select supabase_vault_secret_id,
         vercel_vault_secret_id,
         github_vault_secret_id
    into v_supabase_secret_id,
         v_vercel_secret_id,
         v_github_secret_id
    from public.project_registry
   where id = p_project_id;

  if not found then
    raise exception 'Project % not found', p_project_id;
  end if;

  -- Decrypt each secret if a reference exists
  if v_supabase_secret_id is not null then
    select decrypted_secret into v_value
      from vault.decrypted_secrets
     where id = v_supabase_secret_id;
    if v_value is not null then
      v_result := jsonb_set(v_result, '{supabase_key}', to_jsonb(v_value));
    end if;
  end if;

  if v_vercel_secret_id is not null then
    select decrypted_secret into v_value
      from vault.decrypted_secrets
     where id = v_vercel_secret_id;
    if v_value is not null then
      v_result := jsonb_set(v_result, '{vercel_token}', to_jsonb(v_value));
    end if;
  end if;

  if v_github_secret_id is not null then
    select decrypted_secret into v_value
      from vault.decrypted_secrets
     where id = v_github_secret_id;
    if v_value is not null then
      v_result := jsonb_set(v_result, '{github_token}', to_jsonb(v_value));
    end if;
  end if;

  return v_result;
end;
$$;

-- Lock it down: only service_role can call this
revoke execute on function public.get_project_secrets(uuid) from public;
revoke execute on function public.get_project_secrets(uuid) from anon;
revoke execute on function public.get_project_secrets(uuid) from authenticated;
grant execute on function public.get_project_secrets(uuid) to service_role;

-- ============================================================
-- MIGRATION 003: Agent Tasks + Dependency Graph (DAG)
-- DAG-based workflow: Plan → Code → Test → Review → Deploy
-- ============================================================

create table if not exists public.agent_tasks (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references public.organizations(id) on delete cascade,
  project_id        uuid not null references public.project_registry(id) on delete cascade,
  parent_task_id    uuid references public.agent_tasks(id) on delete set null,
  task_type         text not null check (task_type in (
                      'BUILD_FEATURE','FIX_BUG','QA_EXPLORE','QA_REPLAY',
                      'QA_TARGETED','QA_DIFF','QA_SECURITY','DEPLOY','REPORT','PLAN')),
  prompt            text not null,
  status            text not null default 'queued'
                      check (status in ('queued','blocked','running','awaiting_approval',
                                        'done','failed','cancelled')),
  assigned_agent    text,                       -- 'coding','qa','review','deploy'
  prompt_version_id uuid,                       -- FK to prompt_versions
  plan              jsonb,
  result            jsonb,
  branch_name       text,                       -- git branch created for this task
  pr_url            text,                       -- GitHub PR opened by the agent
  workspace_path    text,                       -- isolated git worktree path
  created_at        timestamptz not null default now(),
  started_at        timestamptz,
  completed_at      timestamptz
);

create index if not exists idx_agent_tasks_project on public.agent_tasks(project_id, status);
create index if not exists idx_agent_tasks_org     on public.agent_tasks(org_id, created_at desc);
create index if not exists idx_agent_tasks_parent  on public.agent_tasks(parent_task_id);

create table if not exists public.task_dependencies (
  id                 uuid primary key default gen_random_uuid(),
  task_id            uuid not null references public.agent_tasks(id) on delete cascade,
  depends_on_task_id uuid not null references public.agent_tasks(id) on delete cascade,
  condition          text not null default 'completed'
                      check (condition in ('completed','succeeded','pr_merged')),
  created_at         timestamptz not null default now(),
  unique(task_id, depends_on_task_id),
  check (task_id <> depends_on_task_id)
);

create index if not exists idx_task_deps_task on public.task_dependencies(task_id);

-- ============================================================
-- MIGRATION 004: Agent Traces + Results (Observability)
-- ============================================================

create table if not exists public.agent_results (
  id            uuid primary key default gen_random_uuid(),
  task_id       uuid not null references public.agent_tasks(id) on delete cascade,
  step_number   int not null,
  step_type     text not null check (step_type in (
                  'planning','coding','testing','verification','review','deploy')),
  content       text,
  model_used    text,
  tokens_input  int default 0,
  tokens_output int default 0,
  cost_usd      numeric(12,6) default 0,
  created_at    timestamptz not null default now(),
  unique(task_id, step_number)
);

create index if not exists idx_agent_results_task on public.agent_results(task_id, step_number);

create table if not exists public.agent_traces (
  id            uuid primary key default gen_random_uuid(),
  task_id       uuid not null references public.agent_tasks(id) on delete cascade,
  step_number   int not null,
  trace_type    text not null check (trace_type in (
                  'adk_call','a2a_delegation','mcp_tool_call','model_call','error')),
  tool_name     text,
  server_name   text,
  input_hash    text,
  output_hash   text,
  duration_ms   int,
  error_message text,
  error_stack   text,
  metadata      jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists idx_agent_traces_task   on public.agent_traces(task_id, step_number);
create index if not exists idx_agent_traces_type   on public.agent_traces(trace_type);
create index if not exists idx_agent_traces_errors on public.agent_traces(task_id) where trace_type = 'error';

-- ============================================================
-- MIGRATION 005: Prompt Versioning
-- ============================================================

create table if not exists public.prompt_versions (
  id           uuid primary key default gen_random_uuid(),
  agent_name   text not null,                 -- 'coding','qa','review','deploy'
  version      int not null,
  content      text not null,                 -- the system prompt
  notes        text,
  active       boolean not null default false,
  created_at   timestamptz not null default now(),
  unique(agent_name, version)
);

create unique index if not exists idx_prompt_versions_active
  on public.prompt_versions(agent_name)
  where active = true;

alter table public.agent_tasks
  drop constraint if exists fk_task_prompt_version,
  add constraint fk_task_prompt_version
  foreign key (prompt_version_id) references public.prompt_versions(id);

-- ============================================================
-- MIGRATION 006: Cost Events & Budgets (Hard-Stop Guardrails)
-- ============================================================

create table if not exists public.cost_events (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.organizations(id) on delete cascade,
  project_id     uuid references public.project_registry(id) on delete set null,
  task_id        uuid references public.agent_tasks(id) on delete set null,
  trace_id       uuid references public.agent_traces(id) on delete set null,
  provider       text not null check (provider in ('google','anthropic','xai','openai','local')),
  model          text not null,
  endpoint       text,
  tokens_input   int default 0,
  tokens_output  int default 0,
  cost_usd       numeric(12,6) not null default 0,
  attributed_to  text,          -- e.g. 'FEATURE:debt_clearance_badge'
  created_at     timestamptz not null default now()
);

create index if not exists idx_cost_events_org_project on public.cost_events(org_id, project_id, created_at desc);
create index if not exists idx_cost_events_task        on public.cost_events(task_id);
create index if not exists idx_cost_events_attribution on public.cost_events(attributed_to) where attributed_to is not null;

create table if not exists public.project_budgets (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null unique references public.project_registry(id) on delete cascade,
  monthly_limit_usd   numeric(12,2) not null default 50.00,
  alert_threshold_pct int not null default 80,
  hard_stop           boolean not null default true,
  period_start        date not null default date_trunc('month', now())::date,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create or replace function public.project_month_spend(p_project_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(cost_usd), 0)
    from public.cost_events
   where project_id = p_project_id
     and created_at >= date_trunc('month', now());
$$;

-- ============================================================
-- MIGRATION 007: QA Runs & Findings
-- ============================================================

create table if not exists public.qa_runs (
  id                    uuid primary key default gen_random_uuid(),
  org_id                uuid not null references public.organizations(id) on delete cascade,
  project_id            uuid not null references public.project_registry(id) on delete cascade,
  task_id               uuid references public.agent_tasks(id) on delete set null,
  run_type              text not null check (run_type in ('explore','replay','targeted','diff','security')),
  target_url            text not null,
  target_platform       text not null check (target_platform in ('web','mobile','api','desktop')),
  role_tested           text,                   -- 'cargo_agent','auditor','driver', etc.
  status                text not null default 'running'
                          check (status in ('running','completed','failed','cancelled')),
  engine_used           text,                   -- 'agent-qa','mk-qa-master','comber','appcrawl'
  findings_count        int default 0,
  replay_script_path    text,                   -- e.g. 'qa/replays/ehi-cargo-explore.yaml'
  summary               jsonb,
  created_at            timestamptz not null default now(),
  completed_at          timestamptz
);

create index if not exists idx_qa_runs_project on public.qa_runs(project_id, status);
create index if not exists idx_qa_runs_org     on public.qa_runs(org_id, created_at desc);

create table if not exists public.qa_findings (
  id                    uuid primary key default gen_random_uuid(),
  run_id                uuid not null references public.qa_runs(id) on delete cascade,
  severity              text not null check (severity in ('critical','high','medium','low')),
  title                 text not null,
  description           text,
  component             text,                   -- 'cargo_form','scanner','ledger'
  screenshot_url        text,
  reproduction_steps    jsonb,
  status                text not null default 'open'
                          check (status in ('open','in_progress','resolved','wont_fix')),
  resolved_by_task_id   uuid references public.agent_tasks(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_qa_findings_run      on public.qa_findings(run_id, severity);
create index if not exists idx_qa_findings_status   on public.qa_findings(status) where status = 'open';

-- ============================================================
-- MIGRATION 008: App Health Checks (Synthetic Pings)
-- ============================================================

create table if not exists public.app_health_checks (
  id                       uuid primary key default gen_random_uuid(),
  project_id               uuid not null references public.project_registry(id) on delete cascade,
  url                      text not null,
  expected_status          int not null default 200,
  check_interval_seconds   int not null default 300,
  last_check_at            timestamptz,
  last_status              int,
  last_latency_ms          int,
  consecutive_failures     int not null default 0,
  enabled                  boolean not null default true,
  created_at               timestamptz not null default now()
);

create index if not exists idx_health_checks_enabled on public.app_health_checks(enabled, last_check_at);

-- ============================================================
-- MIGRATION 009: Notifications & Realtime Publications
-- ============================================================

create table if not exists public.notifications (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete cascade,  -- null = broadcast to org
  project_id    uuid references public.project_registry(id) on delete cascade,
  task_id       uuid references public.agent_tasks(id) on delete cascade,
  severity      text not null check (severity in ('info','warning','critical')),
  title         text not null,
  body          text,
  category      text,          -- 'approval_needed','qa_finding','budget_alert','health_down','deploy_done'
  read          boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists idx_notifications_user    on public.notifications(user_id, read, created_at desc);
create index if not exists idx_notifications_org     on public.notifications(org_id, created_at desc);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

alter table public.organizations     enable row level security;
alter table public.org_members       enable row level security;
alter table public.project_registry  enable row level security;
alter table public.agent_tasks       enable row level security;
alter table public.task_dependencies enable row level security;
alter table public.agent_results     enable row level security;
alter table public.agent_traces      enable row level security;
alter table public.prompt_versions   enable row level security;
alter table public.cost_events       enable row level security;
alter table public.project_budgets   enable row level security;
alter table public.qa_runs           enable row level security;
alter table public.qa_findings       enable row level security;
alter table public.app_health_checks enable row level security;
alter table public.notifications     enable row level security;

-- Organizations
create policy "org members can read own org"
  on public.organizations for select to authenticated
  using (id = public.current_org_id());

-- Org members
create policy "org members can read own org members"
  on public.org_members for select to authenticated
  using (org_id = public.current_org_id());

-- Projects
create policy "org members can read projects"
  on public.project_registry for select to authenticated
  using (org_id = public.current_org_id());

create policy "org admins can write projects"
  on public.project_registry for all to authenticated
  using (org_id = public.current_org_id() and public.current_org_role() in ('owner','admin'))
  with check (org_id = public.current_org_id() and public.current_org_role() in ('owner','admin'));

-- Tasks
create policy "org members read tasks"
  on public.agent_tasks for select to authenticated
  using (org_id = public.current_org_id());

create policy "org admins write tasks"
  on public.agent_tasks for all to authenticated
  using (org_id = public.current_org_id() and public.current_org_role() in ('owner','admin'))
  with check (org_id = public.current_org_id() and public.current_org_role() in ('owner','admin'));

-- Task Dependencies
create policy "org members read task deps"
  on public.task_dependencies for select to authenticated
  using (exists (
    select 1 from public.agent_tasks t
     where t.id = task_dependencies.task_id and t.org_id = public.current_org_id()
  ));

-- Results & Traces
create policy "org members read results"
  on public.agent_results for select to authenticated
  using (exists (
    select 1 from public.agent_tasks t
     where t.id = agent_results.task_id and t.org_id = public.current_org_id()
  ));

create policy "org members read traces"
  on public.agent_traces for select to authenticated
  using (exists (
    select 1 from public.agent_tasks t
     where t.id = agent_traces.task_id and t.org_id = public.current_org_id()
  ));

-- Prompts
create policy "authenticated read prompts"
  on public.prompt_versions for select to authenticated
  using (true);

create policy "admins write prompts"
  on public.prompt_versions for all to authenticated
  using (public.current_org_role() in ('owner','admin'))
  with check (public.current_org_role() in ('owner','admin'));

-- Costs & Budgets
create policy "org members read costs"
  on public.cost_events for select to authenticated
  using (org_id = public.current_org_id());

create policy "org admins read budgets"
  on public.project_budgets for select to authenticated
  using (exists (
    select 1 from public.project_registry p
     where p.id = project_budgets.project_id and p.org_id = public.current_org_id()
  ));

create policy "org admins write budgets"
  on public.project_budgets for all to authenticated
  using (public.current_org_role() in ('owner','admin'))
  with check (public.current_org_role() in ('owner','admin'));

-- QA Runs & Findings
create policy "org members read qa runs"
  on public.qa_runs for select to authenticated
  using (org_id = public.current_org_id());

create policy "org members read qa findings"
  on public.qa_findings for select to authenticated
  using (exists (
    select 1 from public.qa_runs r
     where r.id = qa_findings.run_id and r.org_id = public.current_org_id()
  ));

-- Health Checks
create policy "org members read health"
  on public.app_health_checks for select to authenticated
  using (exists (
    select 1 from public.project_registry p
     where p.id = app_health_checks.project_id and p.org_id = public.current_org_id()
  ));

create policy "org admins write health"
  on public.app_health_checks for all to authenticated
  using (public.current_org_role() in ('owner','admin'))
  with check (public.current_org_role() in ('owner','admin'));

-- Notifications
create policy "users read own notifications"
  on public.notifications for select to authenticated
  using (user_id = auth.uid() or (user_id is null and org_id = public.current_org_id()));

create policy "users mark own notifications read"
  on public.notifications for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================
-- REALTIME PUBLICATIONS
-- ============================================================
do $$ begin
  alter publication supabase_realtime add table public.agent_tasks;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.agent_results;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.qa_runs;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.qa_findings;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.cost_events;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.app_health_checks;
exception when duplicate_object then null; end $$;
`;
