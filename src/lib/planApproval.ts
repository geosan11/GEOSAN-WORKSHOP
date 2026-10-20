/**
 * Plan approval, without the UI (PlanApproval.tsx calls this).
 *
 * Order matters (fail closed):
 *   1. budget check on the saved project: blocked -> nothing is persisted,
 *      no audit line is written, the reason is returned for the UI to show;
 *   2. plan checks for gated task types (done_when, goal, constraints);
 *   3. the approval itself (onApprove; useTasks also re-checks the budget);
 *   4. only after it succeeded: persist the run packet and append the
 *      'approved' audit line.
 * It never throws: every failure comes back as { ok: false, reason }.
 */
import type { AgentTask, RunPacket } from './types';
import type { BudgetCheck } from './projectBudgetGuard';
import type { ApprovalLine } from './approvalLog';

export interface ApprovePlanDeps {
  checkBudget: (projectId: string) => BudgetCheck;
  onApprove: (taskId: string) => Promise<void>;
  persistRunPacket: (taskId: string, packet: RunPacket) => void;
  appendApprovalLine: (line: Omit<ApprovalLine, 'line_id' | 'at'>) => unknown;
  actor?: string;
  now?: () => Date;
}

export type ApprovePlanResult =
  | { ok: true; runPacket: RunPacket | null }
  | { ok: false; reason: string; error?: unknown };

export function isGatedTaskType(task: Pick<AgentTask, 'task_type'>): boolean {
  return task.task_type === 'BUILD_FEATURE' || task.task_type === 'FIX_BUG';
}

export async function approvePlan(task: AgentTask, deps: ApprovePlanDeps): Promise<ApprovePlanResult> {
  const actor = deps.actor ?? 'operator@demo.internal'; // demo fallback
  const now = deps.now ?? (() => new Date());

  const budget = deps.checkBudget(task.project_id);
  if (!budget.ok) return { ok: false, reason: budget.reason };

  let runPacket: RunPacket | null = null;
  if (isGatedTaskType(task)) {
    if (!task.done_when || task.done_when.length === 0) return { ok: false, reason: 'Plan has no done_when. Not approved.' };
    if (!task.goal || !task.constraints) return { ok: false, reason: 'Plan has missing goal or constraints. Not approved.' };
    runPacket = {
      packet_id: `pkt-${now().getTime()}`,
      task_id: task.id,
      project_id: task.project_id,
      goal: task.goal,
      constraints: task.constraints,
      done_when: task.done_when,
      fixture_hash: null,
      worktree: 'not_opened',
      branch_name: task.branch_name || 'no branch',
      pr_url: task.pr_url || null,
      deploy: 'not_requested',
      approved_by: actor,
      approved_at: now().toISOString()
    };
  }

  try {
    await deps.onApprove(task.id);
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : 'Plan approval failed', error };
  }

  if (runPacket) deps.persistRunPacket(task.id, runPacket);
  deps.appendApprovalLine({ actor, action: 'approved', task_id: task.id, packet_id: runPacket?.packet_id || null, reason: null });
  return { ok: true, runPacket };
}

/** Writes the run packet onto the saved task (demo store). */
export function persistRunPacketToStorage(
  taskId: string,
  packet: RunPacket,
  store: { getItem(k: string): string | null; setItem(k: string, v: string): void } | undefined =
    typeof localStorage === 'undefined' ? undefined : localStorage
): void {
  const saved = store?.getItem('geosan_tasks');
  if (!store || !saved) return;
  try {
    const allTasks = JSON.parse(saved);
    const idx = allTasks.findIndex((t: { id?: string }) => t.id === taskId);
    if (idx >= 0) {
      allTasks[idx].run_packet = packet;
      store.setItem('geosan_tasks', JSON.stringify(allTasks));
    }
  } catch {
    /* unreadable demo store: leave it */
  }
}
