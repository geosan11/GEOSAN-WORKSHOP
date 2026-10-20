-- Single-winner merge rule for proj-iya-002 when no canonical row exists:
-- ONE old row wins (latest updated_at, then latest created_at, then lowest
-- old id) and BOTH the project row and the budget come from it. Each
-- scenario sets up its own rows on the seeded schema, runs the migration
-- (psql variable :mig) and rolls back. Test data only (throwaway Postgres).
\set ON_ERROR_STOP 1

create function pg_temp.reset_iya() returns void language sql as $$
  delete from public.project_budgets  where project_id in ('proj-iya-002','proj-iya-001','proj-iyanu-002');
  delete from public.project_registry where id         in ('proj-iya-002','proj-iya-001','proj-iyanu-002');
$$;
create function pg_temp.check_iya(scenario text, want_name text, want_budget numeric) returns void
language plpgsql as $$
declare got_name text; got_budget numeric; n bigint;
begin
  select name into got_name from public.project_registry where id = 'proj-iya-002';
  select monthly_limit_usd into got_budget from public.project_budgets where project_id = 'proj-iya-002';
  if got_name is distinct from want_name then
    raise exception 'FAIL % : project row should be %, got %', scenario, want_name, got_name;
  end if;
  if got_budget is distinct from want_budget then
    raise exception 'FAIL % : budget should be % (same winner as the project row), got %', scenario, want_budget, got_budget;
  end if;
  select count(*) into n from (
    select id from public.project_registry where id in ('proj-iya-001','proj-iyanu-002')
    union all select project_id from public.project_budgets where project_id in ('proj-iya-001','proj-iyanu-002')
    union all select project_id from public.agent_tasks where project_id in ('proj-iya-001','proj-iyanu-002')) x;
  if n <> 0 then raise exception 'FAIL % : % old-id row(s) left', scenario, n; end if;
  select count(*) into n from public.agent_tasks where id in ('t-sw-1','t-sw-2') and project_id = 'proj-iya-002';
  if n <> 2 then raise exception 'FAIL % : tasks of both old rows must move to proj-iya-002 (got %)', scenario, n; end if;
  raise notice 'PASS %', scenario;
end $$;

-- A. The reviewer's case: the project row is newer in proj-iyanu-002 but the
--    budget row is newer in proj-iya-001. Both must come from proj-iyanu-002.
begin;
select pg_temp.reset_iya();
insert into public.project_registry (id, name, vertical, created_at, updated_at) values
  ('proj-iya-001',   'A iya-001',   'agriculture', '2026-08-01', '2026-09-01'),
  ('proj-iyanu-002', 'A iyanu-002', 'agriculture', '2026-08-01', '2026-10-15');
insert into public.project_budgets (project_id, monthly_limit_usd, updated_at) values
  ('proj-iya-001', 333, '2026-10-18'),
  ('proj-iyanu-002', 777, '2026-09-02');
insert into public.agent_tasks (id, project_id, task_type, prompt) values
  ('t-sw-1', 'proj-iya-001', 'FIX_BUG', 'a'), ('t-sw-2', 'proj-iyanu-002', 'FIX_BUG', 'b');
\i :mig
select pg_temp.check_iya('single winner A (reviewer case): project newer in proj-iyanu-002, budget newer in proj-iya-001 -> both from proj-iyanu-002', 'A iyanu-002', 777);
rollback;

-- B. Tie on updated_at: the later created_at wins (not the lowest id), and
--    its budget comes with it even though the other budget is newer.
begin;
select pg_temp.reset_iya();
insert into public.project_registry (id, name, vertical, created_at, updated_at) values
  ('proj-iya-001',   'B iya-001',   'agriculture', '2026-08-01', '2026-10-01'),
  ('proj-iyanu-002', 'B iyanu-002', 'agriculture', '2026-09-01', '2026-10-01');
insert into public.project_budgets (project_id, monthly_limit_usd, updated_at) values
  ('proj-iya-001', 333, '2026-10-05'),
  ('proj-iyanu-002', 777, '2026-09-01');
insert into public.agent_tasks (id, project_id, task_type, prompt) values
  ('t-sw-1', 'proj-iya-001', 'FIX_BUG', 'a'), ('t-sw-2', 'proj-iyanu-002', 'FIX_BUG', 'b');
