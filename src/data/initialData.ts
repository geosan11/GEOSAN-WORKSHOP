import {
  ProjectRegistry,
  AgentTask,
  AgentResult,
  CostEvent,
  QARun,
  QAFinding,
  AgentInstruction,
  ModelPricing,
  FileNode,
  TaskDependency,
  AgentTrace,
  PromptVersion,
  ProjectBudget,
  AppHealthCheck,
  NotificationAlert,
  Organization
} from '../types';

export const INITIAL_MODEL_PRICING: ModelPricing[] = [
  {
    provider: 'google',
    model: 'gemini-3.5-flash',
    input_per_million: 0.15,
    output_per_million: 0.60,
    context_window: '1M tokens',
    best_for: 'Coding orchestrator, DOM QA exploration, high-throughput subagent tasks'
  },
  {
    provider: 'anthropic',
    model: 'claude-sonnet-4',
    input_per_million: 3.00,
    output_per_million: 15.00,
    context_window: '200k tokens',
    best_for: 'Critic & review verification, complex architectural refactors'
  },
  {
    provider: 'xai',
    model: 'grok-4',
    input_per_million: 2.00,
    output_per_million: 10.00,
    context_window: '128k tokens',
    best_for: 'Real-time telemetry triage, anomaly reasoning, parallel edge tests'
  },
  {
    provider: 'openai',
    model: 'o3-mini',
    input_per_million: 1.10,
    output_per_million: 4.40,
    context_window: '200k tokens',
    best_for: 'Formal verification, deterministic SQL invariant checking'
  }
];

export const INITIAL_PROJECTS: ProjectRegistry[] = [
  {
    id: 'proj-ehi-001',
    name: 'EHI Cargo Hubs & Waybills',
    vertical: 'logistics',
    supabase_project_url: 'https://ehi-cargo-core.supabase.co',
    supabase_anon_key_masked: 'sb_anon_••••••••••••ehi92',
    vercel_deployment_url: 'https://ehi-cargo-hub.vercel.app',
    github_repo_url: 'https://github.com/ehi-logistics/cargo-platform-v2',
    status: 'testing',
    last_commit_hash: 'd4f892a',
    deployment_status: 'degraded',
    repo_sync: {
      state: 'drifted',
      remote_commit_hash: '8f2d91c',
      remote_branch: 'main',
      commits_ahead: 2,
      commits_behind: 0,
      last_synced_at: '2026-09-28T17:15:00Z',
      drift_summary: '2 local commits ahead (Kano Hub syncClient patch not yet pushed)'
    },
    monthly_budget_usd: 600.00,
    current_spend_usd: 142.86,
    health: 'warning',
    created_at: '2026-08-15T09:00:00Z',
    updated_at: '2026-09-28T16:15:00Z',
    description: 'Autonomous freight intake, barcode sorting, and waybill payment reconciliation across Kano, Lagos, and Abuja transit hubs.'
  },
  {
    id: 'proj-iya-002',
    name: 'Iyanuoluwa AgroSupply & Silos',
    vertical: 'agriculture',
    supabase_project_url: 'https://iyanuoluwa-agro.supabase.co',
    supabase_anon_key_masked: 'sb_anon_••••••••••••iya44',
    vercel_deployment_url: 'https://iyanu-agro.vercel.app',
    github_repo_url: 'https://github.com/iyanu-agrik/silo-monitoring-engine',
    status: 'production',
    last_commit_hash: 'e4a110b',
    deployment_status: 'live',
    repo_sync: {
      state: 'synced',
      remote_commit_hash: 'e4a110b',
      remote_branch: 'main',
      commits_ahead: 0,
      commits_behind: 0,
      last_synced_at: '2026-09-28T17:20:00Z',
      drift_summary: 'Local IDE is clean and in sync with GitHub origin/main'
    },
    monthly_budget_usd: 450.00,
    current_spend_usd: 78.40,
    health: 'healthy',
    created_at: '2026-07-10T12:00:00Z',
    updated_at: '2026-09-28T14:30:00Z',
    description: 'IoT telemetry aggregation for grain moisture, cocoa cooperative bulk payout dispatch, and warehouse receipt tokenization.'
  },
  {
    id: 'proj-aero-003',
    name: 'AeroOps Apron & Dispatch',
    vertical: 'aviation',
    supabase_project_url: 'https://aeroops-ground.supabase.co',
    supabase_anon_key_masked: 'sb_anon_••••••••••••aero77',
    vercel_deployment_url: 'https://aeroops-dispatch.vercel.app',
    github_repo_url: 'https://github.com/aero-ground/turnaround-orchestrator',
    status: 'building',
    last_commit_hash: 'a19bc32',
    deployment_status: 'deploying',
    repo_sync: {
      state: 'drifted',
      remote_commit_hash: 'c71b04a',
      remote_branch: 'develop',
      commits_ahead: 0,
      commits_behind: 3,
      last_synced_at: '2026-09-28T17:00:00Z',
      drift_summary: 'Remote origin/develop has 3 commits not pulled into local IDE'
    },
    monthly_budget_usd: 800.00,
    current_spend_usd: 310.25,
    health: 'healthy',
    created_at: '2026-09-01T08:30:00Z',
    updated_at: '2026-09-28T17:05:00Z',
    description: 'Ground handling turnaround management, fuel bowser dispatch, baggage carousel allocation, and runway ramp telemetry.'
  },
  {
    id: 'proj-edge-004',
    name: 'EdgePoint Cross-Border Settlement',
    vertical: 'fintech',
    supabase_project_url: 'https://edgepoint-treasury.supabase.co',
    supabase_anon_key_masked: 'sb_anon_••••••••••••edge11',
    vercel_deployment_url: 'https://edgepoint-treasury.vercel.app',
    github_repo_url: 'https://github.com/edgepoint-core/settlement-ledger',
    status: 'production',
    last_commit_hash: '93c04ff',
    deployment_status: 'deployed',
    repo_sync: {
      state: 'synced',
      remote_commit_hash: '93c04ff',
      remote_branch: 'main',
      commits_ahead: 0,
      commits_behind: 0,
      last_synced_at: '2026-09-28T17:22:00Z',
      drift_summary: 'Clean working tree matching origin/main'
    },
    monthly_budget_usd: 1200.00,
    current_spend_usd: 540.90,
    health: 'healthy',
    created_at: '2026-06-20T11:20:00Z',
    updated_at: '2026-09-28T15:45:00Z',
    description: 'Multi-currency correspondent debt clearance, end-of-day ledger locking, FX collateral reserves, and SWIFT gpi webhook verification.'
  }
];

