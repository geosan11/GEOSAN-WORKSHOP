-- Fixture for testing supabase/migrations/20261030000000_remove_placeholder_projects.sql.
-- Test data only (throwaway local Postgres).
-- Seeds all 8 placeholder project ids (4 canonical + 4 historical aliases) and
-- 3 real projects (proj-real-001 under 'org-ehi-global', proj-real-002 under 'org-geosan',
-- proj-real-003 already on 'org-geosan-workshop') across project_registry,
-- public.projects (when present), and all child tables, plus cross-project links.

do $fixture$
declare
  placeholder_ids constant text[] := array[
    'proj-ehi-001',
    'proj-iya-002',
    'proj-iyanu-002',
    'proj-iya-001',
    'proj-aero-003',
    'proj-aviation-003',
    'proj-edge-004',
    'proj-edgepoint-004'
  ];
  pid text;
  idx int;
  ts constant timestamptz := '2026-10-01 00:00:00+00'::timestamptz;
  real_ts constant timestamptz := '2026-10-02 00:00:00+00'::timestamptz;
begin
  -- 1. All 8 placeholder ids + 2 real projects in public.project_registry
  for idx in 1 .. array_length(placeholder_ids, 1) loop
    pid := placeholder_ids[idx];
    insert into public.project_registry (
      id, name, vertical, supabase_project_url, supabase_anon_key_masked,
      vercel_deployment_url, github_repo_url, status, last_commit_hash,
      deployment_status, monthly_budget_usd, current_spend_usd, health,
      created_at, updated_at, description
    ) values (
      pid,
      'Placeholder ' || pid,
      case (idx % 4)
        when 1 then 'logistics'
        when 2 then 'agriculture'
        when 3 then 'aviation'
        else 'fintech'
      end,
      'https://example.supabase.co',
      'anon-mask-' || pid,
      'https://' || pid || '.vercel.app',
      'https://github.com/example/' || pid,
      'testing',
      'abc000' || idx,
      'deployed',
      600.00 + idx * 10,
      10.00 + idx,
      'healthy',
      ts,
      ts,
      'Placeholder description for ' || pid
    )
    on conflict (id) do update set
      name = excluded.name,
      vertical = excluded.vertical,
      supabase_project_url = excluded.supabase_project_url,
      supabase_anon_key_masked = excluded.supabase_anon_key_masked,
      vercel_deployment_url = excluded.vercel_deployment_url,
      github_repo_url = excluded.github_repo_url,
      status = excluded.status,
      last_commit_hash = excluded.last_commit_hash,
      deployment_status = excluded.deployment_status,
      monthly_budget_usd = excluded.monthly_budget_usd,
      current_spend_usd = excluded.current_spend_usd,
      health = excluded.health,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at,
      description = excluded.description;
  end loop;

  insert into public.project_registry (
    id, name, vertical, supabase_project_url, supabase_anon_key_masked,
    vercel_deployment_url, github_repo_url, status, last_commit_hash,
    deployment_status, monthly_budget_usd, current_spend_usd, health,
    created_at, updated_at, description
  ) values
    ('proj-real-001', 'Real Client One', 'logistics', 'https://real1.supabase.co', 'mask-1',
     'https://real1.vercel.app', 'https://github.com/real/one', 'production', 'f00baa1',
     'live', 1500.00, 120.50, 'healthy', real_ts, real_ts, 'First real client project'),
    ('proj-real-002', 'Real Client Two', 'fintech', 'https://real2.supabase.co', 'mask-2',
     'https://real2.vercel.app', 'https://github.com/real/two', 'building', 'f00baa2',
     'deploying', 2500.00, 340.75, 'healthy', real_ts, real_ts, 'Second real client project'),
    ('proj-real-003', 'Real Client Three', 'aviation', 'https://real3.supabase.co', 'mask-3',
     'https://real3.vercel.app', 'https://github.com/real/three', 'testing', 'f00baa3',
     'deployed', 1800.00, 90.25, 'healthy', real_ts, real_ts, 'Third real client project')
  on conflict (id) do nothing;

  -- Force deterministic updated_at on project_registry in case BEFORE UPDATE trigger fired
  update public.project_registry set updated_at = ts where id = any (placeholder_ids);
  update public.project_registry set updated_at = real_ts where id in ('proj-real-001', 'proj-real-002', 'proj-real-003');

  -- 2. All 8 placeholder ids + 3 real projects in public.projects (when workshop_aligned is applied)
  if to_regclass('public.projects') is not null then
    for idx in 1 .. array_length(placeholder_ids, 1) loop
      pid := placeholder_ids[idx];
      insert into public.projects (
        id, org_id, name, slug, description, vertical, archetype, source_type, source_ref,
        advisor_provider, advisor_agent_name, status, deployment_status, health, health_status,
        last_commit_hash, monthly_budget_usd, current_spend_usd, last_activity_at, created_at, updated_at
      ) values (
        pid,
        case when idx % 2 = 1 then 'org-ehi-global' else 'org-geosan' end,
        'Placeholder ' || pid, pid, 'Placeholder description for ' || pid,
        'logistics', 'custom', 'github', 'https://github.com/example/' || pid,
        'anthropic', 'CoordinatorAgent', 'testing', 'deployed', 'healthy', 'healthy',
        'abc000' || idx, 600.00 + idx * 10, 10.00 + idx, ts, ts, ts
      )
      on conflict (id) do update set
        org_id = excluded.org_id,
        name = excluded.name,
        slug = excluded.slug,
        description = excluded.description,
        last_activity_at = excluded.last_activity_at,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at;
    end loop;

    insert into public.projects (
      id, org_id, name, slug, description, vertical, archetype, source_type, source_ref,
      advisor_provider, advisor_agent_name, status, deployment_status, health, health_status,
      last_commit_hash, monthly_budget_usd, current_spend_usd, last_activity_at, created_at, updated_at
    ) values
      ('proj-real-001', 'org-ehi-global', 'Real Client One', 'real-client-one', 'First real client project',
       'logistics', 'custom', 'github', 'https://github.com/real/one',
       'anthropic', 'CoordinatorAgent', 'production', 'live', 'healthy', 'healthy',
       'f00baa1', 1500.00, 120.50, real_ts, real_ts, real_ts),
      ('proj-real-002', 'org-geosan', 'Real Client Two', 'real-client-two', 'Second real client project',
       'fintech', 'custom', 'github', 'https://github.com/real/two',
       'anthropic', 'CoordinatorAgent', 'building', 'deploying', 'healthy', 'healthy',
       'f00baa2', 2500.00, 340.75, real_ts, real_ts, real_ts),
      ('proj-real-003', 'org-geosan-workshop', 'Real Client Three', 'real-client-three', 'Third real client project',
       'aviation', 'custom', 'github', 'https://github.com/real/three',
       'anthropic', 'CoordinatorAgent', 'testing', 'deployed', 'healthy', 'healthy',
       'f00baa3', 1800.00, 90.25, real_ts, real_ts, real_ts)
    on conflict (id) do update set
      org_id = excluded.org_id,
      name = excluded.name,
      slug = excluded.slug,
      description = excluded.description,
      last_activity_at = excluded.last_activity_at,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at;
  end if;

  -- 3. agent_tasks:
  --    * Real root task on proj-real-001 ('org-ehi-global') whose plan/result/subagents JSON mentions 'proj-ehi-001'
  --    * 8 placeholder tasks (1 per placeholder id), each with plan/result/subagents JSON mentioning its id;
  --      t-proj-ehi-001 has parent_task_id = 't-real-001-root' (placeholder task's parent is a real task)
  --    * Real child task on proj-real-001 ('org-geosan') whose parent_task_id points at 't-proj-ehi-001' (placeholder task)
  --    * Real task on proj-real-002 ('org-geosan') whose parent_task_id points at 't-real-001-root' (real -> real, kept)
  --    * Real task on proj-real-003 ('org-geosan-workshop', already on workshop org_id)
  insert into public.agent_tasks (
    id, org_id, project_id, task_type, prompt, status, assigned_agent, model_used,
    parent_task_id, plan, result, subagents, created_at, started_at, completed_at
  ) values (
    't-real-001-root', 'org-ehi-global', 'proj-real-001', 'AUDIT_SCHEMA', 'Real root task', 'done',
    'CoordinatorAgent', 'gemini-2.5-pro', null,
    '{"note": "migrated after proj-ehi-001", "steps": ["verify"]}'::jsonb,
    '{"summary": "compared with proj-ehi-001"}'::jsonb,
    '[{"agent": "QAAgent", "legacy_ref": "proj-ehi-001"}]'::jsonb,
    real_ts, real_ts, real_ts
  );

  for idx in 1 .. array_length(placeholder_ids, 1) loop
    pid := placeholder_ids[idx];
    insert into public.agent_tasks (
      id, org_id, project_id, task_type, prompt, status, assigned_agent, model_used,
      parent_task_id, plan, result, subagents, created_at, started_at, completed_at
    ) values (
      't-' || pid,
      case when idx % 2 = 1 then 'org-ehi-global' else 'org-geosan' end,
      pid,
      'FIX_BUG',
      'Task for ' || pid,
      'done',
      'CoordinatorAgent',
      'gemini-2.5-pro',
      case when pid = 'proj-ehi-001' then 't-real-001-root' else null end,
      jsonb_build_object('project_id', pid, 'steps', jsonb_build_array('step-' || pid)),
      jsonb_build_object('project_id', pid, 'status', 'ok'),
      jsonb_build_array(jsonb_build_object('subagent', 'Worker', 'project_id', pid)),
      ts, ts, ts
    );
  end loop;

  insert into public.agent_tasks (
    id, org_id, project_id, task_type, prompt, status, assigned_agent, model_used,
    parent_task_id, plan, result, subagents, created_at, started_at, completed_at
  ) values
    ('t-real-001-child', 'org-geosan', 'proj-real-001', 'FIX_BUG', 'Real task with placeholder parent', 'queued',
     'CoordinatorAgent', 'gemini-2.5-pro', 't-proj-ehi-001',
     '{"steps": ["real-step-1"]}'::jsonb, '{"ok": true}'::jsonb, '[{"agent": "Coder"}]'::jsonb,
     real_ts, null, null),
    ('t-real-002-root', 'org-geosan', 'proj-real-002', 'DEPLOY', 'Real two task with real parent', 'running',
     'CoordinatorAgent', 'gemini-2.5-pro', 't-real-001-root',
     '{"steps": ["real-step-2"]}'::jsonb, '{"ok": true}'::jsonb, '[{"agent": "Deployer"}]'::jsonb,
     real_ts, real_ts, null),
    ('t-real-003-root', 'org-geosan-workshop', 'proj-real-003', 'QA_EXPLORE', 'Real three task already on workshop org', 'done',
     'CoordinatorAgent', 'gemini-2.5-pro', null,
     '{"steps": ["real-step-3"]}'::jsonb, '{"ok": true}'::jsonb, '[{"agent": "Tester"}]'::jsonb,
     real_ts, real_ts, real_ts);

  -- 4. cost_events: 1 per placeholder id + real costs across 'org-ehi-global', 'org-geosan', 'org-geosan-workshop'
  for idx in 1 .. array_length(placeholder_ids, 1) loop
    pid := placeholder_ids[idx];
    insert into public.cost_events (
      id, org_id, project_id, task_id, tokens_input, tokens_output,
      cost_usd, provider, model, feature_attribution, created_at
    ) values (
      'c-' || pid,
      case when idx % 2 = 1 then 'org-ehi-global' else 'org-geosan' end,
      pid, 't-' || pid, 1000, 500,
      1.2500, 'gemini', 'gemini-2.5-flash', 'feature-' || pid, ts
    );
  end loop;

  insert into public.cost_events (
    id, org_id, project_id, task_id, tokens_input, tokens_output,
    cost_usd, provider, model, feature_attribution, created_at
  ) values
    ('c-real-001-cross', 'org-ehi-global', 'proj-real-001', 't-proj-ehi-001', 2000, 800,
     2.5000, 'gemini', 'gemini-2.5-flash', 'cross-task-cost', real_ts),
    ('c-real-001-own', 'org-ehi-global', 'proj-real-001', 't-real-001-root', 1500, 600,
     1.7500, 'gemini', 'gemini-2.5-flash', 'own-task-cost-1', real_ts),
    ('c-real-002-own', 'org-geosan', 'proj-real-002', 't-real-002-root', 3000, 1200,
     3.5000, 'gemini', 'gemini-2.5-flash', 'own-task-cost-2', real_ts),
    ('c-real-003-own', 'org-geosan-workshop', 'proj-real-003', 't-real-003-root', 1200, 400,
     1.1000, 'gemini', 'gemini-2.5-flash', 'own-task-cost-3', real_ts);

  -- 5. qa_runs & qa_findings (with reproduction_steps JSON): 1 each per placeholder id + 1 each per real project
  for idx in 1 .. array_length(placeholder_ids, 1) loop
    pid := placeholder_ids[idx];
    insert into public.qa_runs (
      id, org_id, project_id, run_type, status, total_findings,
      critical_count, high_count, medium_count, low_count, started_at, completed_at
    ) values (
      'r-' || pid,
      case when idx % 2 = 1 then 'org-ehi-global' else 'org-geosan' end,
      pid, 'QA_EXPLORE', 'failed', 1,
      0, 1, 0, 0, ts, ts
    );

    insert into public.qa_findings (
      id, run_id, project_id, severity, category, title, description,
      reproduction_steps, status, resolved_at, created_at
    ) values (
      'f-' || pid, 'r-' || pid, pid, 'high', 'regression',
      'Finding for ' || pid, 'Description for ' || pid,
      jsonb_build_array(jsonb_build_object('project_id', pid, 'action', 'click')),
      'open', null, ts
    );
  end loop;

  insert into public.qa_runs (
    id, org_id, project_id, run_type, status, total_findings,
    critical_count, high_count, medium_count, low_count, started_at, completed_at
  ) values
    ('r-real-001', 'org-ehi-global', 'proj-real-001', 'QA_EXPLORE', 'passed', 1, 0, 0, 0, 1, real_ts, real_ts),
    ('r-real-002', 'org-geosan', 'proj-real-002', 'QA_EXPLORE', 'passed', 1, 0, 0, 1, 0, real_ts, real_ts),
    ('r-real-003', 'org-geosan-workshop', 'proj-real-003', 'QA_EXPLORE', 'passed', 1, 0, 0, 0, 1, real_ts, real_ts);

  insert into public.qa_findings (
    id, run_id, project_id, severity, category, title, description,
    reproduction_steps, status, resolved_at, created_at
  ) values
    ('f-real-001', 'r-real-001', 'proj-real-001', 'low', 'ux',
     'Real finding 1', 'Real finding description 1',
     '[{"step": 1, "expected": "clean ui"}]'::jsonb, 'open', null, real_ts),
    ('f-real-002', 'r-real-002', 'proj-real-002', 'medium', 'performance',
     'Real finding 2', 'Real finding description 2',
     '[{"step": 1, "expected": "fast query"}]'::jsonb, 'resolved', real_ts, real_ts),
    ('f-real-003', 'r-real-003', 'proj-real-003', 'low', 'invariant',
     'Real finding 3', 'Real finding description 3',
     '[{"step": 1, "expected": "stable state"}]'::jsonb, 'open', null, real_ts);

  -- 6. project_budgets: 1 per placeholder id + 1 per real project
  for idx in 1 .. array_length(placeholder_ids, 1) loop
    pid := placeholder_ids[idx];
    insert into public.project_budgets (
      project_id, monthly_limit_usd, alert_threshold_pct, hard_stop, updated_at
    ) values (
      pid, 600.00 + idx * 10, 80, true, ts
    );
  end loop;

  insert into public.project_budgets (
    project_id, monthly_limit_usd, alert_threshold_pct, hard_stop, updated_at
  ) values
    ('proj-real-001', 1500.00, 80, true, real_ts),
    ('proj-real-002', 2500.00, 85, false, real_ts),
    ('proj-real-003', 1800.00, 75, true, real_ts);

  -- 7. Workshop tables: project_logs (incl. level='audit'), agent_assignments, provider_configs
  if to_regclass('public.project_logs') is not null then
    for idx in 1 .. array_length(placeholder_ids, 1) loop
      pid := placeholder_ids[idx];
      insert into public.project_logs (
        id, project_id, owner_id, task_id, run_id, agent_name, provider,
        level, event_type, message, payload, created_at, updated_at
      ) values (
        ('00000000-0000-0000-0001-00000000000' || idx)::uuid,
        pid, null, 't-' || pid, 'r-' || pid, 'CoordinatorAgent', 'anthropic',
        case when pid = 'proj-ehi-001' then 'audit' else 'info' end,
        'task_event', 'Log message for ' || pid,
        jsonb_build_object('project_id', pid, 'audit', (pid = 'proj-ehi-001')),
        ts, ts
      );
    end loop;

    insert into public.project_logs (
      id, project_id, owner_id, task_id, run_id, agent_name, provider,
      level, event_type, message, payload, created_at, updated_at
    ) values
      ('00000000-0000-0000-0001-000000000091'::uuid, 'proj-real-001', null, 't-real-001-root', 'r-real-001',
       'CoordinatorAgent', 'anthropic', 'audit', 'security_audit', 'Real project 1 audit log',
       '{"project_id": "proj-real-001", "verified": true}'::jsonb, real_ts, real_ts),
      ('00000000-0000-0000-0001-000000000092'::uuid, 'proj-real-002', null, 't-real-002-root', 'r-real-002',
       'CoordinatorAgent', 'anthropic', 'info', 'deploy_log', 'Real project 2 info log',
       '{"project_id": "proj-real-002", "step": "build"}'::jsonb, real_ts, real_ts);
  end if;

  if to_regclass('public.agent_assignments') is not null then
    for idx in 1 .. array_length(placeholder_ids, 1) loop
      pid := placeholder_ids[idx];
      insert into public.agent_assignments (
        id, project_id, owner_id, role, agent_name, provider, model, status,
        is_primary, system_prompt, instructions, config, assigned_task_id,
        last_active_at, created_at, updated_at
      ) values (
        ('00000000-0000-0000-0002-00000000000' || idx)::uuid,
        pid, null, 'advisor', 'CoordinatorAgent', 'anthropic', 'claude-3-7-sonnet', 'idle',
        true, 'Prompt for ' || pid, 'Instructions for ' || pid,
        jsonb_build_object('project_id', pid), 't-' || pid, ts, ts, ts
      );
    end loop;

    insert into public.agent_assignments (
      id, project_id, owner_id, role, agent_name, provider, model, status,
      is_primary, system_prompt, instructions, config, assigned_task_id,
      last_active_at, created_at, updated_at
    ) values
      ('00000000-0000-0000-0002-000000000091'::uuid, 'proj-real-001', null, 'advisor', 'CoordinatorAgent',
       'anthropic', 'claude-3-7-sonnet', 'active', true, 'Real 1 prompt', 'Real 1 instructions',
       '{"tier": "prod"}'::jsonb, 't-real-001-root', real_ts, real_ts, real_ts),
      ('00000000-0000-0000-0002-000000000092'::uuid, 'proj-real-002', null, 'specialist', 'CodingAgent',
       'anthropic', 'claude-3-7-sonnet', 'running', false, 'Real 2 prompt', 'Real 2 instructions',
       '{"tier": "staging"}'::jsonb, 't-real-002-root', real_ts, real_ts, real_ts);
  end if;

  if to_regclass('public.provider_configs') is not null then
    for idx in 1 .. array_length(placeholder_ids, 1) loop
      pid := placeholder_ids[idx];
      insert into public.provider_configs (
        id, owner_id, project_id, provider, display_name, enabled, is_default,
        default_model, available_models, api_key_masked, key_last4, has_secret,
        priority, health_status, config, created_at, updated_at
      ) values (
        ('00000000-0000-0000-0003-00000000000' || idx)::uuid,
        null, pid, 'anthropic', 'Anthropic ' || pid, true, true,
        'claude-3-7-sonnet', '["claude-3-7-sonnet"]'::jsonb, 'sk-ant-***', '000' || idx, true,
        100, 'healthy', jsonb_build_object('project_id', pid), ts, ts
      );
    end loop;

    insert into public.provider_configs (
      id, owner_id, project_id, provider, display_name, enabled, is_default,
      default_model, available_models, api_key_masked, key_last4, has_secret,
      priority, health_status, config, created_at, updated_at
    ) values
      ('00000000-0000-0000-0003-000000000091'::uuid, null, 'proj-real-001', 'anthropic', 'Real 1 Anthropic',
       true, true, 'claude-3-7-sonnet', '["claude-3-7-sonnet"]'::jsonb, 'sk-ant-r1', '1111', true,
       100, 'healthy', '{"real": 1}'::jsonb, real_ts, real_ts),
      ('00000000-0000-0000-0003-000000000092'::uuid, null, 'proj-real-002', 'gemini', 'Real 2 Gemini',
       true, false, 'gemini-2.5-pro', '["gemini-2.5-pro"]'::jsonb, 'AIza-r2', '2222', true,
       90, 'healthy', '{"real": 2}'::jsonb, real_ts, real_ts),
      ('00000000-0000-0000-0003-000000000093'::uuid, null, null, 'openai', 'Global OpenAI',
       true, false, 'gpt-4.1', '["gpt-4.1"]'::jsonb, 'sk-proj-gl', '3333', true,
       80, 'healthy', '{"global": true}'::jsonb, real_ts, real_ts);
  end if;

  -- 8. Non-project tables: prompt_versions, app_owner, user_preferences
  insert into public.prompt_versions (id, role, version, system_instruction, changelog, created_at)
  values ('pv-invariant-001', 'CoordinatorAgent', 1, 'Never delete real projects.', 'Initial invariant', real_ts)
  on conflict (id) do nothing;

  if to_regclass('auth.users') is not null and to_regclass('public.app_owner') is not null then
    insert into auth.users (id, email)
    values ('00000000-0000-0000-0009-000000000001'::uuid, 'owner@geosan.workshop')
    on conflict (id) do nothing;

    insert into public.app_owner (user_id, created_at)
    values ('00000000-0000-0000-0009-000000000001'::uuid, real_ts)
    on conflict (user_id) do nothing;
  end if;

  if to_regclass('public.user_preferences') is not null and to_regclass('auth.users') is not null then
    insert into public.user_preferences (user_id, font_scale, theme, density, created_at, updated_at)
    values ('00000000-0000-0000-0009-000000000001'::uuid, 1.10, 'dark', 'normal', real_ts, real_ts)
    on conflict (user_id) do nothing;
  end if;
end
$fixture$;
