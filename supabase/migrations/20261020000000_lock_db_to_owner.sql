-- =========================================================================
-- Lock the GEOSAN-WORKSHOP database to a single owner account.
--
-- Before this migration, supabase/schema.sql created "Public read ..." and
-- "Public write ..." policies with `using (true)` on every table, so anyone
-- holding the anon key (it ships in the browser bundle) could read, insert,
-- update and delete all project data.
--
-- After this migration:
--   * every app table has RLS enabled AND forced;
--   * the anon role has no privileges on any app table;
--   * the only policy on each table lets a signed-in user through when
--     public.is_app_owner() is true, i.e. their auth.uid() is listed in
--     public.app_owner;
--   * public.app_owner itself is unreachable through the API.
--
-- Nothing is left public: the app's demo mode runs entirely on local data
-- and never talks to Supabase, so no table has to stay readable for it.
--
-- Safe to run more than once (idempotent). It does not delete or change any
-- row of project data. See docs/SECURITY-DB.md for how to apply it and how
-- to register the owner.
-- =========================================================================

-- 1. Owner registry -------------------------------------------------------
create table if not exists public.app_owner (
  user_id uuid primary key,
  created_at timestamptz not null default now()
);

comment on table public.app_owner is
  'User ids (auth.users.id) allowed to read and write app data. Managed from the SQL editor only.';

alter table public.app_owner enable row level security;
alter table public.app_owner force row level security;
-- No policies on purpose: anon/authenticated get nothing. The SQL editor
-- (postgres role, BYPASSRLS) and is_app_owner() below can still read it.
revoke all on table public.app_owner from anon, authenticated;

-- 2. Owner check ----------------------------------------------------------
-- SECURITY DEFINER so it can read app_owner even though API roles cannot.
-- search_path is pinned to '' and every name is schema-qualified, so a
-- caller cannot hijack it with objects in another schema.
create or replace function public.is_app_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.app_owner o
    where o.user_id = (select auth.uid())
  );
$$;

comment on function public.is_app_owner() is
  'True when the current request''s auth.uid() is registered in public.app_owner.';

revoke all on function public.is_app_owner() from public;
revoke all on function public.is_app_owner() from anon;
grant execute on function public.is_app_owner() to authenticated;

-- 3. Lock every app table -------------------------------------------------
do $$
declare
  t text;
  p record;
  app_tables constant text[] := array[
    'project_registry',
    'agent_tasks',
    'cost_events',
    'qa_runs',
    'qa_findings',
    'project_budgets',
    'prompt_versions'
  ];
begin
  foreach t in array app_tables loop
    if to_regclass(format('public.%I', t)) is null then
      raise notice 'lock_db_to_owner: table public.% does not exist yet, skipped (re-run this migration after creating it)', t;
      continue;
    end if;

    -- 3a. Drop the open policies created by supabase/schema.sql.
    execute format('drop policy if exists %I on public.%I', 'Public read ' || t, t);
    execute format('drop policy if exists %I on public.%I', 'Public write ' || t, t);

    -- 3b. Permissive policies are OR-ed together, so any other leftover
    --     policy (for example one added by hand in the dashboard) could
    --     re-open the table. Drop everything except our own policy.
    for p in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = t
        and policyname <> 'Owner only ' || t
    loop
      raise notice 'lock_db_to_owner: dropping extra policy "%" on public.%', p.policyname, t;
      execute format('drop policy if exists %I on public.%I', p.policyname, t);
    end loop;

    -- 3c. RLS on, and forced so even the table owner goes through policies
    --     (roles with BYPASSRLS, like postgres/service_role, still bypass).
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);

    -- 3d. No anon access at all; signed-in users get the table privileges
    --     back, and the policy below decides whether they see any rows.
    execute format('revoke all on table public.%I from anon', t);
    execute format('revoke all on table public.%I from authenticated', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);

    -- 3e. The single owner-only policy (recreated so re-runs stay in sync).
    execute format('drop policy if exists %I on public.%I', 'Owner only ' || t, t);
    execute format(
      'create policy %I on public.%I as permissive for all to authenticated '
      'using (public.is_app_owner()) with check (public.is_app_owner())',
      'Owner only ' || t, t
    );
  end loop;
end
$$;

-- 4. Future tables --------------------------------------------------------
-- Supabase grants anon full privileges on new tables in `public` by
-- default. Stop doing that for tables created later by the role running
-- this migration, so a new table is never public by accident.
alter default privileges in schema public revoke all on tables from anon;
