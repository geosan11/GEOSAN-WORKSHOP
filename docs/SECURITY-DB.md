# Database security: owner-only access

The app has one user: Sanni. The Supabase database should only ever answer
to Sanni's account. This page explains how that is enforced and the few
manual steps needed to switch it on.

## What was wrong

`supabase/schema.sql` used to create two policies on every table:

```sql
create policy "Public read <table>"  ... for select using (true);
create policy "Public write <table>" ... for all    using (true);
```

`using (true)` means "everyone". Together with Supabase's default grants to
the `anon` role, anyone holding the anon key (it ships inside the web app,
so assume everyone has it) could read, add, change and delete all data in
these 7 tables:

`project_registry`, `agent_tasks`, `cost_events`, `qa_runs`, `qa_findings`,
`project_budgets`, `prompt_versions`.

The live database still has those 14 policies until the lock migration
below is applied.

## What the fix does

**`supabase/schema.sql`** no longer creates any policies. It still switches
RLS on for every table, so run on its own it leaves every table closed to
the API. Re-running it is now safe: it can't re-open anything.

**`supabase/migrations/20261020000000_lock_db_to_owner.sql`**:

1. Creates `public.app_owner (user_id uuid primary key references
   auth.users(id) on delete cascade)`, the list of accounts allowed in.
   Only real accounts can be added, and deleting an account removes its
   entry. RLS is on with no policies and no grants to `anon` or
   `authenticated`, so it can't be read or changed through the API, only
   from the SQL editor. RLS is deliberately **not forced** on this table
   (see the guard in step 3).
2. Creates `public.is_app_owner()`, which returns true only when the
   signed-in user's `auth.uid()` is in `app_owner`. It is `SECURITY DEFINER`
   (so it can read `app_owner`) with `search_path` pinned to `''`. Only
   `authenticated` may call it.
3. **Guard:** stops with an error before any table is locked unless
   `is_app_owner()` can actually work. Its owner must be able to see
   `app_owner`'s rows (own the non-forced table, have `BYPASSRLS`, or be a
   superuser). It must also have SELECT on `app_owner`, USAGE on the
   `public` and `auth` schemas, and EXECUTE on `auth.uid()`. On Supabase it
   runs as `postgres`, which passes all of these. Without the guard, a wrong
   owner would make `is_app_owner()` always false (or fail) and lock you
   out. The guard, the table lock (step 4) and the default-privilege
   changes (step 5) are one `DO` block, so they apply together or not at
   all. That holds even with plain `psql -f`, without `ON_ERROR_STOP` or a
   transaction.
4. On every app table, it:
   - drops the 14 open policies, and any other leftover policy, which would
     otherwise re-open the table;
   - enables and forces RLS;
   - revokes everything from `anon`;
   - gives `authenticated` back only select, insert, update and delete. Not
     TRUNCATE, which RLS can't filter.

   Then it adds a single policy:
   `for all to authenticated using (is_app_owner()) with check (is_app_owner())`.
5. Changes the default privileges for objects that `postgres` creates later:
   - Tables in `public`: no grants to `anon` or `authenticated`.
   - Sequences in `public`: no grants to `anon`.
   - Functions: not executable by `PUBLIC`, so not by `anon` or
     `authenticated` either. Revoking from `anon` and `authenticated` alone
     does nothing, because they inherit `PUBLIC`'s EXECUTE. A
     `PUBLIC` revoke limited to schema `public` is also a no-op in Postgres.
     So this revoke is global: it covers functions `postgres` creates in
     **any** schema, including through `CREATE EXTENSION`. Grant EXECUTE
     explicitly to any new function the API (or a column default or
     policy used by signed-in requests) must call. `is_app_owner()` already
     exists and keeps its explicit grant to `authenticated`.

   None of this covers objects created by other roles, such as
   `supabase_admin`. See the rule below.

Nothing is left public. Demo mode doesn't use Supabase (see below), so no
table has to stay readable for it.

The migration is safe to run more than once and doesn't delete or change
any project data. The one exception: if `app_owner` already exists from an
earlier draft, ids with no matching account are removed before the foreign
key is added.

