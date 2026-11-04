-- =========================================================================
-- Behaviour tests for supabase/migrations/20261104000000_fix_workshop_owner_policies.sql
-- Run by scripts/db/run-owner-policies-test.sh as role postgres.
--
-- Checks:
--   (a) before migration: registered owner reading public.projects fails with
--       permission denied (proves the bug).
--   (b) after migration: registered owner can select/insert/update/delete on
--       projects and project_logs and select on agent_assignments,
--       provider_configs, user_preferences.
--   (c) a different authenticated user sees 0 rows and cannot insert.
--   (d) anon is denied.
--   (e) with app_owner empty, a user sees only rows where owner_id = their uid.
--   (g) authenticated still cannot select from public.app_owner directly.
-- =========================================================================

\set owner_id '11111111-1111-1111-1111-111111111111'
\set other_id '22222222-2222-2222-2222-222222222222'
\set owner_claims '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}'
\set other_claims '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}'

insert into auth.users (id, email) values
  (:'owner_id', 'sanni@example.com'),
  (:'other_id', 'stranger@example.com')
on conflict (id) do nothing;

\if :{?stage}
\else
  \set stage auto
\endif

select case
  when :'stage' = 'pre' then 1
  when :'stage' = 'post' then 0
  when to_regprocedure('public.app_owner_unset()') is null then 1
  else 0
end as is_pre \gset

\if :is_pre
-- =========================================================================
-- Stage PRE: Check (a)
-- =========================================================================
insert into public.app_owner (user_id) values (:'owner_id') on conflict (user_id) do nothing;

begin;
set local role authenticated;
select set_config('request.jwt.claims', :'owner_claims', true);
do $$
begin
  begin
    perform count(*) from public.projects;
    raise exception 'FAIL (a): expected permission denied reading public.projects before fix, but query succeeded';
  exception
    when insufficient_privilege then
      raise notice 'PASS (a): registered owner reading public.projects fails with permission denied before fix (proves bug)';
  end;
end $$;
rollback;

\else
-- =========================================================================
-- Stage POST: Checks (b), (c), (d), (e), (g)
-- =========================================================================

-- Ensure owner is registered in app_owner
insert into public.app_owner (user_id) values (:'owner_id') on conflict (user_id) do nothing;

-- -------------------------------------------------------------------------
-- Check (b): registered owner can select/insert/update/delete on projects &
-- project_logs, and select on the other 3 tables.
-- -------------------------------------------------------------------------
begin;
set local role authenticated;
select set_config('request.jwt.claims', :'owner_claims', true);
do $$
declare
  n int;
begin
  -- projects: select
  perform count(*) from public.projects;

  -- projects: insert
  insert into public.projects (id, name, slug, description)
    values ('proj-test-b', 'Test B', 'test-b', 'initial description');

  -- projects: update
  update public.projects set description = 'updated description' where id = 'proj-test-b';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL (b): owner update public.projects affected % rows', n; end if;

  -- project_logs: select
  perform count(*) from public.project_logs;

  -- project_logs: insert
  insert into public.project_logs (id, project_id, message)
    values ('a0000000-0000-0000-0000-000000000001', 'proj-test-b', 'initial log');

  -- project_logs: update
  update public.project_logs set message = 'updated log' where id = 'a0000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL (b): owner update public.project_logs affected % rows', n; end if;

  -- project_logs: delete
  delete from public.project_logs where id = 'a0000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL (b): owner delete public.project_logs affected % rows', n; end if;

  -- projects: delete
  delete from public.projects where id = 'proj-test-b';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL (b): owner delete public.projects affected % rows', n; end if;

  -- other 3 tables: select
  perform count(*) from public.agent_assignments;
  perform count(*) from public.provider_configs;
  perform count(*) from public.user_preferences;

  raise notice 'PASS (b): registered owner can select/insert/update/delete on projects and project_logs and select on agent_assignments, provider_configs, user_preferences';
end $$;
rollback;

-- -------------------------------------------------------------------------
-- Check (c): a different authenticated user sees 0 rows and cannot insert
-- -------------------------------------------------------------------------
insert into public.projects (id, owner_id, name, slug)
  values ('proj-seed-c', :'owner_id', 'Seed C', 'seed-c')
  on conflict (id) do nothing;
insert into public.project_logs (id, project_id, owner_id, message)
  values ('b0000000-0000-0000-0000-000000000001', 'proj-seed-c', :'owner_id', 'seed log')
  on conflict (id) do nothing;
insert into public.agent_assignments (id, project_id, owner_id, agent_name, role)
  values ('c0000000-0000-0000-0000-000000000001', 'proj-seed-c', :'owner_id', 'AgentC', 'coordinator')
  on conflict (id) do nothing;
