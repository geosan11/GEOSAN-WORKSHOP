-- =========================================================================
-- GEOSAN-WORKSHOP (AetherOrch) - Production Supabase Schema
-- Project: zxdxsizyvotkcsrtzscw (https://zxdxsizyvotkcsrtzscw.supabase.co)
-- Paste and execute this entire script in your Supabase SQL Editor.
-- =========================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Project Registry
create table if not exists public.project_registry (
  id text primary key,
  name text not null,
  vertical text not null check (vertical in ('logistics', 'agriculture', 'aviation', 'fintech')),
  supabase_project_url text not null default '',
  supabase_anon_key_masked text not null default '',
  vercel_deployment_url text not null default '',
  github_repo_url text not null default '',
  status text not null default 'planning' check (status in ('planning', 'building', 'testing', 'production', 'monitoring')),
  last_commit_hash text not null default 'main-001',
  deployment_status text not null default 'deployed' check (deployment_status in ('live', 'deploying', 'pending', 'degraded', 'deployed', 'failed', 'queued', 'stale')),
  monthly_budget_usd numeric(10,2) not null default 1000.00,
  current_spend_usd numeric(10,2) not null default 0.00,
  health text not null default 'healthy' check (health in ('healthy', 'warning', 'degraded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  description text not null default ''
);

-- 2. Agent Tasks
create table if not exists public.agent_tasks (
  id text primary key,
  org_id text not null default 'org-ehi-global',
  project_id text not null references public.project_registry(id) on delete cascade,
  task_type text not null,
  prompt text not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'awaiting_approval', 'done', 'failed', 'cancelled')),
  assigned_agent text not null default 'CoordinatorAgent',
  model_used text not null default 'gemini-2.5-pro',
  parent_task_id text references public.agent_tasks(id) on delete set null,
  plan jsonb default null,
  result jsonb default null,
  subagents jsonb default null,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

-- 3. Cost Events
create table if not exists public.cost_events (
  id text primary key,
  org_id text not null default 'org-ehi-global',
  project_id text not null references public.project_registry(id) on delete cascade,
  task_id text references public.agent_tasks(id) on delete set null,
  tokens_input integer not null default 0,
  tokens_output integer not null default 0,
  cost_usd numeric(10,4) not null default 0.0000,
  provider text not null default 'gemini',
  model text not null default 'gemini-2.5-flash',
  feature_attribution text default null,
  created_at timestamptz not null default now()
);

-- 4. QA Runs
create table if not exists public.qa_runs (
  id text primary key,
  org_id text not null default 'org-ehi-global',
  project_id text not null references public.project_registry(id) on delete cascade,
  run_type text not null default 'QA_EXPLORE',
  status text not null default 'passed' check (status in ('running', 'passed', 'failed', 'needs_review')),
  total_findings integer not null default 0,
  critical_count integer not null default 0,
  high_count integer not null default 0,
  medium_count integer not null default 0,
  low_count integer not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

-- 5. QA Findings
create table if not exists public.qa_findings (
  id text primary key,
  run_id text not null references public.qa_runs(id) on delete cascade,
  project_id text not null references public.project_registry(id) on delete cascade,
  severity text not null check (severity in ('critical', 'high', 'medium', 'low', 'info')),
  category text not null check (category in ('security', 'regression', 'drift', 'invariant', 'performance', 'ux')),
  title text not null,
  description text not null,
  reproduction_steps jsonb default '[]'::jsonb,
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved', 'ignored')),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

-- 6. Project Budgets
create table if not exists public.project_budgets (
  project_id text primary key references public.project_registry(id) on delete cascade,
  monthly_limit_usd numeric(10,2) not null default 1000.00,
  alert_threshold_pct integer not null default 80,
  hard_stop boolean not null default true,
  updated_at timestamptz not null default now()
);

-- 7. Prompt Versions (System Invariants)
create table if not exists public.prompt_versions (
  id text primary key,
  role text not null,
  version integer not null default 1,
  system_instruction text not null,
  changelog text not null default '',
  created_at timestamptz not null default now()
);

-- 8. Seed the Four Core Verticals
insert into public.project_registry (id, name, vertical, supabase_project_url, vercel_deployment_url, github_repo_url, status, last_commit_hash, deployment_status, monthly_budget_usd, current_spend_usd, health, description)
values
  ('proj-ehi-001', 'EHI Multisystems (Cargo Hubs & Waybills)', 'logistics', 'https://zxdxsizyvotkcsrtzscw.supabase.co', 'https://ehi-cargo-hub.vercel.app', 'https://github.com/ehi-logistics/cargo-platform-v2', 'testing', 'd4f892a', 'degraded', 600.00, 142.86, 'warning', 'Autonomous freight intake, barcode sorting, and waybill payment reconciliation across Kano, Lagos, and Abuja transit hubs.'),
  ('proj-iya-002', 'Iyanuoluwa Vegetable Oil (AgroSupply & Silos)', 'agriculture', 'https://zxdxsizyvotkcsrtzscw.supabase.co', 'https://iyanu-agro.vercel.app', 'https://github.com/iyanu-agrik/silo-monitoring-engine', 'production', 'e4a110b', 'live', 450.00, 78.40, 'healthy', 'IoT telemetry aggregation for grain moisture, vegetable oil processing, bulk payout dispatch, and warehouse receipt tokenization.'),
  ('proj-aero-003', 'Aviation Log Entry (AeroOps Turnaround)', 'aviation', 'https://zxdxsizyvotkcsrtzscw.supabase.co', 'https://aeroops-dispatch.vercel.app', 'https://github.com/aero-ground/turnaround-orchestrator', 'building', 'a19bc32', 'deploying', 800.00, 310.25, 'healthy', 'Electronic flight log entries, turnaround management, fuel bowser dispatch, baggage allocation, and runway ramp telemetry.'),
  ('proj-edge-004', 'EdgePoint (Cross-Border Settlement)', 'fintech', 'https://zxdxsizyvotkcsrtzscw.supabase.co', 'https://edgepoint-treasury.vercel.app', 'https://github.com/edgepoint-core/settlement-ledger', 'production', '93c04ff', 'deployed', 1200.00, 540.90, 'healthy', 'Cross-border liquidity balancing, FX corridor routing, and central bank compliance proofs.')
on conflict (id) do update set
  name = excluded.name,
  supabase_project_url = excluded.supabase_project_url,
  updated_at = now();

-- 9. Row Level Security (RLS) - Allow public access with anon key for this applet
alter table public.project_registry enable row level security;
alter table public.agent_tasks enable row level security;
alter table public.cost_events enable row level security;
alter table public.qa_runs enable row level security;
alter table public.qa_findings enable row level security;
alter table public.project_budgets enable row level security;
alter table public.prompt_versions enable row level security;

create policy "Public read project_registry" on public.project_registry for select using (true);
create policy "Public write project_registry" on public.project_registry for all using (true);

create policy "Public read agent_tasks" on public.agent_tasks for select using (true);
create policy "Public write agent_tasks" on public.agent_tasks for all using (true);

create policy "Public read cost_events" on public.cost_events for select using (true);
create policy "Public write cost_events" on public.cost_events for all using (true);

create policy "Public read qa_runs" on public.qa_runs for select using (true);
create policy "Public write qa_runs" on public.qa_runs for all using (true);

create policy "Public read qa_findings" on public.qa_findings for select using (true);
create policy "Public write qa_findings" on public.qa_findings for all using (true);

create policy "Public read project_budgets" on public.project_budgets for select using (true);
create policy "Public write project_budgets" on public.project_budgets for all using (true);

create policy "Public read prompt_versions" on public.prompt_versions for select using (true);
create policy "Public write prompt_versions" on public.prompt_versions for all using (true);