Who can do what after the lock:

| Who | Access |
| --- | --- |
| Anyone with only the anon key (signed out) | Nothing: "permission denied" |
| Any other signed-in account | Sees 0 rows, can't insert, update, delete or truncate |
| Sanni's account (listed in `app_owner`) | Full read and write |
| Supabase SQL editor / `service_role` secret key | Full access (they bypass RLS by design; keep the secret key off the browser) |

## Rule for new tables

Default privileges only cover objects created by `postgres`. Tables created
by other roles, such as `supabase_admin`, still get Supabase's default
grants to `anon` and `authenticated`. Even a table created by `postgres`
has no owner policy until you add one. So for **every new table** in
`public`, run this (also in `scripts/db/protect-new-table.sql`), with the
table name in place of `<new_table>`:

```sql
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
```

- **Run it as the table's owner.** Tables you create from the SQL editor
  or the dashboard table editor are owned by `postgres`, so the SQL editor
  works. If you get `must be owner of table ...`, another role (for example
  `supabase_admin`) created it. You can't fix that table from the SQL
  editor: re-create it as `postgres`, or ask Supabase support.
- **Revoke from `authenticated` too, not just `anon`.** RLS doesn't apply
  to TRUNCATE, so if `authenticated` keeps Supabase's default grants, any
  signed-in stranger can empty the table even though the policy hides its
  rows.

Or add the table name to the list in the lock migration and run it again.

New functions created by `postgres` are not callable by `anon` or
`authenticated` after the lock. Add
`grant execute on function public.<fn>(...) to authenticated;` only if the
signed-in app has to call one.

## Steps for Sanni

### 1. Make sure your account exists

Supabase dashboard → **Authentication → Users**. If your email isn't
listed, use **Add user → Create new user** and give it a password.

### 2. Apply the lock and register yourself in one go (recommended)

This does both in a single transaction. If the email doesn't match an
account, nothing at all is changed, so you can't end up locked out.

Dashboard → **SQL Editor** → New query → paste, in this order:

1. `begin;`
2. the whole contents of
   `supabase/migrations/20261020000000_lock_db_to_owner.sql`
3. the block below, with your sign-in email in place of
   `<YOUR_ACCOUNT_EMAIL>` (this is also in
   `scripts/db/register-owner-by-email.sql`)
4. `commit;`

```sql
-- Register the owner by email. Replace <YOUR_ACCOUNT_EMAIL> with the email
-- you sign in with. If no account has that email, this raises an error, and
-- inside the rollout transaction (docs/SECURITY-DB.md) that undoes the
-- whole migration, so you can never end up locked out.
do $$
declare
  owner_email constant text := '<YOUR_ACCOUNT_EMAIL>';
  uid uuid;
begin
  select id into uid from auth.users where lower(email) = lower(owner_email);
  if uid is null then
    raise exception 'No Supabase account with email %; nothing was changed', owner_email;
  end if;
  insert into public.app_owner (user_id) values (uid) on conflict (user_id) do nothing;
  raise notice 'Owner registered: % (%)', owner_email, uid;
end
$$;
```

Then **Run**. You should see `Owner registered: ...`. Skip to step 4.

### 3. Or: apply the migration and register yourself separately

**3a. Apply the migration.** Pick one:

- **SQL editor:** paste the whole migration file → **Run**.
- **Supabase CLI:** from the repo root:

  ```bash
  npx supabase init          # only if supabase/config.toml doesn't exist yet
  npx supabase link --project-ref <your-project-ref>
  npx supabase db push
  ```

  `<your-project-ref>` is the ID in your project URL
  (`https://<project-ref>.supabase.co`).

If the tables don't exist yet, run `supabase/schema.sql` first, then the
migration.

Until 3b is done, nobody (you included) can read data through the app.
That's expected.

**3b. Register yourself as the owner.** Find your user id: dashboard →
**Authentication → Users** → click your account → copy the **User UID** (it
looks like `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`). You can also run
`select id, email from auth.users;` in the SQL editor. Then run this, with
your id in place of the placeholder:

```sql
insert into public.app_owner (user_id)
values ('<YOUR_SUPABASE_USER_ID>')
on conflict (user_id) do nothing;

-- check: should show exactly one row, your id
select * from public.app_owner;
```

### 4. Turn off public sign-ups

Otherwise strangers can still create accounts. They wouldn't see any data,
but there's no reason to allow it. Dashboard → **Authentication → Sign In /
Providers** (in older dashboards: **Authentication → Providers → Email**,
or **Settings**) → switch off **Allow new users to sign up** → Save.

### 5. Check it worked (optional)

In the SQL editor, this should fail with `permission denied for table
project_registry`:

```sql
begin;
set local role anon;
select * from public.project_registry;
rollback;
```

And this should return your projects (put in your id):

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"<YOUR_SUPABASE_USER_ID>","role":"authenticated"}', true);
select id, name from public.project_registry;
rollback;
```

## If something goes wrong

**Locked out, but the lock itself is fine** (for example you registered the
wrong account): don't roll back. Just fix the owner row from the SQL editor
with step 3b.

**Rollback (by DevOps).** This is DevOps's rollback from the PR #5 review,
extended to also restore the extra default privileges the revised migration
changes. It's in `scripts/db/rollback-lock.sql`. **It re-opens all data to
anyone with the anon key**, so only use it if the lock itself is broken.

```sql
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
```

## Demo mode still works

When `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` aren't set (and none are
saved in the browser), `src/lib/supabase.ts` sets `isDemoMode = true` and
`supabase = null`. The app then runs on the built-in local data and never
contacts Supabase, so this lock doesn't affect it.

## Notes on the client code

- Today no screen actually reads or writes these tables through Supabase.
  Projects, tasks, costs and QA data come from local data, and the realtime
  helpers are stubs. So nothing visible in the app changes when the lock is
  applied.
- The small REST client used to send only the anon key on table requests.
  If a screen had used it, every request would have counted as "signed out".
  It now sends the signed-in user's access token when there is one.
- Signing in with a real Supabase account used to be dropped, because the
  code expected a `session` object the REST endpoint doesn't return. It now
  keeps the real token.
- Known follow-ups, not part of this change:
  - If Supabase sign-in fails, `src/lib/auth.tsx` still falls back to a
    local "staff operator" session that accepts any email and password. It
    only gets you past the login screen. With the lock in place, that
    session can't read any Supabase data.
  - Access tokens expire after about an hour and the client doesn't refresh
    them. Sign in again if data requests start failing.

## How this was tested

All on throwaway local Postgres. Nothing touches a real Supabase project.

- `scripts/db/run-lock-test.sh` adds a small Supabase stand-in
  (`scripts/db/supabase-stub.sql`), then:
  - applies the pre-lock `schema.sql` (14 open policies, as live today) and
    the lock migration;
  - checks that signed-out users are denied, other signed-in users are
    denied, and the owner can read and write;
  - checks that re-running the current `schema.sql` doesn't re-open
    anything;
  - checks that new `postgres`-created functions can't be called by
    `anon` or `authenticated`, and that `is_app_owner()` stays callable by
    `authenticated` only;
  - checks that the guard refuses each owner setup that couldn't work (no
    way to see the rows, no SELECT on `app_owner`, no EXECUTE on
    `auth.uid()`, no USAGE on `auth`);
  - checks that a plain `psql -f` without stop-on-error and with a failing
    guard leaves policies, RLS flags, ACLs and default ACLs untouched;
  - checks the new-table rule on a table created by `supabase_admin`:
    `postgres` gets `must be owner`, and once the owner runs it, a stranger
    can't select, delete or truncate.

  The stand-in provides the `anon`, `authenticated`, `service_role` and
  BYPASSRLS `postgres` roles, Supabase's default grants, `auth.users`, and
  `auth.uid()` reading the JWT `sub` claim.
- `scripts/db/run-rollout-rollback-test.sh` covers:
  - the one-transaction rollout, both with an unknown email (nothing
    applied) and with the right one;
  - DevOps's rollback round trip;
  - upgrading from the first draft of the migration.
- DevOps's independent `verify.sh` from the PR #5 review.
