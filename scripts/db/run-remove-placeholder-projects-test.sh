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

# Dump of every row in every public table with updated_at stripped ONLY on public.projects rows
# whose workspace id was moved ('proj-real-001', 'proj-real-002'), because trg_projects_updated_at
# bumps updated_at on moved rows (placeholder-test.sql asserts updated_at > real_ts on those rows).
data_modulo_moved_updated_at() {
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
          if t = 'projects' then
            insert into _dump
              select 'projects|' || (
                case when r.id in ('proj-real-001', 'proj-real-002')
                     then (to_jsonb(r) - 'updated_at')
                     else to_jsonb(r)
                end
              )::text
              from public.projects r;
          else
            execute format('insert into _dump select %L || ''|'' || to_jsonb(r)::text from public.%I r', t, t);
          end if;
        end if;
      end loop;
    end
    \$d\$;
    select line from _dump;
  " | LC_ALL=C sort
}

# Expected post-migration byte-level dump derived from pre-migration non-placeholder rows,
# with ONLY:
#   - the two cross-project task links (t-real-001-child.parent_task_id and c-real-001-cross.task_id) set to null,
#   - legacy workspace ids ('org-ehi-global', 'org-geosan') rewritten to 'org-geosan-workshop',
#   - updated_at stripped on moved public.projects rows (proj-real-001, proj-real-002) bumped by trg_projects_updated_at.
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
        insert into _exp
          select 'projects|' || (
            case when r.org_id in ('org-ehi-global', 'org-geosan')
                 then (jsonb_set(to_jsonb(r), '{org_id}', '\"org-geosan-workshop\"'::jsonb) - 'updated_at')
                 else to_jsonb(r)
            end
          )::text
          from public.projects r where r.id <> all (ids);
      end if;
      insert into _exp
        select 'agent_tasks|' || (
          jsonb_set(
            case when r.id = 't-real-001-child'
                 then jsonb_set(to_jsonb(r), '{parent_task_id}', 'null'::jsonb)
                 else to_jsonb(r)
            end,
            '{org_id}',
            '\"org-geosan-workshop\"'::jsonb
          )
        )::text
        from public.agent_tasks r where r.project_id <> all (ids);
      insert into _exp
        select 'cost_events|' || (
          jsonb_set(
            case when r.id = 'c-real-001-cross'
                 then jsonb_set(to_jsonb(r), '{task_id}', 'null'::jsonb)
                 else to_jsonb(r)
            end,
            '{org_id}',
            '\"org-geosan-workshop\"'::jsonb
          )
        )::text
        from public.cost_events r where r.project_id <> all (ids);
      insert into _exp
        select 'qa_runs|' || jsonb_set(to_jsonb(r), '{org_id}', '\"org-geosan-workshop\"'::jsonb)::text
        from public.qa_runs r where r.project_id <> all (ids);
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

