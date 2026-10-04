/**
 * Demo Session Fixtures
 *
 * Provides realistic, clean session data for AetherOrch:
 * - One running task ('Working') and one awaiting-approval task ('Approve plan') on demo project 'proj-ehi-001'
 * - Complete chronological worklog events: plan, edit (3 files), shell (2 commands), qa (1 finding), approval (1 wait)
 * - Read-only shell commands (e.g. `npm run lint`, `git status --short`) with zero secret leakage
 * - Task threads with numbered plan steps and status dots
 */

import { AgentTask, QAFinding } from '../lib/types';

export interface SessionPlanStep {
  number: number;
  text: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  notes?: string;
}

export type WorklogType = 'plan' | 'edit' | 'shell' | 'qa' | 'approval' | 'pr';

export interface WorklogItem {
  id: string;
  taskId: string;
  timestamp: string; // Mono ISO or display
  type: WorklogType;
  summary: string;
  payload?: {
    command?: string;
    output?: string;
    filePath?: string;
    diff?: { before: string; after: string };
    steps?: SessionPlanStep[];
    finding?: {
      severity: 'critical' | 'high' | 'medium' | 'low';
      title: string;
      description?: string;
      component?: string;
    };
    prUrl?: string;
    branch?: string;
    notes?: string;
    approvedBy?: string;
  };
}

export interface SessionDiffFile {
  path: string;
  status: 'added' | 'modified' | 'deleted';
  additions: number;
  deletions: number;
  before: string;
  after: string;
}

export interface SessionMessage {
  id: string;
  taskId: string;
  role: 'user' | 'agent';
  author: string;
  timestamp: string;
  text: string;
  isPlan?: boolean;
  planSteps?: SessionPlanStep[];
}

/**
 * 1. Demo Tasks
 */
