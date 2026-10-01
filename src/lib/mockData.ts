import {
  Project,
  AgentTask,
  CostEvent,
  QARun,
  QAFinding,
  ProjectBudget,
  PromptVersion,
  Conversation,
  ChatMessage
} from './types';

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'proj-ehi-001',
    org_id: 'org-ehi-global',
    name: 'EHI Multisystems',
    slug: 'ehi-multisystems',
    vertical: 'Fintech & Enterprise Ledger',
    repo_url: 'https://github.com/ehi-enterprise/ledger-core',
    vercel_deployment_url: 'https://ledger.ehi-multisystems.internal',
    status: 'production',
    created_at: '2026-08-10T08:00:00Z',
    updated_at: '2026-09-29T01:15:00Z',
    agent_instructions: 'Strict financial invariant testing required. Never push to main branch without ReviewAgent signoff and 100% test pass on settlement reconciliations.',
    monthly_budget_usd: 1200.0,
    health_status: 'healthy',
    uptime_pct: 99.98,
    last_activity_at: '2026-09-29T02:05:00Z'
  },
  {
    id: 'proj-iyanu-002',
    org_id: 'org-ehi-global',
    name: 'Iyanuoluwa Vegetable Oil',
    slug: 'iyanu-oil',
    vertical: 'Agri-processing & Supply Chain',
    repo_url: 'https://github.com/iyanu-processing/crushing-telemetry',
    vercel_deployment_url: 'https://ops.iyanuoluwa-agro.com',
    status: 'building',
    created_at: '2026-08-25T10:30:00Z',
    updated_at: '2026-09-29T00:45:00Z',
    agent_instructions: 'Offline-first sync for refinery scale-house tablets. Validate Bluetooth weight-bridge driver parity on mobile builds.',
    monthly_budget_usd: 800.0,
    health_status: 'healthy',
    uptime_pct: 99.92,
    last_activity_at: '2026-09-29T01:40:00Z'
  },
  {
    id: 'proj-aviation-003',
    org_id: 'org-ehi-global',
    name: 'Aviation Log Entry',
    slug: 'aviation-log',
    vertical: 'Flight Deck & FAA Compliance',
    repo_url: 'https://github.com/skyfleet-ops/electronic-flight-bag',
    vercel_deployment_url: 'https://efb.skyfleet-aviation.org',
    status: 'testing',
    created_at: '2026-09-01T14:00:00Z',
    updated_at: '2026-09-28T23:30:00Z',
    agent_instructions: 'Strict FAA part 121 compliance audit. All pilot signature flows must be signed with RSA hardware certs.',
    monthly_budget_usd: 1500.0,
    health_status: 'degraded',
    uptime_pct: 98.85,
    last_activity_at: '2026-09-28T23:30:00Z'
  },
  {
    id: 'proj-edgepoint-004',
    org_id: 'org-ehi-global',
    name: 'EdgePoint',
    slug: 'edgepoint-gateway',
    vertical: 'IoT Telemetry & Edge Nodes',
    repo_url: 'https://github.com/edgepoint-mesh/sensor-daemon',
    vercel_deployment_url: 'https://telemetry.edgepoint.io',
    status: 'monitoring',
    created_at: '2026-07-15T09:00:00Z',
    updated_at: '2026-09-29T01:10:00Z',
    agent_instructions: 'MQTT message latency under 45ms. Synthetic health pings running every 60s via pg_net.',
    monthly_budget_usd: 600.0,
    health_status: 'healthy',
    uptime_pct: 99.99,
    last_activity_at: '2026-09-29T01:10:00Z'
  }
];

