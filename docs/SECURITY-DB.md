# Database security: owner-only access

The app has one user: Sanni. The Supabase database should only ever answer
to Sanni's account. This page explains how that is enforced and the few
manual steps needed to switch it on.

## What was wrong

`supabase/schema.sql` created two policies on every table:

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

## What the fix does

`supabase/migrations/20261020000000_lock_db_to_owner.sql`:

1. Creates `public.app_owner (user_id uuid primary key)`, a list of the
   accounts allowed in. RLS is on and forced, it has no policies and no
   grants to `anon`/`authenticated`, so it can't be read or changed through
   the API at all, only from the SQL editor.
2. Creates `public.is_app_owner()`, which returns true only when the
   signed-in user's `auth.uid()` is in `app_owner`. It is `SECURITY DEFINER`
   (so it can read `app_owner`) with `search_path` pinned to `''`.
3. On every app table: drops the 14 open policies (and any other leftover
   policy, which would otherwise re-open the table), enables and forces RLS,
   revokes everything from `anon`, and adds a single policy:
   `for all to authenticated using (is_app_owner()) with check (is_app_owner())`.
4. Stops Supabase from automatically granting `anon` access to tables
   created later in `public`.

Nothing is left public. Demo mode doesn't use Supabase (see below), so no
table has to stay readable for it.

The migration is safe to run more than once and doesn't delete or change
any data rows. The old `supabase/schema.sql` is left as it was.

> **Careful:** re-running `supabase/schema.sql` re-creates the open
> policies. If you ever run it again, run the lock migration straight
> after it.

Who can do what after the lock:

| Who | Access |
| --- | --- |
| Anyone with only the anon key (signed out) | Nothing: "permission denied" |
| Any other signed-in account | Sees 0 rows, can't insert, update or delete |
| Sanni's account (listed in `app_owner`) | Full read and write |
| Supabase SQL editor / `service_role` secret key | Full access (they bypass RLS by design; keep the secret key off the browser) |

## Steps for Sanni

Do these in order. Until step 3 is done, nobody, including you, can read
data through the app. That's expected.

### 1. Make sure your account exists

Supabase dashboard → **Authentication → Users**. If your email isn't
listed, use **Add user → Create new user** and give it a password.

### 2. Apply the migration

Pick one:

- **SQL editor (simplest):** dashboard → **SQL Editor** → New query → paste
  the whole contents of
  `supabase/migrations/20261020000000_lock_db_to_owner.sql` → **Run**.
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

### 3. Register yourself as the owner

Find your user id: dashboard → **Authentication → Users** → click your
account → copy the **User UID** (it looks like
`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`). You can also run
`select id, email from auth.users;` in the SQL editor.

Then run this in the SQL editor, with your id in place of the placeholder:

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

`scripts/db/run-lock-test.sh` starts a throwaway local Postgres, adds a
small Supabase stand-in (`scripts/db/supabase-stub.sql`: the `anon`,
`authenticated`, `service_role` and BYPASSRLS `postgres` roles, Supabase's
default grants, and `auth.uid()` reading the JWT `sub` claim), applies
`schema.sql` and the lock migration, and runs `scripts/db/lock-test.sql`.
That script checks that signed-out users are denied, other signed-in users
are denied, and the owner can read and write. It never touches a real
Supabase project.