export const DEMO_SESSION_TASKS: AgentTask[] = [
  {
    id: 'task-session-running-01',
    org_id: 'org-ehi-global',
    project_id: 'proj-ehi-001',
    parent_task_id: null,
    task_type: 'BUILD_FEATURE',
    prompt: 'Implement bilateral netting engine for Kano Hub settlement\nEnsure strict integer arithmetic for kobo precision and generate verifiable settlement receipts.',
    status: 'running',
    assigned_agent: 'FullStackAgent',
    plan: {
      summary: 'Bilateral netting engine with atomic transaction and kobo integer math',
      steps_count: 4,
      model: 'deepseek-r1'
    },
    result: {
      changed_files: [
        'src/settlement/bilateralNetting.ts',
        'src/api/routes/settle.ts',
        'test/settlementNetting.spec.ts'
      ]
    },
    branch_name: 'feat/kano-netting-engine',
    pr_url: null,
    cost_usd: 0.142,
    created_at: '2026-10-04T07:15:00Z',
    started_at: '2026-10-04T07:15:08Z',
    completed_at: null
  },
  {
    id: 'task-session-approval-02',
    org_id: 'org-ehi-global',
    project_id: 'proj-ehi-001',
    parent_task_id: null,
    task_type: 'PLAN',
    prompt: 'Audit and patch floating-point arithmetic across fee settlement ledger\nMigrate legacy IEEE-754 calculations to BigInt micro-units.',
    status: 'awaiting_approval',
    assigned_agent: 'ArchitectAgent',
    plan: {
      summary: 'Replace all floating point multiplication with integer micro-kobo currency representation across 4 ledger modules.',
      model: 'claude-3-7-sonnet',
      files_to_touch: 4
    },
    result: null,
    branch_name: 'fix/ledger-micro-units',
    pr_url: 'https://github.com/ehi-enterprise/ledger-core/pull/142',
    cost_usd: 0.048,
    created_at: '2026-10-04T07:30:00Z',
    started_at: '2026-10-04T07:30:04Z',
    completed_at: null
  },
  {
    id: 'task-session-queued-03',
    org_id: 'org-ehi-global',
    project_id: 'proj-ehi-001',
    parent_task_id: 'task-session-approval-02',
    task_type: 'FIX_BUG',
    prompt: 'Execute integer currency migration in src/settlement/ledgerNetting.ts and verify against test suite',
    status: 'queued',
    assigned_agent: 'CodingAgent',
    plan: null,
    result: null,
    branch_name: 'fix/ledger-micro-units',
    pr_url: null,
    cost_usd: 0.0,
    created_at: '2026-10-04T07:35:00Z',
    started_at: null,
    completed_at: null
  },
  {
    id: 'task-session-proposed-04',
    org_id: 'org-ehi-global',
    project_id: 'proj-iyanu-002',
    parent_task_id: null,
    task_type: 'PLAN',
    prompt: 'Add offline outbox queue for weighbridge truck tickets\nSupport 4-hour satellite internet blackout without dropping intake weights.',
    status: 'proposed',
    assigned_agent: 'HardwareEdgeAgent',
    plan: null,
    result: null,
    branch_name: null,
    pr_url: null,
    cost_usd: 0.0,
    created_at: '2026-10-04T07:40:00Z',
    started_at: null,
    completed_at: null
  },
  {
    id: 'task-session-blocked-05',
    org_id: 'org-ehi-global',
    project_id: 'proj-aviation-003',
    parent_task_id: null,
    task_type: 'QA_SECURITY',
    prompt: 'Validate RSA-4096 cryptographic signature envelope on captain pilot logs\nMissing staging certificate key from Flight Operations authority.',
    status: 'blocked',
    assigned_agent: 'SecurityAuditorAgent',
    plan: { reason: 'Blocked waiting on authority RSA root certificate' },
    result: null,
    branch_name: 'audit/faa-rsa-cert',
    pr_url: null,
    cost_usd: 0.021,
    created_at: '2026-10-04T06:20:00Z',
    started_at: '2026-10-04T06:20:10Z',
    completed_at: null
  },
  {
    id: 'task-session-done-06',
    org_id: 'org-ehi-global',
    project_id: 'proj-edgepoint-004',
    parent_task_id: null,
    task_type: 'BUILD_FEATURE',
    prompt: 'Implement sub-45ms MQTT binary frame ingestion parser for edge telemetry nodes',
    status: 'done',
    assigned_agent: 'FullStackAgent',
    plan: { summary: 'Zero-copy binary buffer slicing for MQTT payload' },
    result: { summary: 'Merged and passing 100% throughput benchmarks' },
    branch_name: 'feat/mqtt-zero-copy',
    pr_url: 'https://github.com/edgepoint-mesh/sensor-daemon/pull/88',
    cost_usd: 0.185,
    created_at: '2026-10-04T05:00:00Z',
    started_at: '2026-10-04T05:00:15Z',
    completed_at: '2026-10-04T05:22:40Z'
  },
  {
    id: 'task-session-failed-07',
    org_id: 'org-ehi-global',
    project_id: 'proj-ehi-001',
    parent_task_id: null,
    task_type: 'FIX_BUG',
    prompt: 'Attempt automated upgrade of legacy bcrypt library across microservices',
    status: 'failed',
    assigned_agent: 'CodingAgent',
    plan: null,
    result: { error: 'Native binding compilation mismatch on musl target' },
    branch_name: 'chore/bcrypt-upgrade',
    pr_url: null,
    cost_usd: 0.035,
    created_at: '2026-10-04T04:10:00Z',
    started_at: '2026-10-04T04:10:10Z',
    completed_at: '2026-10-04T04:14:20Z'
  },
  {
    id: 'task-session-cancelled-08',
    org_id: 'org-ehi-global',
    project_id: 'proj-iyanu-002',
    parent_task_id: null,
    task_type: 'DEPLOY',
    prompt: 'Deploy experimental Bluetooth scale simulator to staging tablet fleet',
    status: 'cancelled',
    assigned_agent: 'DeployAgent',
    plan: null,
    result: { reason: 'Operator aborted due to maintenance window shift' },
    branch_name: 'deploy/bt-sim-staging',
    pr_url: null,
    cost_usd: 0.008,
    created_at: '2026-10-04T03:30:00Z',
    started_at: '2026-10-04T03:30:05Z',
    completed_at: '2026-10-04T03:32:00Z'
  }
];

/**
 * 2. Worklog Events for the Running Task
 * Meets exact prompt requirements:
 * "Events include a plan, three file edits, two shell commands, one QA finding, one approval wait. Shell commands are illustrative strings such as `npm run lint`."
 */
