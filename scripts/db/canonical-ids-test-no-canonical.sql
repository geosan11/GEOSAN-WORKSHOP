-- Assertions for the "no canonical row" case.
do $t$
begin
  if (select name from public.project_registry where id = 'proj-iya-002') is distinct from 'Iyanuoluwa (latest)' then
    raise exception 'FAIL proj-iya-002 should come from the most recently updated old row, got %',
      (select name from public.project_registry where id = 'proj-iya-002');
  end if;
  raise notice 'PASS no canonical row: the most recently updated old row is kept (not the first by id)';
  if (select monthly_limit_usd from public.project_budgets where project_id = 'proj-iya-002') is distinct from 777 then
    raise exception 'FAIL budget should come from the winning old row, got %',
      (select monthly_limit_usd from public.project_budgets where project_id = 'proj-iya-002');
  end if;
  if (select count(*) from public.project_budgets where project_id in ('proj-iya-001','proj-iyanu-002')) <> 0 then
    raise exception 'FAIL old budgets left';
  end if;
  raise notice 'PASS no canonical budget: the budget of the winning (most recently updated) old row is kept';
  if (select count(*) from public.agent_tasks where id in ('t-nc-1','t-nc-2') and project_id = 'proj-iya-002') <> 2 then
    raise exception 'FAIL child rows of both old rows must move to proj-iya-002';
  end if;
  if exists (select 1 from public.project_registry where id in ('proj-iya-001','proj-iyanu-002')) then
    raise exception 'FAIL old registry rows left';
  end if;
  raise notice 'PASS children of both old rows kept and moved; old rows removed';
end
$t$;