export const MOCK_TASKS: AgentTask[] = [
  {
    id: 'task-ehi-prop-1',
    org_id: 'org-ehi-global',
    project_id: 'proj-ehi-001',
    parent_task_id: null,
    task_type: 'BUILD_FEATURE',
    prompt: 'Add automated PDF statement dispatch on month-end settlement closure',
    status: 'proposed',
    assigned_agent: null,
    plan: {
      summary: '1. Hook into settlement reconciliation trigger.\n2. Render signed financial PDF statements.\n3. Dispatch via transactional email.',
      rationale: 'Hooks into settlement trigger; eliminates manual staff exports'
    },
    result: null,
    branch_name: null,
    pr_url: null,
    created_at: '2026-09-29T02:14:30Z',
    started_at: null,
    completed_at: null,
    proposed_by_message_id: 'msg-ehi-04'
  },
  {
    id: 'task-ehi-101',
    org_id: 'org-ehi-global',
    project_id: 'proj-ehi-001',
    parent_task_id: null,
    task_type: 'BUILD_FEATURE',
    prompt: 'Implement debt clearance badge and instant reconciliation receipt on customer transaction ledger',
    status: 'awaiting_approval',
    assigned_agent: 'CodingAgent',
    plan: {
      summary: '1. Update CustomerLedger.tsx to render emerald debt clearance badge.\n2. Add RPC call to check account settlement threshold.\n3. Implement PDF download receipt for cleared balances.\n4. Add unit test assertions.',
      files_to_modify: ['src/components/CustomerLedger.tsx', 'src/services/ledgerRpc.ts'],
      estimated_tokens: 38400
    },
    result: {
      summary: 'Plan generated and verified by ReviewAgent. Adversarial review passed zero secret leaks and strict RLS alignment. Awaiting operator approval to commit and open PR.',
      diff_stat: '+142 -18 lines across 3 files',
      tests_passed: true
    },
    branch_name: 'agent/task-ehi-101',
    pr_url: 'https://github.com/ehi-enterprise/ledger-core/pull/284',
    created_at: '2026-09-29T01:45:00Z',
    started_at: '2026-09-29T01:45:15Z',
    completed_at: null
  },
  {
    id: 'task-ehi-102',
    org_id: 'org-ehi-global',
    project_id: 'proj-ehi-001',
    parent_task_id: null,
    task_type: 'FIX_BUG',
    prompt: 'Fix floating point rounding error on batch payroll payout reconciliation ledger',
    status: 'running',
    assigned_agent: 'CodingAgent',
    plan: {
      summary: 'Replace IEEE 754 float math with BigInt integer cents calculation in payroll calculation daemon.',
      files_to_modify: ['src/lib/payrollEngine.ts']
    },
    result: null,
    branch_name: 'agent/task-ehi-102',
    pr_url: null,
    created_at: '2026-09-29T02:00:00Z',
    started_at: '2026-09-29T02:00:10Z',
    completed_at: null
  },
  {
    id: 'task-ehi-103',
    org_id: 'org-ehi-global',
    project_id: 'proj-ehi-001',
    parent_task_id: null,
    task_type: 'QA_SECURITY',
    prompt: 'Execute full RBAC penetration crawl testing customer financial record isolation across tenant boundaries',
    status: 'done',
    assigned_agent: 'QAAgent',
    plan: { summary: 'Simulate member token trying to access foreign tenant records via REST and GraphQL endpoints.' },
    result: {
      summary: 'Full security test completed. All 48 multi-tenant boundary checks passed. RLS policy enforcement returned 403 Forbidden for all cross-tenant access attempts.',
      findings_count: 0
    },
    branch_name: null,
    pr_url: null,
    created_at: '2026-09-28T22:10:00Z',
    started_at: '2026-09-28T22:10:15Z',
    completed_at: '2026-09-28T22:18:40Z'
  },
  {
    id: 'task-iyanu-201',
    org_id: 'org-ehi-global',
    project_id: 'proj-iyanu-002',
    parent_task_id: null,
    task_type: 'BUILD_FEATURE',
    prompt: 'Add offline SQLite synchronization queue for palm kernel oil weighing stations',
    status: 'queued',
    assigned_agent: null,
    plan: null,
    result: null,
    branch_name: null,
    pr_url: null,
    created_at: '2026-09-29T01:50:00Z',
    started_at: null,
    completed_at: null
  },
  {
    id: 'task-iyanu-202',
    org_id: 'org-ehi-global',
    project_id: 'proj-iyanu-002',
    parent_task_id: null,
    task_type: 'QA_EXPLORE',
    prompt: 'Autonomous exploratory crawl of tanker dispatch workflow on simulated mobile screen sizes',
    status: 'running',
    assigned_agent: 'QAAgent',
    plan: { summary: 'Maestro-driven automated tap and swipe pass through scale-house ticket creation.' },
    result: null,
    branch_name: null,
    pr_url: null,
    created_at: '2026-09-29T01:30:00Z',
    started_at: '2026-09-29T01:30:20Z',
    completed_at: null
  },
  {
    id: 'task-aviation-301',
    org_id: 'org-ehi-global',
    project_id: 'proj-aviation-003',
    parent_task_id: null,
    task_type: 'FIX_BUG',
    prompt: 'Resolve GPS coordinate truncation on transoceanic waypoint entry modal',
    status: 'awaiting_approval',
    assigned_agent: 'ReviewAgent',
    plan: {
      summary: 'Extend coordinate input mask from 4 to 6 decimal precision; add DMS / Decimal toggle.',
      files_to_modify: ['src/components/WaypointInput.tsx']
    },
    result: {
      summary: 'Patch created and reviewed. Adversarial review passed. Ready for pilot signoff approval.',
      pr_url: 'https://github.com/skyfleet-ops/electronic-flight-bag/pull/112'
    },
    branch_name: 'agent/task-aviation-301',
    pr_url: 'https://github.com/skyfleet-ops/electronic-flight-bag/pull/112',
    created_at: '2026-09-28T21:00:00Z',
    started_at: '2026-09-28T21:00:30Z',
    completed_at: null
  },
  {
    id: 'task-aviation-302',
    org_id: 'org-ehi-global',
    project_id: 'proj-aviation-003',
    parent_task_id: null,
    task_type: 'DEPLOY',
    prompt: 'Promote EFB release v2.4.1 to staging Vercel preview and run post-deploy synthetic health probes',
    status: 'blocked',
    assigned_agent: 'DeployAgent',
    plan: { summary: 'Awaiting dependency resolution on PR #112 approval.' },
    result: { error: 'Prerequisite task task-aviation-301 is pending approval.' },
    branch_name: null,
    pr_url: null,
    created_at: '2026-09-28T21:05:00Z',
    started_at: null,
    completed_at: null
  },
  {
    id: 'task-edgepoint-401',
    org_id: 'org-ehi-global',
    project_id: 'proj-edgepoint-004',
    parent_task_id: null,
    task_type: 'REPORT',
    prompt: 'Generate weekly telemetry latency distribution audit across 400 edge gateways',
    status: 'done',
    assigned_agent: 'CoordinatorAgent',
    plan: { summary: 'Aggregate p50, p95, p99 ping latencies from app_health_checks table.' },
    result: {
      summary: 'Audit generated. Mean latency 28.4ms (p95: 41.2ms). Zero packet loss anomalies recorded.',
      report_url: '/reports/telemetry-latency-wk39.pdf'
    },
    branch_name: null,
    pr_url: null,
    created_at: '2026-09-28T18:00:00Z',
    started_at: '2026-09-28T18:00:15Z',
    completed_at: '2026-09-28T18:04:22Z'
  },
  {
    id: 'task-ehi-104',
    org_id: 'org-ehi-global',
    project_id: 'proj-ehi-001',
    parent_task_id: null,
    task_type: 'PLAN',
    prompt: 'Architect multi-currency SWIFT GPI tracking integration with real-time settlement webhooks',
    status: 'done',
    assigned_agent: 'CoordinatorAgent',
    plan: { summary: 'Breakdown implementation into 4 DAG tasks: Schema, Ingestion, Reconcile, Webhooks.' },
    result: {
      summary: 'Architecture specification completed and approved. DAG dependency tree committed to task_dependencies.',
      subtasks_count: 4
    },
    branch_name: null,
    pr_url: null,
    created_at: '2026-09-27T14:30:00Z',
    started_at: '2026-09-27T14:30:10Z',
    completed_at: '2026-09-27T14:41:00Z'
  },
  {
    id: 'task-iyanu-203',
    org_id: 'org-ehi-global',
    project_id: 'proj-iyanu-002',
    parent_task_id: null,
    task_type: 'FIX_BUG',
    prompt: 'Handle empty payload exception when weighbridge disconnected during gross weight sampling',
    status: 'done',
    assigned_agent: 'CodingAgent',
    plan: { summary: 'Add timeout and reconnect retry loop to SerialPort reader.' },
    result: {
      summary: 'Bug resolved. Handled ECONNRESET gracefully with fallback manual override log.',
      pr_url: 'https://github.com/iyanu-processing/crushing-telemetry/pull/49'
    },
    branch_name: 'agent/task-iyanu-203',
    pr_url: 'https://github.com/iyanu-processing/crushing-telemetry/pull/49',
    created_at: '2026-09-27T11:00:00Z',
    started_at: '2026-09-27T11:00:20Z',
    completed_at: '2026-09-27T11:22:15Z'
  },
  {
    id: 'task-aviation-303',
    org_id: 'org-ehi-global',
    project_id: 'proj-aviation-003',
    parent_task_id: null,
    task_type: 'QA_DIFF',
    prompt: 'Test git diff on flight dispatcher manifest parser after JSON schema update',
    status: 'failed',
    assigned_agent: 'QAAgent',
    plan: { summary: 'Run Schemathesis against changed API routes in PR #108.' },
    result: {
      error: 'Schema invariant assertion failure: mandatory field flight_crew.captain_license missing in response fixture.'
    },
    branch_name: null,
    pr_url: null,
    created_at: '2026-09-26T16:00:00Z',
    started_at: '2026-09-26T16:00:15Z',
    completed_at: '2026-09-26T16:06:50Z'
  }
];

