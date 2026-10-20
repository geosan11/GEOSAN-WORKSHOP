-- =========================================================================
-- Lock the GEOSAN-WORKSHOP database to a single owner account.
--
-- Earlier versions of supabase/schema.sql created "Public read ..." and
-- "Public write ..." policies with `using (true)` on every table, so anyone
-- holding the anon key (it ships in the browser bundle) could read, insert,
-- update and delete all project data.
--
-- After this migration:
--   * every app data table has RLS enabled AND forced;
--   * the anon role has no privileges on any app table;
--   * the only policy on each table lets a signed-in user through when
--     public.is_app_owner() is true, i.e. their auth.uid() is listed in
--     public.app_owner;
--   * public.app_owner itself is unreachable through the API (RLS on, no
--     policies, no grants); its user_id references auth.users.
--
-- Nothing is left public: the app's demo mode runs entirely on local data
-- and never talks to Supabase, so no table has to stay readable for it.
--
-- Safe to run more than once (idempotent). It does not delete or change any
-- row of project data. See docs/SECURITY-DB.md for how to apply it and how
-- to register the owner.
-- =========================================================================

-- 1. Owner registry -------------------------------------------------------
-- user_id must be a real account; deleting the account removes its owner
-- row too, so a stale id can never grant access.
create table if not exists public.app_owner (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Older copies of this table (from an earlier draft of this migration) may
-- lack the foreign key: drop ids that no longer exist, then add it.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.app_owner'::regclass
      and contype = 'f'
      and confrelid = 'auth.users'::regclass
  ) then
    delete from public.app_owner o
    where not exists (select 1 from auth.users u where u.id = o.user_id);
    alter table public.app_owner
      add constraint app_owner_user_id_fkey
      foreign key (user_id) references auth.users (id) on delete cascade;
  end if;
end
$$;

comment on table public.app_owner is
  'User ids (auth.users.id) allowed to read and write app data. Managed from the SQL editor only.';

-- RLS on, with no policies, so anon/authenticated get nothing. It is NOT
-- forced: is_app_owner() reads this table as its owner, and forcing RLS
-- would hide every row from that owner unless it has BYPASSRLS. The API
-- roles are already shut out by RLS plus having no grants.
alter table public.app_owner enable row level security;
alter table public.app_owner no force row level security;
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

-- 3. Guard, lock and future defaults: ONE block ----------------------------
-- Everything below runs as a single DO block, so it is atomic even when the
-- file is run with plain `psql -f` (no ON_ERROR_STOP, no transaction): if
-- the guard fails, no table is locked and no default privilege changes.
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
  fn_owner oid;
  fn_owner_name text;
  tbl_owner oid;
  tbl_forced boolean;
  can_bypass boolean;
  problems text[] := '{}';
