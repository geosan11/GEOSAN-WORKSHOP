-- =========================================================================
-- One canonical id per project, and a neutral workspace id.
--
-- The four client projects were saved under several id variants. This
-- migration moves every row onto the canonical ids used by the app
-- (src/data/clientProjects.ts) and replaces the client-branded workspace id
-- 'org-ehi-global' with 'org-geosan'.
--
--   old id               -> canonical id
--   proj-iya-001         -> proj-iya-002
--   proj-iyanu-002       -> proj-iya-002
--   proj-aviation-003    -> proj-aero-003
--   proj-edgepoint-004   -> proj-edge-004
--   org-ehi-global       -> org-geosan        (org_id columns)
--
-- Also adds the optional project_registry.design_kit column and fills it for
-- the four client projects where it is still empty.
--
-- * Safe to run more than once: a second run changes nothing.
-- * Data only. It creates no table, policy, grant or function, so it leaves
--   the owner-only lock (20261020000000_lock_db_to_owner.sql) exactly as it
--   is. Run it as the table owner (postgres, e.g. the SQL Editor).
-- * All in one DO block: it either finishes completely or changes nothing,
--   even with plain `psql -f`. It refuses up front if row security could hide
--   rows from the role running it (no BYPASSRLS, and a table forces RLS or is
--   owned by someone else), and rolls back if any old id is left at the end.
-- =========================================================================

do $migrate$
declare
  leftover bigint;
begin
  if not exists (select 1 from pg_roles where rolname = current_user and (rolsuper or rolbypassrls))
     and exists (
       select 1 from pg_class c
       where c.oid in ('public.project_registry'::regclass, 'public.agent_tasks'::regclass,
                       'public.cost_events'::regclass, 'public.qa_runs'::regclass,
                       'public.qa_findings'::regclass, 'public.project_budgets'::regclass)
         and c.relrowsecurity
         and (c.relforcerowsecurity or c.relowner <> (select oid from pg_roles where rolname = current_user))
     ) then
    raise exception 'canonical_project_ids: % cannot see every row (row security applies to it); run this as postgres. Nothing was changed.', current_user;
  end if;

  create temporary table _project_id_map (old_id text primary key, new_id text not null) on commit drop;
  insert into _project_id_map (old_id, new_id) values
    ('proj-iya-001', 'proj-iya-002'),
    ('proj-iyanu-002', 'proj-iya-002'),
    ('proj-aviation-003', 'proj-aero-003'),
    ('proj-edgepoint-004', 'proj-edge-004');

  alter table public.project_registry add column if not exists design_kit text;

  -- 1. Make sure the canonical registry row exists, copied from an old row if
  --    needed (every column except id). Children can then be moved before the
  --    old row is removed.
  insert into public.project_registry
  select (jsonb_populate_record(null::public.project_registry,
            to_jsonb(r) || jsonb_build_object('id', m.new_id, 'updated_at', now()))).*
  from public.project_registry r
  join _project_id_map m on m.old_id = r.id
  where not exists (select 1 from public.project_registry c where c.id = m.new_id)
  order by m.old_id
  on conflict (id) do nothing;

  -- 2. Move child rows.
  update public.agent_tasks t set project_id = m.new_id from _project_id_map m where t.project_id = m.old_id;
  update public.cost_events t set project_id = m.new_id from _project_id_map m where t.project_id = m.old_id;
  update public.qa_runs     t set project_id = m.new_id from _project_id_map m where t.project_id = m.old_id;
  update public.qa_findings t set project_id = m.new_id from _project_id_map m where t.project_id = m.old_id;

  -- project_budgets has project_id as its primary key: keep an existing
  -- canonical row; otherwise keep the first old one (by old id).
  delete from public.project_budgets b
  using _project_id_map m
  where b.project_id = m.old_id
    and (exists (select 1 from public.project_budgets c where c.project_id = m.new_id)
         or exists (select 1 from public.project_budgets o
                    join _project_id_map om on om.old_id = o.project_id
                    where om.new_id = m.new_id and om.old_id < m.old_id));
  update public.project_budgets b set project_id = m.new_id from _project_id_map m where b.project_id = m.old_id;

  -- 3. Remove the old registry rows (nothing references them any more).
  delete from public.project_registry r using _project_id_map m where r.id = m.old_id;

  -- 4. Neutral workspace id.
  update public.agent_tasks set org_id = 'org-geosan' where org_id = 'org-ehi-global';
  update public.cost_events set org_id = 'org-geosan' where org_id = 'org-ehi-global';
  update public.qa_runs     set org_id = 'org-geosan' where org_id = 'org-ehi-global';
  alter table public.agent_tasks alter column org_id set default 'org-geosan';
  alter table public.cost_events alter column org_id set default 'org-geosan';
  alter table public.qa_runs     alter column org_id set default 'org-geosan';

  -- 5. Design-kit preset ids for the four client projects (only if empty).
  update public.project_registry r set design_kit = k.kit
  from (values
    ('proj-ehi-001', 'ledger-debt-line'),
    ('proj-iya-002', 'weighbridge-ticket'),
    ('proj-aero-003', 'flight-logbook'),
    ('proj-edge-004', 'sensor-telemetry')
  ) as k(id, kit)
  where r.id = k.id and r.design_kit is null;

  -- 6. Verify: no old id may be left anywhere.
  select
      (select count(*) from public.project_registry where id in (select old_id from _project_id_map))
    + (select count(*) from public.agent_tasks     where project_id in (select old_id from _project_id_map) or org_id = 'org-ehi-global')
    + (select count(*) from public.cost_events     where project_id in (select old_id from _project_id_map) or org_id = 'org-ehi-global')
    + (select count(*) from public.qa_runs         where project_id in (select old_id from _project_id_map) or org_id = 'org-ehi-global')
    + (select count(*) from public.qa_findings     where project_id in (select old_id from _project_id_map))
    + (select count(*) from public.project_budgets where project_id in (select old_id from _project_id_map))
  into leftover;
  if leftover > 0 then
    raise exception 'canonical_project_ids: % row(s) still use an old id; nothing was changed', leftover;
  end if;

  drop table _project_id_map;
end
$migrate$;