export const MOCK_COST_EVENTS: CostEvent[] = [
  {
    id: 'cost-ev-001',
    org_id: 'org-ehi-global',
    project_id: 'proj-ehi-001',
    task_id: 'task-ehi-101',
    provider: 'google',
    model: 'gemini-3.5-flash',
    tokens_input: 18450,
    tokens_output: 3200,
    cost_usd: 0.0234,
    attributed_to: 'FEATURE:debt-clearance-badge',
    created_at: '2026-09-29T01:46:00Z'
  },
  {
    id: 'cost-ev-002',
    org_id: 'org-ehi-global',
    project_id: 'proj-ehi-001',
    task_id: 'task-ehi-101',
    provider: 'anthropic',
    model: 'claude-sonnet-4',
    tokens_input: 12200,
    tokens_output: 1850,
    cost_usd: 0.0643,
    attributed_to: 'FEATURE:debt-clearance-badge',
    created_at: '2026-09-29T01:48:30Z'
  },
  {
    id: 'cost-ev-003',
    org_id: 'org-ehi-global',
    project_id: 'proj-ehi-001',
    task_id: 'task-ehi-102',
    provider: 'google',
    model: 'gemini-3.5-flash',
    tokens_input: 24100,
    tokens_output: 4800,
    cost_usd: 0.0324,
    attributed_to: 'BUG:batch-payroll-rounding',
    created_at: '2026-09-29T02:01:00Z'
  },
  {
    id: 'cost-ev-004',
    org_id: 'org-ehi-global',
    project_id: 'proj-iyanu-002',
    task_id: 'task-iyanu-202',
    provider: 'anthropic',
    model: 'claude-sonnet-4',
    tokens_input: 38400,
    tokens_output: 5400,
    cost_usd: 0.1962,
    attributed_to: 'QA:QA_EXPLORE',
    created_at: '2026-09-29T01:32:00Z'
  },
  {
    id: 'cost-ev-005',
    org_id: 'org-ehi-global',
    project_id: 'proj-aviation-003',
    task_id: 'task-aviation-301',
    provider: 'google',
    model: 'gemini-3.5-pro',
    tokens_input: 42100,
    tokens_output: 6100,
    cost_usd: 0.2114,
    attributed_to: 'BUG:gps-coordinate-truncation',
    created_at: '2026-09-28T21:02:00Z'
  },
  {
    id: 'cost-ev-006',
    org_id: 'org-ehi-global',
    project_id: 'proj-aviation-003',
    task_id: 'task-aviation-301',
    provider: 'anthropic',
    model: 'claude-sonnet-4',
    tokens_input: 16800,
    tokens_output: 2200,
    cost_usd: 0.0834,
    attributed_to: 'BUG:gps-coordinate-truncation',
    created_at: '2026-09-28T21:04:15Z'
  },
  {
    id: 'cost-ev-007',
    org_id: 'org-ehi-global',
    project_id: 'proj-ehi-001',
    task_id: 'task-ehi-103',
    provider: 'xai',
    model: 'grok-4',
    tokens_input: 54000,
    tokens_output: 8200,
    cost_usd: 0.2310,
    attributed_to: 'QA:QA_SECURITY',
    created_at: '2026-09-28T22:15:00Z'
  },
  {
    id: 'cost-ev-008',
    org_id: 'org-ehi-global',
    project_id: 'proj-edgepoint-004',
    task_id: 'task-edgepoint-401',
    provider: 'google',
    model: 'gemini-3.5-flash',
    tokens_input: 15300,
    tokens_output: 2100,
    cost_usd: 0.0177,
    attributed_to: 'REPORT:latency-distribution',
    created_at: '2026-09-28T18:02:00Z'
  },
  {
    id: 'cost-ev-009',
    org_id: 'org-ehi-global',
    project_id: 'proj-ehi-001',
    task_id: 'task-ehi-104',
    provider: 'openai',
    model: 'gpt-5',
    tokens_input: 48900,
    tokens_output: 7200,
    cost_usd: 0.1942,
    attributed_to: 'PLAN:swift-gpi-integration',
    created_at: '2026-09-27T14:35:00Z'
  },
  {
    id: 'cost-ev-010',
    org_id: 'org-ehi-global',
    project_id: 'proj-iyanu-002',
    task_id: 'task-iyanu-203',
    provider: 'google',
    model: 'gemini-3.5-flash',
    tokens_input: 29800,
    tokens_output: 4100,
    cost_usd: 0.0346,
    attributed_to: 'BUG:weighbridge-empty-payload',
    created_at: '2026-09-27T11:10:00Z'
  },
  {
    id: 'cost-ev-011',
    org_id: 'org-ehi-global',
    project_id: 'proj-aviation-003',
    task_id: 'task-aviation-303',
    provider: 'anthropic',
    model: 'claude-sonnet-4',
    tokens_input: 32000,
    tokens_output: 4500,
    cost_usd: 0.1635,
    attributed_to: 'QA:QA_DIFF',
    created_at: '2026-09-26T16:03:00Z'
  },
  {
    id: 'cost-ev-012',
    org_id: 'org-ehi-global',
    project_id: 'proj-ehi-001',
    task_id: null,
    provider: 'google',
    model: 'gemini-3.5-flash',
    tokens_input: 14200,
    tokens_output: 2200,
    cost_usd: 0.0172,
    attributed_to: 'FEATURE:account-statement-export',
    created_at: '2026-09-26T10:15:00Z'
  },
  {
    id: 'cost-ev-013',
    org_id: 'org-ehi-global',
    project_id: 'proj-ehi-001',
    task_id: null,
    provider: 'google',
    model: 'gemini-3.5-flash',
    tokens_input: 19800,
    tokens_output: 3100,
    cost_usd: 0.0241,
    attributed_to: 'FEATURE:account-statement-export',
    created_at: '2026-09-25T14:40:00Z'
  },
  {
    id: 'cost-ev-014',
    org_id: 'org-ehi-global',
    project_id: 'proj-iyanu-002',
    task_id: null,
    provider: 'xai',
    model: 'grok-4',
    tokens_input: 34100,
    tokens_output: 5100,
    cost_usd: 0.1449,
    attributed_to: 'FEATURE:boiler-temp-anomaly-detection',
    created_at: '2026-09-25T09:20:00Z'
  },
  {
    id: 'cost-ev-015',
    org_id: 'org-ehi-global',
    project_id: 'proj-aviation-003',
    task_id: null,
    provider: 'openai',
    model: 'gpt-5',
    tokens_input: 41200,
    tokens_output: 6300,
    cost_usd: 0.1660,
    attributed_to: 'FEATURE:notam-decoding-pipeline',
    created_at: '2026-09-24T18:10:00Z'
  },
  {
    id: 'cost-ev-016',
    org_id: 'org-ehi-global',
    project_id: 'proj-ehi-001',
    task_id: null,
    provider: 'anthropic',
    model: 'claude-sonnet-4',
    tokens_input: 28400,
    tokens_output: 3900,
    cost_usd: 0.1437,
    attributed_to: 'FEATURE:audit-trail-tamper-seal',
    created_at: '2026-09-24T11:00:00Z'
  },
  {
    id: 'cost-ev-017',
    org_id: 'org-ehi-global',
    project_id: 'proj-edgepoint-004',
    task_id: null,
    provider: 'google',
    model: 'gemini-3.5-flash',
    tokens_input: 11200,
    tokens_output: 1400,
    cost_usd: 0.0126,
    attributed_to: 'FEATURE:heartbeat-compression',
    created_at: '2026-09-23T15:20:00Z'
  },
  {
    id: 'cost-ev-018',
    org_id: 'org-ehi-global',
    project_id: 'proj-ehi-001',
    task_id: null,
    provider: 'google',
    model: 'gemini-3.5-flash',
    tokens_input: 16500,
    tokens_output: 2800,
    cost_usd: 0.0207,
    attributed_to: 'BUG:double-entry-timestamp-skew',
    created_at: '2026-09-22T08:30:00Z'
  },
  {
    id: 'cost-ev-019',
    org_id: 'org-ehi-global',
    project_id: 'proj-iyanu-002',
    task_id: null,
    provider: 'anthropic',
    model: 'claude-sonnet-4',
    tokens_input: 22100,
    tokens_output: 3400,
    cost_usd: 0.1173,
    attributed_to: 'QA:QA_REPLAY',
    created_at: '2026-09-21T13:45:00Z'
  },
  {
    id: 'cost-ev-020',
    org_id: 'org-ehi-global',
    project_id: 'proj-aviation-003',
    task_id: null,
    provider: 'google',
    model: 'gemini-3.5-pro',
    tokens_input: 39500,
    tokens_output: 5800,
    cost_usd: 0.1991,
    attributed_to: 'FEATURE:altimeter-conversion-utility',
    created_at: '2026-09-20T17:10:00Z'
  }
];

