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

/**
 * Clean Platform Registry: 4 Core Client Verticals
 */
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
    updated_at: '2026-10-03T08:00:00Z',
    agent_instructions: 'Strict financial invariant testing required. Never push to main branch without ReviewAgent signoff and 100% test pass on settlement reconciliations.',
    monthly_budget_usd: 1200.0,
    health_status: 'healthy',
    uptime_pct: 99.98,
    last_activity_at: '2026-10-03T08:00:00Z'
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
    updated_at: '2026-10-03T08:00:00Z',
    agent_instructions: 'Offline-first sync for refinery scale-house tablets. Validate Bluetooth weight-bridge driver parity on mobile builds.',
    monthly_budget_usd: 800.0,
    health_status: 'healthy',
    uptime_pct: 99.92,
    last_activity_at: '2026-10-03T08:00:00Z'
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
    updated_at: '2026-10-03T08:00:00Z',
    agent_instructions: 'Strict FAA part 121 compliance audit. All pilot signature flows must be signed with RSA hardware certs.',
    monthly_budget_usd: 1500.0,
    health_status: 'healthy',
    uptime_pct: 99.85,
    last_activity_at: '2026-10-03T08:00:00Z'
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
    updated_at: '2026-10-03T08:00:00Z',
    agent_instructions: 'MQTT message latency under 45ms. Synthetic health pings running every 60s via pg_net.',
    monthly_budget_usd: 600.0,
    health_status: 'healthy',
    uptime_pct: 99.99,
    last_activity_at: '2026-10-03T08:00:00Z'
  }
];

/**
 * All simulated demo tasks have been removed.
 * Operational tasks are created and persisted dynamically.
 */
export const MOCK_TASKS: AgentTask[] = [];

/**
 * All simulated demo cost events have been removed.
 * Real telemetry events are recorded upon dispatch.
 */
export const MOCK_COST_EVENTS: CostEvent[] = [];

/**
 * All simulated demo QA runs have been removed.
 */
export const MOCK_QA_RUNS: QARun[] = [];

/**
 * All simulated demo QA findings have been removed.
 */
export const MOCK_QA_FINDINGS: QAFinding[] = [];

/**
 * Initial Project Budgets
 */
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
    hard_stop: true
  },
  {
    project_id: 'proj-aviation-003',
    monthly_limit_usd: 1500.0,
    alert_threshold_pct: 80,
    hard_stop: true
  },
  {
    project_id: 'proj-edgepoint-004',
    monthly_limit_usd: 600.0,
    alert_threshold_pct: 80,
    hard_stop: true
  }
];

/**
 * System Governance Prompt Invariants
 */
export const MOCK_PROMPT_VERSIONS: PromptVersion[] = [
  {
    id: 'pv-01',
    role: 'CodingAgent',
    version: 4,
    system_instruction:
      'You are a senior full-stack engineer operating inside an isolated git worktree. You write clean TypeScript, maintain invariants, and never push secrets.',
    created_at: '2026-09-20T00:00:00Z',
    changelog: 'Added strict RLS policy checking and automated tsx test assertion verification',
    is_active: true
  },
  {
    id: 'pv-02',
    role: 'QAAgent',
    version: 2,
    system_instruction:
      'You are an adversarial security & QA engineer. You execute targeted crawls, replay regression fixtures, and audit multi-tenant boundaries.',
    created_at: '2026-09-18T00:00:00Z',
    changelog: 'Added simulated mobile viewport crawls and network-throttle emulation',
    is_active: true
  },
  {
    id: 'pv-03',
    role: 'ReviewAgent',
    version: 3,
    system_instruction:
      'You are an adversarial architectural reviewer. You diff every PR against production schemas and verify zero foreign key regressions.',
    created_at: '2026-09-22T00:00:00Z',
    changelog: 'Added automated budget impact estimation before PR sign-off',
    is_active: true
  },
  {
    id: 'pv-04',
    role: 'DeployAgent',
    version: 1,
    system_instruction:
      'You manage Vercel preview environments and production promotions. You run health probes and rollback on p95 latency spikes.',
    created_at: '2026-09-15T00:00:00Z',
    changelog: 'Initial automated deployment agent configuration',
    is_active: true
  }
];

/**
 * All simulated demo conversations and chat messages have been removed.
 */
export const MOCK_CONVERSATIONS: Conversation[] = [];
export const MOCK_CHAT_MESSAGES: ChatMessage[] = [];
