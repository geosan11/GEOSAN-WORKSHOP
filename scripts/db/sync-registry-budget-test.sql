-- Tests for 20261020020000_sync_registry_budget.sql (new, separate migration).
-- Each scenario runs the canonical-id migration (:mig), then the sync (:sync)
-- twice, and rolls back. Test data only (throwaway local Postgres).
\set ON_ERROR_STOP 1

create function pg_temp.reset_iya() returns void language sql as $$
  delete from public.project_budgets  where project_id in ('proj-iya-002','proj-iya-001','proj-iyanu-002');
  delete from public.project_registry where id         in ('proj-iya-002','proj-iya-001','proj-iyanu-002');
$$;
create function pg_temp.reg_budget(p text) returns numeric language sql as $$
  select monthly_budget_usd from public.project_registry where id = p $$;
create function pg_temp.bud(p text) returns numeric language sql as $$
  select monthly_limit_usd from public.project_budgets where project_id = p $$;
create function pg_temp.expect(label text, got numeric, want numeric) returns void language plpgsql as $$
begin
  if got is distinct from want then raise exception 'FAIL % : expected %, got %', label, want, got; end if;
end $$;

-- S1. Fallback case D: winner (proj-iyanu-002, registry budget 1000) has no
--     budget row; next-ranked proj-iya-001 has 333. After #12 the two
--     columns disagree (1000 vs 333); the sync makes registry = 333.
begin;
select pg_temp.reset_iya();
insert into public.project_registry (id, name, vertical, monthly_budget_usd, created_at, updated_at) values
  ('proj-iya-001',   'S1 iya-001',   'agriculture', 500,  '2026-08-01', '2026-09-01'),
  ('proj-iyanu-002', 'S1 iyanu-002', 'agriculture', 1000, '2026-08-01', '2026-10-15');
insert into public.project_budgets (project_id, monthly_limit_usd, updated_at) values ('proj-iya-001', 333, '2026-10-18');
\i :mig
select pg_temp.expect('S1 drift exists after #12 alone (registry keeps the winner''s 1000)', pg_temp.reg_budget('proj-iya-002'), 1000);
select pg_temp.expect('S1 budget row from next-ranked row', pg_temp.bud('proj-iya-002'), 333);
\i :sync
\i :sync
select pg_temp.expect('S1 registry synced to project_budgets', pg_temp.reg_budget('proj-iya-002'), 333);
select pg_temp.expect('S1 project_budgets unchanged', pg_temp.bud('proj-iya-002'), 333);
do $$ begin raise notice 'PASS sync S1: fallback budget (333) copied into project_registry.monthly_budget_usd (was 1000); second run no-op'; end $$;
rollback;

-- S2. Canonical proj-iya-002 exists without a budget; the top-ranked old
--     budget (777) moves onto it; the sync copies 777 into the registry.
begin;
select pg_temp.reset_iya();
insert into public.project_registry (id, name, vertical, monthly_budget_usd, created_at, updated_at) values
  ('proj-iya-002',   'S2 canonical', 'agriculture', 1000, '2026-01-01', '2026-01-01'),
  ('proj-iyanu-002', 'S2 iyanu-002', 'agriculture', 1000, '2026-08-01', '2026-10-15');
insert into public.project_budgets (project_id, monthly_limit_usd, updated_at) values ('proj-iyanu-002', 777, '2026-10-01');
\i :mig
\i :sync
select pg_temp.expect('S2 registry synced', pg_temp.reg_budget('proj-iya-002'), 777);
do $$ begin raise notice 'PASS sync S2: canonical without budget + moved old budget (777) -> registry agrees'; end $$;
rollback;

-- S3. No budget row at all: registry left alone (project stays blocked).
begin;
select pg_temp.reset_iya();
insert into public.project_registry (id, name, vertical, monthly_budget_usd, created_at, updated_at) values
  ('proj-iyanu-002', 'S3 iyanu-002', 'agriculture', 1000, '2026-08-01', '2026-10-15');
\i :mig
\i :sync
select pg_temp.expect('S3 registry untouched', pg_temp.reg_budget('proj-iya-002'), 1000);
select pg_temp.expect('S3 still no budget row', pg_temp.bud('proj-iya-002'), null);
do $$ begin raise notice 'PASS sync S3: no project_budgets row -> registry untouched, no row created'; end $$;
rollback;

-- S4. Projects outside the merge (proj-ehi-001) are never touched.
begin;
update public.project_registry set monthly_budget_usd = 4242 where id = 'proj-ehi-001';
insert into public.project_budgets (project_id, monthly_limit_usd) values ('proj-ehi-001', 11)
  on conflict (project_id) do update set monthly_limit_usd = 11;
\i :mig
\i :sync
select pg_temp.expect('S4 proj-ehi-001 untouched', pg_temp.reg_budget('proj-ehi-001'), 4242);
do $$ begin raise notice 'PASS sync S4: projects outside the merge (proj-ehi-001) untouched'; end $$;
rollback;