export const MOCK_QA_RUNS: QARun[] = [
  {
    id: 'qa-run-001',
    org_id: 'org-ehi-global',
    project_id: 'proj-ehi-001',
    task_id: 'task-ehi-103',
    run_type: 'security',
    target_url: 'https://ledger.ehi-multisystems.internal',
    target_platform: 'web',
    role_tested: 'unauthenticated_guest',
    status: 'completed',
    engine_used: 'agent-qa (RBAC Matrix)',
    findings_count: 0,
    replay_script_path: 'qa/replays/ehi-rbac-matrix.yaml',
    created_at: '2026-09-28T22:10:15Z',
    completed_at: '2026-09-28T22:18:40Z'
  },
  {
    id: 'qa-run-002',
    org_id: 'org-ehi-global',
    project_id: 'proj-aviation-003',
    task_id: 'task-aviation-303',
    run_type: 'diff',
    target_url: 'https://efb.skyfleet-aviation.org/api/v2/manifest',
    target_platform: 'api',
    role_tested: 'flight_dispatcher',
    status: 'failed',
    engine_used: 'mk-qa-master (Schemathesis)',
    findings_count: 2,
    replay_script_path: 'qa/replays/aviation-manifest-diff.yaml',
    created_at: '2026-09-26T16:00:15Z',
    completed_at: '2026-09-26T16:06:50Z'
  },
  {
    id: 'qa-run-003',
    org_id: 'org-ehi-global',
    project_id: 'proj-iyanu-002',
    task_id: 'task-iyanu-202',
    run_type: 'explore',
    target_url: 'https://ops.iyanuoluwa-agro.com',
    target_platform: 'mobile',
    role_tested: 'scalehouse_operator',
    status: 'running',
    engine_used: 'agent-qa (Maestro Mobile)',
    findings_count: 1,
    replay_script_path: null,
    created_at: '2026-09-29T01:30:20Z',
    completed_at: null
  },
  {
    id: 'qa-run-004',
    org_id: 'org-ehi-global',
    project_id: 'proj-edgepoint-004',
    task_id: null,
    run_type: 'targeted',
    target_url: 'https://telemetry.edgepoint.io/health',
    target_platform: 'web',
    role_tested: 'system_admin',
    status: 'completed',
    engine_used: 'agent-qa (DOM Crawler)',
    findings_count: 0,
    replay_script_path: 'qa/replays/edgepoint-uptime.yaml',
    created_at: '2026-09-28T09:00:00Z',
    completed_at: '2026-09-28T09:04:12Z'
  }
];

