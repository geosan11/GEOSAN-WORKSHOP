import { test } from 'node:test';
import assert from 'node:assert/strict';
import { approvePlan, type ApprovePlanDeps } from './planApproval';
import { ProjectBudgetBlockedError } from './projectBudgetGuard';
import type { AgentTask } from './types';

const task = {
  id: 'task-1', project_id: 'proj-test-001', task_type: 'BUILD_FEATURE', prompt: 'p', status: 'awaiting_approval',
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

import { approveThenContinue, rejectPlan } from './planApproval';

test('chat approval: a refused approve (budget changed in another tab) is not recorded as approved and the follow-up does not run', async () => {
  const { d, log } = deps();
  let followed = false;
  const refused = async () => { throw new ProjectBudgetBlockedError('AI work blocked: budget removed in another tab'); };
  const r = await approvePlan(task, { ...d, onApprove: (id) => approveThenContinue(id, refused, () => { followed = true; }) });
  assert.equal(r.ok, false);
  assert.deepEqual(log, []);
  assert.equal(followed, false);
});

test('chat approval: a successful approve runs the follow-up, then approved is recorded', async () => {
  const { d, log } = deps();
  const r = await approvePlan(task, { ...d, onApprove: (id) => approveThenContinue(id, async () => { log.push('approve'); }, () => { log.push('follow'); }) });
  assert.equal(r.ok, true);
  assert.deepEqual(log, ['approve', 'follow', 'persist', 'audit:approved']);
});

test('plan approval never throws: storage failure in budget check -> not approved', async () => {
  const { d, log } = deps({ checkBudget: () => { throw new Error('SecurityError: storage blocked'); } });
  const r = await approvePlan(task, d);
  assert.equal(r.ok, false);
  assert.match((r as { reason: string }).reason, /Budget could not be checked: SecurityError/);
  assert.deepEqual(log, []);
});

test('plan approval never throws: run packet / audit storage failure after approve -> ok with a warning', async () => {
  for (const over of [
    { persistRunPacket: () => { throw new Error('QuotaExceededError'); } },
    { appendApprovalLine: () => { throw new Error('QuotaExceededError'); } }
  ]) {
    const { d } = deps(over);
    const r = await approvePlan(task, d);
    assert.equal(r.ok, true);
    assert.match((r as { warning?: string }).warning ?? '', /approved, but the run record could not be saved: QuotaExceededError/);
  }
});

test('plan rejection: rejected audit line only after reject succeeds; reject failure -> no audit, reason returned', async () => {
  const log: string[] = [];
  const append = (l: { action: string }) => { log.push(`audit:${l.action}`); };
  const fail = await rejectPlan('task-1', 'no', { onReject: async () => { throw new Error('network down'); }, appendApprovalLine: append });
  assert.deepEqual(fail, { ok: false, reason: 'network down', error: (fail as { error: unknown }).error });
  assert.equal(log.length, 0);
  const ok = await rejectPlan('task-1', 'no', { onReject: async () => { log.push('reject'); }, appendApprovalLine: append });
  assert.deepEqual(ok, { ok: true });
  assert.deepEqual(log, ['reject', 'audit:rejected']);
  const warn = await rejectPlan('task-1', 'no', { onReject: async () => {}, appendApprovalLine: () => { throw new Error('QuotaExceededError'); } });
  assert.equal(warn.ok, true);
  assert.match((warn as { warning?: string }).warning ?? '', /audit line could not be saved/);
});
