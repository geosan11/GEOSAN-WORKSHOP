-- =========================================================================
-- GEOSAN-WORKSHOP: Fix Workshop Owner Policies
-- File: supabase/migrations/20261104000000_fix_workshop_owner_policies.sql
--
-- Fixes permission denied on public.app_owner when signed-in owner accesses
-- workshop tables (projects, project_logs, agent_assignments, provider_configs,
-- user_preferences).
--
-- The policies created in 20261028000000_workshop_aligned.sql directly queried
-- `not exists (select 1 from public.app_owner)`. Because role authenticated
-- has no privileges on public.app_owner (revoked in 20261020000000_lock_db_to_owner.sql),
-- evaluating the policy failed with permission denied for table app_owner.
--
-- This migration introduces SECURITY DEFINER helper public.app_owner_unset()
-- and updates the policies on the 5 workshop tables.
-- Idempotent and executed in a single transaction.
-- =========================================================================

begin;

-- 1. Helper function: check if app_owner has no rows (SECURITY DEFINER)
create or replace function public.app_owner_unset()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (select 1 from public.app_owner);
$$;

comment on function public.app_owner_unset() is
  'True when public.app_owner is empty (initial setup before owner registration).';

revoke all on function public.app_owner_unset() from public;
revoke all on function public.app_owner_unset() from anon;
grant execute on function public.app_owner_unset() to authenticated;

-- 2. Drop and recreate owner policies on the 5 workshop tables
do $$
declare
  t text;
  workshop_owner_tables constant text[] := array[
    'projects',
    'project_logs',
    'agent_assignments',
    'provider_configs'
  ];
begin
  foreach t in array workshop_owner_tables loop
    if to_regclass(format('public.%I', t)) is not null then
      execute format('drop policy if exists %I on public.%I', 'Owner only ' || t, t);
      execute format($pol$
        create policy %I on public.%I
          as permissive for all to authenticated
          using (
            public.is_app_owner()
            or (owner_id is not null and owner_id = (select auth.uid()) and public.app_owner_unset())
          )
          with check (
            public.is_app_owner()
            or (owner_id is not null and owner_id = (select auth.uid()) and public.app_owner_unset())
          )
      $pol$, 'Owner only ' || t, t);
    end if;
  end loop;

  if to_regclass('public.user_preferences') is not null then
    execute 'drop policy if exists "Owner only user_preferences" on public.user_preferences';
    execute $pol$
      create policy "Owner only user_preferences" on public.user_preferences
        as permissive for all to authenticated
        using (
          public.is_app_owner()
          or (user_id = (select auth.uid()) and public.app_owner_unset())
        )
        with check (
          public.is_app_owner()
          or (user_id = (select auth.uid()) and public.app_owner_unset())
        )
    $pol$;
  end if;
end;
$$;

commit;
