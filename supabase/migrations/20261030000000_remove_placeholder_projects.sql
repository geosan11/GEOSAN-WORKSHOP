-- =========================================================================
-- Remove the four placeholder client projects and move legacy workspace ids
-- ('org-ehi-global', 'org-geosan') to 'org-geosan-workshop'.
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
-- WORKSPACE IDS MOVED & DEFAULTS UPDATED (after the deletes and verification):
--   Discovers every text/varchar column in public base tables (relkind r/p)
--   named org_id, workspace_id, *_org_id or *_workspace_id (today:
--   agent_tasks.org_id, cost_events.org_id, qa_runs.org_id, and projects.org_id
--   when 20261028 is applied; project_registry if it ever has one).
--   * Rewrites surviving rows with 'org-ehi-global' or 'org-geosan' to
--     'org-geosan-workshop', printing before and after counts via RAISE NOTICE
--     and verifying 0 legacy rows remain.
--   * Note: updated_at BEFORE UPDATE triggers from 20261028000000_workshop_aligned.sql
--     (e.g. on public.projects) bump updated_at on rows whose workspace id is moved.
--   * Alters any discovered column whose DEFAULT expression is the literal
--     'org-ehi-global' or 'org-geosan' to DEFAULT 'org-geosan-workshop' (and
--     prints a RAISE NOTICE).
-- NOT TOUCHED: prompt_versions, app_owner, user_preferences (no project or
--   workspace reference) and every other project's non-workspace fields. There
--   is no weekly-ledger table (the weekly ledger is per tier, server-side,
--   with no project id).
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
-- * Refuses before any delete if:
--   (a) any FK constraint includes a discovered workspace-id column (either side);
--   (b) any public table whose name contains 'org' or 'workspace' has an id or
--       slug column holding 'org-ehi-global' or 'org-geosan';
--   (c) any unique constraint or unique index containing a discovered
--       workspace-id column would have a duplicate among surviving rows when
--       'org-ehi-global'/'org-geosan' are rewritten to 'org-geosan-workshop'.
-- * One DO block: all or nothing, even with plain `psql -f`. Rolls back if a
--   row is left or a count changed while running.
-- * Idempotent: a second run deletes 0 rows, moves 0 workspace-id rows, and
--   alters 0 column defaults.
-- * Data + column defaults only: alters literal 'org-ehi-global'/'org-geosan'
--   column defaults to 'org-geosan-workshop', but no table, policy, grant or
--   function is created, changed or dropped, so the owner-only lock
--   (20261020000000_lock_db_to_owner.sql) and the workshop policies stay
--   exactly as they are.
-- * Prints (RAISE NOTICE) per table the rows it WILL delete, before deleting,
--   the rows it DELETED, after, the per-column workspace id counts before and
--   after moving, and any altered column defaults.
--
-- ARCHIVE VARIANT (if the owner chooses archive over delete): only step 5
-- changes. Before each `delete`, copy the same rows, e.g.
--   execute format('create table if not exists archive.%I (like public.%I)', t, t);
--   execute format('insert into archive.%I select * from public.%I where %I = any ($1)', t, t, col) using ids;
-- or, for public.projects, set archived_at/is_demo instead of deleting.
-- Steps 1-4 and 6-7 stay the same.
-- =========================================================================

do $remove$
declare
  ids constant text[] := array['proj-ehi-001', 'proj-iya-002', 'proj-iyanu-002', 'proj-iya-001',
                               'proj-aero-003', 'proj-aviation-003', 'proj-edge-004', 'proj-edgepoint-004'];
  old_orgs constant text[] := array['org-ehi-global', 'org-geosan'];
  target_org constant text := 'org-geosan-workshop';
  -- Children first. {table, id column}. Tables that do not exist are skipped.
  plan constant text[][] := array[
    array['qa_findings', 'project_id'], array['qa_runs', 'project_id'], array['cost_events', 'project_id'],
    array['project_budgets', 'project_id'], array['agent_tasks', 'project_id'],
    array['project_logs', 'project_id'], array['agent_assignments', 'project_id'], array['provider_configs', 'project_id'],
    array['project_registry', 'id'], array['projects', 'id']];
  known regclass[] := '{}';
  ws_relids regclass[] := '{}';
  t text; col text; i int; k int;
  cnt bigint; total bigint := 0;
  cnt_ehi bigint; cnt_geosan bigint; cnt_moved bigint; after_ehi bigint; after_geosan bigint;
  n_def_altered int := 0;
  will jsonb := '{}'; done jsonb := '{}';
  unknown_refs text; n_cross_find bigint := 0; n_null_parent bigint := 0; n_null_cost bigint := 0; n_audit bigint := 0;
  bad_ws_fks text;
  bad_org_tbls text[] := '{}';
  bad_uq_list text[] := '{}';
  ws_rec record;
  ix_rec record;
  proj_sql text;
  survive_sql text;
  del_col text;
  key_expr text;
  key_exprs text[];
  not_null_conds text[];
  idx_where text;
  summary text;
