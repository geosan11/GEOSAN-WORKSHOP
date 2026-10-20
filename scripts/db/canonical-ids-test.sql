-- Assertions after 20261020010000_canonical_project_ids.sql has run.
do $t$
declare n bigint;
begin
  select count(*) into n from public.project_registry
   where id in ('proj-iya-001','proj-iyanu-002','proj-aviation-003','proj-edgepoint-004');
  if n <> 0 then raise exception 'FAIL old registry rows left: %', n; end if;
  raise notice 'PASS no old ids in project_registry';

  select count(*) into n from public.project_registry
   where id in ('proj-ehi-001','proj-iya-002','proj-aero-003','proj-edge-004');
  if n <> 4 then raise exception 'FAIL expected 4 canonical rows, got %', n; end if;
  raise notice 'PASS 4 canonical rows (proj-edge-004 recreated from its old row)';

  if (select name from public.project_registry where id = 'proj-edge-004') <> 'EdgePoint (old id)' then
    raise exception 'FAIL proj-edge-004 was not copied from proj-edgepoint-004';
  end if;
  if (select name from public.project_registry where id = 'proj-iya-002') = 'Iyanuoluwa (old id)' then
    raise exception 'FAIL existing canonical proj-iya-002 was overwritten';
  end if;
  raise notice 'PASS existing canonical rows kept; missing one copied from the old row';

  select count(*) into n from (
    select project_id from public.agent_tasks union all select project_id from public.cost_events
    union all select project_id from public.qa_runs union all select project_id from public.qa_findings
    union all select project_id from public.project_budgets) x
   where project_id in ('proj-iya-001','proj-iyanu-002','proj-aviation-003','proj-edgepoint-004');
  if n <> 0 then raise exception 'FAIL old project ids left in child tables: %', n; end if;
  if (select count(*) from public.agent_tasks where id like 't-old-%') <> 4 then raise exception 'FAIL tasks lost'; end if;
  if (select project_id from public.agent_tasks where id = 't-old-2') <> 'proj-iya-002' then raise exception 'FAIL t-old-2'; end if;
  if (select project_id from public.qa_findings where id = 'f-old-1') <> 'proj-aero-003' then raise exception 'FAIL f-old-1'; end if;
  if (select project_id from public.cost_events where id = 'c-old-2') <> 'proj-edge-004' then raise exception 'FAIL c-old-2'; end if;
  raise notice 'PASS child rows moved to canonical ids, none lost';

  if (select monthly_limit_usd from public.project_budgets where project_id = 'proj-iya-002') <> 111 then
    raise exception 'FAIL canonical budget not kept';
  end if;
  if (select monthly_limit_usd from public.project_budgets where project_id = 'proj-aero-003') <> 444 then
    raise exception 'FAIL old-only budget not moved';
  end if;
  raise notice 'PASS budgets: canonical kept, old-only moved';

  select count(*) into n from (
    select org_id from public.agent_tasks union all select org_id from public.cost_events
    union all select org_id from public.qa_runs) x where org_id = 'org-ehi-global';
  if n <> 0 then raise exception 'FAIL org-ehi-global left: %', n; end if;
  if (select column_default from information_schema.columns
       where table_schema='public' and table_name='agent_tasks' and column_name='org_id') not like '%org-geosan%' then
    raise exception 'FAIL org_id default';
  end if;
  raise notice 'PASS workspace id is org-geosan (rows and defaults)';

  if (select string_agg(id || '=' || coalesce(design_kit,'NULL'), ',' order by id) from public.project_registry)
     <> 'proj-aero-003=flight-logbook,proj-edge-004=sensor-telemetry,proj-ehi-001=ledger-debt-line,proj-iya-002=weighbridge-ticket' then
    raise exception 'FAIL design_kit: %', (select string_agg(id || '=' || coalesce(design_kit,'NULL'), ',' order by id) from public.project_registry);
  end if;
  raise notice 'PASS design_kit preset ids set';
end
$t$;
do $t$
begin
  if (select name from public.project_registry where id = 'proj-iya-002') in ('Iyanuoluwa (old id)', 'Iyanuoluwa (older id)') then
    raise exception 'FAIL both rows exist: a newer old-id row replaced the canonical proj-iya-002';
  end if;
  raise notice 'PASS both rows exist: canonical row kept although the old-id rows are newer';
end
$t$;