export const INITIAL_TASKS: AgentTask[] = [
  {
    id: 'task-ehi-901',
    project_id: 'proj-ehi-001',
    task_type: 'FIX_BUG',
    prompt: 'Fix receipt_mode vs payment_mode inconsistency causing failed cargo reconciliation at Kano Hub terminal when offline sync replays.',
    status: 'awaiting_approval',
    assigned_agent: 'Antigravity Coding Harness',
    model_used: 'gemini-3.5-flash',
    plan: {
      overview: 'Unify receipt_mode and payment_mode state flags in CargoSyncClient and add idempotent ledger key check before hub batch push.',
      steps: [
        'Inspect src/modules/cargo/syncClient.ts and diff with receipt_mode definitions',
        'Standardize enum PaymentMode { CASH, POS, DIRECT_TRANSFER, CLEARANCE }',
        'Add migration for legacy Kano receipt payload normalization',
        'Run targeted QA test using Comber MCP to verify offline cache replay'
      ],
      affected_files: [
        'src/modules/cargo/syncClient.ts',
        'src/modules/cargo/paymentMode.ts',
        'src/db/migrations/20260928_kano_sync.sql'
      ],
      estimated_tokens: 38500,
      subagents: ['Frontend Reconciliation View', 'Backend Postgres Invariant Subagent']
    },
    result: {
      summary: 'Patched sync client to map receipt_mode -> payment_mode on incoming edge events. Enforced transactional idempotency key on waybill payment logs.',
      diff_summary: '3 files changed, +48 lines, -14 lines. Verified with 14 unit test assertions.',
      artifacts: ['src/modules/cargo/syncClient.ts', 'qa/replays/kano_hub_replay.yaml'],
      qa_verdict: 'pass'
    },
    subagents: [
      {
        id: 'sub-01',
        role: 'backend',
        assigned_model: 'gemini-3.5-flash',
        status: 'completed',
        current_action: 'Generated idempotent hash constraint in syncClient.ts',
        tokens_used: 18200
      },
      {
        id: 'sub-02',
        role: 'reviewer',
        assigned_model: 'claude-sonnet-4',
        status: 'completed',
        current_action: 'Reviewed edge case when network drops mid-handshake',
        tokens_used: 8400
      }
    ],
    created_at: '2026-09-28T15:10:00Z',
    started_at: '2026-09-28T15:11:00Z',
    completed_at: null
  },
  {
    id: 'task-ehi-902',
    project_id: 'proj-ehi-001',
    task_type: 'QA_EXPLORE',
    prompt: 'Autonomously explore the entire Kano freight intake workflow as Hub Attendant role. Parse DOM tree, check every button, verify waybill generation and receipt PDF export.',
    status: 'done',
    assigned_agent: 'Autonomous QA Comber Engine',
    model_used: 'gemini-3.5-flash',
    plan: {
      overview: 'Execute accessibility tree crawl (~280 tokens/step) across 18 interactive hub controls, test form submissions, and generate replay YAML script.',
      steps: [
        'Mount headless browser session with session token for hub_attendant_kano',
        'Traverse /cargo/intake DOM accessibility hierarchy',
        'Simulate package weigh-in, dimensional scan, and barcode assignment',
        'Capture network assertions and export replay script to qa/replays/kano_intake.yaml'
      ],
      affected_files: ['qa/replays/kano_intake.yaml'],
      estimated_tokens: 42000
    },
    result: {
      summary: 'Exploration completed across 14 screens and 6 modal states. Detected 1 critical field mismatch (receipt_mode vs payment_mode) and 1 minor layout shift on barcode print.',
      diff_summary: 'Generated qa/replays/kano_intake.yaml (142 execution steps)',
      artifacts: ['qa/replays/kano_intake.yaml', 'qa/artifacts/kano_dom_tree.json'],
      qa_verdict: 'warn'
    },
    created_at: '2026-09-28T13:40:00Z',
    started_at: '2026-09-28T13:40:30Z',
    completed_at: '2026-09-28T13:48:15Z'
  },
  {
    id: 'task-edge-903',
    project_id: 'proj-edge-004',
    task_type: 'BUILD_FEATURE',
    prompt: 'Implement bilateral debt clearance engine for multi-party invoice netting with atomic EOD settlement locking.',
    status: 'done',
    assigned_agent: 'Antigravity Coding Harness',
    model_used: 'gemini-3.5-flash',
    plan: {
      overview: 'Develop NettingSettlementService with cycle-detection algorithm (Tarjan) for debt cancellation loops and write audit events to cost_events.',
      steps: [
        'Build core graph netting algorithm in TypeScript',
        'Add Supabase advisory locks for EOD ledger close',
        'Verify zero-sum conservation invariant across all accounts',
        'Attach automated cost event logger'
      ],
      affected_files: ['src/services/nettingEngine.ts', 'src/db/functions/eod_lock.sql'],
      estimated_tokens: 65000
    },
    result: {
      summary: 'Successfully deployed bilateral & multilateral cycle cancellation algorithm. Reduced settlement transactions by 64% in simulation benchmarks.',
      diff_summary: '4 files changed, +280 lines. Invariant tests: 24/24 passing.',
      artifacts: ['src/services/nettingEngine.ts'],
      qa_verdict: 'pass'
    },
    created_at: '2026-09-27T10:00:00Z',
    started_at: '2026-09-27T10:01:20Z',
    completed_at: '2026-09-27T10:24:50Z'
  },
  {
    id: 'task-aero-904',
    project_id: 'proj-aero-003',
    task_type: 'QA_SECURITY',
    prompt: 'Verify strict role isolation between Apron Ramp Agent, Fuel Bowser Dispatcher, and Airside Supervisor.',
    status: 'running',
    assigned_agent: 'Role Matrix Security Agent',
    model_used: 'gemini-3.5-flash',
    plan: {
      overview: 'Execute automated matrix tests across 12 API endpoints and 4 route guards to prevent privilege escalation.',
      steps: [
        'Authenticate as Apron Ramp Agent and attempt Fuel Allocation bypass',
        'Assert 403 Forbidden on supervisor gate reassignment endpoint',
        'Check RLS policy enforcement on apron_telemetry table'
      ],
      affected_files: ['tests/security/role_matrix.spec.ts'],
      estimated_tokens: 28000
    },
    result: null,
    created_at: '2026-09-28T16:55:00Z',
    started_at: '2026-09-28T16:55:40Z',
    completed_at: null
  }
];

