#!/usr/bin/env bash
# Prove the workshop owner policies fix against a throwaway local Postgres 17.
#   scripts/db/run-owner-policies-test.sh
# Never touches a remote or Supabase database.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PGBIN="/usr/lib/postgresql/17/bin"
if [ ! -d "$PGBIN" ]; then
  PGBIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)"
fi
export PATH="${PGBIN:+$PGBIN:}$PATH"

WORK="$(mktemp -d)"
PORT="${PGPORT_TEST:-55444}"

cleanup() {
  pg_ctl -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

initdb -D "$WORK/data" -U supabase_admin --auth=trust >/dev/null
pg_ctl -D "$WORK/data" -o "-p $PORT -k $WORK -c listen_addresses='' -c wal_level=logical" -l "$WORK/pg.log" -w start >/dev/null

as() {
  local role="$1"; shift
  psql -X -q -v ON_ERROR_STOP=1 -h "$WORK" -p "$PORT" -U "$role" -d postgres "$@"
}

quiet() {
  PGOPTIONS='-c client_min_messages=warning' as "$@"
}

echo "== Postgres: $(as supabase_admin -tAc 'show server_version')"
echo "== 1/7 Supabase stub (roles, default grants, auth.uid())"
as supabase_admin -f "$ROOT/scripts/db/supabase-stub.sql"

echo "== 2/7 supabase/schema.sql"
if git -C "$ROOT" show 6bfeb72:supabase/schema.sql > "$WORK/schema-before.sql" 2>/dev/null; then
  quiet postgres -f "$WORK/schema-before.sql"
else
  quiet postgres -f "$ROOT/supabase/schema.sql"
fi

echo "== 3/7 lock migration (20261020000000_lock_db_to_owner.sql)"
quiet postgres -f "$ROOT/supabase/migrations/20261020000000_lock_db_to_owner.sql"

echo "== 4/7 workshop aligned migration (20261028000000_workshop_aligned.sql)"
quiet postgres -f "$ROOT/supabase/migrations/20261028000000_workshop_aligned.sql"

echo "== 5/7 check (a): before new migration, registered owner reading public.projects fails with permission denied"
as postgres -v stage=pre -f "$ROOT/scripts/db/owner-policies-test.sql" 2>&1 | sed -n 's/.*NOTICE:  //p;/ERROR/p'
test "${PIPESTATUS[0]}" -eq 0

echo "== 6/7 apply new migration (20261104000000_fix_workshop_owner_policies.sql)"
quiet postgres -f "$ROOT/supabase/migrations/20261104000000_fix_workshop_owner_policies.sql"

echo "== 7/7 behaviour checks: (b), (c), (d), (e), (g)"
as postgres -v stage=post -f "$ROOT/scripts/db/owner-policies-test.sql" 2>&1 | sed -n 's/.*NOTICE:  //p;/ERROR/p'
test "${PIPESTATUS[0]}" -eq 0

echo "== check (f): idempotency (migration run second time leaves pg_policies identical)"
snap_pol() {
  as postgres -tA -c "select tablename, policyname, permissive, roles::text, cmd, qual, with_check from pg_policies where schemaname = 'public' order by tablename, policyname, cmd"
}
snap1="$(snap_pol)"
quiet postgres -f "$ROOT/supabase/migrations/20261104000000_fix_workshop_owner_policies.sql"
snap2="$(snap_pol)"
if [ "$snap1" != "$snap2" ]; then
  echo "FAIL (f): pg_policies changed after second migration run"
  diff <(echo "$snap1") <(echo "$snap2")
  exit 1
fi
echo "PASS (f): running the new migration a second time succeeds and leaves pg_policies identical"

echo "ALL OWNER-POLICY CHECKS PASSED"
