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
 * No built-in projects: the four placeholder client projects were removed
 * until real ones are added.
 */
export const MOCK_PROJECTS: Project[] = [];

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

/** No built-in projects, so no budgets. */
export const MOCK_PROJECT_BUDGETS: ProjectBudget[] = [];

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
