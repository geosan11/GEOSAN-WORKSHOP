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

test('an invalid budget (0, negative, NaN, Infinity, non-numeric string) also blocks: never unlimited', () => {
  for (const v of [0, -5, NaN, Infinity, 'abc']) {
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
    const noBudget = JSON.stringify([{ id: 'proj-iya-002', name: 'Iyanuoluwa' }]);
    const withBudget = JSON.stringify([{ id: 'proj-iya-002', name: 'Iyanuoluwa', monthly_budget_usd: 800 }]);
    const refused = await requestProjectBudgetAdmit(proj(null), 1, 0.0075, { saved: noBudget });
    assert.equal(refused.admitted, false);
    assert.match(refused.reason!, /has no monthly budget/);
    assert.equal(calls, 0, 'ledger must not be called');
    const used = refused.totalRequestsUsed;
    const ok = await requestProjectBudgetAdmit(proj(800), 1, 0.0075, { saved: withBudget });
    assert.equal(ok.admitted, true);
    assert.equal(calls, 1);
    assert.equal(ok.totalRequestsUsed, used + 1, 'only the admitted call is charged');
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('numeric strings from a DB driver (numeric type) count as amounts: "100.00" is allowed', () => {
  assert.deepEqual(checkProjectBudget(proj('100.00')), { ok: true, budgetUsd: 100 });
  assert.deepEqual(checkProjectBudget(proj(' 0.50 ')), { ok: true, budgetUsd: 0.5 });
  assert.deepEqual(checkProjectBudget(proj(undefined), { budgetRow: { monthly_limit_usd: '250.00' } }), { ok: true, budgetUsd: 250 });
  for (const bad of ['', '   ', 'abc', '0', '0.00', '-5', '-5.00', 'NaN', 'Infinity', '1e3', '0x10', '10 USD']) {
    assert.equal(checkProjectBudget(proj(bad)).ok, false, JSON.stringify(bad));
  }
});

test('ask mode: the SAVED project is checked before the ledger, not the in-memory object', async () => {
  const realFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => { calls++; throw new Error('offline'); }) as typeof fetch;
  try {
    // In memory the project still shows a budget, but the saved record (what
    // createTask's guard reads next) has none: refuse before any ledger call.
    const saved = JSON.stringify([{ id: 'proj-iya-002', name: 'Iyanuoluwa' }]);
    const r = await requestProjectBudgetAdmit(proj(800), 1, 0.0075, { saved });
    assert.equal(r.admitted, false);
    assert.match(r.reason!, /has no monthly budget/);
    assert.equal(calls, 0, 'weekly ledger must not be asked or charged');
  } finally {
    globalThis.fetch = realFetch;
  }
});