export const MOCK_QA_FINDINGS: QAFinding[] = [
  {
    id: 'finding-av-001',
    run_id: 'qa-run-002',
    severity: 'critical',
    title: 'Missing mandatory captain license certificate in dispatch manifest API response',
    description: 'When requesting flight manifest schema v2, the flight_crew array returns captain records with captain_license omitted, violating FAA electronic record standards.',
    component: 'GET /api/v2/manifest',
    screenshot_url: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=400&q=80',
    reproduction_steps: [
      'Send authenticated GET request to /api/v2/manifest with flight_id=FL-902',
      'Inspect JSON response under response.flight_crew[0]',
      'Assert captain_license string presence',
      'Received undefined field, causing downstream flight bag app crash'
    ],
    status: 'open',
    created_at: '2026-09-26T16:04:00Z'
  },
  {
    id: 'finding-av-002',
    run_id: 'qa-run-002',
    severity: 'medium',
    title: 'Fuel burn calculation precision mismatch between metric tonnes and pounds',
    description: 'When converting FOB from kilograms to pounds, rounding truncation causes a 4.2 lb variance on 100,000 lb fueling entries.',
    component: 'FuelPlanningModal.tsx',
    screenshot_url: null,
    reproduction_steps: [
      'Open Flight Planning tab',
      'Toggle unit selector from KG to LBS',
      'Observe fuel reserve calculation sum mismatching gross payload total by 4 lbs'
    ],
    status: 'open',
    created_at: '2026-09-26T16:05:30Z'
  },
  {
    id: 'finding-iy-001',
    run_id: 'qa-run-003',
    severity: 'high',
    title: 'Bluetooth weighbridge reconnect button becomes unclickable on 360px viewport',
    description: 'Floating action button overlaps the tare reset trigger on narrow mobile devices, preventing operators from reconnecting the wireless scale.',
    component: 'WeighbridgeControl.tsx',
    screenshot_url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=400&q=80',
    reproduction_steps: [
      'Set device viewport width to 360px (Android POS handheld)',
      'Disconnect serial/bluetooth scale',
      'Tap Reconnect Scale button',
      'Click is intercepted by z-index of bottom navigation bar'
    ],
    status: 'in_progress',
    created_at: '2026-09-29T01:34:00Z'
  }
];

