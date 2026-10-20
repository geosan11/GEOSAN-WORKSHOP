#!/usr/bin/env bash
# Rollout transaction, rollback round trip, and upgrade from the first draft
# of the migration, on a throwaway local Postgres. Never touches Supabase.
#   scripts/db/run-rollout-rollback-test.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
MIG="$ROOT/supabase/migrations/20261020000000_lock_db_to_owner.sql"
PGBIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)"
export PATH="${PGBIN:+$PGBIN:}$PATH"
W="$(mktemp -d)"; P="${PGPORT_TEST:-55493}"
OWNER=11111111-1111-1111-1111-111111111111; STRANGER=22222222-2222-2222-2222-222222222222
trap 'pg_ctl -D "$W/d" -m immediate stop >/dev/null 2>&1; rm -rf "$W"' EXIT
as(){ local u=$1; shift; PGOPTIONS='-c client_min_messages=warning' psql -X -q -v ON_ERROR_STOP=1 -h "$W" -p "$P" -U "$u" -d postgres "$@"; }
fresh(){
  pg_ctl -D "$W/d" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$W/d"
  initdb -D "$W/d" -U supabase_admin --auth=trust >/dev/null
  pg_ctl -D "$W/d" -o "-p $P -k $W -c listen_addresses=''" -l "$W/log" -w start >/dev/null
  as supabase_admin -f "$ROOT/scripts/db/supabase-stub.sql"
  git -C "$ROOT" show 6bfeb72:supabase/schema.sql > "$W/live.sql"   # the schema as it is live today
  as postgres -f "$W/live.sql"
  as postgres -c "insert into auth.users values ('$OWNER','Sanni@Example.com'),('$STRANGER','stranger@example.com')"
}
cnt(){ as postgres -tA -c "begin" -c "set local role $1" -c "set local request.jwt.claims='{\"sub\":\"$2\"}'" \
  -c "select count(*) from public.project_registry" -c "rollback" 2>&1 | grep -E '^[0-9]+$|ERROR' | sed 's/.*ERROR: */denied: /' || true; }
open_count(){ as postgres -tAc "select count(*) from pg_policies where schemaname='public' and (qual='true' or with_check='true')"; }
defacl(){ as postgres -tA -c "select defaclobjtype::text||':'||defaclacl::text from pg_default_acl order by 1"; }
rollout(){ { echo 'begin;'; cat "$MIG"; sed "s/<YOUR_ACCOUNT_EMAIL>/$1/" "$ROOT/scripts/db/register-owner-by-email.sql"; echo 'commit;'; } > "$W/rollout.sql"; }
fail(){ echo "FAIL: $*"; exit 1; }

echo "== A. rollout transaction with an email that has no account: everything rolls back"
fresh; rollout nobody@example.com
if as postgres -f "$W/rollout.sql" >/dev/null 2>&1; then fail "rollout succeeded with unknown email"; fi
o=$(open_count); e=$(as postgres -tAc "select to_regclass('public.app_owner') is not null")
[ "$o" = 14 ] && [ "$e" = f ] || fail "partial apply (open=$o app_owner=$e)"
echo "   PASS nothing applied: 14 open policies still there, app_owner not created"

echo "== B. rollout transaction with Sanni's email (any case): locked, owner works at once"
rollout sanni@example.com; as postgres -f "$W/rollout.sql" >/dev/null
o=$(open_count); ow=$(cnt authenticated $OWNER); st=$(cnt authenticated $STRANGER); an=$(cnt anon '')
[ "$o" = 0 ] && [ "$ow" = 4 ] && [ "$st" = 0 ] && [[ "$an" == denied:* ]] || fail "open=$o owner=$ow stranger=$st anon=$an"
echo "   PASS open=0, owner sees $ow rows, stranger $st, anon $an"

echo "== C. rollback (DevOps) round trip"
fresh; before=$(defacl); as postgres -f "$MIG"; locked=$(defacl)
[ "$before" != "$locked" ] || fail "migration did not change default privileges"
as postgres -f "$ROOT/scripts/db/rollback-lock.sql"
[ "$before" = "$(defacl)" ] || fail "default privileges not restored"
o=$(open_count); an=$(cnt anon ''); e=$(as postgres -tAc "select to_regclass('public.app_owner') is not null")
[ "$o" = 14 ] && [ "$an" = 4 ] && [ "$e" = f ] || fail "rollback state open=$o anon=$an app_owner=$e"
echo "   PASS pre-PR state restored: 14 open policies, anon sees $an rows, app_owner gone, default privileges identical"
as postgres -f "$MIG"; an=$(cnt anon ''); st=$(cnt authenticated $STRANGER)
[[ "$an" == denied:* ]] && [ "$st" = 0 ] || fail "re-lock anon=$an stranger=$st"
echo "   PASS re-lock after rollback works (owner must re-register: app_owner starts empty)"

echo "== D. upgrade from the first draft of this migration (b5daab2: no FK, FORCE on app_owner)"
fresh; git -C "$ROOT" show b5daab2:supabase/migrations/20261020000000_lock_db_to_owner.sql > "$W/v1.sql"
as postgres -f "$W/v1.sql"
as postgres -c "insert into public.app_owner values ('$OWNER'), ('99999999-9999-9999-9999-999999999999')"
as postgres -f "$MIG"
rows=$(as postgres -tAc "select string_agg(user_id::text, ',') from public.app_owner")
force=$(as postgres -tAc "select relforcerowsecurity from pg_class where oid='public.app_owner'::regclass")
fk=$(as postgres -tAc "select count(*) from pg_constraint where conrelid='public.app_owner'::regclass and contype='f'")
ow=$(cnt authenticated $OWNER)
[ "$rows" = "$OWNER" ] && [ "$force" = f ] && [ "$fk" = 1 ] && [ "$ow" = 4 ] || fail "rows=$rows force=$force fk=$fk owner=$ow"
echo "   PASS orphan id dropped, FK added, FORCE removed, owner still sees $ow rows"
echo "ALL ROLLOUT/ROLLBACK CHECKS PASSED"