check_ws_notices() { # $1 label, $2 output, $3 schema_mode ("workshop"|"legacy"), $4 run_kind ("first"|"second")
  local label="$1"
  local out="$2"
  local schema_mode="$3"
  local run_kind="$4"

  local n_lines
  n_lines="$(printf '%s\n' "$out" | notices)"

  local expected_lines=()
  if [ "$run_kind" = "first" ]; then
    expected_lines+=(
      "remove_placeholder_projects: workspace id before agent_tasks.org_id: org-ehi-global=1, org-geosan=2"
      "remove_placeholder_projects: workspace id after agent_tasks.org_id: org-ehi-global=0, org-geosan=0 (moved 3)"
      "remove_placeholder_projects: workspace id before cost_events.org_id: org-ehi-global=2, org-geosan=1"
      "remove_placeholder_projects: workspace id after cost_events.org_id: org-ehi-global=0, org-geosan=0 (moved 3)"
    )
    if [ "$schema_mode" = "workshop" ]; then
      expected_lines+=(
        "remove_placeholder_projects: workspace id before projects.org_id: org-ehi-global=1, org-geosan=1"
        "remove_placeholder_projects: workspace id after projects.org_id: org-ehi-global=0, org-geosan=0 (moved 2)"
      )
    fi
    expected_lines+=(
      "remove_placeholder_projects: workspace id before qa_runs.org_id: org-ehi-global=1, org-geosan=1"
      "remove_placeholder_projects: workspace id after qa_runs.org_id: org-ehi-global=0, org-geosan=0 (moved 2)"
      "remove_placeholder_projects: altered default on agent_tasks.org_id to org-geosan-workshop"
      "remove_placeholder_projects: altered default on cost_events.org_id to org-geosan-workshop"
      "remove_placeholder_projects: altered default on qa_runs.org_id to org-geosan-workshop"
      "remove_placeholder_projects: workspace defaults altered: 3"
    )
  else
    expected_lines+=(
      "remove_placeholder_projects: workspace id before agent_tasks.org_id: org-ehi-global=0, org-geosan=0"
      "remove_placeholder_projects: workspace id after agent_tasks.org_id: org-ehi-global=0, org-geosan=0 (moved 0)"
      "remove_placeholder_projects: workspace id before cost_events.org_id: org-ehi-global=0, org-geosan=0"
      "remove_placeholder_projects: workspace id after cost_events.org_id: org-ehi-global=0, org-geosan=0 (moved 0)"
    )
    if [ "$schema_mode" = "workshop" ]; then
      expected_lines+=(
        "remove_placeholder_projects: workspace id before projects.org_id: org-ehi-global=0, org-geosan=0"
        "remove_placeholder_projects: workspace id after projects.org_id: org-ehi-global=0, org-geosan=0 (moved 0)"
      )
    fi
    expected_lines+=(
      "remove_placeholder_projects: workspace id before qa_runs.org_id: org-ehi-global=0, org-geosan=0"
      "remove_placeholder_projects: workspace id after qa_runs.org_id: org-ehi-global=0, org-geosan=0 (moved 0)"
      "remove_placeholder_projects: workspace defaults altered: 0"
    )
  fi

  local prev_ln=0 cur_ln line
  for line in "${expected_lines[@]}"; do
    printf '%s\n' "$n_lines" | grep -Fxq "$line" || {
      echo "   [$label] FAIL missing workspace NOTICE: $line. Got:"
      printf '%s\n' "$n_lines"
      exit 1
    }
    cur_ln="$(printf '%s\n' "$n_lines" | grep -Fxn "$line" | head -1 | cut -d: -f1)"
    if [ -z "$cur_ln" ] || [ "$cur_ln" -le "$prev_ln" ]; then
      echo "   [$label] FAIL workspace NOTICE out of order: $line"
      exit 1
    fi
    prev_ln="$cur_ln"
  done

  if [ "$run_kind" = "second" ]; then
    if printf '%s\n' "$n_lines" | grep -q "altered default on"; then
      echo "   [$label] FAIL second run altered a default unexpectedly"
      exit 1
    fi
  fi
  echo "   [$label] PASS workspace id before/after counts and default-alteration NOTICEs exact ($run_kind)"
}