export const DEMO_WORKLOG_RUNNING: WorklogItem[] = [
  {
    id: 'wl-01',
    taskId: 'task-session-running-01',
    timestamp: '07:15:12',
    type: 'plan',
    summary: 'Plan generated: 4 steps to implement kobo-precision netting engine',
    payload: {
      steps: [
        {
          number: 1,
          text: 'Define bilateral netting state schema and integer arithmetic invariants',
          status: 'done',
          notes: 'BigInt micro-unit precision prevents floating-point drift'
        },
        {
          number: 2,
          text: 'Implement idempotent POST /api/settle handler with row locks',
          status: 'done',
          notes: 'Requires RFC-4122 v4 idempotency token'
        },
        {
          number: 3,
          text: 'Execute deterministic lint and contract tests on settlement calculations',
          status: 'running',
          notes: 'Running npm run lint and vitest suite'
        },
        {
          number: 4,
          text: 'Push branch and generate pull request for operator review',
          status: 'pending',
          notes: 'Pre-flight checks passing'
        }
      ]
    }
  },
  {
    id: 'wl-02',
    taskId: 'task-session-running-01',
    timestamp: '07:15:40',
    type: 'shell',
    summary: 'git checkout -b feat/kano-netting-engine',
    payload: {
      command: 'git checkout -b feat/kano-netting-engine',
      output: `Switched to a new branch 'feat/kano-netting-engine'
M  src/settlement/bilateralNetting.ts
Already on 'feat/kano-netting-engine'`
    }
  },
  {
    id: 'wl-03',
    taskId: 'task-session-running-01',
    timestamp: '07:16:15',
    type: 'edit',
    summary: 'Created src/settlement/bilateralNetting.ts with BigInt micro-unit math',
    payload: {
      filePath: 'src/settlement/bilateralNetting.ts',
      diff: {
        before: `// TODO: implement bilateral netting\nexport function calculateNetting() {\n  return 0;\n}`,
        after: `export interface NettingResult {\n  grossKobo: bigint;\n  netKobo: bigint;\n  feeKobo: bigint;\n}\n\nexport function calculateBilateralNetting(consignments: { amountKobo: bigint }[], feeBps: number): NettingResult {\n  const gross = consignments.reduce((acc, c) => acc + c.amountKobo, 0n);\n  const fee = (gross * BigInt(feeBps)) / 10000n;\n  const net = gross - fee;\n  return { grossKobo: gross, netKobo: net, feeKobo: fee };\n}`
      }
    }
  },
  {
    id: 'wl-04',
    taskId: 'task-session-running-01',
    timestamp: '07:17:02',
    type: 'edit',
    summary: 'Updated src/api/routes/settle.ts with RFC-4122 idempotency locking',
    payload: {
      filePath: 'src/api/routes/settle.ts',
      diff: {
        before: `- const { hubId, amount } = req.body;\n- await db.insert(settlements).values({ hubId, amount });`,
        after: `+ const idempotencyKey = req.headers['idempotency-key'] as string;\n+ if (!idempotencyKey) {\n+   return res.status(400).json({ error: 'Missing Idempotency-Key header' });\n+ }\n+ await db.transaction(async (tx) => {\n+   await tx.insert(settlements).values({ hubId, amountKobo: BigInt(amount), idempotencyKey });\n+ });`
      }
    }
  },
  {
    id: 'wl-05',
    taskId: 'task-session-running-01',
    timestamp: '07:17:45',
    type: 'edit',
    summary: 'Added invariant unit tests in test/settlementNetting.spec.ts',
    payload: {
      filePath: 'test/settlementNetting.spec.ts',
      diff: {
        before: `// Test suite stub`,
        after: `import { describe, it, expect } from 'vitest';\nimport { calculateBilateralNetting } from '../src/settlement/bilateralNetting';\n\ndescribe('Bilateral Netting Invariants', () => {\n  it('guarantees zero rounding drift on fractional splits', () => {\n    const res = calculateBilateralNetting([{ amountKobo: 1000000n }], 175);\n    expect(res.feeKobo).toBe(17500n);\n    expect(res.netKobo).toBe(982500n);\n  });\n});`
      }
    }
  },
  {
    id: 'wl-06',
    taskId: 'task-session-running-01',
    timestamp: '07:18:20',
    type: 'shell',
    summary: 'npm run lint',
    payload: {
      command: 'npm run lint',
      output: `> react-example@0.0.0 lint
> tsc --noEmit

✔ All TypeScript diagnostics clean. 0 syntax or type errors. (1.42s)`
    }
  },
  {
    id: 'wl-07',
    taskId: 'task-session-running-01',
    timestamp: '07:18:55',
    type: 'qa',
    summary: 'QA crawl detected 1 non-blocking response header warning on /api/settle',
    payload: {
      finding: {
        severity: 'low',
        title: 'Settlement endpoint missing RateLimit-Reset header',
        description: 'Endpoint responds within 18ms SLA but omitted standard RFC-6585 rate limiting header.',
        component: 'src/api/routes/settle.ts'
      }
    }
  },
  {
    id: 'wl-08',
    taskId: 'task-session-running-01',
    timestamp: '07:19:10',
    type: 'approval',
    summary: 'Pre-flight budget & security checks approved automatically; continuing run',
    payload: {
      notes: 'Task runs within approved $1,200 monthly tier limit. Model cost $0.142 logged.',
      approvedBy: 'AutoSupervisor'
    }
  }
];

