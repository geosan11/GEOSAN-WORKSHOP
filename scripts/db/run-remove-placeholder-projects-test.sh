#!/usr/bin/env bash
# Test supabase/migrations/20261030000000_remove_placeholder_projects.sql against a
# throwaway local Postgres. Never touches a remote or Supabase database.
#   bash scripts/db/run-remove-placeholder-projects-test.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PGBIN="/usr/lib/postgresql/17/bin"
if [ ! -d "$PGBIN" ]; then
  PGBIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)"
fi
export PATH="${PGBIN:+$PGBIN:}$PATH"
WORK="$(mktemp -d)"
PORT="${PGPORT_TEST:-55441}"
MIG="$ROOT/supabase/migrations/20261030000000_remove_placeholder_projects.sql"
LOCK="$ROOT/supabase/migrations/20261020000000_lock_db_to_owner.sql"
WORKSHOP="$ROOT/supabase/migrations/20261028000000_workshop_aligned.sql"
STUB="$ROOT/scripts/db/supabase-stub.sql"
FIXTURE="$ROOT/scripts/db/placeholder-fixture.sql"
CHECKS="$ROOT/scripts/db/placeholder-test.sql"

cleanup() { pg_ctl -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$WORK"; }
trap cleanup EXIT

initdb -D "$WORK/data" -U supabase_admin --auth=trust >/dev/null
pg_ctl -D "$WORK/data" -o "-p $PORT -k $WORK -c listen_addresses='' -c wal_level=logical" -l "$WORK/pg.log" -w start >/dev/null

as() {
  local role="$1"; shift
  PGOPTIONS='-c client_min_messages=warning' psql -X -q -v ON_ERROR_STOP=1 -h "$WORK" -p "$PORT" -U "$role" -d "${DB:-postgres}" "$@"
}

run_mig() {
  local role="${1:-postgres}"; shift || true
  PGOPTIONS='-c geosan.backup_confirmed=yes' psql -X -q -v ON_ERROR_STOP=1 -h "$WORK" -p "$PORT" -U "$role" -d "${DB:-postgres}" -f "$MIG" "$@"
}

notices() { sed -n 's/.*NOTICE:  //p'; }

snapshot() {
  as postgres -tA -c "
    select 'pol', tablename, policyname, cmd, roles::text, qual, with_check from pg_policies where schemaname = 'public'
    union all select 'rel', relname, relrowsecurity::text, relforcerowsecurity::text, coalesce(relacl::text, ''), '', ''
      from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'
    union all select 'defacl', pg_get_userbyid(defaclrole), defaclnamespace::text, defaclobjtype::text, defaclacl::text, '', ''
      from pg_default_acl" | LC_ALL=C sort
}

# Full byte-level dump of every row in every public table (works with or without workshop_aligned tables).
data() {
  as postgres -tA -c "
    create temp table _dump (line text) on commit drop;
    do \$d\$
    declare
      t text;
      tbls constant text[] := array[
        'project_registry', 'projects', 'agent_tasks', 'cost_events',
        'qa_runs', 'qa_findings', 'project_budgets', 'project_logs',
        'agent_assignments', 'provider_configs', 'prompt_versions',
        'app_owner', 'user_preferences'
      ];
    begin
      foreach t in array tbls loop
        if to_regclass('public.' || t) is not null then
          execute format('insert into _dump select %L || ''|'' || to_jsonb(r)::text from public.%I r', t, t);
        end if;
      end loop;
    end
    \$d\$;
    select line from _dump;
  " | LC_ALL=C sort
}

# Expected post-migration byte-level dump derived from pre-migration non-placeholder rows,
# with ONLY the two cross-project task links (t-real-001-child.parent_task_id and c-real-001-cross.task_id) set to null.
expected_after_from_before() {
  as postgres -tA -c "
    create temp table _exp (line text) on commit drop;
    do \$e\$
    declare
      ids constant text[] := array[
        'proj-ehi-001', 'proj-iya-002', 'proj-iyanu-002', 'proj-iya-001',
        'proj-aero-003', 'proj-aviation-003', 'proj-edge-004', 'proj-edgepoint-004'
      ];
    begin
      insert into _exp select 'project_registry|' || to_jsonb(r)::text from public.project_registry r where r.id <> all (ids);
      if to_regclass('public.projects') is not null then
        insert into _exp select 'projects|' || to_jsonb(r)::text from public.projects r where r.id <> all (ids);
      end if;
      insert into _exp
        select 'agent_tasks|' || (
          case when r.id = 't-real-001-child'
               then jsonb_set(to_jsonb(r), '{parent_task_id}', 'null'::jsonb)
               else to_jsonb(r)
          end
        )::text
        from public.agent_tasks r where r.project_id <> all (ids);
      insert into _exp
        select 'cost_events|' || (
          case when r.id = 'c-real-001-cross'
               then jsonb_set(to_jsonb(r), '{task_id}', 'null'::jsonb)
               else to_jsonb(r)
          end
        )::text
        from public.cost_events r where r.project_id <> all (ids);
      insert into _exp select 'qa_runs|' || to_jsonb(r)::text from public.qa_runs r where r.project_id <> all (ids);
      insert into _exp select 'qa_findings|' || to_jsonb(r)::text from public.qa_findings r where r.project_id <> all (ids);
      insert into _exp select 'project_budgets|' || to_jsonb(r)::text from public.project_budgets r where r.project_id <> all (ids);
      if to_regclass('public.project_logs') is not null then
        insert into _exp select 'project_logs|' || to_jsonb(r)::text from public.project_logs r where r.project_id <> all (ids);
      end if;
      if to_regclass('public.agent_assignments') is not null then
        insert into _exp select 'agent_assignments|' || to_jsonb(r)::text from public.agent_assignments r where r.project_id <> all (ids);
      end if;
      if to_regclass('public.provider_configs') is not null then
        insert into _exp select 'provider_configs|' || to_jsonb(r)::text from public.provider_configs r where r.project_id is null or r.project_id <> all (ids);
      end if;
      insert into _exp select 'prompt_versions|' || to_jsonb(r)::text from public.prompt_versions r;
      if to_regclass('public.app_owner') is not null then
        insert into _exp select 'app_owner|' || to_jsonb(r)::text from public.app_owner r;
      end if;
      if to_regclass('public.user_preferences') is not null then
        insert into _exp select 'user_preferences|' || to_jsonb(r)::text from public.user_preferences r;
      end if;
    end
    \$e\$;
    select line from _exp;
  " | LC_ALL=C sort
}

# The database as it is live today: schema.sql from 6bfeb72 (seeds the 4 canonical ids).
git -C "$ROOT" show 6bfeb72:supabase/schema.sql > "$WORK/schema-before.sql"

init_db() { # $1 db, $2 "lock"|"nolock", $3 "workshop"|"legacy"
  local db="$1"
  local lock_mode="$2"
  local schema_mode="${3:-workshop}"
  as supabase_admin -c "create database $db owner postgres"
  DB=$db as supabase_admin -c "alter schema public owner to postgres; grant usage on schema public to anon, authenticated, service_role;"
  if [ -f "$STUB" ]; then
    psql -X -q -h "$WORK" -p "$PORT" -U supabase_admin -d "$db" -f "$STUB" >/dev/null 2>&1 || true
  fi
  DB=$db as postgres -f "$WORK/schema-before.sql"
  if [ "$lock_mode" = "lock" ]; then
    DB=$db as postgres -f "$LOCK"
  fi
  if [ "$schema_mode" = "workshop" ]; then
    DB=$db as postgres -f "$WORKSHOP"
    if [ "$lock_mode" = "lock" ]; then
      DB=$db as postgres -f "$LOCK"
    fi
  fi
}

check_notice_order_and_counts() { # $1 label, $2 output, $3 expected_counts, $4 expected_audit, $5 expected_nulls
  local label="$1"
  local out="$2"
  local exp_counts="$3"
  local exp_audit="$4"
  local exp_nulls="$5"

  local will_line="remove_placeholder_projects: will delete $exp_counts"
  local audit_line="remove_placeholder_projects: of those, project_logs rows with level=audit: $exp_audit"
  local null_line="remove_placeholder_projects: will set to null in other projects: $exp_nulls"
  local del_line="remove_placeholder_projects: deleted $exp_counts"

  local n_lines
  n_lines="$(printf '%s\n' "$out" | notices)"

  printf '%s\n' "$n_lines" | grep -Fxq "$will_line" || {
    echo "   [$label] FAIL missing or wrong 'will delete' NOTICE. Got:"
    printf '%s\n' "$n_lines"
    exit 1
  }
  printf '%s\n' "$n_lines" | grep -Fxq "$audit_line" || {
    echo "   [$label] FAIL missing or wrong audit NOTICE. Got:"
    printf '%s\n' "$n_lines"
    exit 1
  }
  printf '%s\n' "$n_lines" | grep -Fxq "$null_line" || {
    echo "   [$label] FAIL missing or wrong null-links NOTICE. Got:"
    printf '%s\n' "$n_lines"
    exit 1
  }
  printf '%s\n' "$n_lines" | grep -Fxq "$del_line" || {
    echo "   [$label] FAIL missing or wrong 'deleted' NOTICE. Got:"
    printf '%s\n' "$n_lines"
    exit 1
  }

  local will_ln del_ln
  will_ln="$(printf '%s\n' "$n_lines" | grep -Fxn "$will_line" | head -1 | cut -d: -f1)"
  del_ln="$(printf '%s\n' "$n_lines" | grep -Fxn "$del_line" | tail -1 | cut -d: -f1)"
  if [ -z "$will_ln" ] || [ -z "$del_ln" ] || [ "$will_ln" -ge "$del_ln" ]; then
    echo "   [$label] FAIL 'will delete' NOTICE did not appear before 'deleted' NOTICE"
    exit 1
  fi
  echo "   [$label] PASS NOTICE 'will delete' appeared before 'deleted' with exact per-table counts ($exp_counts; audit=$exp_audit)"
}

run_main_case() { # $1 label, $2 "lock"|"nolock", $3 db
  local label="$1"
  local lock_mode="$2"
  local db="$3"

  init_db "$db" "$lock_mode" "workshop"
  export DB="$db"
  as postgres -f "$FIXTURE"

  local before_snap before_data expected_after
  before_snap="$(snapshot)"
  before_data="$(data)"
  expected_after="$(expected_after_from_before)"

  # Pre-check that the two cross-project links start non-null before migration
  as postgres -tA -c "
    do \$\$
    begin
      if (select parent_task_id from public.agent_tasks where id = 't-real-001-child') <> 't-proj-ehi-001' then
        raise exception 'fixture error: t-real-001-child.parent_task_id';
      end if;
      if (select task_id from public.cost_events where id = 'c-real-001-cross') <> 't-proj-ehi-001' then
        raise exception 'fixture error: c-real-001-cross.task_id';
      end if;
    end \$\$;
  " >/dev/null

  # Without geosan.backup_confirmed=yes -> refused, data unchanged
  local out_unconfirmed
  if out_unconfirmed="$(PGOPTIONS= psql -X -q -v ON_ERROR_STOP=1 -h "$WORK" -p "$PORT" -U postgres -d "$db" -f "$MIG" 2>&1)"; then
    echo "   [$label] FAIL migration succeeded without geosan.backup_confirmed=yes"
    exit 1
  fi
  printf '%s\n' "$out_unconfirmed" | grep -q "backup not confirmed" || {
    echo "   [$label] FAIL unexpected error without backup confirmation: $out_unconfirmed"
    exit 1
  }
  [ "$before_data" = "$(data)" ] || {
    echo "   [$label] FAIL unconfirmed run modified data"
    exit 1
  }
  echo "   [$label] PASS refused without backup confirmation ('backup not confirmed'); data unchanged"

  # With geosan.backup_confirmed=yes -> succeeds, capture NOTICEs
  local out_confirmed
  out_confirmed="$(run_mig postgres 2>&1)"
  check_notice_order_and_counts "$label" "$out_confirmed" \
    "qa_findings=8, qa_runs=8, cost_events=8, project_budgets=8, agent_tasks=8, project_logs=8, agent_assignments=8, provider_configs=8, project_registry=8, projects=8" \
    "1" \
    "agent_tasks.parent_task_id=1, cost_events.task_id=1"

  # Post-migration SQL assertions (all 8 ids gone, real projects intact, 2 links set to null, prompt_versions/app_owner unchanged)
  PGOPTIONS= psql -X -q -v ON_ERROR_STOP=1 -h "$WORK" -p "$PORT" -U postgres -d "$db" \
    -f "$CHECKS" 2>&1 | sed -n 's/.*NOTICE:  //p;s/.*ERROR: */ERROR: /p' | sed "s/^/   [$label] /"
  test "${PIPESTATUS[0]}" -eq 0

  # Byte-identical check on all real project rows and non-project tables (except the 2 nulled links)
  local after_data
  after_data="$(data)"
  [ "$expected_after" = "$after_data" ] || {
    echo "   [$label] FAIL real project rows or non-project tables are not byte-identical (modulo the 2 nulled links)"
    diff <(printf '%s\n' "$expected_after") <(printf '%s\n' "$after_data") || true
    exit 1
  }
  echo "   [$label] PASS real projects and all their rows byte-identical except the two links set to null"

  # Policies, RLS flags, grants and default ACL snapshot unchanged
  local after_snap
  after_snap="$(snapshot)"
  [ "$before_snap" = "$after_snap" ] || {
    echo "   [$label] FAIL migration changed policies/RLS/grants/default ACLs"
    diff <(printf '%s\n' "$before_snap") <(printf '%s\n' "$after_snap") || true
    exit 1
  }
  echo "   [$label] PASS policies, RLS flags, grants and default ACL snapshot unchanged"

  # Second run is a no-op (data identical, counts 0)
  local out_second
  out_second="$(run_mig postgres 2>&1)"
  check_notice_order_and_counts "$label-2nd" "$out_second" \
    "qa_findings=0, qa_runs=0, cost_events=0, project_budgets=0, agent_tasks=0, project_logs=0, agent_assignments=0, provider_configs=0, project_registry=0, projects=0" \
    "0" \
    "agent_tasks.parent_task_id=0, cost_events.task_id=0"
  [ "$after_data" = "$(data)" ] || {
    echo "   [$label] FAIL second run changed data"
    exit 1
  }
  echo "   [$label] PASS second run is a no-op (data identical, counts 0)"

  # Re-running current supabase/schema.sql then the migration does not bring any id back
  as postgres -f "$ROOT/supabase/schema.sql"
  run_mig postgres >/dev/null 2>&1
  [ "$after_data" = "$(data)" ] || {
    echo "   [$label] FAIL re-running current supabase/schema.sql + migration changed data or brought an id back"
    exit 1
  }
  echo "   [$label] PASS re-running current supabase/schema.sql then migration does not bring any id back"

  unset DB
}

echo "== Postgres: $(as supabase_admin -tAc 'show server_version')"
if [ -f "$STUB" ]; then
  as supabase_admin -f "$STUB"
else
  as supabase_admin -c "create role postgres login createrole createdb bypassrls; create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; grant create on database postgres to postgres; alter schema public owner to postgres;"
fi
as supabase_admin -c "alter role postgres createdb" -c "create role app_user login"

echo "== 1. Unlocked schema (6bfeb72 schema.sql + workshop_aligned.sql)"
run_main_case unlocked nolock t_unlocked

echo "== 2. Locked schema (6bfeb72 schema.sql + #5 lock_db_to_owner.sql + workshop_aligned.sql)"
run_main_case locked lock t_locked

echo "== 3. FK actions verified (catalog check + direct delete inside rolled-back transaction)"
init_db t_fks lock workshop
export DB=t_fks
as postgres -f "$FIXTURE"
d_fk_before="$(data)"
PGOPTIONS= psql -X -q -v ON_ERROR_STOP=1 -h "$WORK" -p "$PORT" -U postgres -d t_fks <<'EOF' 2>&1 | sed -n 's/.*NOTICE:  //p;s/.*ERROR: */ERROR: /p' | sed 's/^/   [fk-check] /'
begin;

do $fk_cat$
declare
  rec record;
  act char;
  expected constant text[][] := array[
    array['agent_tasks',       'project_id',     'project_registry', 'c'],
    array['cost_events',       'project_id',     'project_registry', 'c'],
    array['qa_runs',           'project_id',     'project_registry', 'c'],
    array['qa_findings',       'project_id',     'project_registry', 'c'],
    array['qa_findings',       'run_id',         'qa_runs',          'c'],
    array['project_budgets',   'project_id',     'project_registry', 'c'],
    array['project_logs',      'project_id',     'projects',         'c'],
    array['agent_assignments', 'project_id',     'projects',         'c'],
    array['provider_configs',  'project_id',     'projects',         'c'],
    array['agent_tasks',       'parent_task_id', 'agent_tasks',      'n'],
    array['cost_events',       'task_id',        'agent_tasks',      'n']
  ];
  i int;
  src_tbl text;
  src_col text;
  dst_tbl text;
  exp_act text;
begin
  for i in 1 .. array_length(expected, 1) loop
    src_tbl := expected[i][1];
    src_col := expected[i][2];
    dst_tbl := expected[i][3];
    exp_act := expected[i][4];

    select c.confdeltype into act
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
     where c.contype = 'f'
       and c.conrelid = to_regclass('public.' || src_tbl)
       and c.confrelid = to_regclass('public.' || dst_tbl)
       and a.attname = src_col;

    if act is distinct from exp_act then
      raise exception 'FAIL FK %.% -> % expected confdeltype=%, got %',
        src_tbl, src_col, dst_tbl, exp_act, coalesce(act::text, 'NULL');
    end if;
  end loop;
  raise notice 'PASS catalog check: tasks/costs/QA runs/findings/budgets CASCADE to project_registry; logs/assignments/provider_configs CASCADE to projects; parent_task_id & cost task_id SET NULL';
end
$fk_cat$;

-- Behaviour check: delete one placeholder project directly from parent tables only (without deleting children first)
delete from public.project_registry where id = 'proj-ehi-001';
delete from public.projects where id = 'proj-ehi-001';

do $fk_beh$
declare
  n bigint;
begin
  select count(*) into n from (
    select project_id from public.agent_tasks where project_id = 'proj-ehi-001'
    union all select project_id from public.cost_events where project_id = 'proj-ehi-001'
    union all select project_id from public.qa_runs where project_id = 'proj-ehi-001'
    union all select project_id from public.qa_findings where project_id = 'proj-ehi-001'
    union all select project_id from public.project_budgets where project_id = 'proj-ehi-001'
    union all select project_id from public.project_logs where project_id = 'proj-ehi-001'
    union all select project_id from public.agent_assignments where project_id = 'proj-ehi-001'
    union all select project_id from public.provider_configs where project_id = 'proj-ehi-001'
  ) x;
  if n <> 0 then
    raise exception 'FAIL direct delete of proj-ehi-001 left % child row(s)', n;
  end if;

  if (select parent_task_id from public.agent_tasks where id = 't-real-001-child') is not null then
    raise exception 'FAIL direct delete did not SET NULL on t-real-001-child.parent_task_id';
  end if;
  if (select task_id from public.cost_events where id = 'c-real-001-cross') is not null then
    raise exception 'FAIL direct delete did not SET NULL on c-real-001-cross.task_id';
  end if;
  if (select count(*) from public.agent_tasks where id = 't-real-001-root') <> 1 then
    raise exception 'FAIL parent real task t-real-001-root was affected';
  end if;

  raise notice 'PASS behaviour check: direct delete of proj-ehi-001 cascaded to all 8 child tables and set cross-project parent_task_id/task_id to NULL';
end
$fk_beh$;

rollback;
EOF
test "${PIPESTATUS[0]}" -eq 0
[ "$d_fk_before" = "$(data)" ] || { echo "   [fk-check] FAIL rolled-back transaction changed data"; exit 1; }
echo "   [fk-check] PASS rolled-back direct delete left all data untouched"
unset DB

echo "== 4. Role subject to row security (non-bypassrls app_user with table grants) is refused"
export DB=t_fks
as postgres -c "grant usage on schema public to app_user; grant select, insert, update, delete on all tables in schema public to app_user"
d_rls_before="$(data)"
if out_rls="$(run_mig app_user 2>&1)"; then
  echo "   [rls-role] FAIL non-bypassrls app_user was allowed to run migration"
  exit 1
fi
printf '%s\n' "$out_rls" | grep -q "cannot see every row" || {
  echo "   [rls-role] FAIL unexpected error for app_user: $out_rls"
  exit 1
}
[ "$d_rls_before" = "$(data)" ] || {
  echo "   [rls-role] FAIL refused app_user run changed data"
  exit 1
}
echo "   [rls-role] PASS refused non-bypassrls app_user ('cannot see every row'); data unchanged"

# Also verify on unlocked schema (where RLS is enabled by schema.sql and app_user does not own the tables)
init_db t_rls_unlocked nolock workshop
export DB=t_rls_unlocked
as postgres -f "$FIXTURE"
as postgres -c "grant usage on schema public to app_user; grant select, insert, update, delete on all tables in schema public to app_user"
d_rls_u_before="$(data)"
if out_rls_u="$(run_mig app_user 2>&1)"; then
  echo "   [rls-role] FAIL non-owner app_user on unlocked schema was allowed to run migration"
  exit 1
fi
printf '%s\n' "$out_rls_u" | grep -q "cannot see every row" || {
  echo "   [rls-role] FAIL unexpected error for app_user on unlocked schema: $out_rls_u"
  exit 1
}
[ "$d_rls_u_before" = "$(data)" ] || {
  echo "   [rls-role] FAIL refused app_user run on unlocked schema changed data"
  exit 1
}
echo "   [rls-role] PASS refused non-owner app_user on unlocked schema too; data unchanged"
unset DB

echo "== 5. Mid-way failure rolls back (BEFORE DELETE trigger on project_registry raises after children deleted)"
export DB=t_fks
d_mid_before="$(data)"
as postgres -c "
  create or replace function public. abort_registry_delete() returns trigger language plpgsql as \$\$
  begin
    raise exception 'simulated mid-way failure on project_registry delete';
  end \$\$;
  create trigger trg_abort_registry_delete before delete on public.project_registry
    for each statement execute function public.abort_registry_delete();
"
if out_mid="$(run_mig postgres 2>&1)"; then
  echo "   [mid-way] FAIL migration succeeded despite raising BEFORE DELETE trigger on project_registry"
  exit 1
fi
printf '%s\n' "$out_mid" | grep -q "simulated mid-way failure on project_registry delete" || {
  echo "   [mid-way] FAIL unexpected error: $out_mid"
  exit 1
}
as postgres -c "drop trigger trg_abort_registry_delete on public.project_registry; drop function public.abort_registry_delete();"
[ "$d_mid_before" = "$(data)" ] || {
  echo "   [mid-way] FAIL mid-way failure did not roll back child deletes"
  exit 1
}
echo "   [mid-way] PASS mid-way failure rolled back completely; all parent and child rows identical to before"
unset DB

echo "== 6. Unknown table referencing projects (FK or plain project_id column) is refused naming the table"
export DB=t_fks
# 6a. Unknown table with FK to project_registry (even without column named project_id)
as postgres -c "create table public.unknown_fk_audit (id text primary key, ref_proj text references public.project_registry(id));"
d_unk_before="$(data)"
if out_unk_fk="$(run_mig postgres 2>&1)"; then
  echo "   [unknown-table] FAIL migration succeeded with unknown FK table public.unknown_fk_audit"
  exit 1
fi
printf '%s\n' "$out_unk_fk" | grep -q "unknown_fk_audit" || {
  echo "   [unknown-table] FAIL error did not name unknown_fk_audit: $out_unk_fk"
  exit 1
}
[ "$d_unk_before" = "$(data)" ] || {
  echo "   [unknown-table] FAIL refused unknown FK table run changed data"
  exit 1
}
as postgres -c "drop table public.unknown_fk_audit;"
echo "   [unknown-table] PASS unknown table with FK to project_registry refused naming 'unknown_fk_audit'; data unchanged"

# 6b. Unknown table with FK to public.projects
as postgres -c "create table public.unknown_projects_fk (id text primary key, proj_ref text references public.projects(id));"
if out_unk_pfk="$(run_mig postgres 2>&1)"; then
  echo "   [unknown-table] FAIL migration succeeded with unknown FK table public.unknown_projects_fk"
  exit 1
fi
printf '%s\n' "$out_unk_pfk" | grep -q "unknown_projects_fk" || {
  echo "   [unknown-table] FAIL error did not name unknown_projects_fk: $out_unk_pfk"
  exit 1
}
[ "$d_unk_before" = "$(data)" ] || {
  echo "   [unknown-table] FAIL refused unknown projects FK table run changed data"
  exit 1
}
as postgres -c "drop table public.unknown_projects_fk;"
echo "   [unknown-table] PASS unknown table with FK to projects refused naming 'unknown_projects_fk'; data unchanged"

# 6c. Unknown table with plain project_id column (no FK)
as postgres -c "create table public.unknown_plain_col (id text primary key, project_id text);"
if out_unk_col="$(run_mig postgres 2>&1)"; then
  echo "   [unknown-table] FAIL migration succeeded with unknown plain project_id table public.unknown_plain_col"
  exit 1
fi
printf '%s\n' "$out_unk_col" | grep -q "unknown_plain_col" || {
  echo "   [unknown-table] FAIL error did not name unknown_plain_col: $out_unk_col"
  exit 1
}
[ "$d_unk_before" = "$(data)" ] || {
  echo "   [unknown-table] FAIL refused unknown plain column run changed data"
  exit 1
}
as postgres -c "drop table public.unknown_plain_col;"
echo "   [unknown-table] PASS unknown table with plain project_id column refused naming 'unknown_plain_col'; data unchanged"
unset DB

echo "== 7. Another project's qa_finding pointing at a placeholder qa_run is refused"
export DB=t_fks
as postgres -c "
  insert into public.qa_findings (id, run_id, project_id, severity, category, title, description)
  values ('f-cross-bad', 'r-proj-ehi-001', 'proj-real-001', 'high', 'drift', 'Cross finding', 'Real finding on placeholder run');
"
d_cross_before="$(data)"
if out_cross="$(run_mig postgres 2>&1)"; then
  echo "   [cross-finding] FAIL migration succeeded when real project had qa_finding on placeholder qa_run"
  exit 1
fi
printf '%s\n' "$out_cross" | grep -q "QA finding(s) of other projects belong to a QA run being deleted" || {
  echo "   [cross-finding] FAIL unexpected error: $out_cross"
  exit 1
}
[ "$d_cross_before" = "$(data)" ] || {
  echo "   [cross-finding] FAIL refused cross-finding run changed data"
  exit 1
}
as postgres -c "delete from public.qa_findings where id = 'f-cross-bad';"
echo "   [cross-finding] PASS refused when another project's qa_finding points at a placeholder qa_run; data unchanged"
unset DB

echo "== 8. Legacy schema only (public.projects, project_logs, agent_assignments, provider_configs do NOT exist)"
init_db t_legacy lock legacy
export DB=t_legacy
as postgres -f "$FIXTURE"

# Confirm workshop tables do not exist in t_legacy
as postgres -tA -c "
  do \$\$
  begin
    if to_regclass('public.projects') is not null
       or to_regclass('public.project_logs') is not null
       or to_regclass('public.agent_assignments') is not null
       or to_regclass('public.provider_configs') is not null then
      raise exception 'workshop tables should not exist in t_legacy';
    end if;
  end \$\$;
" >/dev/null

before_leg_snap="$(snapshot)"
expected_leg_after="$(expected_after_from_before)"

out_leg="$(run_mig postgres 2>&1)"
check_notice_order_and_counts "legacy" "$out_leg" \
  "qa_findings=8, qa_runs=8, cost_events=8, project_budgets=8, agent_tasks=8, project_registry=8" \
  "0" \
  "agent_tasks.parent_task_id=1, cost_events.task_id=1"

PGOPTIONS= psql -X -q -v ON_ERROR_STOP=1 -h "$WORK" -p "$PORT" -U postgres -d t_legacy \
  -f "$CHECKS" 2>&1 | sed -n 's/.*NOTICE:  //p;s/.*ERROR: */ERROR: /p' | sed "s/^/   [legacy] /"
test "${PIPESTATUS[0]}" -eq 0

after_leg_data="$(data)"
[ "$expected_leg_after" = "$after_leg_data" ] || {
  echo "   [legacy] FAIL legacy real project rows not byte-identical (modulo the 2 nulled links)"
  diff <(printf '%s\n' "$expected_leg_after") <(printf '%s\n' "$after_leg_data") || true
  exit 1
}
[ "$before_leg_snap" = "$(snapshot)" ] || {
  echo "   [legacy] FAIL legacy run changed policies/RLS/grants"
  exit 1
}
out_leg_2="$(run_mig postgres 2>&1)"
check_notice_order_and_counts "legacy-2nd" "$out_leg_2" \
  "qa_findings=0, qa_runs=0, cost_events=0, project_budgets=0, agent_tasks=0, project_registry=0" \
  "0" \
  "agent_tasks.parent_task_id=0, cost_events.task_id=0"
[ "$after_leg_data" = "$(data)" ] || {
  echo "   [legacy] FAIL legacy second run changed data"
  exit 1
}
echo "   [legacy] PASS legacy-only schema migration succeeded, preserved real data byte-identically, and is idempotent"
unset DB

echo "ALL PLACEHOLDER REMOVAL TESTS PASSED"
