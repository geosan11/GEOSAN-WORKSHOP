import { test } from 'node:test';
import assert from 'node:assert/strict';
import { saveProjectBudget, checkStoredProjectBudget, type ProjectStore } from './useProjects';
import { guardAiWork } from './useTasks';
import { isProjectBudgetBlocked } from '../lib/projectBudgetGuard';

class Store implements ProjectStore {
  m = new Map<string, string>();
  failWrites = false;
  constructor(init?: unknown) { if (init !== undefined) this.m.set('geosan_projects', JSON.stringify(init)); }
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { if (this.failWrites) throw new Error('QuotaExceededError'); this.m.set(k, v); }
}

const blocked = () => new Store([{ id: 'proj-iya-002', name: 'Iyanuoluwa' }, { id: 'proj-x', name: 'X', monthly_budget_usd: 50 }]);

test('budget edit persists to the store the guard reads, so a blocked project is unblocked', () => {
  const s = blocked();
  assert.throws(() => guardAiWork('proj-iya-002', s.getItem('geosan_projects')), isProjectBudgetBlocked);
  const saved = saveProjectBudget('proj-iya-002', '800', s);
  assert.equal(saved.monthly_budget_usd, 800);
  assert.doesNotThrow(() => guardAiWork('proj-iya-002', s.getItem('geosan_projects')));
  assert.deepEqual(checkStoredProjectBudget('proj-iya-002', s.getItem('geosan_projects')), { ok: true, budgetUsd: 800 });
  // other projects untouched
  assert.equal(JSON.parse(s.getItem('geosan_projects')!)[1].monthly_budget_usd, 50);
});

test('budget edit: invalid value, unknown project, unreadable list or failed write -> error, nothing changed', () => {
  for (const bad of ['', 'abc', '0', '-5', 'NaN']) {
    const s = blocked();
    const before = s.getItem('geosan_projects');
    assert.throws(() => saveProjectBudget('proj-iya-002', bad, s), /Budget not saved/);
    assert.equal(s.getItem('geosan_projects'), before, bad);
  }
  assert.throws(() => saveProjectBudget('proj-missing', '10', blocked()), /was not found/);
  const broken = new Store(); broken.m.set('geosan_projects', '{not json');
  assert.throws(() => saveProjectBudget('proj-iya-002', '10', broken), /unreadable/);
  assert.equal(broken.getItem('geosan_projects'), '{not json');
  const full = blocked(); full.failWrites = true;
  assert.throws(() => saveProjectBudget('proj-iya-002', '10', full), /Budget not saved: QuotaExceededError/);
  assert.throws(() => guardAiWork('proj-iya-002', full.getItem('geosan_projects')), isProjectBudgetBlocked);
});