export const MOCK_PROJECT_BUDGETS: ProjectBudget[] = [
  {
    project_id: 'proj-ehi-001',
    monthly_limit_usd: 1200.0,
    alert_threshold_pct: 80,
    hard_stop: true
  },
  {
    project_id: 'proj-iyanu-002',
    monthly_limit_usd: 800.0,
    alert_threshold_pct: 80,
    hard_stop: false
  },
  {
    project_id: 'proj-aviation-003',
    monthly_limit_usd: 1500.0,
    alert_threshold_pct: 85,
    hard_stop: true
  },
  {
    project_id: 'proj-edgepoint-004',
    monthly_limit_usd: 600.0,
    alert_threshold_pct: 75,
    hard_stop: true
  }
];

export const MOCK_PROMPT_VERSIONS: PromptVersion[] = [
  {
    id: 'pv-001',
    role: 'CoordinatorAgent',
    version: 4,
    system_instruction: 'You are the EHI Platform Coordinator. Route agent_tasks to specialist agents: BUILD_FEATURE/FIX_BUG -> CodingAgent, QA_* -> QAAgent, DEPLOY -> DeployAgent. Never do work yourself.',
    created_at: '2026-09-20T10:00:00Z',
    changelog: 'Added strict error trace logging to agent_traces on invalid task dispatch routing.',
    is_active: true
  },
  {
    id: 'pv-002',
    role: 'CodingAgent',
    version: 7,
    system_instruction: 'You are the EHI Coding Agent. Read project agent_instructions first, explore workspace using filesystem MCP, plan step_type=planning before writing code, commit to agent/task-{id}, open PR with plan description.',
    created_at: '2026-09-22T14:15:00Z',
    changelog: 'Added worktree isolation constraint and ban on main branch direct commits.',
    is_active: true
  },
  {
    id: 'pv-003',
    role: 'ReviewAgent',
    version: 3,
    system_instruction: 'You are the EHI Review Agent (Claude Sonnet 4 critic). Assume the coder made a mistake. Check diff against plan, verify tests ran and passed, audit for hardcoded secrets or RLS leaks.',
    created_at: '2026-09-24T09:30:00Z',
    changelog: 'Enforced independent foundation model evaluation (Claude Sonnet 4 vs Gemini 3.5 Flash coder).',
    is_active: true
  },
  {
    id: 'pv-004',
    role: 'QAAgent',
    version: 5,
    system_instruction: 'You are the EHI QA Agent. Dispatch web/mobile tests to agent-qa MCP and API tests to mk-qa-master MCP. Output zero-token replay scripts to qa/replays/{flow}.yaml.',
    created_at: '2026-09-25T11:00:00Z',
    changelog: 'Integrated Maestro mobile driver actions and multi-role RBAC crawl.',
    is_active: true
  }
];

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-ehi-001',
    org_id: 'org-ehi-global',
    project_id: 'proj-ehi-001',
    title: 'EHI Core Ledger Architecture & Reconciliations',
    adk_session_id: 'adk-sess-ehi-001',
    last_message_at: '2026-09-29T02:15:00Z',
    message_count: 4,
    archived: false,
    created_at: '2026-09-28T09:00:00Z',
    updated_at: '2026-09-29T02:15:00Z'
  },
  {
    id: 'conv-aviation-002',
    org_id: 'org-ehi-global',
    project_id: 'proj-aviation-003',
    title: 'EFB FAA Compliance & Manifest Schema Audit',
    adk_session_id: 'adk-sess-aviation-002',
    last_message_at: '2026-09-28T22:30:00Z',
    message_count: 2,
    archived: false,
    created_at: '2026-09-28T14:00:00Z',
    updated_at: '2026-09-28T22:30:00Z'
  }
];

