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

echo "== guard: owner path must work, otherwise the migration refuses to run"
# Function owned by a role that neither owns app_owner nor bypasses RLS:
# the migration must stop with an error (single transaction, nothing applied).
as supabase_admin -q -c "create role plain_owner nobypassrls; grant plain_owner to postgres; grant usage on schema auth to plain_owner; alter function public.is_app_owner() owner to plain_owner"
if out=$(quiet postgres -1 -f "$ROOT/supabase/migrations/20261020000000_lock_db_to_owner.sql" 2>&1); then
  echo "   FAIL: migration ran although is_app_owner() could not see app_owner"; exit 1
fi
echo "   PASS refused: $(echo "$out" | grep -o 'is_app_owner() is owned by "plain_owner"[^;]*')"
# postgres without BYPASSRLS but owning both (table not forced): allowed and works.
as supabase_admin -q -c "alter function public.is_app_owner() owner to postgres; alter role postgres nobypassrls"
quiet postgres -1 -f "$ROOT/supabase/migrations/20261020000000_lock_db_to_owner.sql"
n=$(as postgres -tA -c "begin" -c "set local role authenticated" -c "set local request.jwt.claims = '{\"sub\":\"11111111-1111-1111-1111-111111111111\"}'" -c "select count(*) from public.project_registry" -c "rollback" | grep -E '^[0-9]+$')
[ "$n" = 4 ] || { echo "   FAIL: owner saw $n rows with a NOBYPASSRLS function owner"; exit 1; }
echo "   PASS function owner without BYPASSRLS but owning non-forced app_owner: owner still sees $n rows"
as supabase_admin -q -c "alter role postgres bypassrls"
echo "ALL CHECKS PASSED"