insert into public.provider_configs (id, project_id, owner_id, provider)
  values ('d0000000-0000-0000-0000-000000000001', 'proj-seed-c', :'owner_id', 'anthropic')
  on conflict (id) do nothing;
insert into public.user_preferences (user_id)
  values (:'owner_id')
  on conflict (user_id) do nothing;

begin;
set local role authenticated;
select set_config('request.jwt.claims', :'other_claims', true);
do $$
declare
  n int;
begin
  select count(*) into n from public.projects;
  if n <> 0 then raise exception 'FAIL (c): other user saw % rows in projects', n; end if;

  select count(*) into n from public.project_logs;
  if n <> 0 then raise exception 'FAIL (c): other user saw % rows in project_logs', n; end if;

  select count(*) into n from public.agent_assignments;
  if n <> 0 then raise exception 'FAIL (c): other user saw % rows in agent_assignments', n; end if;

  select count(*) into n from public.provider_configs;
  if n <> 0 then raise exception 'FAIL (c): other user saw % rows in provider_configs', n; end if;

  select count(*) into n from public.user_preferences;
  if n <> 0 then raise exception 'FAIL (c): other user saw % rows in user_preferences', n; end if;

  begin
    insert into public.projects (id, name, slug) values ('proj-stranger', 'Stranger', 'stranger');
    raise exception 'FAIL (c): other user was able to insert into projects';
  exception
    when insufficient_privilege or check_violation then null;
  end;

  begin
    insert into public.project_logs (project_id, message) values ('proj-seed-c', 'msg');
    raise exception 'FAIL (c): other user was able to insert into project_logs';
  exception
    when insufficient_privilege or check_violation then null;
  end;

  begin
    insert into public.agent_assignments (project_id, agent_name, role) values ('proj-seed-c', 'a', 'r');
    raise exception 'FAIL (c): other user was able to insert into agent_assignments';
  exception
    when insufficient_privilege or check_violation then null;
  end;

  begin
    insert into public.provider_configs (provider) values ('openai');
    raise exception 'FAIL (c): other user was able to insert into provider_configs';
  exception
    when insufficient_privilege or check_violation then null;
  end;

  begin
    insert into public.user_preferences (user_id) values ('22222222-2222-2222-2222-222222222222');
    raise exception 'FAIL (c): other user was able to insert into user_preferences';
  exception
    when insufficient_privilege or check_violation then null;
  end;

  raise notice 'PASS (c): different authenticated user sees 0 rows and cannot insert';
end $$;
rollback;

delete from public.project_logs where id = 'b0000000-0000-0000-0000-000000000001';
delete from public.agent_assignments where id = 'c0000000-0000-0000-0000-000000000001';
delete from public.provider_configs where id = 'd0000000-0000-0000-0000-000000000001';
delete from public.user_preferences where user_id = :'owner_id';
delete from public.projects where id = 'proj-seed-c';

-- -------------------------------------------------------------------------
-- Check (d): anon is denied
-- -------------------------------------------------------------------------
begin;
set local role anon;
do $$
begin
  begin perform count(*) from public.projects; raise exception 'FAIL (d): anon select projects succeeded'; exception when insufficient_privilege then null; end;
  begin perform count(*) from public.project_logs; raise exception 'FAIL (d): anon select project_logs succeeded'; exception when insufficient_privilege then null; end;
  begin perform count(*) from public.agent_assignments; raise exception 'FAIL (d): anon select agent_assignments succeeded'; exception when insufficient_privilege then null; end;
  begin perform count(*) from public.provider_configs; raise exception 'FAIL (d): anon select provider_configs succeeded'; exception when insufficient_privilege then null; end;
  begin perform count(*) from public.user_preferences; raise exception 'FAIL (d): anon select user_preferences succeeded'; exception when insufficient_privilege then null; end;

  begin insert into public.projects (id, name, slug) values ('p', 'p', 'p'); raise exception 'FAIL (d): anon insert projects succeeded'; exception when insufficient_privilege then null; end;
  begin insert into public.project_logs (project_id, message) values ('p', 'm'); raise exception 'FAIL (d): anon insert project_logs succeeded'; exception when insufficient_privilege then null; end;
  begin insert into public.agent_assignments (project_id, agent_name, role) values ('p', 'a', 'r'); raise exception 'FAIL (d): anon insert agent_assignments succeeded'; exception when insufficient_privilege then null; end;
  begin insert into public.provider_configs (provider) values ('openai'); raise exception 'FAIL (d): anon insert provider_configs succeeded'; exception when insufficient_privilege then null; end;
  begin insert into public.user_preferences (user_id) values ('00000000-0000-0000-0000-000000000000'); raise exception 'FAIL (d): anon insert user_preferences succeeded'; exception when insufficient_privilege then null; end;

  begin perform public.app_owner_unset(); raise exception 'FAIL (d): anon called app_owner_unset()'; exception when insufficient_privilege then null; end;

  raise notice 'PASS (d): anon is denied on all 5 workshop tables and app_owner_unset()';