export const MOCK_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-ehi-01',
    conversation_id: 'conv-ehi-001',
    role: 'user',
    content: 'What is the current health status of the EHI transaction ledger, and did any tasks fail overnight?',
    created_at: '2026-09-29T02:10:00Z'
  },
  {
    id: 'msg-ehi-02',
    conversation_id: 'conv-ehi-001',
    role: 'assistant',
    content: 'EHI Multisystems is fully operational at 99.98% uptime. Zero tasks failed overnight. We currently have 1 task awaiting your approval (PR #284 for the debt clearance badge) and 1 task actively running (payroll floating point precision fix). Month-to-date spend is $342.18, well under the $1,200 monthly cap.',
    tool_calls: [
      { name: 'get_project_summary', args: { project_id: 'proj-ehi-001' } },
      { name: 'get_recent_tasks', args: { project_id: 'proj-ehi-001', limit: 5 } }
    ],
    tool_results: [
      { status: 'healthy', uptime_pct: 99.98, failed_tasks: 0 }
    ],
    model_used: 'gemini-3.5-flash',
    tokens_input: 1840,
    tokens_output: 320,
    cost_usd: 0.0023,
    created_at: '2026-09-29T02:10:20Z'
  },
  {
    id: 'msg-ehi-03',
    conversation_id: 'conv-ehi-001',
    role: 'user',
    content: 'Can we add an automated PDF statement dispatch on month-end settlement closure?',
    created_at: '2026-09-29T02:14:00Z'
  },
  {
    id: 'msg-ehi-04',
    conversation_id: 'conv-ehi-001',
    role: 'assistant',
    content: 'Yes. That would hook directly into the settlement reconciliation trigger and dispatch signed statements via transactional email. It would save ~3 hours of manual staff exports on the 1st of each month. I have formulated a task for this. Review the proposed task card below and confirm if you want me to queue it for CodingAgent.',
    proposed_task_id: 'task-ehi-prop-1',
    tool_calls: [
      {
        name: 'propose_task',
        args: {
          project_id: 'proj-ehi-001',
          task_type: 'BUILD_FEATURE',
          prompt: 'Add automated PDF statement dispatch on month-end settlement closure',
          rationale: 'Hooks into settlement trigger; eliminates manual staff exports'
        }
      }
    ],
    tool_results: [
      { task_id: 'task-ehi-prop-1', status: 'proposed' }
    ],
    model_used: 'gemini-3.5-flash',
    tokens_input: 2420,
    tokens_output: 410,
    cost_usd: 0.0031,
    created_at: '2026-09-29T02:14:30Z'
  }
];