begin
  for i in 1 .. array_length(plan, 1) loop
    if to_regclass('public.' || plan[i][1]) is not null then
      known := known || to_regclass('public.' || plan[i][1]);
    end if;
  end loop;

  select coalesce(array_agg(distinct c.oid::regclass), '{}')
    into ws_relids
    from pg_class c
    join pg_attribute a on a.attrelid = c.oid
   where c.relnamespace = 'public'::regnamespace
     and c.relkind in ('r', 'p')
     and not a.attisdropped
     and a.attnum > 0
     and a.atttypid in ('text'::regtype, 'varchar'::regtype)
     and (
       a.attname in ('org_id', 'workspace_id')
       or a.attname like '%\_org\_id' escape '\'
       or a.attname like '%\_workspace\_id' escape '\'
     );

  -- 1. Backup confirmation.
  if coalesce(current_setting('geosan.backup_confirmed', true), '') <> 'yes' then
    raise exception 'remove_placeholder_projects: backup not confirmed. Take a backup, then run: set geosan.backup_confirmed = ''yes''; and run this file again. Nothing was changed.';
  end if;

  -- 2. Row security must not hide rows from the running role.
  if not exists (select 1 from pg_roles where rolname = current_user and (rolsuper or rolbypassrls))
     and exists (
       select 1 from pg_class c
       where (c.oid = any (known) or c.oid = any (ws_relids)) and c.relrowsecurity
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

  -- 3a. Pre-check 2(a): refuse if any FK constraint includes a discovered workspace-id column (either side).
  select string_agg(distinct format('%s on %s (%I.%I)', con.conname, con.conrelid::regclass, ws.tbl, ws.col), ', ')
    into bad_ws_fks
    from pg_constraint con
    join (
      select c.oid as relid, c.relname as tbl, a.attnum, a.attname as col
        from pg_class c
        join pg_attribute a on a.attrelid = c.oid
       where c.relnamespace = 'public'::regnamespace
         and c.relkind in ('r', 'p')
         and not a.attisdropped
         and a.attnum > 0
         and a.atttypid in ('text'::regtype, 'varchar'::regtype)
         and (
           a.attname in ('org_id', 'workspace_id')
           or a.attname like '%\_org\_id' escape '\'
           or a.attname like '%\_workspace\_id' escape '\'
         )
    ) ws
      on (con.conrelid = ws.relid and ws.attnum = any (con.conkey))
      or (con.confrelid = ws.relid and ws.attnum = any (con.confkey))
   where con.contype = 'f';
  if bad_ws_fks is not null then
    raise exception 'remove_placeholder_projects: foreign key constraint(s) % include a workspace-id column; drop or update them first. Nothing was changed.', bad_ws_fks;
  end if;

  -- 3b. Pre-check 2(b): refuse if any public table whose name contains 'org' or 'workspace'
  --     has an id/slug column holding 'org-ehi-global' or 'org-geosan'.
  for ws_rec in
    select c.relname as tbl, a.attname as col
      from pg_class c
      join pg_attribute a on a.attrelid = c.oid
     where c.relnamespace = 'public'::regnamespace
       and c.relkind in ('r', 'p')
       and (c.relname ilike '%org%' or c.relname ilike '%workspace%')
       and not a.attisdropped
       and a.attnum > 0
       and a.attname in ('id', 'slug')
     order by c.relname, a.attname
  loop
    execute format('select count(*) from public.%I where %I::text = any ($1)', ws_rec.tbl, ws_rec.col)
      into cnt using old_orgs;
    if cnt > 0 then
      bad_org_tbls := array_append(bad_org_tbls, format('public.%I.%I', ws_rec.tbl, ws_rec.col));
    end if;
  end loop;
  if cardinality(bad_org_tbls) > 0 then
    raise exception 'remove_placeholder_projects: organization/workspace table(s) % hold old workspace id(s) in id/slug and cannot be safely rewritten. Nothing was changed.',
      array_to_string(bad_org_tbls, ', ');
  end if;

  -- 3c. Pre-check 2(c): refuse if rewriting 'org-ehi-global'/'org-geosan' to 'org-geosan-workshop'
  --     would create a duplicate in any unique constraint or unique index among surviving rows.
  for ws_rec in
    select c.oid as relid, c.relname as tbl, array_agg(a.attnum order by a.attnum) as ws_attnums
      from pg_class c
      join pg_attribute a on a.attrelid = c.oid
     where c.relnamespace = 'public'::regnamespace
       and c.relkind in ('r', 'p')
       and not a.attisdropped
       and a.attnum > 0
       and a.atttypid in ('text'::regtype, 'varchar'::regtype)
       and (
         a.attname in ('org_id', 'workspace_id')
         or a.attname like '%\_org\_id' escape '\'
         or a.attname like '%\_workspace\_id' escape '\'
       )
     group by c.oid, c.relname
     order by c.relname
  loop
    del_col := null;
    for i in 1 .. array_length(plan, 1) loop
      if plan[i][1] = ws_rec.tbl then
        del_col := plan[i][2];
        exit;
      end if;
    end loop;
    if del_col is not null then
      survive_sql := format('not coalesce(_src.%I = any ($3), false)', del_col);
    else
      survive_sql := 'true';
    end if;

    select string_agg(
      case
        when a.attnum = any (ws_rec.ws_attnums) then
          format('case when _src.%I = any ($1) then $2 else _src.%I end as %I', a.attname, a.attname, a.attname)
        else
          format('_src.%I', a.attname)
      end,
      ', ' order by a.attnum
    )
    into proj_sql
    from pg_attribute a
    where a.attrelid = ws_rec.relid and a.attnum > 0 and not a.attisdropped;

    for ix_rec in
      select ix.indexrelid,
             ic.relname as idxname,
             con.conname as conname,
             ix.indnkeyatts,
             ix.indnullsnotdistinct,
             pg_get_expr(ix.indpred, ix.indrelid) as pred_sql
        from pg_index ix
        join pg_class ic on ic.oid = ix.indexrelid
        left join pg_constraint con on con.conindid = ix.indexrelid and con.contype in ('u', 'p')
       where ix.indrelid = ws_rec.relid
         and ix.indisunique
         and ix.indisvalid
         and (
           exists (
             select 1 from unnest((ix.indkey::smallint[])[1:ix.indnkeyatts]) u(attnum)
             where u.attnum = any (ws_rec.ws_attnums)
           )
           or exists (
             select 1 from pg_depend d
             where d.classid = 'pg_class'::regclass
               and d.objid = ix.indexrelid
               and d.refclassid = 'pg_class'::regclass
               and d.refobjid = ws_rec.relid
               and d.refobjsubid = any (ws_rec.ws_attnums)
           )
         )
       order by ic.relname
    loop
      key_exprs := '{}';
      not_null_conds := '{}';
      for k in 1 .. ix_rec.indnkeyatts loop
        key_expr := pg_get_indexdef(ix_rec.indexrelid, k, true);
        key_exprs := array_append(key_exprs, key_expr);
        if not ix_rec.indnullsnotdistinct then
          not_null_conds := array_append(not_null_conds, format('(%s) is not null', key_expr));
        end if;
      end loop;

      idx_where := 'true';
      if ix_rec.pred_sql is not null then
        idx_where := idx_where || ' and (' || ix_rec.pred_sql || ')';
      end if;
      if cardinality(not_null_conds) > 0 then
        idx_where := idx_where || ' and ' || array_to_string(not_null_conds, ' and ');
      end if;

      execute format(
        'with _s as (select %s from public.%I _src where %s and ($3 is not null)) '
        'select count(*) from (select 1 from _s where %s group by %s having count(*) > 1) _d',
        proj_sql, ws_rec.tbl, survive_sql, idx_where, array_to_string(key_exprs, ', ')
      ) into cnt using old_orgs, target_org, ids;

      if cnt > 0 then
        bad_uq_list := array_append(
          bad_uq_list,
          format('public.%I (%s)', ws_rec.tbl, coalesce(ix_rec.conname, ix_rec.idxname))
        );
      end if;
    end loop;
  end loop;
  if cardinality(bad_uq_list) > 0 then
    raise exception 'remove_placeholder_projects: rewriting workspace ids to % would create duplicate(s) in unique constraint/index % among surviving rows. Nothing was changed.',
      target_org, array_to_string(bad_uq_list, ', ');
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

  -- 7. Move workspace ids ('org-ehi-global', 'org-geosan' -> 'org-geosan-workshop')
  --    across every discovered workspace-id column, then update literal defaults.
  for ws_rec in
    select c.relname as tbl, a.attname as col
      from pg_class c
      join pg_attribute a on a.attrelid = c.oid
     where c.relnamespace = 'public'::regnamespace
       and c.relkind in ('r', 'p')
       and not a.attisdropped
       and a.attnum > 0
       and a.atttypid in ('text'::regtype, 'varchar'::regtype)
       and (
         a.attname in ('org_id', 'workspace_id')
         or a.attname like '%\_org\_id' escape '\'
         or a.attname like '%\_workspace\_id' escape '\'
       )
     order by c.relname, a.attname
  loop
    execute format(
      'select count(*) filter (where %I = $1), count(*) filter (where %I = $2) from public.%I',
      ws_rec.col, ws_rec.col, ws_rec.tbl
    ) into cnt_ehi, cnt_geosan using 'org-ehi-global', 'org-geosan';
    raise notice 'remove_placeholder_projects: workspace id before %.%: org-ehi-global=%, org-geosan=%',
      ws_rec.tbl, ws_rec.col, cnt_ehi, cnt_geosan;

    execute format(
      'update public.%I set %I = $1 where %I = any ($2)',
      ws_rec.tbl, ws_rec.col, ws_rec.col
    ) using target_org, old_orgs;
    get diagnostics cnt_moved = row_count;

    execute format(
      'select count(*) filter (where %I = $1), count(*) filter (where %I = $2) from public.%I',
      ws_rec.col, ws_rec.col, ws_rec.tbl
    ) into after_ehi, after_geosan using 'org-ehi-global', 'org-geosan';
    raise notice 'remove_placeholder_projects: workspace id after %.%: org-ehi-global=%, org-geosan=% (moved %)',
      ws_rec.tbl, ws_rec.col, after_ehi, after_geosan, cnt_moved;

    if after_ehi <> 0 or after_geosan <> 0 or cnt_moved <> (cnt_ehi + cnt_geosan) then
      raise exception 'remove_placeholder_projects: workspace id move mismatch on %.% (before org-ehi-global=%, org-geosan=%; moved=%; after org-ehi-global=%, org-geosan=%); rolled back, nothing was changed.',
        ws_rec.tbl, ws_rec.col, cnt_ehi, cnt_geosan, cnt_moved, after_ehi, after_geosan;
    end if;
  end loop;

  for ws_rec in
    select c.relname as tbl, a.attname as col, pg_get_expr(ad.adbin, ad.adrelid) as def_expr
      from pg_class c
      join pg_attribute a on a.attrelid = c.oid
      left join pg_attrdef ad on ad.adrelid = c.oid and ad.adnum = a.attnum
     where c.relnamespace = 'public'::regnamespace
       and c.relkind in ('r', 'p')
       and not a.attisdropped
       and a.attnum > 0
       and a.atttypid in ('text'::regtype, 'varchar'::regtype)
       and (
         a.attname in ('org_id', 'workspace_id')
         or a.attname like '%\_org\_id' escape '\'
         or a.attname like '%\_workspace\_id' escape '\'
       )
     order by c.relname, a.attname
  loop
    if ws_rec.def_expr in (
      '''org-ehi-global''', '''org-ehi-global''::text', '''org-ehi-global''::character varying',
      '''org-geosan''', '''org-geosan''::text', '''org-geosan''::character varying'
    ) then
      execute format('alter table public.%I alter column %I set default %L', ws_rec.tbl, ws_rec.col, target_org);
      n_def_altered := n_def_altered + 1;
      raise notice 'remove_placeholder_projects: altered default on %.% to %', ws_rec.tbl, ws_rec.col, target_org;
    end if;
  end loop;
  raise notice 'remove_placeholder_projects: workspace defaults altered: %', n_def_altered;
end
$remove$;