export const INITIAL_RESULTS: AgentResult[] = [
  {
    id: 'res-101',
    task_id: 'task-ehi-901',
    step_number: 1,
    step_type: 'planning',
    content: 'Inspected codebase history. Found commit d4f892 where mobile intake switched field to receipt_mode while backend remained payment_mode.',
    model_used: 'gemini-3.5-flash',
    tokens_input: 12400,
    tokens_output: 1850,
    cost_usd: 0.002970,
    created_at: '2026-09-28T15:11:30Z'
  },
  {
    id: 'res-102',
    task_id: 'task-ehi-901',
    step_number: 2,
    step_type: 'coding',
    content: 'Generated patch for src/modules/cargo/syncClient.ts. Implemented dual-read compatibility layer and typed enum validator.',
    model_used: 'gemini-3.5-flash',
    tokens_input: 16800,
    tokens_output: 3200,
    cost_usd: 0.004440,
    created_at: '2026-09-28T15:14:10Z',
    diff: `--- a/src/modules/cargo/syncClient.ts
+++ b/src/modules/cargo/syncClient.ts
@@ -42,8 +42,16 @@ export class CargoSyncClient {
   async processHubQueue(event: CargoPayload): Promise<SyncResult> {
-    const mode = event.payment_mode;
-    if (!mode) throw new Error('Missing payment mode');
+    // Normalize receipt_mode vs payment_mode compatibility
+    const normalizedMode = event.payment_mode || event.receipt_mode;
+    if (!normalizedMode) {
+      throw new Error(\`Payment modality missing on hub waybill \${event.waybill_id}\`);
+    }
+    const modeEnum = parsePaymentMode(normalizedMode);
+    const idempotencyKey = \`sync_\${event.hub_id}_\${event.waybill_id}_\${event.timestamp}\`;
     
     return await this.db.tx(async (trx) => {
-      return await trx.insertPaymentLog({ waybill_id: event.waybill_id, mode });
+      return await trx.insertPaymentLogWithKey({ 
+        idempotencyKey, 
+        waybill_id: event.waybill_id, 
+        mode: modeEnum 
+      });
     });`
  },
  {
    id: 'res-103',
    task_id: 'task-ehi-901',
    step_number: 3,
    step_type: 'testing',
    content: 'Comber MCP simulated 25 offline queue reconnects. All 25 waybills reconciled with zero duplicate ledger entries.',
    model_used: 'gemini-3.5-flash',
    tokens_input: 18200,
    tokens_output: 1400,
    cost_usd: 0.003570,
    created_at: '2026-09-28T15:16:45Z'
  },
  {
    id: 'res-104',
    task_id: 'task-ehi-901',
    step_number: 4,
    step_type: 'verification',
    content: 'Reviewer agent verified that RLS policies prevent non-Kano hub attendants from replaying foreign hub payment streams.',
    model_used: 'claude-sonnet-4',
    tokens_input: 8400,
    tokens_output: 920,
    cost_usd: 0.039000,
    created_at: '2026-09-28T15:18:00Z'
  }
];

