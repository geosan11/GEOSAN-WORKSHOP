-- Rows saved under the old ids, on top of the seeded canonical projects.
-- Test data only (throwaway local Postgres).
-- Case "both rows exist": canonical proj-iya-002 (from the seed) plus two
-- old-id rows that are NEWER than it. The canonical row must still win.
update public.project_registry set updated_at = '2026-01-01' where id = 'proj-iya-002';
insert into public.project_registry (id, name, vertical, updated_at) values
  ('proj-iyanu-002', 'Iyanuoluwa (old id)', 'agriculture', '2026-10-01'),
  ('proj-iya-001', 'Iyanuoluwa (older id)', 'agriculture', '2026-10-02');
insert into public.project_registry (id, name, vertical) values
  ('proj-aviation-003', 'Aviation (old id)', 'aviation'),
  ('proj-edgepoint-004', 'EdgePoint (old id)', 'fintech');
-- An old id whose canonical row does NOT exist yet must be copied, not lost.
delete from public.project_registry where id = 'proj-edge-004';

insert into public.agent_tasks (id, org_id, project_id, task_type, prompt) values
  ('t-old-1', 'org-ehi-global', 'proj-iyanu-002', 'FIX_BUG', 'old'),
  ('t-old-2', 'org-ehi-global', 'proj-iya-001', 'FIX_BUG', 'older'),
  ('t-old-3', 'org-ehi-global', 'proj-aviation-003', 'FIX_BUG', 'old'),
  ('t-old-4', 'org-ehi-global', 'proj-edgepoint-004', 'FIX_BUG', 'old'),
  ('t-new-1', 'org-ehi-global', 'proj-ehi-001', 'FIX_BUG', 'canonical');
insert into public.cost_events (id, org_id, project_id, task_id, cost_usd) values
  ('c-old-1', 'org-ehi-global', 'proj-iyanu-002', 't-old-1', 0.5),
  ('c-old-2', 'org-ehi-global', 'proj-edgepoint-004', 't-old-4', 0.25);
insert into public.qa_runs (id, org_id, project_id) values
  ('r-old-1', 'org-ehi-global', 'proj-aviation-003');
insert into public.qa_findings (id, run_id, project_id, severity, category, title, description) values
  ('f-old-1', 'r-old-1', 'proj-aviation-003', 'high', 'regression', 't', 'd');
insert into public.project_budgets (project_id, monthly_limit_usd, updated_at) values
  ('proj-iya-002', 111, '2026-01-01'),       -- canonical budget exists: it wins even though older
  ('proj-iyanu-002', 222, '2026-10-01'),
  ('proj-iya-001', 333, '2026-10-02'),
  ('proj-aviation-003', 444, '2026-10-01'),  -- only old budget: it moves
  ('proj-edgepoint-004', 555, '2026-10-01');
