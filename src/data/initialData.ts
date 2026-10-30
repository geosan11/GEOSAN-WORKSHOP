import {
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
  },
  {
    provider: 'deepseek',
    model: 'deepseek-r1',
    input_per_million: 0.55,
    output_per_million: 2.19,
    context_window: '128k tokens',
    best_for: 'Open reasoning, mathematical invariant validation, deep code analysis'
  },
  {
    provider: 'deepseek',
    model: 'deepseek-v3',
    input_per_million: 0.14,
    output_per_million: 0.28,
    context_window: '64k tokens',
    best_for: 'High-throughput code synthesis, repo tree refactoring, budget efficiency'
  },
  {
    provider: 'kimi',
    model: 'kimi-k1.5',
    input_per_million: 0.60,
    output_per_million: 2.40,
    context_window: '256k tokens',
    best_for: 'Massive context multimodal reasoning, cross-repo dependency indexing'
  },
  {
    provider: 'kimi',
    model: 'kimi-chat',
    input_per_million: 0.40,
    output_per_million: 1.60,
    context_window: '128k tokens',
    best_for: 'Context-heavy instruction following, rapid turnaround verification'
  }
];

// There are no built-in client projects (the placeholder projects were removed).

/** Empty: the placeholder client projects were removed (no built-in projects). */
export const INITIAL_TASKS: AgentTask[] = [];

/** Empty: the placeholder client projects were removed (no built-in projects). */
export const INITIAL_RESULTS: AgentResult[] = [];

/** Empty: the placeholder client projects were removed (no built-in projects). */
export const INITIAL_COST_EVENTS: CostEvent[] = [];

/** Empty: the placeholder client projects were removed (no built-in projects). */
export const INITIAL_QA_RUNS: QARun[] = [];

/** Empty: the placeholder client projects were removed (no built-in projects). */
export const INITIAL_QA_FINDINGS: QAFinding[] = [];

/** Empty: the placeholder client projects were removed (no built-in projects). */
export const INITIAL_INSTRUCTIONS: AgentInstruction[] = [];

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

/** Empty: the only entry was the removed placeholder client (EHI). */
export const INITIAL_ORGANIZATIONS: Organization[] = [];

/** Empty: the placeholder client projects were removed (no built-in projects). */
export const INITIAL_TASK_DEPENDENCIES: TaskDependency[] = [];

/** Empty: the placeholder client projects were removed (no built-in projects). */
export const INITIAL_AGENT_TRACES: AgentTrace[] = [];

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

/** Empty: the placeholder client projects were removed (no built-in projects). */
export const INITIAL_PROJECT_BUDGETS: ProjectBudget[] = [];

/** Empty: the placeholder client projects were removed (no built-in projects). */
export const INITIAL_APP_HEALTH_CHECKS: AppHealthCheck[] = [];

/** Empty: the placeholder client projects were removed (no built-in projects). */
export const INITIAL_NOTIFICATIONS: NotificationAlert[] = [];
