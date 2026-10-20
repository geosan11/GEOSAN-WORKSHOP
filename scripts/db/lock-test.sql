-- Behaviour tests for supabase/migrations/20261020000000_lock_db_to_owner.sql
-- Run by run-lock-test.sh as the "postgres" role after schema.sql and the
-- lock migration. Every check raises an exception on failure, so with
-- ON_ERROR_STOP the script exits non-zero at the first broken expectation.

\set owner_id '11111111-1111-1111-1111-111111111111'
\set other_id '22222222-2222-2222-2222-222222222222'
\set owner_claims '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}'
\set other_claims '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}'

-- ---------------------------------------------------------------- structure
do $$
declare n int;
begin
  select count(*) into n from pg_policies
   where schemaname = 'public' and (qual = 'true' or with_check = 'true');
  if n <> 0 then raise exception 'FAIL: % open (true) policies remain', n; end if;

  select count(*) into n from pg_policies
   where schemaname = 'public' and policyname not like 'Owner only %';
  if n <> 0 then raise exception 'FAIL: % non-owner policies remain', n; end if;

  select count(*) into n from pg_policies where schemaname = 'public';
  if n <> 7 then raise exception 'FAIL: expected 7 owner policies, found %', n; end if;

  select count(*) into n from pg_class c join pg_namespace s on s.oid = c.relnamespace
   where s.nspname = 'public' and c.relkind = 'r'
     and not (c.relrowsecurity and c.relforcerowsecurity);
  if n <> 0 then raise exception 'FAIL: % public tables without RLS enabled+forced', n; end if;

  select count(*) into n from information_schema.role_table_grants
   where table_schema = 'public' and grantee = 'anon';
  if n <> 0 then raise exception 'FAIL: anon still has % table grants', n; end if;

  select count(*) into n from information_schema.role_table_grants
   where table_schema = 'public' and table_name = 'app_owner'
     and grantee in ('anon', 'authenticated');
  if n <> 0 then raise exception 'FAIL: API roles have grants on app_owner'; end if;

  if has_function_privilege('anon', 'public.is_app_owner()', 'execute') then
    raise exception 'FAIL: anon can execute is_app_owner()';
  end if;

  if not (select prosecdef from pg_proc where oid = 'public.is_app_owner()'::regprocedure) then
    raise exception 'FAIL: is_app_owner() is not SECURITY DEFINER';
  end if;
  if not exists (select 1 from pg_proc where oid = 'public.is_app_owner()'::regprocedure
                 and proconfig @> array['search_path=""']) then
    raise exception 'FAIL: is_app_owner() search_path not pinned';
  end if;
  raise notice 'PASS structure: 7 owner-only policies, no open policies, RLS enabled+forced on all public tables, anon has no grants';
end $$;

-- A table created later by postgres must not be granted to anon.
create table public.zz_future_table (id int);
do $$ begin
  if has_table_privilege('anon', 'public.zz_future_table', 'select') then
    raise exception 'FAIL: new tables are still auto-granted to anon';
  end if;
  raise notice 'PASS default privileges: new tables are not granted to anon';
end $$;
drop table public.zz_future_table;

-- ------------------------------------------- owner not registered yet: denied
begin;
set local role authenticated;
select set_config('request.jwt.claims', :'owner_claims', true);
do $$ declare n int; begin
  select count(*) into n from public.project_registry;
  if n <> 0 then raise exception 'FAIL: unregistered user saw % rows', n; end if;
  raise notice 'PASS before owner is registered: even Sanni''s account sees 0 rows';
end $$;
rollback;

-- Register the owner (what Sanni does once in the SQL editor).
insert into public.app_owner (user_id) values (:'owner_id') on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------- anon
begin;
set local role anon;
do $$ begin
  begin perform 1 from public.project_registry;
    raise exception 'FAIL: anon could select project_registry';
  exception when insufficient_privilege then null; end;
  begin insert into public.project_registry (id, name, vertical) values ('anon-x', 'x', 'fintech');
    raise exception 'FAIL: anon could insert';
  exception when insufficient_privilege then null; end;
  begin update public.project_registry set name = 'pwned';
    raise exception 'FAIL: anon could update';
  exception when insufficient_privilege then null; end;
  begin delete from public.cost_events;
    raise exception 'FAIL: anon could delete';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.app_owner;
    raise exception 'FAIL: anon could read app_owner';
  exception when insufficient_privilege then null; end;
  begin perform public.is_app_owner();
    raise exception 'FAIL: anon could call is_app_owner()';
  exception when insufficient_privilege then null; end;
  raise notice 'PASS anon: select/insert/update/delete denied (42501), app_owner and is_app_owner() denied';
end $$;
rollback;