/**
 * 3. Worklog Events for the Awaiting-Approval Task
 */
export const DEMO_WORKLOG_APPROVAL: WorklogItem[] = [
  {
    id: 'wl-appr-01',
    taskId: 'task-session-approval-02',
    timestamp: '07:30:15',
    type: 'plan',
    summary: 'Plan generated: 3 architectural steps to eliminate float math from ledger',
    payload: {
      steps: [
        {
          number: 1,
          text: 'Replace Number(amount) * rate with BigInt micro-kobo in settlement calculations',
          status: 'pending',
          notes: 'Prevents rounding drift on high-volume terminal settlements'
        },
        {
          number: 2,
          text: 'Add database migration with CHECK (gross_kobo >= 0) constraint',
          status: 'pending',
          notes: 'Ensures schema-level invariant enforcement'
        },
        {
          number: 3,
          text: 'Run 10,000 synthetic Monte Carlo reconciliation replays to prove zero delta',
          status: 'pending',
          notes: 'Verifies parity with bank settlement statements'
        }
      ]
    }
  },
  {
    id: 'wl-appr-02',
    taskId: 'task-session-approval-02',
    timestamp: '07:30:45',
    type: 'approval',
    summary: 'Awaiting operator approval to proceed with financial schema modifications',
    payload: {
      notes: 'Requires human operator signoff because financial invariants and ledger schema migrations will be modified.',
      prUrl: 'https://github.com/ehi-enterprise/ledger-core/pull/142',
      branch: 'fix/ledger-micro-units'
    }
  }
];

/**
 * 4. Thread Messages
 */
export const DEMO_SESSION_MESSAGES: Record<string, SessionMessage[]> = {
  'task-session-running-01': [
    {
      id: 'msg-01',
      taskId: 'task-session-running-01',
      role: 'user',
      author: 'Operator (geoflashsanni@gmail.com)',
      timestamp: '07:15:00',
      text: 'Implement bilateral netting engine for Kano Hub settlement. Ensure strict integer arithmetic for kobo precision and generate verifiable settlement receipts.'
    },
    {
      id: 'msg-02',
      taskId: 'task-session-running-01',
      role: 'agent',
      author: 'FullStackAgent',
      timestamp: '07:15:15',
      text: 'I have formulated the implementation plan. Decomposing the netting logic into atomic transactions with BigInt micro-unit math to satisfy EHI financial invariants.',
      isPlan: true,
      planSteps: [
        {
          number: 1,
          text: 'Define bilateral netting state schema and integer arithmetic invariants',
          status: 'done'
        },
        {
          number: 2,
          text: 'Implement idempotent POST /api/settle handler with row locks',
          status: 'done'
        },
        {
          number: 3,
          text: 'Execute deterministic lint and contract tests on settlement calculations',
          status: 'running'
        },
        {
          number: 4,
          text: 'Push branch and generate pull request for operator review',
          status: 'pending'
        }
      ]
    },
    {
      id: 'msg-03',
      taskId: 'task-session-running-01',
      role: 'agent',
      author: 'FullStackAgent',
      timestamp: '07:17:50',
      text: 'Created `src/settlement/bilateralNetting.ts` and added idempotent route locking. Currently running `npm run lint` and verifying no type regressions.'
    }
  ],
  'task-session-approval-02': [
    {
      id: 'msg-appr-01',
      taskId: 'task-session-approval-02',
      role: 'user',
      author: 'Operator (geoflashsanni@gmail.com)',
      timestamp: '07:30:00',
      text: 'Audit and patch floating-point arithmetic across fee settlement ledger. Migrate legacy IEEE-754 calculations to BigInt micro-units.'
    },
    {
      id: 'msg-appr-02',
      taskId: 'task-session-approval-02',
      role: 'agent',
      author: 'ArchitectAgent',
      timestamp: '07:30:18',
      text: 'Architectural audit complete. I identified 4 legacy modules performing floating-point division on fiat balances. Proposed 3-step remediation plan below. Awaiting your approval before executing mutations.',
      isPlan: true,
      planSteps: [
        {
          number: 1,
          text: 'Replace Number(amount) * rate with BigInt micro-kobo in settlement calculations',
          status: 'pending'
        },
        {
          number: 2,
          text: 'Add database migration with CHECK (gross_kobo >= 0) constraint',
          status: 'pending'
        },
        {
          number: 3,
          text: 'Run 10,000 synthetic Monte Carlo reconciliation replays to prove zero delta',
          status: 'pending'
        }
      ]
    }
  ]
};

