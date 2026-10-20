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
SYNC="$ROOT/supabase/migrations/20261020020000_sync_registry_budget.sql"
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
  select 'reg', id, '', coalesce(design_kit,'') from public.project_registry
  union all select 'task', id, project_id, org_id from public.agent_tasks
  union all select 'cost', id, project_id, org_id from public.cost_events
  union all select 'run', id, project_id, org_id from public.qa_runs
  union all select 'find', id, project_id, '' from public.qa_findings
  union all select 'bud', project_id, monthly_limit_usd::text, '' from public.project_budgets" | LC_ALL=C sort; }

# The database as it is live today: schema.sql from main before this PR.
git -C "$ROOT" show 6bfeb72:supabase/schema.sql > "$WORK/schema-before.sql"

run_case() {  # $1 label, $2 "lock" to apply PR #5's lock first, $3 db, [$4 fixture, $5 assertions]
  local db="$3"
  local fixture="${4:-$ROOT/scripts/db/canonical-ids-fixture.sql}"
  local checks="${5:-$ROOT/scripts/db/canonical-ids-test.sql}"
  as supabase_admin -c "create database $db owner postgres"
  DB=$db as supabase_admin -c "alter schema public owner to postgres; grant usage on schema public to anon, authenticated, service_role;"
  # Per-database parts of the stub (auth schema, auth.uid()); role creation
  # errors are expected here because roles are cluster-wide.
  if [ -f "$STUB" ]; then psql -X -q -h "$WORK" -p "$PORT" -U supabase_admin -d "$db" -f "$STUB" >/dev/null 2>&1 || true; fi
  export DB=$db
  as postgres -f "$WORK/schema-before.sql"
  as postgres -f "$fixture"
  if [ "$2" = lock ]; then as postgres -f "$LOCK"; fi
  local before; before=$(snapshot)
  as postgres -f "$MIG"
  PGOPTIONS= psql -X -q -v ON_ERROR_STOP=1 -h "$WORK" -p "$PORT" -U postgres -d "$db" \
    -f "$checks" 2>&1 | sed -n 's/.*NOTICE:  //p;s/.*ERROR: */ERROR: /p' | sed "s/^/   [$1] /"
  test "${PIPESTATUS[0]}" -eq 0
  local after; after=$(snapshot)
  [ "$before" = "$after" ] || { echo "   [$1] FAIL migration changed policies/RLS/grants"; diff <(echo "$before") <(echo "$after"); exit 1; }
  echo "   [$1] PASS policies, RLS flags, grants and default grants unchanged"
  local d1; d1=$(data)
  as postgres -f "$MIG"
  [ "$d1" = "$(data)" ] || { echo "   [$1] FAIL second run changed data"; exit 1; }
  # schema.sql's seed upsert (it resets names) must not bring old ids back. (Only when the file
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

NC_FIX="$ROOT/scripts/db/canonical-ids-fixture-no-canonical.sql"
NC_TEST="$ROOT/scripts/db/canonical-ids-test-no-canonical.sql"

echo "== 1. old ids on today's (unlocked) schema (canonical proj-iya-002 and two newer old-id rows)"
run_case unlocked nolock t_unlocked
echo "== 1b. no canonical proj-iya-002, two old-id rows (unlocked)"
run_case unlocked-nc nolock t_unlocked_nc "$NC_FIX" "$NC_TEST"

echo "== 1c. single winner: project row and budget from the same old row; tie-breaks"
as supabase_admin -c "create database t_single_winner owner postgres"
DB=t_single_winner as supabase_admin -c "alter schema public owner to postgres"
DB=t_single_winner as postgres -f "$WORK/schema-before.sql"
PGOPTIONS= psql -X -q -v ON_ERROR_STOP=1 -v mig="$MIG" -h "$WORK" -p "$PORT" -U postgres -d t_single_winner \
  -f "$ROOT/scripts/db/canonical-ids-test-single-winner.sql" 2>&1 | sed -n 's/.*NOTICE:  //p;s/.*ERROR: */ERROR: /p' | sed "s/^/   [single-winner] /"
test "${PIPESTATUS[0]}" -eq 0

if [ -f "$LOCK" ]; then
  echo "== 2. on top of PR #5's owner-only lock"
  run_case locked lock t_locked
  echo "== 2b. no canonical proj-iya-002, two old-id rows (locked)"
  run_case locked-nc lock t_locked_nc "$NC_FIX" "$NC_TEST"
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
[ -f "$SYNC" ] || { echo "   FAIL missing $SYNC"; exit 1; }
{
  echo "== 4. sync_registry_budget (new separate migration): registry budget agrees with project_budgets"
  as supabase_admin -c "create database t_sync owner postgres"
  DB=t_sync as supabase_admin -c "alter schema public owner to postgres; grant usage on schema public to anon, authenticated, service_role;"
  if [ -f "$STUB" ]; then psql -X -q -h "$WORK" -p "$PORT" -U supabase_admin -d t_sync -f "$STUB" >/dev/null 2>&1 || true; fi
  export DB=t_sync
  as postgres -f "$WORK/schema-before.sql"
  if [ -f "$LOCK" ]; then as postgres -f "$LOCK"; fi
  PGOPTIONS= psql -X -q -v ON_ERROR_STOP=1 -v mig="$MIG" -v sync="$SYNC" -h "$WORK" -p "$PORT" -U postgres -d t_sync \
    -f "$ROOT/scripts/db/sync-registry-budget-test.sql" 2>&1 | sed -n 's/.*NOTICE:  PASS/PASS/p;s/.*ERROR: */ERROR: /p' | sed "s/^/   [sync] /"
  test "${PIPESTATUS[0]}" -eq 0
  # Refuses (and changes nothing) before the canonical-id migration has run.
  as postgres -f "$ROOT/scripts/db/canonical-ids-fixture.sql"
  reg() { as postgres -tA -c "select string_agg(id || '=' || monthly_budget_usd, ',' order by id) from public.project_registry"; }
  r0=$(reg)
  if out=$(as postgres -f "$SYNC" 2>&1); then echo "   [sync] FAIL ran before the canonical-id migration"; exit 1; fi
  echo "$out" | grep -q "run 20261020010000_canonical_project_ids.sql first" || { echo "   [sync] FAIL unexpected error: $out"; exit 1; }
  [ "$r0" = "$(reg)" ] || { echo "   [sync] FAIL refused run changed data"; exit 1; }
  echo "   [sync] PASS refused before the canonical-id migration; nothing changed"
  # Policies, RLS flags and grants unchanged by the sync.
  as postgres -f "$MIG"
  b0=$(snapshot); as postgres -f "$SYNC"; [ "$b0" = "$(snapshot)" ] || { echo "   [sync] FAIL changed policies/RLS/grants"; exit 1; }
  r1=$(reg); as postgres -f "$SYNC"; [ "$r1" = "$(reg)" ] || { echo "   [sync] FAIL second run changed data"; exit 1; }
  echo "   [sync] PASS policies/RLS/grants unchanged; idempotent"
  unset DB
}
echo "ALL CANONICAL ID MIGRATION TESTS PASSED"
