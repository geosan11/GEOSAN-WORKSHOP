-- Post-migration assertions for supabase/migrations/20261030000000_remove_placeholder_projects.sql.
-- Runs after the migration has succeeded on a database seeded with placeholder-fixture.sql.

do $test$
declare
  placeholder_ids constant text[] := array[
    'proj-ehi-001',
    'proj-iya-002',
    'proj-iyanu-002',
    'proj-iya-001',
    'proj-aero-003',
    'proj-aviation-003',
    'proj-edge-004',
    'proj-edgepoint-004'
  ];
  tbl_plan constant text[][] := array[
    array['qa_findings', 'project_id'],
    array['qa_runs', 'project_id'],
    array['cost_events', 'project_id'],
    array['project_budgets', 'project_id'],
    array['agent_tasks', 'project_id'],
    array['project_logs', 'project_id'],
    array['agent_assignments', 'project_id'],
    array['provider_configs', 'project_id'],
    array['project_registry', 'id'],
    array['projects', 'id']
  ];
  i int;
  t text;
  col text;
  n bigint;
begin
  -- 1. All 8 placeholder ids gone from every table.
  for i in 1 .. array_length(tbl_plan, 1) loop
    t := tbl_plan[i][1];
    col := tbl_plan[i][2];
    continue when to_regclass('public.' || t) is null;
    execute format('select count(*) from public.%I where %I = any ($1)', t, col) into n using placeholder_ids;
    if n <> 0 then
      raise exception 'FAIL % still has % placeholder row(s)', t, n;
    end if;
  end loop;
  raise notice 'PASS all 8 placeholder ids removed from every table';

  -- 2. Real projects and their child rows are present in exact expected counts.
  select count(*) into n from public.project_registry where id in ('proj-real-001', 'proj-real-002');
  if n <> 2 then raise exception 'FAIL expected 2 real rows in project_registry, got %', n; end if;

  if to_regclass('public.projects') is not null then
    select count(*) into n from public.projects where id in ('proj-real-001', 'proj-real-002');
    if n <> 2 then raise exception 'FAIL expected 2 real rows in projects, got %', n; end if;
  end if;

  if (select count(*) from public.agent_tasks) <> 3 then
    raise exception 'FAIL expected 3 real agent_tasks, got %', (select count(*) from public.agent_tasks);
  end if;
  if (select count(*) from public.cost_events) <> 3 then
    raise exception 'FAIL expected 3 real cost_events, got %', (select count(*) from public.cost_events);
  end if;
  if (select count(*) from public.qa_runs) <> 2 then
    raise exception 'FAIL expected 2 real qa_runs, got %', (select count(*) from public.qa_runs);
  end if;
  if (select count(*) from public.qa_findings) <> 2 then
    raise exception 'FAIL expected 2 real qa_findings, got %', (select count(*) from public.qa_findings);
  end if;
  if (select count(*) from public.project_budgets) <> 2 then
    raise exception 'FAIL expected 2 real project_budgets, got %', (select count(*) from public.project_budgets);
  end if;

  if to_regclass('public.project_logs') is not null then
    if (select count(*) from public.project_logs) <> 2 then
      raise exception 'FAIL expected 2 real project_logs, got %', (select count(*) from public.project_logs);
    end if;
    if (select count(*) from public.project_logs where level = 'audit' and project_id = 'proj-real-001') <> 1 then
      raise exception 'FAIL real audit log missing';
    end if;
  end if;

  if to_regclass('public.agent_assignments') is not null then
    if (select count(*) from public.agent_assignments) <> 2 then
      raise exception 'FAIL expected 2 real agent_assignments, got %', (select count(*) from public.agent_assignments);
    end if;
  end if;

  if to_regclass('public.provider_configs') is not null then
    if (select count(*) from public.provider_configs) <> 3 then
      raise exception 'FAIL expected 3 remaining provider_configs (2 real + 1 global), got %', (select count(*) from public.provider_configs);
    end if;
  end if;
  raise notice 'PASS real projects (proj-real-001, proj-real-002) and all child rows preserved';

  -- 3. The two cross-project links to placeholder tasks were set to NULL; real-to-real links kept;
  --    real task JSON mentioning 'proj-ehi-001' kept intact.
  if (select parent_task_id from public.agent_tasks where id = 't-real-001-child') is not null then
    raise exception 'FAIL t-real-001-child.parent_task_id was not set to null';
  end if;
  if (select task_id from public.cost_events where id = 'c-real-001-cross') is not null then
    raise exception 'FAIL c-real-001-cross.task_id was not set to null';
  end if;
  if (select parent_task_id from public.agent_tasks where id = 't-real-002-root') <> 't-real-001-root' then
    raise exception 'FAIL real-to-real parent_task_id on t-real-002-root was altered';
  end if;
  if (select task_id from public.cost_events where id = 'c-real-001-own') <> 't-real-001-root'
     or (select task_id from public.cost_events where id = 'c-real-002-own') <> 't-real-002-root' then
    raise exception 'FAIL real-to-real cost_events.task_id was altered';
  end if;
  if (select a.plan ->> 'note' from public.agent_tasks a where a.id = 't-real-001-root') <> 'migrated after proj-ehi-001'
     or (select a.result ->> 'summary' from public.agent_tasks a where a.id = 't-real-001-root') <> 'compared with proj-ehi-001'
     or (select a.subagents -> 0 ->> 'legacy_ref' from public.agent_tasks a where a.id = 't-real-001-root') <> 'proj-ehi-001' then
    raise exception 'FAIL real task JSON mentioning proj-ehi-001 was modified or lost';
  end if;
  raise notice 'PASS cross-project links (agent_tasks.parent_task_id, cost_events.task_id) set to null; real JSON mentioning proj-ehi-001 untouched';

  -- 4. prompt_versions, app_owner and user_preferences untouched.
  if (select count(*) from public.prompt_versions where id = 'pv-invariant-001' and system_instruction = 'Never delete real projects.') <> 1 then
    raise exception 'FAIL prompt_versions changed';
  end if;
  if to_regclass('public.app_owner') is not null then
    if (select count(*) from public.app_owner where user_id = '00000000-0000-0000-0009-000000000001'::uuid) <> 1 then
      raise exception 'FAIL app_owner changed';
    end if;
  end if;
  if to_regclass('public.user_preferences') is not null then
    if (select count(*) from public.user_preferences where user_id = '00000000-0000-0000-0009-000000000001'::uuid and font_scale = 1.10) <> 1 then
      raise exception 'FAIL user_preferences changed';
    end if;
  end if;
  raise notice 'PASS prompt_versions, app_owner and user_preferences unchanged';
end
$test$;