export const INITIAL_COST_EVENTS: CostEvent[] = [
  {
    id: 'cost-001',
    project_id: 'proj-ehi-001',
    task_id: 'task-ehi-901',
    provider: 'google',
    model: 'gemini-3.5-flash',
    endpoint: '/v1beta/models/gemini-3.5-flash:generateContent',
    tokens_input: 12400,
    tokens_output: 1850,
    cost_usd: 0.002970,
    attributed_to: 'bug',
    feature_name: 'Kano Hub Sync Mode Fix',
    created_at: '2026-09-28T15:11:30Z'
  },
  {
    id: 'cost-002',
    project_id: 'proj-ehi-001',
    task_id: 'task-ehi-901',
    provider: 'google',
    model: 'gemini-3.5-flash',
    endpoint: '/v1beta/models/gemini-3.5-flash:generateContent',
    tokens_input: 16800,
    tokens_output: 3200,
    cost_usd: 0.004440,
    attributed_to: 'bug',
    feature_name: 'Kano Hub Sync Mode Fix',
    created_at: '2026-09-28T15:14:10Z'
  },
  {
    id: 'cost-003',
    project_id: 'proj-ehi-001',
    task_id: 'task-ehi-901',
    provider: 'anthropic',
    model: 'claude-sonnet-4',
    endpoint: '/v1/messages',
    tokens_input: 8400,
    tokens_output: 920,
    cost_usd: 0.039000,
    attributed_to: 'bug',
    feature_name: 'Review & Critic Verifier',
    created_at: '2026-09-28T15:18:00Z'
  },
  {
    id: 'cost-004',
    project_id: 'proj-ehi-001',
    task_id: 'task-ehi-902',
    provider: 'google',
    model: 'gemini-3.5-flash',
    endpoint: '/v1beta/models/gemini-3.5-flash:generateContent',
    tokens_input: 38200,
    tokens_output: 4800,
    cost_usd: 0.008610,
    attributed_to: 'qa',
    feature_name: 'Kano Intake DOM Exploration',
    created_at: '2026-09-28T13:45:00Z'
  },
  {
    id: 'cost-005',
    project_id: 'proj-edge-004',
    task_id: 'task-edge-903',
    provider: 'google',
    model: 'gemini-3.5-flash',
    endpoint: '/v1beta/models/gemini-3.5-flash:generateContent',
    tokens_input: 62000,
    tokens_output: 8400,
    cost_usd: 0.014340,
    attributed_to: 'feature',
    feature_name: 'Debt Clearance Netting Engine',
    created_at: '2026-09-27T10:15:00Z'
  },
  {
    id: 'cost-006',
    project_id: 'proj-edge-004',
    task_id: 'task-edge-903',
    provider: 'openai',
    model: 'o3-mini',
    endpoint: '/v1/chat/completions',
    tokens_input: 35000,
    tokens_output: 4200,
    cost_usd: 0.056980,
    attributed_to: 'feature',
    feature_name: 'Zero-Sum Invariant Checker',
    created_at: '2026-09-27T10:20:00Z'
  },
  {
    id: 'cost-007',
    project_id: 'proj-aero-003',
    task_id: 'task-aero-904',
    provider: 'xai',
    model: 'grok-4',
    endpoint: '/v1/chat/completions',
    tokens_input: 24000,
    tokens_output: 3100,
    cost_usd: 0.079000,
    attributed_to: 'qa',
    feature_name: 'Ramp Role Matrix Security Audit',
    created_at: '2026-09-28T16:56:00Z'
  }
];