-- Same for every app table, select + insert attempt.
begin;
set local role anon;
do $$ declare t text; begin
  foreach t in array array['project_registry','agent_tasks','cost_events','qa_runs','qa_findings','project_budgets','prompt_versions'] loop
    begin execute format('select 1 from public.%I limit 1', t);
      raise exception 'FAIL: anon could select %', t;
    exception when insufficient_privilege then null; end;
  end loop;
  raise notice 'PASS anon: select denied on all 7 app tables';
end $$;
rollback;

-- -------------------------------------------- authenticated, not the owner
begin;
set local role authenticated;
select set_config('request.jwt.claims', :'other_claims', true);
do $$ declare n int; t text; begin
  if public.is_app_owner() then raise exception 'FAIL: other user is owner'; end if;
  foreach t in array array['project_registry','agent_tasks','cost_events','qa_runs','qa_findings','project_budgets','prompt_versions'] loop
    execute format('select count(*) from public.%I', t) into n;
    if n <> 0 then raise exception 'FAIL: non-owner saw % rows in %', n, t; end if;
  end loop;

  begin insert into public.project_registry (id, name, vertical) values ('evil-1', 'x', 'fintech');
    raise exception 'FAIL: non-owner could insert';
  exception when insufficient_privilege then null; end;  -- RLS violation is 42501

  update public.project_registry set name = 'pwned';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: non-owner updated % rows', n; end if;

  delete from public.project_registry;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: non-owner deleted % rows', n; end if;

  begin perform 1 from public.app_owner;
    raise exception 'FAIL: non-owner could read app_owner';
  exception when insufficient_privilege then null; end;
  begin insert into public.app_owner (user_id) values ('22222222-2222-2222-2222-222222222222');
    raise exception 'FAIL: non-owner could add themselves to app_owner';
  exception when insufficient_privilege then null; end;
  raise notice 'PASS non-owner: 0 rows on all 7 tables, insert rejected by RLS, update/delete touch 0 rows, cannot read or join app_owner';
end $$;
rollback;

-- Missing/blank JWT on the authenticated role behaves like a stranger.
begin;
set local role authenticated;
do $$ declare n int; begin
  select count(*) into n from public.project_registry;
  if n <> 0 then raise exception 'FAIL: authenticated without sub saw % rows', n; end if;
  raise notice 'PASS authenticated with no sub claim: 0 rows';
end $$;
rollback;

-- ---------------------------------------------------------------- the owner
begin;
set local role authenticated;
select set_config('request.jwt.claims', :'owner_claims', true);
do $$ declare n int; begin
  if not public.is_app_owner() then raise exception 'FAIL: owner not recognised'; end if;

  select count(*) into n from public.project_registry;
  if n <> 4 then raise exception 'FAIL: owner saw % seeded projects, expected 4', n; end if;

  insert into public.project_registry (id, name, vertical) values ('proj-test-999', 'Owner test', 'fintech');
  insert into public.agent_tasks (id, project_id, task_type, prompt) values ('task-test-1', 'proj-test-999', 'FIX_BUG', 'hello');
  insert into public.cost_events (id, project_id, task_id, cost_usd) values ('cost-test-1', 'proj-test-999', 'task-test-1', 0.5);
  insert into public.qa_runs (id, project_id) values ('qa-test-1', 'proj-test-999');
  insert into public.qa_findings (id, run_id, project_id, severity, category, title, description)
    values ('f-test-1', 'qa-test-1', 'proj-test-999', 'low', 'ux', 't', 'd');
  insert into public.project_budgets (project_id) values ('proj-test-999');
  insert into public.prompt_versions (id, role, system_instruction) values ('pv-test-1', 'coordinator', 'be nice');

  update public.project_registry set name = 'Owner test (renamed)' where id = 'proj-test-999';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: owner update touched % rows', n; end if;

  select count(*) into n from public.agent_tasks where id = 'task-test-1';
  if n <> 1 then raise exception 'FAIL: owner cannot read back inserted task'; end if;

  delete from public.project_registry where id = 'proj-test-999';  -- cascades
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: owner delete touched % rows', n; end if;

  -- Owner still cannot reach app_owner through the API role.
  begin perform 1 from public.app_owner;
    raise exception 'FAIL: owner could read app_owner via API role';
  exception when insufficient_privilege then null; end;
  raise notice 'PASS owner: reads 4 seeded projects, inserts into all 7 tables, updates, deletes (with cascade)';
end $$;
rollback;

-- service_role (server-side secret key) still bypasses RLS, as in Supabase.
begin;
set local role service_role;
do $$ declare n int; begin
  select count(*) into n from public.project_registry;
  if n <> 4 then raise exception 'FAIL: service_role saw % rows', n; end if;
  raise notice 'PASS service_role: bypasses RLS (4 rows) as expected for the secret key';
end $$;
rollback;

\echo ALL LOCK TESTS PASSED