begin
  -- 3a. Guard. is_app_owner() runs as its owner, so that role must be able
  --     to (1) see app_owner's rows despite RLS: own the non-forced table,
  --     or have BYPASSRLS, or be superuser; (2) SELECT app_owner; (3) use
  --     the public and auth schemas and EXECUTE auth.uid(). If any of these
  --     fail, is_app_owner() would always be false (or error) and lock the
  --     owner out, so stop before anything is locked.
  select proowner into fn_owner from pg_proc where oid = 'public.is_app_owner()'::regprocedure;
  fn_owner_name := pg_get_userbyid(fn_owner);
  select relowner, relforcerowsecurity into tbl_owner, tbl_forced
    from pg_class where oid = 'public.app_owner'::regclass;
  select rolbypassrls or rolsuper into can_bypass from pg_roles where oid = fn_owner;

  if not (can_bypass or (fn_owner = tbl_owner and not tbl_forced)) then
    problems := array_append(problems, 'neither owns public.app_owner (with RLS not forced) nor has BYPASSRLS, so it could never see the owner row');
  end if;
  if not has_table_privilege(fn_owner, 'public.app_owner', 'select') then
    problems := array_append(problems, 'has no SELECT on public.app_owner');
  end if;
  if not has_schema_privilege(fn_owner, 'public', 'usage') then
    problems := array_append(problems, 'has no USAGE on schema public');
  end if;
  if not has_schema_privilege(fn_owner, 'auth', 'usage') then
    problems := array_append(problems, 'has no USAGE on schema auth');
  end if;
  if not has_function_privilege(fn_owner, 'auth.uid()', 'execute') then
    problems := array_append(problems, 'has no EXECUTE on auth.uid()');
  end if;
  if cardinality(problems) > 0 then
    raise exception
      'lock_db_to_owner: nothing was locked. is_app_owner() is owned by "%", which %. Run this migration as postgres.',
      fn_owner_name, array_to_string(problems, '; and ');
  end if;

  -- 3b. Lock every app table.
  foreach t in array app_tables loop
    if to_regclass(format('public.%I', t)) is null then
      raise notice 'lock_db_to_owner: table public.% does not exist yet, skipped (re-run this migration after creating it)', t;
      continue;
    end if;

    -- Drop the open policies created by older versions of supabase/schema.sql.
    execute format('drop policy if exists %I on public.%I', 'Public read ' || t, t);
    execute format('drop policy if exists %I on public.%I', 'Public write ' || t, t);

    -- Permissive policies are OR-ed together, so any other leftover policy
    -- (for example one added by hand in the dashboard) could re-open the
    -- table. Drop everything except our own policy.
    for p in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = t
        and policyname <> 'Owner only ' || t
    loop
      raise notice 'lock_db_to_owner: dropping extra policy "%" on public.%', p.policyname, t;
      execute format('drop policy if exists %I on public.%I', p.policyname, t);
    end loop;

    -- RLS on, and forced so even the table owner goes through policies
    -- (roles with BYPASSRLS, like postgres/service_role, still bypass).
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);

    -- No anon access at all. Signed-in users get back only select, insert,
    -- update and delete (not TRUNCATE, which RLS cannot filter), and the
    -- policy below decides whether they see any rows.
    execute format('revoke all on table public.%I from anon', t);
    execute format('revoke all on table public.%I from authenticated', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);

    -- The single owner-only policy (recreated so re-runs stay in sync).
    execute format('drop policy if exists %I on public.%I', 'Owner only ' || t, t);
    execute format(
      'create policy %I on public.%I as permissive for all to authenticated '
      'using (public.is_app_owner()) with check (public.is_app_owner())',
      'Owner only ' || t, t
    );
  end loop;

  -- 3c. Future objects. Supabase grants the API roles full privileges on
  --     new tables, functions and sequences in `public`. Stop doing that
  --     for objects created later by the role running this migration
  --     (normally postgres).
  alter default privileges in schema public revoke all on tables from anon;
  alter default privileges in schema public revoke all on tables from authenticated;
  alter default privileges in schema public revoke all on functions from anon;
  alter default privileges in schema public revoke all on functions from authenticated;
  alter default privileges in schema public revoke all on sequences from anon;

  --     Functions are executable by PUBLIC by default, and anon/authenticated
  --     inherit that, so the two function revokes above do nothing on their
  --     own. A per-schema ("in schema public") revoke from PUBLIC is a no-op
  --     too: Postgres only adds per-schema defaults on top of the global
  --     one. So this one is global. It applies only to functions created by
  --     postgres later, in ANY schema, so grant EXECUTE explicitly where such
  --     a function must be callable through the API. Extension functions
  --     installed by supabase_admin (trusted extensions like pgcrypto) keep
  --     their own grants and stay callable by PUBLIC.
  --     is_app_owner() is unaffected: it already exists and keeps its
  --     explicit grant to authenticated.
  alter default privileges for role postgres revoke execute on functions from public;
  --     Tables, functions and sequences created by other roles (for
  --     example supabase_admin) are not covered at all. See "Rule for new
  --     tables" in docs/SECURITY-DB.md.
end
$$;
