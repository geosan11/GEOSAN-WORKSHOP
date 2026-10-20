#!/usr/bin/env bash
# Test supabase/migrations/20261020010000_canonical_project_ids.sql against a
# throwaway local Postgres. Never touches a Supabase project.
#   scripts/db/run-canonical-ids-test.sh
# With PR #5's scripts/db/supabase-stub.sql and lock migration present, it
# also checks that the remap runs on top of the owner-only lock and leaves the
# lock (policies, RLS flags, grants, default grants) unchanged.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PGBIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)"
export PATH="${PGBIN:+$PGBIN:}$PATH"
WORK="$(mktemp -d)"
PORT="${PGPORT_TEST:-55441}"
MIG="$ROOT/supabase/migrations/20261020010000_canonical_project_ids.sql"
LOCK="$ROOT/supabase/migrations/20261020000000_lock_db_to_owner.sql"
STUB="$ROOT/scripts/db/supabase-stub.sql"
cleanup() { pg_ctl -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$WORK"; }
trap cleanup EXIT

initdb -D "$WORK/data" -U supabase_admin --auth=trust >/dev/null
pg_ctl -D "$WORK/data" -o "-p $PORT -k $WORK -c listen_addresses=''" -l "$WORK/pg.log" -w start >/dev/null
as() { local role="$1"; shift; PGOPTIONS='-c client_min_messages=warning' psql -X -q -v ON_ERROR_STOP=1 -h "$WORK" -p "$PORT" -U "$role" -d "${DB:-postgres}" "$@"; }
notices() { sed -n 's/.*NOTICE:  //p'; }
snapshot() { as postgres -tA -c "
  select 'pol', tablename, policyname, cmd, roles::text, qual, with_check from pg_policies where schemaname = 'public'
  union all select 'rel', relname, relrowsecurity::text, relforcerowsecurity::text, coalesce(relacl::text, ''), '', ''
    from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'
  union all select 'defacl', pg_get_userbyid(defaclrole), defaclnamespace::text, defaclobjtype::text, defaclacl::text, '', ''
    from pg_default_acl" | LC_ALL=C sort; }
data() { as postgres -tA -c "
  select 'reg', id, name, coalesce(design_kit,'') from public.project_registry
  union all select 'task', id, project_id, org_id from public.agent_tasks
  union all select 'cost', id, project_id, org_id from public.cost_events
  union all select 'run', id, project_id, org_id from public.qa_runs
  union all select 'find', id, project_id, '' from public.qa_findings
  union all select 'bud', project_id, monthly_limit_usd::text, '' from public.project_budgets" | LC_ALL=C sort; }

# The database as it is live today: schema.sql from main before this PR.
git -C "$ROOT" show 6bfeb72:supabase/schema.sql > "$WORK/schema-before.sql"

run_case() {  # $1 label, $2 "lock" to apply PR #5's lock first
  local db="$3"
  as supabase_admin -c "create database $db owner postgres"
  DB=$db as supabase_admin -c "alter schema public owner to postgres; grant usage on schema public to anon, authenticated, service_role;"
  # Per-database parts of the stub (auth schema, auth.uid()); role creation
  # errors are expected here because roles are cluster-wide.
  if [ -f "$STUB" ]; then psql -X -q -h "$WORK" -p "$PORT" -U supabase_admin -d "$db" -f "$STUB" >/dev/null 2>&1 || true; fi
  export DB=$db
  as postgres -f "$WORK/schema-before.sql"
  as postgres -f "$ROOT/scripts/db/canonical-ids-fixture.sql"
  if [ "$2" = lock ]; then as postgres -f "$LOCK"; fi
  local before; before=$(snapshot)
  as postgres -f "$MIG"
  PGOPTIONS= psql -X -q -v ON_ERROR_STOP=1 -h "$WORK" -p "$PORT" -U postgres -d "$db" \
    -f "$ROOT/scripts/db/canonical-ids-test.sql" 2>&1 | sed -n 's/.*NOTICE:  //p;s/.*ERROR: */ERROR: /p' | sed "s/^/   [$1] /"
  test "${PIPESTATUS[0]}" -eq 0
  local after; after=$(snapshot)
  [ "$before" = "$after" ] || { echo "   [$1] FAIL migration changed policies/RLS/grants"; diff <(echo "$before") <(echo "$after"); exit 1; }
  echo "   [$1] PASS policies, RLS flags, grants and default grants unchanged"
  local d1; d1=$(data)
  as postgres -f "$MIG"
  [ "$d1" = "$(data)" ] || { echo "   [$1] FAIL second run changed data"; exit 1; }
  # schema.sql's seed upsert must not bring old ids back. (Only when the file
  # can be re-run at all: before PR #5 it re-creates policies and errors.)
  if ! grep -qi '^create policy' "$ROOT/supabase/schema.sql"; then
    as postgres -f "$ROOT/supabase/schema.sql"
    as postgres -f "$MIG"
    [ "$d1" = "$(data)" ] || { echo "   [$1] FAIL re-running schema.sql + migration changed data"; exit 1; }
    echo "   [$1] PASS idempotent (second run, and after re-running schema.sql)"
  else
    echo "   [$1] PASS idempotent (second run)"
  fi
  unset DB
}

echo "== Postgres: $(as supabase_admin -tAc 'show server_version')"
# Roles: PR #5's Supabase stub if present, else a minimal stand-in.
if [ -f "$STUB" ]; then
  as supabase_admin -f "$STUB"
else
  as supabase_admin -c "create role postgres login createrole createdb bypassrls; create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; grant create on database postgres to postgres; alter schema public owner to postgres;"
fi
as supabase_admin -c "alter role postgres createdb" -c "create role app_user login"

echo "== 1. old ids on today's (unlocked) schema"
run_case unlocked nolock t_unlocked

if [ -f "$LOCK" ]; then
  echo "== 2. on top of PR #5's owner-only lock"
  run_case locked lock t_locked
  echo "== 3. a role that row security applies to is refused, nothing changes"
  export DB=t_locked
  as postgres -f "$ROOT/scripts/db/canonical-ids-fixture.sql" >/dev/null 2>&1 || true
  as postgres -c "grant usage on schema public to app_user; grant select, insert, update, delete on all tables in schema public to app_user"
  d0=$(data)
  if out=$(as app_user -f "$MIG" 2>&1); then echo "   FAIL non-bypass role ran the migration"; exit 1; fi
  echo "$out" | grep -q "cannot see every row" || { echo "   FAIL unexpected error: $out"; exit 1; }
  [ "$d0" = "$(data)" ] || { echo "   FAIL refused run changed data"; exit 1; }
  echo "   PASS refused: $(echo "$out" | grep -o 'canonical_project_ids: .*' | cut -c1-110)"
  unset DB
else
  echo "== 2. skipped: PR #5's lock migration is not on this branch"
fi
echo "ALL CANONICAL ID MIGRATION TESTS PASSED"