check_rls_owner_and_stranger() { # $1 label, $2 lock_mode ("lock"|"nolock"), $3 db
  local label="$1"
  local lock_mode="$2"
  local db="$3"

  PGOPTIONS= psql -X -q -v ON_ERROR_STOP=1 -h "$WORK" -p "$PORT" -U postgres -d "$db" -v lock_mode="$lock_mode" <<'EOF' 2>&1 | sed -n 's/.*NOTICE:  //p;s/.*ERROR: */ERROR: /p' | sed "s/^/   [$label] /"
\set owner_id '11111111-1111-1111-1111-111111111111'
\set other_id '22222222-2222-2222-2222-222222222222'
\set owner_claims '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}'
\set other_claims '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}'

begin;

insert into auth.users (id, email) values
  (:'owner_id', 'sanni@example.com'),
  (:'other_id', 'stranger@example.com')
on conflict (id) do nothing;

insert into public.app_owner (user_id) values (:'owner_id') on conflict (user_id) do nothing;
select set_config('geosan.test_lock_mode', :'lock_mode', true);

set local role authenticated;
select set_config('request.jwt.claims', :'owner_claims', true);

do $rls_owner$
declare
  n int;
begin
  if not public.is_app_owner() then
    raise exception 'FAIL owner not recognised by is_app_owner()';
  end if;

  select count(*) into n from public.project_registry;
  if n <> 3 then raise exception 'FAIL owner saw % rows in project_registry (expected 3)', n; end if;

  select count(*) into n from public.agent_tasks where org_id = 'org-geosan-workshop';
  if n <> 4 then raise exception 'FAIL owner saw % rows in agent_tasks (expected 4)', n; end if;

  select count(*) into n from public.cost_events where org_id = 'org-geosan-workshop';
  if n <> 4 then raise exception 'FAIL owner saw % rows in cost_events (expected 4)', n; end if;

  select count(*) into n from public.qa_runs where org_id = 'org-geosan-workshop';
  if n <> 3 then raise exception 'FAIL owner saw % rows in qa_runs (expected 3)', n; end if;

  select count(*) into n from public.qa_findings;
  if n <> 3 then raise exception 'FAIL owner saw % rows in qa_findings (expected 3)', n; end if;

  select count(*) into n from public.project_budgets;
  if n <> 3 then raise exception 'FAIL owner saw % rows in project_budgets (expected 3)', n; end if;

  if current_setting('geosan.test_lock_mode', true) <> 'lock' and to_regclass('public.projects') is not null then
    select count(*) into n from public.projects where org_id = 'org-geosan-workshop';
    if n <> 3 then raise exception 'FAIL owner saw % rows in projects (expected 3)', n; end if;
  end if;
end
$rls_owner$;

select set_config('request.jwt.claims', :'other_claims', true);

do $rls_stranger$
declare
  n int;
  t text;
begin
  if public.is_app_owner() then
    raise exception 'FAIL stranger recognised as owner';
  end if;

  if current_setting('geosan.test_lock_mode', true) = 'lock' then
    foreach t in array array['project_registry', 'agent_tasks', 'cost_events', 'qa_runs', 'qa_findings', 'project_budgets', 'prompt_versions'] loop
      execute format('select count(*) from public.%I', t) into n;
      if n <> 0 then raise exception 'FAIL stranger saw % rows in % under #5 lock', n, t; end if;
    end loop;
    raise notice 'PASS RLS check (#5 lock): owner sees all moved org-geosan-workshop rows across all locked tables; stranger sees 0';
  else
    foreach t in array array['projects', 'project_logs', 'agent_assignments', 'provider_configs'] loop
      execute format('select count(*) from public.%I', t) into n;
      if n <> 0 then raise exception 'FAIL stranger saw % rows in %', n, t; end if;
    end loop;
    raise notice 'PASS RLS check (unlocked + 20261028): owner sees all moved org-geosan-workshop rows; stranger sees 0 on workshop tables';
  end if;
end
$rls_stranger$;

rollback;
EOF
  test "${PIPESTATUS[0]}" -eq 0
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

  # Pre-check that the two cross-project links start non-null and legacy defaults are 'org-ehi-global' before migration
  as postgres -tA -c "
    do \$\$
    declare
      t text;
    begin
      if (select parent_task_id from public.agent_tasks where id = 't-real-001-child') <> 't-proj-ehi-001' then
        raise exception 'fixture error: t-real-001-child.parent_task_id';
      end if;
      if (select task_id from public.cost_events where id = 'c-real-001-cross') <> 't-proj-ehi-001' then
        raise exception 'fixture error: c-real-001-cross.task_id';
      end if;
      for t in select unnest(array['agent_tasks', 'cost_events', 'qa_runs']) loop
        if (
          select pg_get_expr(ad.adbin, ad.adrelid)
            from pg_attribute a
            join pg_attrdef ad on ad.adrelid = a.attrelid and ad.adnum = a.attnum
           where a.attrelid = to_regclass('public.' || t) and a.attname = 'org_id'
        ) <> '''org-ehi-global''::text' then
          raise exception 'fixture error: %.org_id default did not start as org-ehi-global', t;
        end if;
      end loop;
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
  check_ws_notices "$label" "$out_confirmed" "workshop" "first"

  # Post-migration SQL assertions (all 8 ids gone, real projects intact, 2 links set to null, workspace ids moved & defaults updated)
  PGOPTIONS= psql -X -q -v ON_ERROR_STOP=1 -h "$WORK" -p "$PORT" -U postgres -d "$db" \
    -f "$CHECKS" 2>&1 | sed -n 's/.*NOTICE:  //p;s/.*ERROR: */ERROR: /p' | sed "s/^/   [$label] /"
  test "${PIPESTATUS[0]}" -eq 0

  # Byte-identical check on all real project rows and non-project tables (modulo the 2 nulled links, org_id -> org-geosan-workshop, and bumped updated_at on moved projects rows)
  local after_data after_data_cmp
  after_data="$(data)"
  after_data_cmp="$(data_modulo_moved_updated_at)"
  [ "$expected_after" = "$after_data_cmp" ] || {
    echo "   [$label] FAIL real project rows or non-project tables are not byte-identical (modulo nulled links, org_id, and projects.updated_at)"
    diff <(printf '%s\n' "$expected_after") <(printf '%s\n' "$after_data_cmp") || true
    exit 1
  }
  echo "   [$label] PASS real projects and all their rows byte-identical except nulled links, org_id->org-geosan-workshop, and bumped projects.updated_at"

  # RLS check: owner sees all moved rows; stranger sees none (rolled back so data unchanged)
  check_rls_owner_and_stranger "$label" "$lock_mode" "$db"
  [ "$after_data" = "$(data)" ] || {
    echo "   [$label] FAIL rolled-back RLS check changed data"
    exit 1
  }

  # Policies, RLS flags, grants and default ACL snapshot unchanged
  local after_snap
  after_snap="$(snapshot)"
  [ "$before_snap" = "$after_snap" ] || {
    echo "   [$label] FAIL migration changed policies/RLS/grants/default ACLs"
    diff <(printf '%s\n' "$before_snap") <(printf '%s\n' "$after_snap") || true
    exit 1
  }
  echo "   [$label] PASS policies, RLS flags, grants and default ACL snapshot unchanged"

  # Second run is a no-op (data identical including projects.updated_at, 0 deleted, 0 moved, 0 defaults altered)
  local out_second
  out_second="$(run_mig postgres 2>&1)"
  check_notice_order_and_counts "$label-2nd" "$out_second" \
    "qa_findings=0, qa_runs=0, cost_events=0, project_budgets=0, agent_tasks=0, project_logs=0, agent_assignments=0, provider_configs=0, project_registry=0, projects=0" \
    "0" \
    "agent_tasks.parent_task_id=0, cost_events.task_id=0"
  check_ws_notices "$label-2nd" "$out_second" "workshop" "second"
  [ "$after_data" = "$(data)" ] || {
    echo "   [$label] FAIL second run changed data"
    exit 1
  }
  echo "   [$label] PASS second run is a no-op (data identical, 0 deleted, 0 workspace ids moved, 0 defaults altered)"

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

echo "== 5. Mid-way failure rolls back (BEFORE DELETE on project_registry AND BEFORE UPDATE on agent_tasks during workspace id move)"
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
echo "   [mid-way] PASS mid-way delete failure rolled back completely; all parent and child rows identical to before"

# 5b. Failure during workspace id move (after all placeholder deletes have succeeded) rolls back everything including deletes
as postgres -c "
  create or replace function public.abort_agent_tasks_ws_move() returns trigger language plpgsql as \$\$
  begin
    raise exception 'simulated mid-way failure during agent_tasks workspace id move';
  end \$\$;
  create trigger trg_abort_agent_tasks_ws_move before update on public.agent_tasks
    for each row execute function public.abort_agent_tasks_ws_move();
"
if out_mid_ws="$(run_mig postgres 2>&1)"; then
  echo "   [mid-way-ws] FAIL migration succeeded despite raising BEFORE UPDATE trigger on agent_tasks"
  exit 1
fi
printf '%s\n' "$out_mid_ws" | grep -q "simulated mid-way failure during agent_tasks workspace id move" || {
  echo "   [mid-way-ws] FAIL unexpected error: $out_mid_ws"
  exit 1
}
as postgres -c "drop trigger trg_abort_agent_tasks_ws_move on public.agent_tasks; drop function public.abort_agent_tasks_ws_move();"
[ "$d_mid_before" = "$(data)" ] || {
  echo "   [mid-way-ws] FAIL failure during workspace id move did not roll back placeholder deletes"
  exit 1
}
echo "   [mid-way-ws] PASS failure during workspace id move (BEFORE UPDATE on agent_tasks) rolled back everything including placeholder deletes"
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
check_ws_notices "legacy" "$out_leg" "legacy" "first"

PGOPTIONS= psql -X -q -v ON_ERROR_STOP=1 -h "$WORK" -p "$PORT" -U postgres -d t_legacy \
  -f "$CHECKS" 2>&1 | sed -n 's/.*NOTICE:  //p;s/.*ERROR: */ERROR: /p' | sed "s/^/   [legacy] /"
test "${PIPESTATUS[0]}" -eq 0

after_leg_data="$(data)"
[ "$expected_leg_after" = "$after_leg_data" ] || {
  echo "   [legacy] FAIL legacy real project rows not byte-identical (modulo the 2 nulled links and org_id move)"
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
check_ws_notices "legacy-2nd" "$out_leg_2" "legacy" "second"
[ "$after_leg_data" = "$(data)" ] || {
  echo "   [legacy] FAIL legacy second run changed data"
  exit 1
}
echo "   [legacy] PASS legacy-only schema migration succeeded, preserved real data byte-identically, and is idempotent"
unset DB

echo "== 9. Workspace-id pre-check refusals: 2(a) FK constraint, 2(b) org/workspace table, 2(c) unique conflict"
export DB=t_fks
d_ws_ref_before="$(data)"

# 9a-1. Pre-check 2(a): FK constraint where a discovered workspace-id column is the referencing side
as postgres -c "
  create table public.external_tenants (code text primary key);
  insert into public.external_tenants values ('org-ehi-global'), ('org-geosan'), ('org-geosan-workshop');
  alter table public.agent_tasks add constraint fk_agent_tasks_org_tenant foreign key (org_id) references public.external_tenants(code);
"
if out_fk_src="$(run_mig postgres 2>&1)"; then
  echo "   [precheck-2a] FAIL migration succeeded with FK on agent_tasks.org_id (referencing side)"
  exit 1
fi
printf '%s\n' "$out_fk_src" | grep -q "fk_agent_tasks_org_tenant" || {
  echo "   [precheck-2a] FAIL error did not name fk_agent_tasks_org_tenant: $out_fk_src"
  exit 1
}
[ "$d_ws_ref_before" = "$(data)" ] || {
  echo "   [precheck-2a] FAIL refused FK (referencing side) changed data"
  exit 1
}
as postgres -c "alter table public.agent_tasks drop constraint fk_agent_tasks_org_tenant; drop table public.external_tenants;"
echo "   [precheck-2a] PASS refused FK on discovered workspace-id column (referencing side: fk_agent_tasks_org_tenant); data unchanged"

# 9a-2. Pre-check 2(a): FK constraint where a discovered workspace-id column (*_workspace_id) is the referenced side
as postgres -c "
  create table public.tenant_directory (id text primary key, parent_workspace_id text unique);
  create table public.tenant_notes (
    id text primary key,
    ref_code text constraint fk_notes_to_parent_workspace references public.tenant_directory (parent_workspace_id)
  );
"
if out_fk_dst="$(run_mig postgres 2>&1)"; then
  echo "   [precheck-2a] FAIL migration succeeded with FK referencing tenant_directory.parent_workspace_id (referenced side)"
  exit 1
fi
printf '%s\n' "$out_fk_dst" | grep -q "fk_notes_to_parent_workspace" || {
  echo "   [precheck-2a] FAIL error did not name fk_notes_to_parent_workspace: $out_fk_dst"
  exit 1
}
[ "$d_ws_ref_before" = "$(data)" ] || {
  echo "   [precheck-2a] FAIL refused FK (referenced side) changed data"
  exit 1
}
as postgres -c "drop table public.tenant_notes; drop table public.tenant_directory;"
echo "   [precheck-2a] PASS refused FK on discovered workspace-id column (referenced side: fk_notes_to_parent_workspace); data unchanged"

# 9b-1. Pre-check 2(b): organizations-style table whose id holds 'org-ehi-global'
as postgres -c "
  create table public.organizations (id text primary key, slug text not null, display_name text not null);
  insert into public.organizations values ('org-ehi-global', 'ehi-global', 'EHI Global');
"
if out_org_tbl="$(run_mig postgres 2>&1)"; then
  echo "   [precheck-2b] FAIL migration succeeded when public.organizations.id held 'org-ehi-global'"
  exit 1
fi
printf '%s\n' "$out_org_tbl" | grep -q "organizations" || {
  echo "   [precheck-2b] FAIL error did not name organizations: $out_org_tbl"
  exit 1
}
[ "$d_ws_ref_before" = "$(data)" ] || {
  echo "   [precheck-2b] FAIL refused organizations table run changed data"
  exit 1
}
as postgres -c "drop table public.organizations;"
echo "   [precheck-2b] PASS refused public.organizations holding 'org-ehi-global' in id; data unchanged"

# 9b-2. Pre-check 2(b): workspace-named table whose slug holds 'org-geosan'
as postgres -c "
  create table public.team_workspaces (id uuid default gen_random_uuid() primary key, slug varchar(64) not null);
  insert into public.team_workspaces (slug) values ('org-geosan');
"
if out_ws_tbl="$(run_mig postgres 2>&1)"; then
  echo "   [precheck-2b] FAIL migration succeeded when public.team_workspaces.slug held 'org-geosan'"
  exit 1
fi
printf '%s\n' "$out_ws_tbl" | grep -q "team_workspaces" || {
  echo "   [precheck-2b] FAIL error did not name team_workspaces: $out_ws_tbl"
  exit 1
}
[ "$d_ws_ref_before" = "$(data)" ] || {
  echo "   [precheck-2b] FAIL refused team_workspaces table run changed data"
  exit 1
}
as postgres -c "drop table public.team_workspaces;"
echo "   [precheck-2b] PASS refused public.team_workspaces holding 'org-geosan' in slug; data unchanged"

# 9c-1. Pre-check 2(c): UNIQUE constraint on (org_id, project_id, assigned_agent) on agent_tasks
#       (distinct before migration because t-real-001-root is 'org-ehi-global' and t-real-001-child is 'org-geosan',
#        both on 'proj-real-001' + 'CoordinatorAgent', so rewriting both to 'org-geosan-workshop' creates a duplicate)
as postgres -c "
  alter table public.agent_tasks add constraint uq_agent_tasks_org_proj_agent unique (org_id, project_id, assigned_agent);
"
if out_uq_con="$(run_mig postgres 2>&1)"; then
  echo "   [precheck-2c] FAIL migration succeeded despite unique constraint conflict on uq_agent_tasks_org_proj_agent"
  exit 1
fi
printf '%s\n' "$out_uq_con" | grep -q "agent_tasks" && printf '%s\n' "$out_uq_con" | grep -q "uq_agent_tasks_org_proj_agent" || {
  echo "   [precheck-2c] FAIL error did not name agent_tasks and uq_agent_tasks_org_proj_agent: $out_uq_con"
  exit 1
}
[ "$d_ws_ref_before" = "$(data)" ] || {
  echo "   [precheck-2c] FAIL refused unique constraint conflict run changed data"
  exit 1
}
as postgres -c "alter table public.agent_tasks drop constraint uq_agent_tasks_org_proj_agent;"
echo "   [precheck-2c] PASS refused unique constraint conflict naming 'agent_tasks' and 'uq_agent_tasks_org_proj_agent'; data unchanged"

# 9c-2. Pre-check 2(c): standalone UNIQUE INDEX on qa_runs (org_id, run_type, status)
#       (surviving r-real-001='org-ehi-global', r-real-002='org-geosan', r-real-003='org-geosan-workshop'
#        all have run_type='QA_EXPLORE' and status='passed', while placeholder runs have status='failed')
as postgres -c "
  create unique index idx_uq_qa_runs_passed_org_type on public.qa_runs (org_id, run_type) where status = 'passed';
"
if out_uq_idx="$(run_mig postgres 2>&1)"; then
  echo "   [precheck-2c] FAIL migration succeeded despite unique index conflict on idx_uq_qa_runs_passed_org_type"
  exit 1
fi
printf '%s\n' "$out_uq_idx" | grep -q "qa_runs" && printf '%s\n' "$out_uq_idx" | grep -q "idx_uq_qa_runs_passed_org_type" || {
  echo "   [precheck-2c] FAIL error did not name qa_runs and idx_uq_qa_runs_passed_org_type: $out_uq_idx"
  exit 1
}
[ "$d_ws_ref_before" = "$(data)" ] || {
  echo "   [precheck-2c] FAIL refused unique index conflict run changed data"
  exit 1
}
as postgres -c "drop index public.idx_uq_qa_runs_passed_org_type;"
echo "   [precheck-2c] PASS refused standalone unique index conflict naming 'qa_runs' and 'idx_uq_qa_runs_passed_org_type'; data unchanged"

# 9c-3. Pre-check 2(c) survival check: a unique index that would only conflict with a deleted placeholder row is NOT refused
#       In projects: proj-iya-002 has org_id='org-geosan', vertical='logistics'; proj-real-001 has org_id='org-ehi-global', vertical='logistics';
#       proj-real-002 has vertical='fintech'; proj-real-003 has vertical='aviation'.
#       Among surviving rows (proj-real-001, proj-real-002, proj-real-003), (org_id, vertical) has NO duplicate after rewrite!
as postgres -c "
  create unique index idx_uq_projects_surviving_vertical on public.projects (org_id, vertical)
    where id in ('proj-iya-002', 'proj-real-001', 'proj-real-002', 'proj-real-003');
"
run_mig postgres >/dev/null 2>&1
echo "   [precheck-2c] PASS unique index that only conflicted with a deleted placeholder row succeeded without false refusal"
unset DB

echo "ALL PLACEHOLDER REMOVAL TESTS PASSED"