end $$;
rollback;

-- -------------------------------------------------------------------------
-- Check (e): with app_owner empty, a user sees only rows where owner_id = their uid
-- -------------------------------------------------------------------------
delete from public.app_owner;
delete from public.projects where id in ('proj-e-owner', 'proj-e-other', 'proj-e-null');
delete from public.user_preferences where user_id in (:'owner_id', :'other_id');

insert into public.projects (id, owner_id, name, slug) values
  ('proj-e-owner', :'owner_id', 'Owner Project', 'owner-proj'),
  ('proj-e-other', :'other_id', 'Other Project', 'other-proj'),
  ('proj-e-null', null, 'Null Project', 'null-proj');

insert into public.user_preferences (user_id) values
  (:'owner_id'),
  (:'other_id');

-- Owner reads own rows only
begin;
set local role authenticated;
select set_config('request.jwt.claims', :'owner_claims', true);
do $$
declare
  arr text[];
  u_arr uuid[];
begin
  select coalesce(array_agg(id order by id), '{}') into arr from public.projects;
  if arr <> array['proj-e-owner'] then
    raise exception 'FAIL (e): owner saw %, expected [proj-e-owner]', arr;
  end if;

  select coalesce(array_agg(user_id order by user_id), '{}') into u_arr from public.user_preferences;
  if u_arr <> array['11111111-1111-1111-1111-111111111111'::uuid] then
    raise exception 'FAIL (e): owner saw user_preferences %, expected [owner_id]', u_arr;
  end if;
end $$;
rollback;

-- Other user reads own rows only and cannot insert row with another owner_id
begin;
set local role authenticated;
select set_config('request.jwt.claims', :'other_claims', true);
do $$
declare
  arr text[];
  u_arr uuid[];
begin
  select coalesce(array_agg(id order by id), '{}') into arr from public.projects;
  if arr <> array['proj-e-other'] then
    raise exception 'FAIL (e): other user saw %, expected [proj-e-other]', arr;
  end if;

  select coalesce(array_agg(user_id order by user_id), '{}') into u_arr from public.user_preferences;
  if u_arr <> array['22222222-2222-2222-2222-222222222222'::uuid] then
    raise exception 'FAIL (e): other user saw user_preferences %, expected [other_id]', u_arr;
  end if;

  -- Can insert row where owner_id = their uid
  insert into public.projects (id, owner_id, name, slug)
    values ('proj-e-other-inserted', (select auth.uid()), 'Other Ins', 'other-ins');

  -- Cannot insert row where owner_id is someone else
  begin
    insert into public.projects (id, owner_id, name, slug)
      values ('proj-e-spoofed', '11111111-1111-1111-1111-111111111111', 'Spoof', 'spoof');
    raise exception 'FAIL (e): other user inserted row with owner_id = owner';
  exception
    when insufficient_privilege or check_violation then null;
  end;

  -- Cannot insert row where owner_id is null
  begin
    insert into public.projects (id, owner_id, name, slug)
      values ('proj-e-null-spoofed', null, 'Null Spoof', 'null-spoof');
    raise exception 'FAIL (e): other user inserted row with owner_id = null';
  exception
    when insufficient_privilege or check_violation then null;
  end;

  raise notice 'PASS (e): with app_owner empty, user sees and inserts only rows matching their uid';
end $$;
rollback;

-- Clean up and restore app_owner
delete from public.projects where id in ('proj-e-owner', 'proj-e-other', 'proj-e-null', 'proj-e-other-inserted');
delete from public.user_preferences where user_id in (:'owner_id', :'other_id');
insert into public.app_owner (user_id) values (:'owner_id');

-- -------------------------------------------------------------------------
-- Check (g): authenticated still cannot select from public.app_owner directly
-- -------------------------------------------------------------------------
begin;
set local role authenticated;
select set_config('request.jwt.claims', :'owner_claims', true);
do $$
begin
  begin
    perform count(*) from public.app_owner;
    raise exception 'FAIL (g): authenticated was able to select from public.app_owner directly';
  exception
    when insufficient_privilege then
      raise notice 'PASS (g): authenticated still cannot select from public.app_owner directly';
  end;
end $$;
rollback;

do $$ begin raise notice 'ALL OWNER-POLICY CHECKS PASSED'; end $$;

\endif
