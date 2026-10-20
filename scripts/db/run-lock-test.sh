#!/usr/bin/env bash
# Prove the owner-only lock against a real, throwaway local Postgres.
#   scripts/db/run-lock-test.sh
# Needs Postgres server binaries (initdb, pg_ctl) on PATH or in
# /usr/lib/postgresql/<ver>/bin. Never touches a Supabase project.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PGBIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)"
export PATH="${PGBIN:+$PGBIN:}$PATH"
WORK="$(mktemp -d)"
PORT="${PGPORT_TEST:-55439}"
cleanup() { pg_ctl -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$WORK"; }
trap cleanup EXIT

initdb -D "$WORK/data" -U supabase_admin --auth=trust >/dev/null
pg_ctl -D "$WORK/data" -o "-p $PORT -k $WORK -c listen_addresses=''" -l "$WORK/pg.log" -w start >/dev/null

as() { local role="$1"; shift; psql -X -q -v ON_ERROR_STOP=1 -h "$WORK" -p "$PORT" -U "$role" -d postgres "$@"; }

quiet() { PGOPTIONS='-c client_min_messages=warning' as "$@"; }
open_count() { as postgres -tAc "select count(*) from pg_policies where schemaname='public' and (qual='true' or with_check='true')"; }
anon_count() { as postgres -tA -c "set role anon" -c "select count(*) from public.project_registry" 2>&1 | sed 's/^psql:.*ERROR: */denied: /'; }

echo "== Postgres: $(as supabase_admin -tAc 'show server_version')"
echo "== 1/6 Supabase stub (roles, default grants, auth.uid())"
as supabase_admin -f "$ROOT/scripts/db/supabase-stub.sql"
# Start from the database as it is live today: the pre-lock schema.sql from
# main, with its 14 "using (true)" policies. Falls back to the current file
# (which has no policies) if git history isn't available.
if git -C "$ROOT" show 6bfeb72:supabase/schema.sql > "$WORK/schema-before.sql" 2>/dev/null; then
  echo "== 2/6 pre-lock supabase/schema.sql (commit 6bfeb72, 14 open policies) as postgres"
else
  cp "$ROOT/supabase/schema.sql" "$WORK/schema-before.sql"
  echo "== 2/6 supabase/schema.sql (git history unavailable; current file) as postgres"
fi
quiet postgres -f "$WORK/schema-before.sql"
echo "   open policies before lock: $(open_count)"
echo "   anon rows visible in project_registry before lock: $(anon_count)"
echo "== 3/6 lock migration"
quiet postgres -f "$ROOT/supabase/migrations/20261020000000_lock_db_to_owner.sql"
echo "   open policies after lock: $(open_count); anon select now: $(anon_count)"
echo "== 4/6 lock migration again (idempotency)"
quiet postgres -f "$ROOT/supabase/migrations/20261020000000_lock_db_to_owner.sql"
echo "   second run OK; open policies: $(open_count)"
echo "== 5/6 re-run current schema.sql (must NOT re-open), add a dashboard-style open policy, then lock again"
quiet postgres -f "$ROOT/supabase/schema.sql"
echo "   open policies after re-running schema.sql: $(open_count)"
as postgres -c "create policy \"Enable read access for all users\" on public.project_registry for select using (true)"
echo "   open policies after adding a dashboard policy: $(open_count)"
quiet postgres -f "$ROOT/supabase/migrations/20261020000000_lock_db_to_owner.sql"
echo "   open policies after re-lock: $(open_count)"
echo "== 6/6 behaviour tests"
as postgres -f "$ROOT/scripts/db/lock-test.sql" 2>&1 | sed -n 's/.*NOTICE:  //p;/ALL LOCK TESTS PASSED/p;/ERROR/p'
test "${PIPESTATUS[0]}" -eq 0

MIGF="$ROOT/supabase/migrations/20261020000000_lock_db_to_owner.sql"
OWNER=11111111-1111-1111-1111-111111111111; STRANGER=22222222-2222-2222-2222-222222222222
# Signed-in request as $1 (uuid), rolled back; prints the result or "denied: ...".
req() { local r; r=$(as postgres -tA -c "begin" -c "set local role authenticated" \
  -c "set local request.jwt.claims = '{\"sub\":\"$1\",\"role\":\"authenticated\"}'" -c "$2" -c "rollback" 2>&1 \
  | grep -Ev '^(BEGIN|SET|ROLLBACK|)$' | sed -E 's/^(psql:.*)?ERROR: +/denied: /' | head -1 || true); echo "${r:-ok}"; }
anon_req() { local r; r=$(as postgres -tA -c "begin" -c "set local role anon" -c "$1" -c "rollback" 2>&1 \
  | grep -Ev '^(BEGIN|SET|ROLLBACK|)$' | sed -E 's/^(psql:.*)?ERROR: +/denied: /' | head -1 || true); echo "${r:-ok}"; }
# Everything the lock changes: policies, RLS flags, table/function ACLs, default ACLs.
snapshot() { as postgres -tA -c "
  select 'pol', tablename, policyname, cmd, roles::text, qual, with_check from pg_policies where schemaname = 'public'
  union all select 'rel', relname, relrowsecurity::text, relforcerowsecurity::text, coalesce(relacl::text, ''), '', ''
    from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'
  union all select 'fn', proname, pg_get_userbyid(proowner), coalesce(proacl::text, ''), md5(prosrc), '', ''
    from pg_proc where pronamespace = 'public'::regnamespace and proname = 'is_app_owner'
  union all select 'defacl', pg_get_userbyid(defaclrole), defaclnamespace::text, defaclobjtype::text, defaclacl::text, '', ''
    from pg_default_acl
  order by 1, 2, 3"; }
expect_refused() {  # $1 label, $2 expected text in the error
  local out
  if out=$(quiet postgres -1 -f "$MIGF" 2>&1); then echo "   FAIL [$1]: migration ran"; exit 1; fi
  echo "$out" | grep -q "nothing was locked.*$2" || { echo "   FAIL [$1]: unexpected error: $out"; exit 1; }
  echo "   PASS [$1] refused: $(echo "$out" | grep 'ERROR' | sed -E 's/.*nothing was locked\. //' | cut -c1-160)"
}

echo "== guard: the owner path must work, otherwise the migration refuses to lock"
as supabase_admin -q -c "create role plain_owner nobypassrls; grant plain_owner to postgres; grant usage on schema public, auth to plain_owner; grant select on public.app_owner to plain_owner; alter function public.is_app_owner() owner to plain_owner"
expect_refused "G1 fn owner neither owns app_owner nor has BYPASSRLS" "never see the owner row"

# D: plain `psql -f` (no ON_ERROR_STOP, no transaction) with a failing guard
# must not lock anything. Put the DB in a state the lock would change first.
as postgres -q -c "drop policy \"Owner only project_registry\" on public.project_registry" \
  -c "create policy \"Enable read access for all users\" on public.project_registry for select using (true)" \
  -c "alter table public.project_registry no force row level security" \
  -c "grant all on public.project_registry to anon" \
  -c "alter default privileges for role postgres grant execute on functions to public"
before=$(snapshot)
out=$(PGOPTIONS='-c client_min_messages=warning' psql -X -h "$WORK" -p "$PORT" -U postgres -d postgres -f "$MIGF" 2>&1); rc=$?
[ "$(echo "$out" | grep -c ERROR)" -ge 1 ] || { echo "   FAIL [D]: guard did not raise"; exit 1; }
[ "$before" = "$(snapshot)" ] || { echo "   FAIL [D]: plain psql -f changed the lock state after the guard failed"; diff <(echo "$before") <(snapshot); exit 1; }
echo "   PASS [D] plain psql -f (exit $rc, $(echo "$out" | grep -c ERROR) error): policies, RLS flags, ACLs and default ACLs unchanged; open policy still there, owner policy not recreated"
as supabase_admin -q -c "alter function public.is_app_owner() owner to postgres"
quiet postgres -1 -f "$MIGF"   # back to locked

# C1: function owner has BYPASSRLS but no SELECT on app_owner.
as supabase_admin -q -c "create role bypass_noselect bypassrls; grant bypass_noselect to postgres; grant usage on schema public, auth to bypass_noselect; alter function public.is_app_owner() owner to bypass_noselect"
expect_refused "C1 fn owner BYPASSRLS but no SELECT on app_owner" "has no SELECT on public.app_owner"
as supabase_admin -q -c "alter function public.is_app_owner() owner to postgres"

# C2: function owner can see app_owner but cannot execute auth.uid().
as supabase_admin -q -c "create role bypass_nouid bypassrls; grant bypass_nouid to postgres; grant usage on schema public, auth to bypass_nouid; grant select on public.app_owner to bypass_nouid;
  revoke execute on function auth.uid() from public; grant execute on function auth.uid() to anon, authenticated, service_role, postgres;
  alter function public.is_app_owner() owner to bypass_nouid"
expect_refused "C2 fn owner without EXECUTE on auth.uid()" "has no EXECUTE on auth.uid()"
as supabase_admin -q -c "alter function public.is_app_owner() owner to postgres; grant execute on function auth.uid() to public"

# C3: function owner without USAGE on schema auth.
as supabase_admin -q -c "create role bypass_noauth bypassrls; grant bypass_noauth to postgres; grant usage on schema public to bypass_noauth; grant select on public.app_owner to bypass_noauth; alter function public.is_app_owner() owner to bypass_noauth"
expect_refused "C3 fn owner without USAGE on schema auth" "has no USAGE on schema auth"
as supabase_admin -q -c "alter function public.is_app_owner() owner to postgres"

# Positive: postgres without BYPASSRLS but owning both (table not forced) works.
as supabase_admin -q -c "alter role postgres nobypassrls"
quiet postgres -1 -f "$MIGF"
n=$(req $OWNER "select count(*) from public.project_registry")
[ "$n" = 4 ] || { echo "   FAIL: owner saw $n rows with a NOBYPASSRLS function owner"; exit 1; }
echo "   PASS function owner without BYPASSRLS but owning non-forced app_owner: owner still sees $n rows"
as supabase_admin -q -c "alter role postgres bypassrls"

echo "== rule for new tables (scripts/db/protect-new-table.sql) on a supabase_admin-created table"
as supabase_admin -q -c "create table public.zz_admin_table (id int primary key); insert into public.zz_admin_table values (1)"
echo "   before rule: anon SELECT=$(anon_req 'select count(*) from public.zz_admin_table') stranger TRUNCATE=$(req $STRANGER 'truncate public.zz_admin_table')"
rule=$(sed 's/<new_table>/zz_admin_table/g' "$ROOT/scripts/db/protect-new-table.sql")
if out=$(as postgres -c "$rule" 2>&1); then echo "   FAIL: postgres could alter a supabase_admin table"; exit 1; fi
echo "   as postgres: $(echo "$out" | grep -o 'ERROR: .*')  (expected: rule must be run by the owner)"
quiet supabase_admin -q -c "$rule"
a=$(anon_req 'select count(*) from public.zz_admin_table'); ss=$(req $STRANGER 'select count(*) from public.zz_admin_table')
sd=$(req $STRANGER 'with d as (delete from public.zz_admin_table returning 1) select count(*) from d'); st=$(req $STRANGER 'truncate public.zz_admin_table')
os=$(req $OWNER 'select count(*) from public.zz_admin_table'); ot=$(req $OWNER 'truncate public.zz_admin_table')
[[ "$a" == denied:* && "$ss" = 0 && "$sd" = 0 && "$st" == denied:* && "$os" = 1 ]] \
  || { echo "   FAIL rule: anon=$a stranger select=$ss delete=$sd truncate=$st owner=$os"; exit 1; }
echo "   PASS as owner (supabase_admin): anon SELECT $a | stranger SELECT $ss, DELETE $sd rows, TRUNCATE $st | owner SELECT $os (owner TRUNCATE: $ot)"
as supabase_admin -q -c "drop table public.zz_admin_table"
echo "ALL CHECKS PASSED"
