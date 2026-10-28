import { test } from 'node:test';
import assert from 'node:assert/strict';
import { approvePlan, type ApprovePlanDeps } from './planApproval';
import { ProjectBudgetBlockedError } from './projectBudgetGuard';
import type { AgentTask } from './types';

const task = {
  id: 'task-1', project_id: 'proj-iya-002', task_type: 'BUILD_FEATURE', prompt: 'p', status: 'awaiting_approval',
  goal: 'g', constraints: ['c'], done_when: ['d'], branch_name: null, pr_url: null
} as unknown as AgentTask;

function deps(over: Partial<ApprovePlanDeps> = {}) {
  const log: string[] = [];
  const d: ApprovePlanDeps = {
    checkBudget: () => ({ ok: true, budgetUsd: 800 }),
    onApprove: async () => { log.push('approve'); },
    persistRunPacket: () => { log.push('persist'); },
    appendApprovalLine: (l) => { log.push(`audit:${l.action}`); },
    ...over
  };
  return { d, log };
}

test('plan approval: no budget -> blocked first; nothing persisted, no audit line, reason returned', async () => {
  const { d, log } = deps({ checkBudget: () => ({ ok: false, reason: 'AI work blocked: X has no monthly budget.' }) });
  const r = await approvePlan(task, d);
  assert.deepEqual(r, { ok: false, reason: 'AI work blocked: X has no monthly budget.' });
  assert.deepEqual(log, []);
});

test('plan approval: onApprove throwing (e.g. the useTasks guard) is caught; nothing persisted or audited', async () => {
  const err = new ProjectBudgetBlockedError('AI work blocked: race');
  const { d, log } = deps({ onApprove: async () => { throw err; } });
  const r = await approvePlan(task, d);
  assert.equal(r.ok, false);
  assert.equal((r as { reason: string }).reason, 'AI work blocked: race');
  assert.equal((r as { error: unknown }).error, err);
  assert.deepEqual(log, []);
});

test('plan approval: with a budget -> approve, then persist the run packet, then audit "approved"', async () => {
  const { d, log } = deps();
  const r = await approvePlan(task, d);
  assert.equal(r.ok, true);
  assert.deepEqual(log, ['approve', 'persist', 'audit:approved']);
});

test('plan approval: missing done_when -> not approved, nothing persisted', async () => {
  const { d, log } = deps();
  const r = await approvePlan({ ...task, done_when: [] } as AgentTask, d);
  assert.deepEqual(r, { ok: false, reason: 'Plan has no done_when. Not approved.' });
  assert.deepEqual(log, []);
});
