-- =========================================================================
-- NEW, SEPARATE MIGRATION (follow-up to #12; #12's migration is unchanged).
--
-- Make project_registry.monthly_budget_usd agree with project_budgets after
-- the canonical-id merge (20261020010000_canonical_project_ids.sql).
--
-- Why: the merge takes the project row from one old row but, when that row
-- has no budget, the budget from the next-ranked old row (or, when
-- proj-iya-002 already existed without a budget, from the top-ranked old
-- budget). project_registry.monthly_budget_usd then still holds the
-- project row's own (possibly default 1000) value, so the two disagree.
--
-- Source of truth: project_budgets.monthly_limit_usd (what the budget guard
-- reads with a budget row). This copies it into
-- project_registry.monthly_budget_usd where they differ.
--
-- Scope: only the canonical ids the merge writes to (proj-iya-002,
-- proj-aero-003, proj-edge-004). Other projects are left alone. A project with
-- no project_budgets row is left alone too (it stays blocked from AI work).
--
-- * Run AFTER 20261020010000_canonical_project_ids.sql. Refuses if any old id
--   is still present (that migration has not run yet).
-- * Safe to run more than once: a second run changes nothing.
-- * Data only: creates no table, policy, grant or function, so #5's
--   owner-only lock is unchanged. Run it as the table owner (postgres).
-- * One DO block: it either finishes completely or changes nothing.
-- =========================================================================

do $sync$
declare
  changed bigint;
  left_over bigint;
begin
  if not exists (select 1 from pg_roles where rolname = current_user and (rolsuper or rolbypassrls))
     and exists (
       select 1 from pg_class c
       where c.oid in ('public.project_registry'::regclass, 'public.project_budgets'::regclass)
         and c.relrowsecurity
         and (c.relforcerowsecurity or c.relowner <> (select oid from pg_roles where rolname = current_user))
     ) then
    raise exception 'sync_registry_budget: % cannot see every row (row security applies to it); run this as postgres. Nothing was changed.', current_user;
  end if;

  if exists (select 1 from public.project_registry
             where id in ('proj-iya-001', 'proj-iyanu-002', 'proj-aviation-003', 'proj-edgepoint-004')) then
    raise exception 'sync_registry_budget: old project ids are still present; run 20261020010000_canonical_project_ids.sql first. Nothing was changed.';
  end if;

  update public.project_registry r
     set monthly_budget_usd = b.monthly_limit_usd
    from public.project_budgets b
   where b.project_id = r.id
     and r.id in ('proj-iya-002', 'proj-aero-003', 'proj-edge-004')
     and r.monthly_budget_usd is distinct from b.monthly_limit_usd;
  get diagnostics changed = row_count;

  select count(*) into left_over
    from public.project_registry r
    join public.project_budgets b on b.project_id = r.id
   where r.id in ('proj-iya-002', 'proj-aero-003', 'proj-edge-004')
     and r.monthly_budget_usd is distinct from b.monthly_limit_usd;
  if left_over > 0 then
    raise exception 'sync_registry_budget: % project(s) still disagree; nothing was changed', left_over;
  end if;

  raise notice 'sync_registry_budget: % project_registry row(s) updated', changed;
end
$sync$;
