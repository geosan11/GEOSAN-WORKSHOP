-- Rows saved under the old ids, on top of the seeded canonical projects.
-- Test data only (throwaway local Postgres).
insert into public.project_registry (id, name, vertical) values
  ('proj-iyanu-002', 'Iyanuoluwa (old id)', 'agriculture'),
  ('proj-iya-001', 'Iyanuoluwa (older id)', 'agriculture'),
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
insert into public.project_budgets (project_id, monthly_limit_usd) values
  ('proj-iya-002', 111),        -- canonical budget exists: old ones are dropped
  ('proj-iyanu-002', 222),
  ('proj-iya-001', 333),
  ('proj-aviation-003', 444),   -- only old budget: it moves
  ('proj-edgepoint-004', 555);