export const INITIAL_QA_RUNS: QARun[] = [
  {
    id: 'qa-run-801',
    project_id: 'proj-ehi-001',
    task_id: 'task-ehi-902',
    run_type: 'explore',
    target_url: 'https://ehi-cargo-hub.vercel.app/cargo/intake',
    target_platform: 'web',
    role_tested: 'hub_attendant_kano',
    status: 'completed',
    findings_count: 2,
    replay_script_path: 'qa/replays/kano_intake_crawl.yaml',
    dom_nodes_inspected: 148,
    tokens_consumed: 38200,
    execution_speed: '1x (DOM Tree crawl)',
    created_at: '2026-09-28T13:40:30Z',
    completed_at: '2026-09-28T13:48:15Z'
  },
  {
    id: 'qa-run-802',
    project_id: 'proj-ehi-001',
    task_id: 'task-ehi-901',
    run_type: 'replay',
    target_url: 'https://ehi-cargo-hub.vercel.app/cargo/reconciliation',
    target_platform: 'web',
    role_tested: 'hub_supervisor',
    status: 'completed',
    findings_count: 0,
    replay_script_path: 'qa/replays/kano_reconcile_fast.yaml',
    dom_nodes_inspected: 86,
    tokens_consumed: 0, // 0 tokens because it's a headless replay!
    execution_speed: '30x headless (Zero AI)',
    created_at: '2026-09-28T15:15:30Z',
    completed_at: '2026-09-28T15:16:10Z'
  },
  {
    id: 'qa-run-803',
    project_id: 'proj-edge-004',
    task_id: 'task-edge-903',
    run_type: 'targeted',
    target_url: 'https://edgepoint-treasury.vercel.app/api/settlement/eod',
    target_platform: 'web',
    role_tested: 'treasury_settler',
    status: 'completed',
    findings_count: 0,
    replay_script_path: 'qa/replays/eod_settlement.yaml',
    dom_nodes_inspected: 42,
    tokens_consumed: 9400,
    execution_speed: '1x targeted',
    created_at: '2026-09-27T10:18:00Z',
    completed_at: '2026-09-27T10:22:00Z'
  },
  {
    id: 'qa-run-804',
    project_id: 'proj-aero-003',
    task_id: 'task-aero-904',
    run_type: 'security',
    target_url: 'https://aeroops-dispatch.vercel.app/ramp/fuel',
    target_platform: 'mobile',
    role_tested: 'apron_ramp_agent',
    status: 'running',
    findings_count: 1,
    replay_script_path: 'qa/replays/security_ramp_matrix.yaml',
    dom_nodes_inspected: 64,
    tokens_consumed: 14200,
    execution_speed: '1x security crawl',
    created_at: '2026-09-28T16:55:40Z',
    completed_at: null
  }
];

export const INITIAL_QA_FINDINGS: QAFinding[] = [
  {
    id: 'find-001',
    run_id: 'qa-run-801',
    project_id: 'proj-ehi-001',
    severity: 'critical',
    title: 'Hub intake form serializes receipt_mode instead of payment_mode',
    description: 'During offline package intake at Kano Hub, selecting "Direct Cash" sets payload.receipt_mode = "CASH". Backend API expects payload.payment_mode, causing failed sync and stranded waybills.',
    dom_selector: '#payment-method-select[data-sync="hub_offline"]',
    reproduction_steps: [
      'Navigate to /cargo/intake with network throttled or offline mode enabled',
      'Select Kano Hub location and scan test waybill #KB-8921-99',
      'Select payment method: Cash at Hub Desk',
      'Click "Complete Intake & Issue Waybill"',
      'Inspect outgoing IndexedDB queue: field is receipt_mode: CASH'
    ],
    component: 'src/modules/cargo/syncClient.ts',
    status: 'in_progress',
    created_at: '2026-09-28T13:46:10Z'
  },
  {
    id: 'find-002',
    run_id: 'qa-run-801',
    project_id: 'proj-ehi-001',
    severity: 'low',
    title: 'Barcode preview modal causes 4px horizontal layout shift on mobile viewports',
    description: 'When rendering the thermal barcode tag preview on 375px screens, the canvas container exceeds viewport boundary causing layout shift.',
    dom_selector: '.thermal-preview-container',
    reproduction_steps: [
      'Switch viewport to 375x812 (iPhone 13)',
      'Click "Print Thermal Label"',
      'Observe horizontal scrollbar appearance'
    ],
    component: 'src/components/BarcodeThermalModal.tsx',
    status: 'open',
    created_at: '2026-09-28T13:47:30Z'
  },
  {
    id: 'find-003',
    run_id: 'qa-run-804',
    project_id: 'proj-aero-003',
    severity: 'high',
    title: 'Apron agent token can view gate re-allocation queue before supervisor approval',
    description: 'API endpoint GET /api/v1/gates/unassigned returns pending schedule locks to apron ramp agents without supervisor authorization header.',
    dom_selector: 'endpoint: /api/v1/gates/unassigned',
    reproduction_steps: [
      'Issue bearer token for role: apron_ramp_agent',
      'Send GET request to /api/v1/gates/unassigned',
      'Verify HTTP 200 returned instead of 403 Forbidden'
    ],
    component: 'src/api/routes/gates.ts',
    status: 'open',
    created_at: '2026-09-28T17:01:00Z'
  }
];

