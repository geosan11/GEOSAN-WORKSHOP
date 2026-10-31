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

/** Empty: the seeded lessons belonged to the removed placeholder projects. */
export const INITIAL_LEARNING_RECORDS: LearningRecord[] = [];

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
