import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guardAiWork, statusStartsAiWork } from './useTasks';
import { isProjectBudgetBlocked } from '../lib/projectBudgetGuard';

const saved = JSON.stringify([
  { id: 'proj-iya-002', name: 'Iyanuoluwa', monthly_budget_usd: 800 },
  { id: 'proj-nobudget', name: 'No Budget Co' },
  { id: 'proj-null', name: 'Null Budget', monthly_budget_usd: null }
]);

test('guardAiWork: a project without a budget cannot get AI work (fails closed)', () => {
  for (const id of ['proj-nobudget', 'proj-null']) {
    assert.throws(() => guardAiWork(id, saved), (e: unknown) => isProjectBudgetBlocked(e) && /has no monthly budget/.test((e as Error).message));
  }
});

test('guardAiWork: an unknown project is blocked, a project with a budget is allowed', () => {
  assert.throws(() => guardAiWork('proj-missing', saved), (e: unknown) => isProjectBudgetBlocked(e) && /was not found/.test((e as Error).message));
  assert.doesNotThrow(() => guardAiWork('proj-iya-002', saved));
});

test('approve / retry / confirm (running, queued) are guarded; reject / cancel are not', () => {
  assert.equal(statusStartsAiWork('running'), true);
  assert.equal(statusStartsAiWork('queued'), true);
  assert.equal(statusStartsAiWork('failed'), false);
  assert.equal(statusStartsAiWork('cancelled'), false);
});