export const INITIAL_INSTRUCTIONS: AgentInstruction[] = [
  {
    id: 'inst-01',
    project_id: 'proj-ehi-001',
    instruction_type: 'coding_standard',
    content: 'All cargo waybill state transitions MUST emit an append-only audit record in waybill_events before acknowledging client responses. Never perform destructive updates on financial ledgers.',
    active: true,
    created_at: '2026-08-16T10:00:00Z'
  },
  {
    id: 'inst-02',
    project_id: 'proj-ehi-001',
    instruction_type: 'qa_policy',
    content: 'DOM-first testing is mandatory. Every pull request touching cargo intake must execute the zero-inference replay script (qa/replays/kano_intake.yaml) at 30x speed before merge.',
    active: true,
    created_at: '2026-08-18T14:00:00Z'
  },
  {
    id: 'inst-03',
    project_id: 'proj-ehi-001',
    instruction_type: 'cost_limit',
    content: 'Hard cap of $5.00 per individual autonomous feature task. If estimated token spend exceeds 80,000 tokens, request approval before spawning subagents.',
    active: true,
    created_at: '2026-08-20T09:30:00Z'
  },
  {
    id: 'inst-04',
    project_id: 'proj-ehi-001',
    instruction_type: 'deployment_rule',
    content: 'Do not deploy to Vercel production unless zero critical or high QA findings remain open in qa_findings.',
    active: true,
    created_at: '2026-08-22T11:15:00Z'
  }
];

export const INITIAL_WORKSPACE_FILES: FileNode[] = [
  {
    name: 'src',
    path: 'src',
    type: 'folder',
    children: [
      {
        name: 'modules',
        path: 'src/modules',
        type: 'folder',
        children: [
          {
            name: 'cargo',
            path: 'src/modules/cargo',
            type: 'folder',
            children: [
              {
                name: 'syncClient.ts',
                path: 'src/modules/cargo/syncClient.ts',
                type: 'file',
                language: 'typescript',
                content: `/**
 * EHI Cargo Logistics — Offline Hub Sync Client
 * Ensures offline hub waybill batches sync cleanly to central Supabase ledger
 */

export enum PaymentMode {
  CASH = 'CASH',
  POS = 'POS',
  DIRECT_TRANSFER = 'DIRECT_TRANSFER',
  DEBT_CLEARANCE = 'DEBT_CLEARANCE'
}

export interface HubIntakeEvent {
  waybill_id: string;
  hub_id: string;
  weight_kg: number;
  // Normalized: supports incoming receipt_mode or payment_mode
  payment_mode?: PaymentMode | string;
  receipt_mode?: PaymentMode | string;
  amount_ngn: number;
  timestamp: string;
}

export function parsePaymentMode(input: string): PaymentMode {
  const clean = input.toUpperCase().trim();
  if (clean in PaymentMode) {
    return clean as PaymentMode;
  }
  return PaymentMode.CASH;
}

export class CargoSyncClient {
  constructor(private supabaseUrl: string, private authToken: string) {}

  async processHubQueue(event: HubIntakeEvent): Promise<{ success: boolean; hash: string }> {
    const rawMode = event.payment_mode || event.receipt_mode;
    if (!rawMode) {
      throw new Error(\`Payment modality missing on hub waybill \${event.waybill_id}\`);
    }

    const mode = parsePaymentMode(String(rawMode));
    const idempotencyKey = \`sync_\${event.hub_id}_\${event.waybill_id}_\${event.timestamp}\`;

    console.log(\`[SyncClient] Committing waybill \${event.waybill_id} via \${mode} (Key: \${idempotencyKey})\`);

    return {
      success: true,
      hash: idempotencyKey
    };
  }
}
`
              },
              {
                name: 'waybillIntake.ts',
                path: 'src/modules/cargo/waybillIntake.ts',
                type: 'file',
                language: 'typescript',
                content: `export interface WaybillIntakeRequest {
  sender_name: string;
  sender_phone: string;
  receiver_name: string;
  destination_hub: 'KANO_HUB' | 'LAGOS_APAPA' | 'ABUJA_GATEWAY';
  pieces: number;
  declared_value_ngn: number;
}

export function validateWaybill(req: WaybillIntakeRequest): boolean {
  return req.pieces > 0 && req.declared_value_ngn >= 0 && Boolean(req.destination_hub);
}
`
              }
            ]
          }
        ]
      }
    ]
  },
  {
    name: 'qa',
    path: 'qa',
    type: 'folder',
    children: [
      {
        name: 'replays',
        path: 'qa/replays',
        type: 'folder',
        children: [
          {
            name: 'kano_intake.yaml',
            path: 'qa/replays/kano_intake.yaml',
            type: 'file',
            language: 'yaml',
            content: `# AetherOrch Autonomous QA Replay Script
# Generated via DOM-First Exploration Engine (Zero AI Inference Replay)
# Target: https://ehi-cargo-hub.vercel.app/cargo/intake
version: "2.4"
role: "hub_attendant_kano"
environment: "staging"
steps:
  - action: "navigate"
    url: "/cargo/intake"
    assert_status: 200
  - action: "type"
    target: "#input-waybill-id"
    value: "KB-8921-99"
  - action: "type"
    target: "#input-weight-kg"
    value: "42.5"
  - action: "click"
    target: "#select-destination"
    select_option: "KANO_HUB"
  - action: "click"
    target: "#payment-method-select"
    select_option: "CASH"
  - action: "click"
    target: "#btn-submit-intake"
    wait_for_selector: ".receipt-preview-banner"
    assert_text: "Waybill Staged for Dispatch"
`
          }
        ]
      }
    ]
  },
  {
    name: 'supabase',
    path: 'supabase',
    type: 'folder',
    children: [
      {
        name: 'migrations',
        path: 'supabase/migrations',
        type: 'folder',
        children: [
          {
            name: '20260928_init_orchestrator.sql',
            path: 'supabase/migrations/20260928_init_orchestrator.sql',
            type: 'file',
            language: 'sql',
            content: `-- Supabase Migration Phase 1
-- Tables: project_registry, agent_tasks, agent_results, cost_events, qa_runs, qa_findings, agent_instructions
-- Enabled Realtime on agent_tasks, qa_runs, cost_events
`
          }
        ]
      }
    ]
  },
  {
    name: 'package.json',
    path: 'package.json',
    type: 'file',
    language: 'json',
    content: `{
  "name": "@ehi/cargo-platform",
  "version": "2.4.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "qa:replay": "aether-qa replay --file qa/replays/kano_intake.yaml --speed 30x",
    "test": "vitest run"
  }
}`
  }
];

