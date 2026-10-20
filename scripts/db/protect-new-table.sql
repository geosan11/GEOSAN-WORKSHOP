-- Lock a NEW table in public to the owner, same as the lock migration does.
-- Replace <new_table> with the table name. Must be run by the table's OWNER
-- (normally postgres, i.e. the SQL editor). Check with:
--   select tableowner from pg_tables where schemaname = 'public' and tablename = '<new_table>';
-- revoke ... from authenticated matters: RLS does not filter TRUNCATE, so
-- only taking the privilege away stops a signed-in stranger emptying it.
alter table public.<new_table> enable row level security;
alter table public.<new_table> force row level security;
revoke all on table public.<new_table> from anon, authenticated;
grant select, insert, update, delete on table public.<new_table> to authenticated;
drop policy if exists "Owner only <new_table>" on public.<new_table>;
create policy "Owner only <new_table>" on public.<new_table>
  as permissive for all to authenticated
  using (public.is_app_owner()) with check (public.is_app_owner());
