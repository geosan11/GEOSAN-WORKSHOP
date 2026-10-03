/**
 * LLM Learning Vault & Post-Mortem Knowledge Store
 *
 * Stores all historical engineering processes, anomalies, root causes, verified fixes,
 * and invariant rules across projects. Provides structured export formats (JSONL, Markdown)
 * so operators and external LLMs can ingest past lessons and prevent recurring bugs.
 */

export type IssueCategory =
  | 'FINANCIAL_INVARIANT'
  | 'SECURITY_RLS'
  | 'RUNTIME_BUNDLER'
  | 'OFFLINE_SYNC'
  | 'AI_GATEWAY_ROUTING'
  | 'PERFORMANCE_LATENCY';

export interface LearningRecord {
  id: string;
  projectId: string;
  projectName: string;
  category: IssueCategory;
  title: string;
  symptomAndIssue: string;
  rootCause: string;
  verifiedFix: string;
  invariantRule: string;
  modelUsed: string;
  tokensUsed: number;
  costUsd: number;
  status: 'verified_fix' | 'active_monitoring';
  createdAt: string;
  tags: string[];
}

export const INITIAL_LEARNING_RECORDS: LearningRecord[] = [
  {
    id: 'learn-001-float-drift',
    projectId: 'proj-ehi-001',
    projectName: 'EHI Multisystems',
    category: 'FINANCIAL_INVARIANT',
    title: 'IEEE-754 Floating-Point Precision Drift in Transaction Reconciliation',
    symptomAndIssue:
      'Summing itemized ledger transactions (0.05 + 0.12) resulted in 0.17000000000000004 in spendByAttribution and projectMonthlySpend, failing settlement reconciliation assertions.',
    rootCause:
      'JavaScript standard Number IEEE-754 floating-point math causes minor binary representation rounding errors during continuous addition.',
    verifiedFix:
      'Normalized all currency math with micro-dollar rounding: Math.round(total * 1000000) / 1000000 across all cost calculators and financial reducers.',
    invariantRule:
      'NEVER use standard IEEE-754 floats for currency or ledger transactions. Always normalize with explicit micro-unit rounding or store integer cents/kobo.',
    modelUsed: 'deepseek-r1',
    tokensUsed: 4200,
    costUsd: 0.0046,
    status: 'verified_fix',
    createdAt: '2026-10-03T03:32:00Z',
    tags: ['financial-math', 'ledger-invariants', 'ieee-754', 'ehi-multisystems']
  },
  {
    id: 'learn-002-import-meta',
    projectId: 'proj-edgepoint-004',
    projectName: 'EdgePoint',
    category: 'RUNTIME_BUNDLER',
    title: 'Unhandled TypeError on import.meta.env Outside Bundled Vite Context',
    symptomAndIssue:
      'Running background test harnesses or server-side scripts threw: "TypeError: Cannot read properties of undefined (reading VITE_SUPABASE_URL)".',
    rootCause:
      'Code accessed import.meta.env.VITE_SUPABASE_URL directly without checking if import.meta or import.meta.env exists in Node.js / tsx runtime.',
    verifiedFix:
      'Wrapped environment reads with safe checks: (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) || (typeof process !== "undefined" && process.env?.VITE_SUPABASE_URL) || "".',
    invariantRule:
      'Always guard client-side bundler globals (import.meta.env, window, localStorage) so modules can safely execute in Node.js scripts, SSR, and test harnesses.',
    modelUsed: 'gemini-3.5-flash',
    tokensUsed: 2800,
    costUsd: 0.0012,
    status: 'verified_fix',
    createdAt: '2026-10-03T03:59:00Z',
    tags: ['runtime-safety', 'vite', 'node-compatibility', 'edgepoint']
  },
  {
    id: 'learn-003-rls-bypass',
    projectId: 'proj-ehi-001',
    projectName: 'EHI Multisystems',
    category: 'SECURITY_RLS',
    title: 'Cross-Tenant Ledger Leak Prevention via Database Row Level Security',
    symptomAndIssue:
      'Automated penetration crawl attempted to query foreign tenant transaction rows by manipulating the REST query parameter ?org_id=.',
    rootCause:
      'Relying solely on frontend UI filters or API where-clauses permits client-side parameter tampering to view unauthorized tenant records.',
    verifiedFix:
      'Enforced PostgreSQL Row Level Security (RLS) on all tables: USING (org_id = current_setting("app.current_org_id")). Unauthorized reads return 403 Forbidden.',
    invariantRule:
      'Multi-tenant boundaries must be strictly enforced at the database engine level via PostgreSQL RLS policies, never relying on application-level filtering.',
    modelUsed: 'deepseek-r1',
    tokensUsed: 6100,
    costUsd: 0.0067,
    status: 'verified_fix',
    createdAt: '2026-09-28T22:15:00Z',
    tags: ['security', 'rls', 'multi-tenancy', 'owasp', 'ehi-multisystems']
  },
  {
    id: 'learn-004-upstream-ttl',
    projectId: 'proj-edgepoint-004',
    projectName: 'EdgePoint',
    category: 'PERFORMANCE_LATENCY',
    title: 'Upstream Polling Storm & Hourly Cache Rate-Limit Shield',
    symptomAndIssue:
      'Rapid UI page switches or manual refresh bursts caused repeated upstream status queries, threatening external quota depletion.',
    rootCause:
      'Lack of centralized time-to-live (TTL) cache allowed every user request to fan-out directly to upstream status providers.',
    verifiedFix:
      'Implemented process-level 1-hour TTL cache in telemetry-gateway.ts. Query param ?force=1 explicitly returns cached data inside the hour without upstream polling.',
    invariantRule:
      'Status checks and health heartbeats must enforce strict in-memory TTL caching (3600s) to prevent cascading rate-limit exhaustion.',
    modelUsed: 'claude-3-7-sonnet',
    tokensUsed: 5400,
    costUsd: 0.0162,
    status: 'verified_fix',
    createdAt: '2026-09-30T10:00:00Z',
    tags: ['caching', 'rate-limiting', 'ttl', 'telemetry-gateway']
  },
  {
    id: 'learn-005-offline-queue',
    projectId: 'proj-iyanu-002',
    projectName: 'Iyanuoluwa Vegetable Oil',
    category: 'OFFLINE_SYNC',
    title: 'Industrial Weighbridge Scale Disconnection During Bulk Tanker Dispatch',
    symptomAndIssue:
      'Refinery scale-house tablets in rural Oyo state experienced cellular drops, stalling tanker gate pass issuance.',
    rootCause:
      'System design required active cloud API response before printing the physical weight ticket and calculating net palm kernel oil (PKO).',
    verifiedFix:
      'Built local SQLite / IndexedDB sync buffer with client-generated monotonic ticket serials and direct ESC/POS thermal printing fallback.',
    invariantRule:
      'Industrial hardware and scale-house operations must be offline-first by default with asynchronous idempotency keys on reconciliation.',
    modelUsed: 'deepseek-v3',
    tokensUsed: 4900,
    costUsd: 0.0018,
    status: 'verified_fix',
    createdAt: '2026-09-29T14:30:00Z',
    tags: ['offline-sync', 'weighbridge', 'sqlite', 'iyanu-oil']
  },
  {
    id: 'learn-006-model-routing',
    projectId: 'proj-aviation-003',
    projectName: 'Aviation Log Entry',
    category: 'AI_GATEWAY_ROUTING',
    title: 'Underpowered Model Selection for FAA Weight & Balance Invariants',
    symptomAndIssue:
      'A lightweight general model hallucinated center-of-gravity (CG) envelope coordinates during edge-case payload calculations.',
    rootCause:
      'Task routing dispatched a complex aeronautical mathematical verification to an economy model without formal reasoning capabilities.',
    verifiedFix:
      'Constructed Intelligent Model Router enforcing DeepSeek R1 or Claude 3.7 Sonnet for P0 Critical tasks, raising warnings if underpowered models are selected.',
    invariantRule:
      'Always route critical mathematical, security, and compliance invariant proofs to deep reasoning models (DeepSeek R1 / Claude 3.7 Sonnet / o3-mini).',
    modelUsed: 'deepseek-r1',
    tokensUsed: 7800,
    costUsd: 0.0085,
    status: 'verified_fix',
    createdAt: '2026-10-01T09:20:00Z',
    tags: ['model-router', 'faa-compliance', 'deep-reasoning', 'aviation-log']
  }
];