\i :mig
select pg_temp.check_iya('single winner B (tie on updated_at): later created_at wins, budget from the same row', 'B iyanu-002', 777);
rollback;

-- C. Full tie (same updated_at and created_at): the lowest old id wins
--    (proj-iya-001 < proj-iyanu-002), with its own budget.
begin;
select pg_temp.reset_iya();
insert into public.project_registry (id, name, vertical, created_at, updated_at) values
  ('proj-iyanu-002', 'C iyanu-002', 'agriculture', '2026-08-01', '2026-10-01'),
  ('proj-iya-001',   'C iya-001',   'agriculture', '2026-08-01', '2026-10-01');
insert into public.project_budgets (project_id, monthly_limit_usd, updated_at) values
  ('proj-iya-001', 333, '2026-09-01'),
  ('proj-iyanu-002', 777, '2026-10-05');
insert into public.agent_tasks (id, project_id, task_type, prompt) values
  ('t-sw-1', 'proj-iya-001', 'FIX_BUG', 'a'), ('t-sw-2', 'proj-iyanu-002', 'FIX_BUG', 'b');
\i :mig
select pg_temp.check_iya('single winner C (full tie): lowest old id proj-iya-001 wins, budget from the same row', 'C iya-001', 333);
rollback;

-- D. The winner has no budget row, the next-ranked old row has one: only the
--    budget falls back to it; the project fields still come from the winner.
begin;
select pg_temp.reset_iya();
insert into public.project_registry (id, name, vertical, created_at, updated_at) values
  ('proj-iya-001',   'D iya-001',   'agriculture', '2026-08-01', '2026-09-01'),
  ('proj-iyanu-002', 'D iyanu-002', 'agriculture', '2026-08-01', '2026-10-15');
insert into public.project_budgets (project_id, monthly_limit_usd, updated_at) values
  ('proj-iya-001', 333, '2026-10-18');
insert into public.agent_tasks (id, project_id, task_type, prompt) values
  ('t-sw-1', 'proj-iya-001', 'FIX_BUG', 'a'), ('t-sw-2', 'proj-iyanu-002', 'FIX_BUG', 'b');
\i :mig
select pg_temp.check_iya('single winner D: winner has no budget -> next-ranked old row''s budget is used; project fields from the winner', 'D iyanu-002', 333);
rollback;

-- D2. Neither old row has a budget: proj-iya-002 has none (the app then
--     blocks AI work for it).
begin;
select pg_temp.reset_iya();
insert into public.project_registry (id, name, vertical, created_at, updated_at) values
  ('proj-iya-001',   'D2 iya-001',   'agriculture', '2026-08-01', '2026-09-01'),
  ('proj-iyanu-002', 'D2 iyanu-002', 'agriculture', '2026-08-01', '2026-10-15');
insert into public.agent_tasks (id, project_id, task_type, prompt) values
  ('t-sw-1', 'proj-iya-001', 'FIX_BUG', 'a'), ('t-sw-2', 'proj-iyanu-002', 'FIX_BUG', 'b');
\i :mig
select pg_temp.check_iya('single winner D2: no old budget at all -> proj-iya-002 has no budget row', 'D2 iyanu-002', null);
rollback;

-- E. Canonical proj-iya-002 exists (no canonical budget) - unchanged rule:
--    canonical project row kept; old budgets tied on updated_at -> lowest id.
begin;
select pg_temp.reset_iya();
insert into public.project_registry (id, name, vertical, created_at, updated_at) values
  ('proj-iya-002',   'E canonical', 'agriculture', '2026-01-01', '2026-01-01'),
  ('proj-iyanu-002', 'E iyanu-002', 'agriculture', '2026-08-01', '2026-10-15'),
  ('proj-iya-001',   'E iya-001',   'agriculture', '2026-08-01', '2026-10-16');
insert into public.project_budgets (project_id, monthly_limit_usd, updated_at) values
  ('proj-iyanu-002', 777, '2026-10-01'),
  ('proj-iya-001', 333, '2026-10-01');
insert into public.agent_tasks (id, project_id, task_type, prompt) values
  ('t-sw-1', 'proj-iya-001', 'FIX_BUG', 'a'), ('t-sw-2', 'proj-iyanu-002', 'FIX_BUG', 'b');
\i :mig
select pg_temp.check_iya('canonical E: proj-iya-002 exists -> it wins; old budgets tied on updated_at -> lowest id', 'E canonical', 333);
rollback;