/**
 * 5. Diff Fixtures for Diff Tab
 */
export const DEMO_SESSION_DIFFS: Record<string, SessionDiffFile[]> = {
  'task-session-running-01': [
    {
      path: 'src/settlement/bilateralNetting.ts',
      status: 'added',
      additions: 38,
      deletions: 0,
      before: `// (New file)`,
      after: `export interface NettingResult {
  grossKobo: bigint;
  netKobo: bigint;
  feeKobo: bigint;
}

export function calculateBilateralNetting(
  consignments: { amountKobo: bigint }[],
  feeBps: number
): NettingResult {
  const gross = consignments.reduce((acc, c) => acc + c.amountKobo, 0n);
  const fee = (gross * BigInt(feeBps)) / 10000n;
  const net = gross - fee;
  return { grossKobo: gross, netKobo: net, feeKobo: fee };
}`
    },
    {
      path: 'src/api/routes/settle.ts',
      status: 'modified',
      additions: 14,
      deletions: 4,
      before: `const { hubId, amount } = req.body;
await db.insert(settlements).values({ hubId, amount });
return res.json({ success: true });`,
      after: `const idempotencyKey = req.headers['idempotency-key'] as string;
if (!idempotencyKey) {
  return res.status(400).json({ error: 'Missing Idempotency-Key header' });
}
await db.transaction(async (tx) => {
  await tx.insert(settlements).values({
    hubId,
    amountKobo: BigInt(amount),
    idempotencyKey
  });
});
return res.json({ success: true, idempotencyKey });`
    },
    {
      path: 'test/settlementNetting.spec.ts',
      status: 'added',
      additions: 22,
      deletions: 0,
      before: `// (New test file)`,
      after: `import { describe, it, expect } from 'vitest';
import { calculateBilateralNetting } from '../src/settlement/bilateralNetting';

describe('Bilateral Netting Invariants', () => {
  it('guarantees zero rounding drift on fractional splits', () => {
    const res = calculateBilateralNetting([{ amountKobo: 1000000n }], 175);
    expect(res.feeKobo).toBe(17500n);
    expect(res.netKobo).toBe(982500n);
  });
});`
    }
  ],
  'task-session-approval-02': [
    {
      path: 'src/settlement/ledgerNetting.ts',
      status: 'modified',
      additions: 12,
      deletions: 6,
      before: `export function calculateNettingFee(grossCargoNgn: number, feePercent: number): number {
  const fee = grossCargoNgn * (feePercent / 100);
  return Math.round(fee * 100) / 100;
}`,
      after: `// Fixed: Integer micro-kobo precision (1 NGN = 100 Kobo = 10,000 Micro-Units)
export function calculateNettingFee(grossCargoNgn: number, feePercent: number): number {
  const grossMicro = BigInt(Math.round(grossCargoNgn * 10000));
  const feeMicro = (grossMicro * BigInt(Math.round(feePercent * 100))) / 10000n;
  return Number(feeMicro) / 10000;
}`
    }
  ]
};

/**
 * 6. QA Findings for QA Tab
 */
export const DEMO_SESSION_QA_FINDINGS: Record<string, QAFinding[]> = {
  'task-session-running-01': [
    {
      id: 'qa-finding-session-01',
      run_id: 'qa-run-mock-01',
      severity: 'low',
      title: 'Settlement endpoint missing RateLimit-Reset header',
      description: 'The endpoint handles high-throughput bursts but omits RateLimit-Reset header.',
      component: 'src/api/routes/settle.ts',
      screenshot_url: null,
      reproduction_steps: ['POST /api/settle with valid payload', 'Inspect response headers'],
      status: 'open',
      created_at: '2026-10-04T07:18:55Z'
    }
  ],
  'task-session-approval-02': [
    {
      id: 'qa-finding-session-02',
      run_id: 'qa-run-mock-02',
      severity: 'critical',
      title: 'IEEE-754 floating-point drift detected in ledger batch reconciliation',
      description: 'Sum of fractional fees across 1,000 transactions drifts by ₦0.04 compared to integer bank clearing.',
      component: 'src/settlement/ledgerNetting.ts',
      screenshot_url: null,
      reproduction_steps: ['Run 1,000 batch transactions with ₦145.33 amounts', 'Compare sum to bank ledger'],
      status: 'in_progress',
      created_at: '2026-10-04T07:25:00Z'
    }
  ]
};
