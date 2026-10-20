import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ProjectBudgetBlockedError,
  assertProjectBudget,
  checkProjectBudget,
  isProjectBudgetBlocked
} from './projectBudgetGuard';
import { requestProjectBudgetAdmit } from './budget';

const proj = (monthly_budget_usd: unknown) => ({ id: 'proj-iya-002', name: 'Iyanuoluwa', monthly_budget_usd });

test('no budget blocks AI work (missing, null), with a clear message naming the project', () => {
  for (const p of [{ id: 'proj-iya-002', name: 'Iyanuoluwa' }, proj(null), proj(undefined)]) {
    const c = checkProjectBudget(p);
    assert.equal(c.ok, false);
    assert.match((c as { reason: string }).reason, /AI work blocked: Iyanuoluwa \(proj-iya-002\) has no monthly budget/);
  }
});

test('an invalid budget (0, negative, NaN, Infinity, string) also blocks: never unlimited', () => {
  for (const v of [0, -5, NaN, Infinity, '800']) {
    const c = checkProjectBudget(proj(v));
    assert.equal(c.ok, false, `budget ${String(v)}`);
    assert.match((c as { reason: string }).reason, /invalid monthly budget/);
  }
});

test('an unknown project blocks', () => {
  const c = checkProjectBudget(null, { projectId: 'proj-gone' });
  assert.deepEqual(c, { ok: false, reason: 'AI work blocked: project proj-gone was not found, so it has no budget.' });
});

test('a positive budget is allowed', () => {
  assert.deepEqual(checkProjectBudget(proj(800)), { ok: true, budgetUsd: 800 });
  assert.equal(assertProjectBudget(proj(0.5)), 0.5);
});

test('budget row (project_budgets, for the run worker): no row blocks even if the project has a number', () => {
  assert.equal(checkProjectBudget(proj(800), { budgetRow: null }).ok, false);
  assert.match((checkProjectBudget(proj(800), { budgetRow: null }) as { reason: string }).reason, /has no monthly budget/);
  assert.equal(checkProjectBudget(proj(800), { budgetRow: { monthly_limit_usd: null } }).ok, false);
  assert.deepEqual(checkProjectBudget(proj(undefined), { budgetRow: { monthly_limit_usd: 250 } }), { ok: true, budgetUsd: 250 });
});

test('assertProjectBudget throws ProjectBudgetBlockedError', () => {
  assert.throws(() => assertProjectBudget(proj(null)), (e: unknown) => {
    assert.ok(e instanceof ProjectBudgetBlockedError);
    assert.ok(isProjectBudgetBlocked(e));
    assert.match((e as Error).message, /has no monthly budget/);
    return true;
  });
  assert.equal(isProjectBudgetBlocked(new Error('x')), false);
});

test('requestProjectBudgetAdmit: no budget is refused before the ledger is asked (no fetch, no charge)', async () => {
  const realFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => { calls++; throw new Error('offline'); }) as typeof fetch;
  try {
    const refused = await requestProjectBudgetAdmit(proj(null), 1, 0.0075);
    assert.equal(refused.admitted, false);
    assert.match(refused.reason!, /has no monthly budget/);
    assert.equal(calls, 0, 'ledger must not be called');
    const used = refused.totalRequestsUsed;
    const ok = await requestProjectBudgetAdmit(proj(800), 1, 0.0075);
    assert.equal(ok.admitted, true);
    assert.equal(calls, 1);
    assert.equal(ok.totalRequestsUsed, used + 1, 'only the admitted call is charged');
  } finally {
    globalThis.fetch = realFetch;
  }
});