export const INITIAL_ORGANIZATIONS: Organization[] = [
  {
    id: 'org-geo-001',
    name: 'Geosan Operations Group',
    slug: 'geosan',
    plan: 'internal',
    created_at: '2026-06-01T00:00:00Z'
  },
  {
    id: 'org-client-002',
    name: 'EHI Global Holdings Ltd',
    slug: 'ehi-multisystems',
    plan: 'client',
    created_at: '2026-07-15T00:00:00Z'
  }
];

export const INITIAL_TASK_DEPENDENCIES: TaskDependency[] = [
  {
    id: 'dep-001',
    task_id: 'task-ehi-901',
    depends_on_task_id: 'task-ehi-902',
    condition: 'completed',
    created_at: '2026-09-28T15:10:30Z'
  }
];

export const INITIAL_AGENT_TRACES: AgentTrace[] = [
  {
    id: 'tr-01',
    task_id: 'task-ehi-901',
    step_number: 1,
    trace_type: 'model_call',
    tool_name: 'gemini_3.5_generateContent',
    server_name: 'antigravity-harness',
    duration_ms: 1240,
    metadata: { tokens_in: 12400, tokens_out: 1850 },
    created_at: '2026-09-28T15:11:30Z'
  },
  {
    id: 'tr-02',
    task_id: 'task-ehi-901',
    step_number: 2,
    trace_type: 'mcp_tool_call',
    tool_name: 'git_patch_apply',
    server_name: 'workspace-mcp',
    duration_ms: 380,
    metadata: { file: 'src/modules/cargo/syncClient.ts', insertions: 14, deletions: 4 },
    created_at: '2026-09-28T15:14:10Z'
  },
  {
    id: 'tr-03',
    task_id: 'task-ehi-901',
    step_number: 3,
    trace_type: 'adk_call',
    tool_name: 'comber_headless_crawl',
    server_name: 'comber-mcp',
    duration_ms: 2480,
    metadata: { asserts_passed: 14, http_status: 200 },
    created_at: '2026-09-28T15:16:45Z'
  },
  {
    id: 'tr-04',
    task_id: 'task-ehi-901',
    step_number: 4,
    trace_type: 'a2a_delegation',
    tool_name: 'claude_critic_review',
    server_name: 'reviewer-agent-daemon',
    duration_ms: 1940,
    metadata: { reviewer_verdict: 'approved', invariants_checked: ['rls_org_isolation', 'idempotent_key'] },
    created_at: '2026-09-28T15:18:00Z'
  }
];

