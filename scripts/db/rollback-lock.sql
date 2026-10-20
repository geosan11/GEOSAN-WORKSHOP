-- ROLLBACK of supabase/migrations/20261020000000_lock_db_to_owner.sql.
-- Written by DevOps in the PR #5 review (rollback.sql); extended for the
-- revised migration: the extra default-privilege revokes are restored too.
--
-- WARNING: this RE-OPENS all 7 tables to anyone holding the anon key.
-- Prefer the break-glass fix (insert your uid into public.app_owner) unless
-- the lock itself is broken. Run in the SQL editor (postgres role).
begin;
do $$
declare t text;
begin
  foreach t in array array['project_registry','agent_tasks','cost_events','qa_runs','qa_findings','project_budgets','prompt_versions'] loop
    if to_regclass(format('public.%I', t)) is null then continue; end if;
    execute format('drop policy if exists %I on public.%I', 'Owner only ' || t, t);
    execute format('alter table public.%I no force row level security', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('grant all on table public.%I to anon, authenticated', t);   -- Supabase default ACL
    execute format('drop policy if exists %I on public.%I', 'Public read ' || t, t);
    execute format('drop policy if exists %I on public.%I', 'Public write ' || t, t);
    execute format('create policy %I on public.%I for select using (true)', 'Public read ' || t, t);
    execute format('create policy %I on public.%I for all using (true)', 'Public write ' || t, t);
  end loop;
end $$;
drop function if exists public.is_app_owner();
drop table if exists public.app_owner;
alter default privileges in schema public grant all on tables to anon;
-- added for the revised migration:
alter default privileges in schema public grant all on tables to authenticated;
alter default privileges in schema public grant all on functions to anon;
alter default privileges in schema public grant all on functions to authenticated;
alter default privileges in schema public grant all on sequences to anon;
-- added after the second review (global PUBLIC execute default for postgres):
alter default privileges for role postgres grant execute on functions to public;
commit;
