-- =========================================================================
-- GEOSAN-WORKSHOP: Locked Workshop Schema Alignment Migration
-- File: supabase/migrations/20261028000000_workshop_aligned.sql
--
-- Aligns the Supabase PostgreSQL schema with the locked GEOSAN Workshop design:
--   1. public.projects (and compatibility columns on public.project_registry)
--      with archetype, source_type, source_ref, advisor_provider, advisor_agent_name
--   2. public.project_logs with jsonb payload
--   3. public.agent_assignments
--   4. public.provider_configs
--   5. public.user_preferences (with font_scale)
--   6. Indexes, updated_at triggers, and supabase_realtime publication
--      for projects, project_logs, and agent_assignments
--   7. Row Level Security (RLS) compatible with public.is_app_owner() and user_id
--
-- Idempotent and safe to run multiple times while preserving existing tables.
-- =========================================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =========================================================================
-- 0. Shared Helper Functions (updated_at trigger & owner check fallback)
-- =========================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Automatically sets updated_at = now() before any row update.';

-- Ensure app_owner & is_app_owner() exist if 20261020000000_lock_db_to_owner.sql
-- has not been applied yet, so RLS policies never fail on missing function.
create table if not exists public.app_owner (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.app_owner enable row level security;

do $$
begin
  if to_regprocedure('public.is_app_owner()') is null then
    execute $fn$
      create function public.is_app_owner()
      returns boolean
      language sql
      stable
      security definer
      set search_path = ''
      as $body$
        select exists (
          select 1
          from public.app_owner o
          where o.user_id = (select auth.uid())
        );
      $body$;
    $fn$;
    revoke all on function public.is_app_owner() from public;
    revoke all on function public.is_app_owner() from anon;
    grant execute on function public.is_app_owner() to authenticated;
  end if;
end
$$;

-- =========================================================================
-- 1. Projects (`public.projects` + compatibility with `public.project_registry`)
-- =========================================================================

create table if not exists public.projects (
  id text primary key default ('proj-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
  owner_id uuid references auth.users (id) on delete set null default auth.uid(),
  org_id text not null default 'org-geosan-workshop',
  client_id text,
  name text not null,
  slug text not null,
  description text not null default '',
  vertical text not null default 'custom',
  archetype text not null default 'custom',
  source_type text not null default 'github'
    check (source_type in ('github', 'local', 'template', 'import', 'scratch', 'blank', 'git', 'archive')),
  source_ref text not null default '',
  advisor_provider text not null default 'anthropic',
  advisor_agent_name text not null default 'CoordinatorAgent',
  repo_url text,
  github_repo_url text not null default '',
  repo_slug text,
  default_branch text not null default 'main',
  git_branch text not null default 'main',
  supabase_project_url text not null default '',
  supabase_anon_key_masked text not null default '',
  vercel_deployment_url text not null default '',
  status text not null default 'planning'
    check (status in ('planning', 'building', 'testing', 'production', 'monitoring', 'archived', 'active', 'paused')),
  deployment_status text not null default 'pending'
    check (deployment_status in ('live', 'deploying', 'pending', 'degraded', 'deployed', 'failed', 'queued', 'stale')),
  health text not null default 'healthy'
    check (health in ('healthy', 'warning', 'degraded', 'down')),
  health_status text not null default 'healthy'
    check (health_status in ('healthy', 'warning', 'degraded', 'down')),
  last_commit_hash text not null default 'main',
  monthly_budget_usd numeric(10,2) not null default 1000.00,
  per_run_cap_usd numeric(10,2) default null,
  current_spend_usd numeric(10,2) not null default 0.00,
  auto_merge_enabled boolean not null default false,
  agent_instructions text not null default '',
  kit jsonb not null default '{}'::jsonb,
  extra_protected_paths jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  is_demo boolean not null default false,
  archived_at timestamptz,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure required columns exist if `public.projects` was already created earlier
alter table public.projects
  add column if not exists owner_id uuid references auth.users (id) on delete set null default auth.uid(),
  add column if not exists org_id text not null default 'org-geosan-workshop',
  add column if not exists client_id text,
  add column if not exists slug text not null default '',
  add column if not exists description text not null default '',
  add column if not exists vertical text not null default 'custom',
  add column if not exists archetype text not null default 'custom',
  add column if not exists source_type text not null default 'github',
  add column if not exists source_ref text not null default '',
  add column if not exists advisor_provider text not null default 'anthropic',
  add column if not exists advisor_agent_name text not null default 'CoordinatorAgent',
  add column if not exists repo_url text,
  add column if not exists github_repo_url text not null default '',
  add column if not exists repo_slug text,
  add column if not exists default_branch text not null default 'main',
  add column if not exists git_branch text not null default 'main',
  add column if not exists supabase_project_url text not null default '',
  add column if not exists supabase_anon_key_masked text not null default '',
  add column if not exists vercel_deployment_url text not null default '',
  add column if not exists status text not null default 'planning',
  add column if not exists deployment_status text not null default 'pending',
  add column if not exists health text not null default 'healthy',
  add column if not exists health_status text not null default 'healthy',
  add column if not exists last_commit_hash text not null default 'main',
  add column if not exists monthly_budget_usd numeric(10,2) not null default 1000.00,
  add column if not exists per_run_cap_usd numeric(10,2) default null,
  add column if not exists current_spend_usd numeric(10,2) not null default 0.00,
  add column if not exists auto_merge_enabled boolean not null default false,
  add column if not exists agent_instructions text not null default '',
  add column if not exists kit jsonb not null default '{}'::jsonb,
  add column if not exists extra_protected_paths jsonb not null default '[]'::jsonb,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists is_demo boolean not null default false,
  add column if not exists archived_at timestamptz,
  add column if not exists last_activity_at timestamptz not null default now(),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

comment on table public.projects is
  'Primary GEOSAN Workshop projects registry with archetype, source tracking, and advisor agent configuration.';

-- Keep backward compatibility with existing `public.project_registry` if present
do $$
begin
  if to_regclass('public.project_registry') is not null then
    alter table public.project_registry
      add column if not exists slug text not null default '',
      add column if not exists archetype text not null default 'custom',
      add column if not exists source_type text not null default 'github',
      add column if not exists source_ref text not null default '',
      add column if not exists advisor_provider text not null default 'anthropic',
      add column if not exists advisor_agent_name text not null default 'CoordinatorAgent';

    -- Backfill existing rows from `public.project_registry` into `public.projects`
    insert into public.projects (
      id,
      name,
      slug,
      vertical,
      archetype,
      source_type,
      source_ref,
      advisor_provider,
      advisor_agent_name,
      supabase_project_url,
      supabase_anon_key_masked,
      vercel_deployment_url,
      github_repo_url,
      repo_url,
      status,
      last_commit_hash,
      deployment_status,
      monthly_budget_usd,
      current_spend_usd,
      health,
      health_status,
      description,
      created_at,
      updated_at
    )
    select
      pr.id,
      pr.name,
      coalesce(nullif(pr.slug, ''), lower(regexp_replace(pr.name, '[^a-zA-Z0-9]+', '-', 'g'))),
      pr.vertical,
      coalesce(nullif(pr.archetype, ''), pr.vertical, 'custom'),
      coalesce(nullif(pr.source_type, ''), 'github'),
      coalesce(nullif(pr.source_ref, ''), pr.github_repo_url, ''),
      coalesce(nullif(pr.advisor_provider, ''), 'anthropic'),
      coalesce(nullif(pr.advisor_agent_name, ''), 'CoordinatorAgent'),
      pr.supabase_project_url,
      pr.supabase_anon_key_masked,
      pr.vercel_deployment_url,
      pr.github_repo_url,
      nullif(pr.github_repo_url, ''),
      pr.status,
      pr.last_commit_hash,
      pr.deployment_status,
      pr.monthly_budget_usd,
      pr.current_spend_usd,
      pr.health,
      pr.health,
      pr.description,
      pr.created_at,
      pr.updated_at
    from public.project_registry pr
    on conflict (id) do update set
      name = excluded.name,
      vertical = excluded.vertical,
      archetype = coalesce(nullif(public.projects.archetype, 'custom'), excluded.archetype),
      source_ref = coalesce(nullif(public.projects.source_ref, ''), excluded.source_ref),
      supabase_project_url = excluded.supabase_project_url,
      vercel_deployment_url = excluded.vercel_deployment_url,
      github_repo_url = excluded.github_repo_url,
      updated_at = now();
  end if;
end
$$;

-- =========================================================================
-- 2. Project Logs (`public.project_logs`) with JSONB payload
-- =========================================================================

create table if not exists public.project_logs (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.projects (id) on delete cascade,
  owner_id uuid references auth.users (id) on delete set null default auth.uid(),
  task_id text,
  run_id text,
  agent_name text,
  provider text,
  level text not null default 'info'
    check (level in ('debug', 'info', 'warn', 'warning', 'error', 'critical', 'audit')),
  event_type text not null default 'log',
  message text not null default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_logs
  add column if not exists project_id text references public.projects (id) on delete cascade,
  add column if not exists owner_id uuid references auth.users (id) on delete set null default auth.uid(),
  add column if not exists task_id text,
  add column if not exists run_id text,
  add column if not exists agent_name text,
  add column if not exists provider text,
  add column if not exists level text not null default 'info',
  add column if not exists event_type text not null default 'log',
  add column if not exists message text not null default '',
  add column if not exists payload jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

comment on table public.project_logs is
  'Structured realtime event and execution log stream per project with a JSONB payload.';

-- =========================================================================
-- 3. Agent Assignments (`public.agent_assignments`)
-- =========================================================================

create table if not exists public.agent_assignments (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.projects (id) on delete cascade,
  owner_id uuid references auth.users (id) on delete set null default auth.uid(),
  role text not null,
  agent_name text not null,
  provider text not null default 'anthropic',
  model text not null default 'claude-3-7-sonnet',
  status text not null default 'idle'
    check (status in ('idle', 'active', 'running', 'paused', 'blocked', 'completed', 'error', 'offline')),
  is_primary boolean not null default false,
  system_prompt text not null default '',
  instructions text not null default '',
  config jsonb not null default '{}'::jsonb,
  assigned_task_id text,
  last_active_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, role, agent_name)
);

alter table public.agent_assignments
  add column if not exists project_id text references public.projects (id) on delete cascade,
  add column if not exists owner_id uuid references auth.users (id) on delete set null default auth.uid(),
  add column if not exists role text not null default 'specialist',
  add column if not exists agent_name text not null default 'CodingAgent',
  add column if not exists provider text not null default 'anthropic',
  add column if not exists model text not null default 'claude-3-7-sonnet',
  add column if not exists status text not null default 'idle',
  add column if not exists is_primary boolean not null default false,
  add column if not exists system_prompt text not null default '',
  add column if not exists instructions text not null default '',
  add column if not exists config jsonb not null default '{}'::jsonb,
  add column if not exists assigned_task_id text,
  add column if not exists last_active_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

comment on table public.agent_assignments is
  'Per-project specialist and advisor agent assignments, models, roles, and live status.';

-- =========================================================================
-- 4. Provider Configs (`public.provider_configs`)
-- =========================================================================

create table if not exists public.provider_configs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete cascade default auth.uid(),
  project_id text references public.projects (id) on delete cascade,
  provider text not null,
  display_name text not null default '',
  enabled boolean not null default true,
  is_default boolean not null default false,
  default_model text not null default '',
  available_models jsonb not null default '[]'::jsonb,
  base_url text,
  api_key_masked text not null default '',
  key_last4 text not null default '',
  has_secret boolean not null default false,
  rate_limit_rpm integer,
  monthly_cap_usd numeric(10,2),
  priority integer not null default 100,
  health_status text not null default 'unknown'
    check (health_status in ('healthy', 'degraded', 'down', 'unknown', 'unconfigured')),
  last_verified_at timestamptz,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.provider_configs
  add column if not exists owner_id uuid references auth.users (id) on delete cascade default auth.uid(),
  add column if not exists project_id text references public.projects (id) on delete cascade,
  add column if not exists provider text not null default 'anthropic',
  add column if not exists display_name text not null default '',
  add column if not exists enabled boolean not null default true,
  add column if not exists is_default boolean not null default false,
  add column if not exists default_model text not null default '',
  add column if not exists available_models jsonb not null default '[]'::jsonb,
  add column if not exists base_url text,
  add column if not exists api_key_masked text not null default '',
  add column if not exists key_last4 text not null default '',
  add column if not exists has_secret boolean not null default false,
  add column if not exists rate_limit_rpm integer,
  add column if not exists monthly_cap_usd numeric(10,2),
  add column if not exists priority integer not null default 100,
  add column if not exists health_status text not null default 'unknown',
  add column if not exists last_verified_at timestamptz,
  add column if not exists config jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

comment on table public.provider_configs is
  'Global and per-project AI/cloud provider configurations, models, masked key metadata, and routing priority.';

-- =========================================================================
-- 5. User Preferences (`public.user_preferences` with `font_scale`)
-- =========================================================================

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  font_scale numeric(4,2) not null default 1.00
    check (font_scale >= 0.75 and font_scale <= 1.75),
  theme text not null default 'dark'
    check (theme in ('dark', 'light', 'system')),
  density text not null default 'normal'
    check (density in ('compact', 'normal', 'expanded')),
  default_advisor_provider text not null default 'anthropic',
  default_advisor_agent text not null default 'CoordinatorAgent',
  sidebar_collapsed boolean not null default false,
  notifications_enabled boolean not null default true,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_preferences
  add column if not exists font_scale numeric(4,2) not null default 1.00,
  add column if not exists theme text not null default 'dark',
  add column if not exists density text not null default 'normal',
  add column if not exists default_advisor_provider text not null default 'anthropic',
  add column if not exists default_advisor_agent text not null default 'CoordinatorAgent',
  add column if not exists sidebar_collapsed boolean not null default false,
  add column if not exists notifications_enabled boolean not null default true,
  add column if not exists preferences jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

comment on table public.user_preferences is
  'Per-operator UI and workshop preferences including font_scale, theme, and density.';

-- =========================================================================
-- 6. Indexes
-- =========================================================================

-- projects indexes
create index if not exists idx_projects_owner_id on public.projects (owner_id);
create index if not exists idx_projects_slug on public.projects (slug);
create index if not exists idx_projects_status on public.projects (status);
create index if not exists idx_projects_archetype on public.projects (archetype);
create index if not exists idx_projects_source_type on public.projects (source_type);
create index if not exists idx_projects_updated_at on public.projects (updated_at desc);

-- project_logs indexes (including GIN index on jsonb payload)
create index if not exists idx_project_logs_project_created on public.project_logs (project_id, created_at desc);
create index if not exists idx_project_logs_level on public.project_logs (level);
create index if not exists idx_project_logs_event_type on public.project_logs (event_type);
create index if not exists idx_project_logs_payload_gin on public.project_logs using gin (payload);

-- agent_assignments indexes
create index if not exists idx_agent_assignments_project_id on public.agent_assignments (project_id);
create index if not exists idx_agent_assignments_status on public.agent_assignments (status);
create index if not exists idx_agent_assignments_provider on public.agent_assignments (provider);

-- provider_configs indexes
create unique index if not exists idx_provider_configs_global_unique
  on public.provider_configs ( coalesce(owner_id, '00000000-0000-0000-0000-000000000000'::uuid), provider )
  where project_id is null;
create unique index if not exists idx_provider_configs_project_unique
  on public.provider_configs ( project_id, provider )
  where project_id is not null;
create index if not exists idx_provider_configs_provider on public.provider_configs (provider);

-- =========================================================================
-- 7. `updated_at` Triggers
-- =========================================================================

do $$
declare
  tbl text;
  trigger_tables constant text[] := array[
    'projects',
    'project_logs',
    'agent_assignments',
    'provider_configs',
    'user_preferences',
    'project_registry',
    'project_budgets'
  ];
begin
  foreach tbl in array trigger_tables loop
    if to_regclass(format('public.%I', tbl)) is not null and exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = tbl
        and column_name = 'updated_at'
    ) then
      execute format('drop trigger if exists trg_%I_updated_at on public.%I', tbl, tbl);
      execute format(
        'create trigger trg_%I_updated_at before update on public.%I '
        'for each row execute function public.set_updated_at()',
        tbl, tbl
      );
    end if;
  end loop;
end
$$;

-- =========================================================================
-- 8. Supabase Realtime Publication (`projects`, `project_logs`, `agent_assignments`)
-- =========================================================================

do $$
declare
  rt_table text;
  rt_tables constant text[] := array[
    'projects',
    'project_logs',
    'agent_assignments'
  ];
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  foreach rt_table in array rt_tables loop
    if to_regclass(format('public.%I', rt_table)) is not null then
      -- Set REPLICA IDENTITY FULL so UPDATE/DELETE realtime payloads carry previous values
      execute format('alter table public.%I replica identity full', rt_table);

      if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = rt_table
      ) then
        execute format('alter publication supabase_realtime add table public.%I', rt_table);
      end if;
    end if;
  end loop;
end
$$;

-- =========================================================================
-- 9. Row Level Security (RLS) & Privileges
-- =========================================================================

do $$
declare
  t text;
  p record;
  workshop_tables constant text[] := array[
    'projects',
    'project_logs',
    'agent_assignments',
    'provider_configs',
    'user_preferences'
  ];
begin
  foreach t in array workshop_tables loop
    -- Enable and force RLS on every table
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);

    -- Revoke anon access and TRUNCATE from authenticated
    execute format('revoke all on table public.%I from anon', t);
    execute format('revoke all on table public.%I from authenticated', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);

    -- Drop any legacy permissive policies to keep state clean and idempotent
    for p in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = t
    loop
      execute format('drop policy if exists %I on public.%I', p.policyname, t);
    end loop;
  end loop;

  -- Owner-only policies on workshop tables (aligns with 20261020000000_lock_db_to_owner.sql)
  -- For projects, project_logs, agent_assignments, and provider_configs:
  -- Allows the registered app owner (`public.is_app_owner()`) OR matching `owner_id = auth.uid()`
  -- when `app_owner` is not yet populated.
  create policy "Owner only projects" on public.projects
    as permissive for all to authenticated
    using (
      public.is_app_owner()
      or (owner_id is not null and owner_id = (select auth.uid()) and not exists (select 1 from public.app_owner))
    )
    with check (
      public.is_app_owner()
      or (owner_id is not null and owner_id = (select auth.uid()) and not exists (select 1 from public.app_owner))
    );

  create policy "Owner only project_logs" on public.project_logs
    as permissive for all to authenticated
    using (
      public.is_app_owner()
      or (owner_id is not null and owner_id = (select auth.uid()) and not exists (select 1 from public.app_owner))
    )
    with check (
      public.is_app_owner()
      or (owner_id is not null and owner_id = (select auth.uid()) and not exists (select 1 from public.app_owner))
    );

  create policy "Owner only agent_assignments" on public.agent_assignments
    as permissive for all to authenticated
    using (
      public.is_app_owner()
      or (owner_id is not null and owner_id = (select auth.uid()) and not exists (select 1 from public.app_owner))
    )
    with check (
      public.is_app_owner()
      or (owner_id is not null and owner_id = (select auth.uid()) and not exists (select 1 from public.app_owner))
    );

  create policy "Owner only provider_configs" on public.provider_configs
    as permissive for all to authenticated
    using (
      public.is_app_owner()
      or (owner_id is not null and owner_id = (select auth.uid()) and not exists (select 1 from public.app_owner))
    )
    with check (
      public.is_app_owner()
      or (owner_id is not null and owner_id = (select auth.uid()) and not exists (select 1 from public.app_owner))
    );

  -- user_preferences: users can manage their own preference row (when owner or self)
  create policy "Owner only user_preferences" on public.user_preferences
    as permissive for all to authenticated
    using (
      public.is_app_owner()
      or (user_id = (select auth.uid()) and not exists (select 1 from public.app_owner))
    )
    with check (
      public.is_app_owner()
      or (user_id = (select auth.uid()) and not exists (select 1 from public.app_owner))
    );
end
$$;