export const INITIAL_PROMPT_VERSIONS: PromptVersion[] = [
  {
    id: 'pv-01',
    agent_name: 'coding',
    version: 4,
    content: 'You are an autonomous senior software engineer. Enforce backward compatibility, schema migrations, and idempotent locks.',
    notes: 'Added strict RLS org_id parameterization and Vault secret binding.',
    active: true,
    created_at: '2026-09-20T10:00:00Z'
  },
  {
    id: 'pv-02',
    agent_name: 'qa',
    version: 3,
    content: 'DOM-first autonomous tester. Parse accessibility tree (AXTree) nodes before falling back to multimodal screenshots.',
    notes: 'Integrated 30x zero-token headless replay script generator.',
    active: true,
    created_at: '2026-09-22T14:30:00Z'
  },
  {
    id: 'pv-03',
    agent_name: 'review',
    version: 2,
    content: 'Adversarial code reviewer. Verify zero unhandled promise rejections, tenant isolation, and SQL transaction invariants.',
    notes: 'Added Claude Sonnet 4 review pass standards.',
    active: true,
    created_at: '2026-09-25T08:00:00Z'
  }
];

export const INITIAL_PROJECT_BUDGETS: ProjectBudget[] = [
  {
    id: 'bud-01',
    project_id: 'proj-ehi-001',
    monthly_limit_usd: 150.00,
    alert_threshold_pct: 80,
    hard_stop: true,
    period_start: '2026-09-01T00:00:00Z',
    current_spend_usd: 48.65
  },
  {
    id: 'bud-02',
    project_id: 'proj-iya-002',
    monthly_limit_usd: 100.00,
    alert_threshold_pct: 85,
    hard_stop: false,
    period_start: '2026-09-01T00:00:00Z',
    current_spend_usd: 19.32
  },
  {
    id: 'bud-03',
    project_id: 'proj-aero-003',
    monthly_limit_usd: 250.00,
    alert_threshold_pct: 75,
    hard_stop: true,
    period_start: '2026-09-01T00:00:00Z',
    current_spend_usd: 34.18
  },
  {
    id: 'bud-04',
    project_id: 'proj-edge-004',
    monthly_limit_usd: 500.00,
    alert_threshold_pct: 90,
    hard_stop: true,
    period_start: '2026-09-01T00:00:00Z',
    current_spend_usd: 142.80
  }
];

export const INITIAL_APP_HEALTH_CHECKS: AppHealthCheck[] = [
  {
    id: 'hc-01',
    project_id: 'proj-ehi-001',
    url: 'https://ehi-cargo-hub.vercel.app/api/health',
    expected_status: 200,
    check_interval_seconds: 60,
    last_check_at: '2026-09-28T17:34:00Z',
    last_status: 200,
    last_latency_ms: 124,
    consecutive_failures: 0,
    enabled: true
  },
  {
    id: 'hc-02',
    project_id: 'proj-iya-002',
    url: 'https://iyanu-agro.vercel.app/healthz',
    expected_status: 200,
    check_interval_seconds: 300,
    last_check_at: '2026-09-28T17:30:00Z',
    last_status: 200,
    last_latency_ms: 88,
    consecutive_failures: 0,
    enabled: true
  },
  {
    id: 'hc-03',
    project_id: 'proj-aero-003',
    url: 'https://aeroops-dispatch.vercel.app/api/ping',
    expected_status: 200,
    check_interval_seconds: 120,
    last_check_at: '2026-09-28T17:33:00Z',
    last_status: 200,
    last_latency_ms: 210,
    consecutive_failures: 0,
    enabled: true
  },
  {
    id: 'hc-04',
    project_id: 'proj-edge-004',
    url: 'https://edgepoint-treasury.vercel.app/status',
    expected_status: 200,
    check_interval_seconds: 60,
    last_check_at: '2026-09-28T17:35:00Z',
    last_status: 200,
    last_latency_ms: 95,
    consecutive_failures: 0,
    enabled: true
  }
];

export const INITIAL_NOTIFICATIONS: NotificationAlert[] = [
  {
    id: 'notif-01',
    org_id: 'org-geo-001',
    project_id: 'proj-ehi-001',
    task_id: 'task-ehi-901',
    severity: 'warning' as const,
    title: 'Approval Required: Kano Hub Sync Fix',
    body: 'Antigravity agent has generated a verified patch for receipt_mode vs payment_mode. Invariant checks passed.',
    category: 'approval_needed' as const,
    read: false,
    created_at: '2026-09-28T15:18:10Z'
  },
  {
    id: 'notif-02',
    org_id: 'org-geo-001',
    project_id: 'proj-ehi-001',
    severity: 'critical' as const,
    title: 'QA Finding: Offline Sync Mode Divergence',
    body: 'Kano Hub intake form serializes receipt_mode instead of payment_mode, stranding waybills.',
    category: 'qa_finding' as const,
    read: false,
    created_at: '2026-09-28T13:46:10Z'
  },
  {
    id: 'notif-03',
    org_id: 'org-geo-001',
    project_id: 'proj-edge-004',
    severity: 'info' as const,
    title: 'Deployment Complete: Settlement Netting Engine',
    body: 'Vercel production build deployed with bilateral cycle netting algorithm.',
    category: 'deploy_done' as const,
    read: true,
    created_at: '2026-09-27T10:25:00Z'
  }
];
