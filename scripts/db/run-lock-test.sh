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
echo "== 2/6 supabase/schema.sql (original open policies) as postgres"
quiet postgres -f "$ROOT/supabase/schema.sql"
echo "   open policies before lock: $(open_count)"
echo "   anon rows visible in project_registry before lock: $(anon_count)"
echo "== 3/6 lock migration"
quiet postgres -f "$ROOT/supabase/migrations/20261020000000_lock_db_to_owner.sql"
echo "   open policies after lock: $(open_count); anon select now: $(anon_count)"
echo "== 4/6 lock migration again (idempotency)"
quiet postgres -f "$ROOT/supabase/migrations/20261020000000_lock_db_to_owner.sql"
echo "   second run OK; open policies: $(open_count)"
echo "== 5/6 re-open on purpose: re-run schema.sql + add a dashboard-style open policy, then lock again"
quiet postgres -f "$ROOT/supabase/schema.sql"
as postgres -c "create policy \"Enable read access for all users\" on public.project_registry for select using (true)"
echo "   open policies after re-opening: $(open_count)"
quiet postgres -f "$ROOT/supabase/migrations/20261020000000_lock_db_to_owner.sql"
echo "   open policies after re-lock: $(open_count)"
echo "== 6/6 behaviour tests"
as postgres -f "$ROOT/scripts/db/lock-test.sql" 2>&1 | sed -n 's/.*NOTICE:  //p;/ALL LOCK TESTS PASSED/p'
