-- =========================================================================
-- Remove the four placeholder client projects.
--
-- EHI, Iyanuoluwa, Aviation and EdgePoint were hard-coded placeholder
-- projects, not real data. They are removed, under every id they were ever
-- stored as, until real projects are added. The app no longer seeds them
-- (supabase/schema.sql, src/) and the browser removes saved copies
-- (src/lib/placeholderProjectCleanup.ts).
--
--   ids: proj-ehi-001, proj-iya-002, proj-iyanu-002, proj-iya-001,
--        proj-aero-003, proj-aviation-003, proj-edge-004, proj-edgepoint-004
--
-- Replaces the never-applied 20261020010000_canonical_project_ids.sql (and
-- 20261020020000_sync_registry_budget.sql). Dated after
-- 20261028000000_workshop_aligned.sql, which copies project_registry rows
-- into public.projects, so the copies are removed too.
--
-- DELETED (children first; the FKs would cascade anyway):
--   qa_findings, qa_runs, cost_events, project_budgets, agent_tasks
--                     -> project_registry (FK: ON DELETE CASCADE)
--   project_logs, agent_assignments, provider_configs
--                     -> projects         (FK: ON DELETE CASCADE)   [if present]
--   project_registry, projects            (the project rows)
-- Project ids inside JSON columns (agent_tasks.plan/result/subagents,
-- qa_findings.reproduction_steps, project_logs.payload) go with their row.
-- project_logs includes level='audit' rows; they cascade with the project, so
-- the count is printed separately. (Keeping them means the archive variant,
-- see below; pending the owner's history decision.)
-- KEPT, but changed by the FKs (ON DELETE SET NULL), counted below:
--   agent_tasks.parent_task_id and cost_events.task_id of OTHER projects' rows
--   that point at a deleted task.
-- NOT TOUCHED: prompt_versions, app_owner, user_preferences (no project
--   reference) and every other project's rows. There is no weekly-ledger
--   table (the weekly ledger is per tier, server-side, with no project id).
--
-- SAFETY
-- * Refuses unless the backup was confirmed in the same session:
--     set geosan.backup_confirmed = 'yes';
--   then run this file. Without it nothing is changed.
-- * Run as the table owner with BYPASSRLS (postgres, e.g. the SQL Editor):
--   refuses up front if row security could hide rows from the running role.
-- * Refuses if a table it does not know references projects (an FK to
--   project_registry/projects, or a project_id column), or if another
--   project's QA finding belongs to a QA run being deleted.
-- * One DO block: all or nothing, even with plain `psql -f`. Rolls back if a
--   row is left or a count changed while running.
-- * Idempotent: a second run finds and deletes nothing.
-- * Data only: no table, policy, grant or function is created, changed or
--   dropped, so the owner-only lock (20261020000000_lock_db_to_owner.sql) and
--   the workshop policies stay exactly as they are.
-- * Prints (RAISE NOTICE) per table the rows it WILL delete, before deleting,
--   and the rows it DELETED, after.
--
-- ARCHIVE VARIANT (if the owner chooses archive over delete): only step 5
-- changes. Before each `delete`, copy the same rows, e.g.
--   execute format('create table if not exists archive.%I (like public.%I)', t, t);
--   execute format('insert into archive.%I select * from public.%I where %I = any ($1)', t, t, col) using ids;
-- or, for public.projects, set archived_at/is_demo instead of deleting.
-- Steps 1-4 and 6 stay the same.
-- =========================================================================

do $remove$
declare
  ids constant text[] := array['proj-ehi-001', 'proj-iya-002', 'proj-iyanu-002', 'proj-iya-001',
                               'proj-aero-003', 'proj-aviation-003', 'proj-edge-004', 'proj-edgepoint-004'];
  -- Children first. {table, id column}. Tables that do not exist are skipped.
  plan constant text[][] := array[
    array['qa_findings', 'project_id'], array['qa_runs', 'project_id'], array['cost_events', 'project_id'],
    array['project_budgets', 'project_id'], array['agent_tasks', 'project_id'],
    array['project_logs', 'project_id'], array['agent_assignments', 'project_id'], array['provider_configs', 'project_id'],
    array['project_registry', 'id'], array['projects', 'id']];
  known regclass[] := '{}';
  t text; col text; i int;
  cnt bigint; total bigint := 0;
  will jsonb := '{}'; done jsonb := '{}';
  unknown_refs text; n_cross_find bigint := 0; n_null_parent bigint := 0; n_null_cost bigint := 0; n_audit bigint := 0;
  summary text;
begin
  for i in 1 .. array_length(plan, 1) loop
    if to_regclass('public.' || plan[i][1]) is not null then
      known := known || to_regclass('public.' || plan[i][1]);
    end if;
  end loop;

  -- 1. Backup confirmation.
  if coalesce(current_setting('geosan.backup_confirmed', true), '') <> 'yes' then
    raise exception 'remove_placeholder_projects: backup not confirmed. Take a backup, then run: set geosan.backup_confirmed = ''yes''; and run this file again. Nothing was changed.';
  end if;

  -- 2. Row security must not hide rows from the running role.
  if not exists (select 1 from pg_roles where rolname = current_user and (rolsuper or rolbypassrls))
     and exists (
       select 1 from pg_class c
       where c.oid = any (known) and c.relrowsecurity
         and (c.relforcerowsecurity or c.relowner <> (select oid from pg_roles where rolname = current_user))
     ) then
    raise exception 'remove_placeholder_projects: % cannot see every row (row security applies to it); run this as postgres. Nothing was changed.', current_user;
  end if;

  -- 3. Every table that references projects must be one this file handles.
  select string_agg(distinct x.t, ', ' order by x.t) into unknown_refs from (
    select conrelid::regclass::text as t from pg_constraint
     where contype = 'f' and conrelid <> all (known)
       and confrelid in (to_regclass('public.project_registry'), to_regclass('public.projects'))
    union
    select a.attrelid::regclass::text from pg_attribute a join pg_class c on c.oid = a.attrelid
     where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p')
       and a.attname = 'project_id' and not a.attisdropped and a.attrelid <> all (known)
  ) x;
  if unknown_refs is not null then
    raise exception 'remove_placeholder_projects: table(s) % also reference projects and are not handled by this migration; add them first. Nothing was changed.', unknown_refs;
  end if;

  -- 4. Count what will go, and what the FKs will change in other projects.
  for i in 1 .. array_length(plan, 1) loop
    t := plan[i][1]; col := plan[i][2];
    continue when to_regclass('public.' || t) is null;
    execute format('select count(*) from public.%I where %I = any ($1)', t, col) into cnt using ids;
    will := will || jsonb_build_object(t, cnt);
  end loop;
  select count(*) into n_cross_find from public.qa_findings f
   where f.project_id <> all (ids) and f.run_id in (select id from public.qa_runs where project_id = any (ids));
  select count(*) into n_null_parent from public.agent_tasks a
   where a.project_id <> all (ids) and a.parent_task_id in (select id from public.agent_tasks where project_id = any (ids));
  select count(*) into n_null_cost from public.cost_events c
   where c.project_id <> all (ids) and c.task_id in (select id from public.agent_tasks where project_id = any (ids));
  if to_regclass('public.project_logs') is not null then
    execute 'select count(*) from public.project_logs where project_id = any ($1) and level = ''audit''' into n_audit using ids;
  end if;
  if n_cross_find > 0 then
    raise exception 'remove_placeholder_projects: % QA finding(s) of other projects belong to a QA run being deleted and would go with it; fix them first. Nothing was changed.', n_cross_find;
  end if;

  select string_agg(key || '=' || value, ', ' order by ord) into summary
    from jsonb_each_text(will) e join unnest(plan[:][1:1]) with ordinality p(name, ord) on p.name = e.key;
  raise notice 'remove_placeholder_projects: will delete %', summary;
  raise notice 'remove_placeholder_projects: of those, project_logs rows with level=audit: %', n_audit;
  raise notice 'remove_placeholder_projects: will set to null in other projects: agent_tasks.parent_task_id=%, cost_events.task_id=%',
    n_null_parent, n_null_cost;

  -- 5. Delete, children first. (Archive variant: copy the rows here first.)
  for i in 1 .. array_length(plan, 1) loop
    t := plan[i][1]; col := plan[i][2];
    continue when to_regclass('public.' || t) is null;
    execute format('delete from public.%I where %I = any ($1)', t, col) using ids;
    get diagnostics cnt = row_count;
    done := done || jsonb_build_object(t, cnt);
  end loop;

  -- 6. Verify: nothing left, counts as announced. Any mismatch rolls back.
  for i in 1 .. array_length(plan, 1) loop
    t := plan[i][1]; col := plan[i][2];
    continue when to_regclass('public.' || t) is null;
    execute format('select count(*) from public.%I where %I = any ($1)', t, col) into cnt using ids;
    total := total + cnt;
  end loop;
  if total <> 0 or done <> will then
    raise exception 'remove_placeholder_projects: % row(s) left or counts changed while running (will %, deleted %); rolled back, nothing was changed.', total, will, done;
  end if;

  select string_agg(key || '=' || value, ', ' order by ord) into summary
    from jsonb_each_text(done) e join unnest(plan[:][1:1]) with ordinality p(name, ord) on p.name = e.key;
  raise notice 'remove_placeholder_projects: deleted %', summary;
end
$remove$;