let inMemoryVault: LearningRecord[] = [...INITIAL_LEARNING_RECORDS];

/**
 * Storage helpers for knowledge records
 */
export function loadLearningVault(): LearningRecord[] {
  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem('aetherorch_learning_vault');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          inMemoryVault = parsed;
          return parsed;
        }
      }
    } catch {}
  }
  return [...inMemoryVault];
}

export function saveLearningVault(records: LearningRecord[]): void {
  inMemoryVault = [...records];
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('aetherorch_learning_vault', JSON.stringify(records));
    } catch {}
  }
}

export function addLearningRecord(record: Omit<LearningRecord, 'id' | 'createdAt'>): LearningRecord {
  const vault = loadLearningVault();
  const newRecord: LearningRecord = {
    ...record,
    id: `learn-${Date.now()}`,
    createdAt: new Date().toISOString()
  };
  const updated = [newRecord, ...vault];
  saveLearningVault(updated);
  return newRecord;
}

/**
 * Exports all learning records as JSONL format for LLM Fine-Tuning / Dataset Ingestion.
 * Format: { "messages": [ { "role": "system", ... }, { "role": "user", ... }, { "role": "assistant", ... } ] }
 */
export function exportAsJSONL(records: LearningRecord[]): string {
  return records
    .map((r) => {
      const conversation = {
        messages: [
          {
            role: 'system',
            content:
              'You are an expert autonomous software engineer operating under AetherOrch invariants. You write zero-defect code and strictly uphold architectural rules.'
          },
          {
            role: 'user',
            content: `Diagnose and fix issue in ${r.projectName} (${r.category}): "${r.title}". Symptom: ${r.symptomAndIssue}`
          },
          {
            role: 'assistant',
            content: `### Root Cause Analysis\n${r.rootCause}\n\n### Verified Fix\n${r.verifiedFix}\n\n### Invariant Rule\n${r.invariantRule}`
          }
        ],
        metadata: {
          id: r.id,
          project_id: r.projectId,
          category: r.category,
          model_used: r.modelUsed,
          timestamp: r.createdAt
        }
      };
      return JSON.stringify(conversation);
    })
    .join('\n');
}

/**
 * Exports all learning records as a curated Markdown System Prompt
 * ready to inject into Claude, Gemini, ChatGPT, or Cursor system prompts.
 */
export function exportAsSystemPrompt(records: LearningRecord[]): string {
  let doc = `# AETHERORCH ARCHITECTURAL INVARIANTS & LESSONS LEARNED
*The following golden rules and verified post-mortems must govern all code synthesis and reasoning.*

`;

  records.forEach((r, idx) => {
    doc += `## Rule ${idx + 1}: ${r.title}
- **Project Context:** ${r.projectName} (\`${r.projectId}\`) · Category: \`${r.category}\`
- **Anomalous Symptom:** ${r.symptomAndIssue}
- **Root Cause:** ${r.rootCause}
- **Verified Fix:** ${r.verifiedFix}
- **Golden Invariant:** ${r.invariantRule}

---
`;
  });

  doc += `\n*End of Architectural Invariants. Never violate these rules in any proposed code changes.*`;
  return doc;
}
