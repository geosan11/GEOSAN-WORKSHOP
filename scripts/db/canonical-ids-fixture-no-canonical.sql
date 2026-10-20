-- Case "no canonical row": proj-iya-002 does not exist, two old-id rows do.
-- proj-iyanu-002 is the most recently updated, but sorts AFTER proj-iya-001,
-- so the rule (most recent wins) is tested, not the sort order.
delete from public.project_budgets where project_id = 'proj-iya-002';
delete from public.project_registry where id = 'proj-iya-002';
insert into public.project_registry (id, name, vertical, created_at, updated_at) values
  ('proj-iya-001', 'Iyanuoluwa (stale)', 'agriculture', '2026-08-01', '2026-09-01'),
  ('proj-iyanu-002', 'Iyanuoluwa (latest)', 'agriculture', '2026-08-01', '2026-10-15');
insert into public.agent_tasks (id, project_id, task_type, prompt) values
  ('t-nc-1', 'proj-iya-001', 'FIX_BUG', 'a'),
  ('t-nc-2', 'proj-iyanu-002', 'FIX_BUG', 'b');
insert into public.project_budgets (project_id, monthly_limit_usd, updated_at) values
  ('proj-iya-001', 333, '2026-09-01'),
  ('proj-iyanu-002', 777, '2026-10-15');
