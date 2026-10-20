import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LEGACY_PROJECT_ID_MAP,
  canonicalProjectId,
  migrateLegacyProjectIds,
  parseIsoTimestamp,
  remapLegacyIds,
  type StorageLike
} from './projectIdMigration';
import { CLIENT_PROJECT_IDS } from '../data/clientProjects';

class MemoryStorage implements StorageLike {
  private m = new Map<string, string>();
  constructor(init: Record<string, unknown> = {}) {
    for (const [k, v] of Object.entries(init)) this.m.set(k, typeof v === 'string' ? v : JSON.stringify(v));
  }
  get length() { return this.m.size; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
  dump() { return Object.fromEntries(this.m); }
  json(k: string) { return JSON.parse(this.getItem(k)!); }
}

const OLD = Object.keys(LEGACY_PROJECT_ID_MAP);
const CANON = new Set<string>(Object.values(CLIENT_PROJECT_IDS));

test('every old id maps to a canonical seed id', () => {
  for (const [oldId, newId] of Object.entries(LEGACY_PROJECT_ID_MAP)) {
    assert.ok(CANON.has(newId), `${oldId} -> ${newId} is not a seeded id`);
    assert.ok(!CANON.has(oldId), `${oldId} is also canonical`);
  }
  assert.equal(canonicalProjectId('proj-iyanu-002'), CLIENT_PROJECT_IDS.iyanuoluwa);
  assert.equal(canonicalProjectId('proj-ehi-001'), 'proj-ehi-001');
  assert.equal(canonicalProjectId('proj-123'), 'proj-123');
});

test('remapLegacyIds only replaces exact ids, not free text', () => {
  const out = remapLegacyIds({
    project_id: 'proj-aviation-003',
    org_id: 'org-ehi-global',
    note: 'moved from proj-aviation-003',
    nested: [{ projectId: 'proj-edgepoint-004' }]
  });
  assert.deepEqual(out, {
    project_id: 'proj-aero-003',
    org_id: 'org-geosan',
    note: 'moved from proj-aviation-003',
    nested: [{ projectId: 'proj-edge-004' }]
  });
});

function legacyStore() {
  return new MemoryStorage({
    geosan_projects: [
      { id: 'proj-ehi-001', org_id: 'org-ehi-global', name: 'EHI' },
      { id: 'proj-iyanu-002', org_id: 'org-ehi-global', name: 'Iyanu' },
      { id: 'proj-aviation-003', org_id: 'org-ehi-global', name: 'Aviation' },
      { id: 'proj-edgepoint-004', org_id: 'org-ehi-global', name: 'EdgePoint' },
      { id: 'proj-1700000000000', org_id: 'org-ehi-global', name: 'Added later' }
    ],
    geosan_tasks: [{ id: 't1', project_id: 'proj-iyanu-002', org_id: 'org-ehi-global' }],
    geosan_conversations: [{ id: 'conv-proj-iyanu-002', project_id: 'proj-iyanu-002', org_id: 'org-ehi-global' }],
    geosan_messages: [{ id: 'm1', conversation_id: 'conv-proj-iyanu-002', project_id: 'proj-iyanu-002' }],
    geosan_costs: [{ id: 'c1', project_id: 'proj-edgepoint-004', cost_usd: 1 }],
    geosan_qa_findings: [{ id: 'f1', project_id: 'proj-aviation-003' }],
    aetherorch_learning_vault: [{ id: 'l1', projectId: 'proj-edgepoint-004', projectName: 'EdgePoint' }],
    aether_recent_destinations: ['screen-inbox', 'project-proj-iyanu-002', 'project-proj-iya-002'],
    'aetherorch_discovery_proj-aviation-003': { projectId: 'proj-aviation-003', answers: { q: 'a' } },
    'geosan_design_brief_proj-edgepoint-004': { project_id: 'proj-edgepoint-004' },
    'geosan_design_brief_proj-iyanu-002': { project_id: 'proj-iyanu-002', v: 'old' },
    'geosan_design_brief_proj-iya-002': { project_id: 'proj-iya-002', v: 'new' },
    unrelated_key: 'proj-iyanu-002',
    geosan_qa_runs: '{not json'
  });
}

test('migrates tasks, chat, costs, QA, learning store, recents and per-project keys', () => {
  const s = legacyStore();
  migrateLegacyProjectIds(s);

  assert.deepEqual(s.json('geosan_projects').map((p: { id: string }) => p.id), [
    'proj-ehi-001', 'proj-iya-002', 'proj-aero-003', 'proj-edge-004', 'proj-1700000000000'
  ]);
  assert.ok(s.json('geosan_projects').every((p: { org_id: string }) => p.org_id === 'org-geosan'));
  assert.equal(s.json('geosan_tasks')[0].project_id, 'proj-iya-002');
  assert.equal(s.json('geosan_tasks')[0].org_id, 'org-geosan');
  assert.equal(s.json('geosan_conversations')[0].project_id, 'proj-iya-002');
  assert.equal(s.json('geosan_messages')[0].project_id, 'proj-iya-002');
  assert.equal(s.json('geosan_costs')[0].project_id, 'proj-edge-004');
  assert.equal(s.json('geosan_qa_findings')[0].project_id, 'proj-aero-003');
  assert.equal(s.json('aetherorch_learning_vault')[0].projectId, 'proj-edge-004');
  assert.deepEqual(s.json('aether_recent_destinations'), ['screen-inbox', 'project-proj-iya-002']);

  assert.equal(s.getItem('aetherorch_discovery_proj-aviation-003'), null);
  assert.equal(s.json('aetherorch_discovery_proj-aero-003').projectId, 'proj-aero-003');
  assert.equal(s.json('geosan_design_brief_proj-edge-004').project_id, 'proj-edge-004');
  // canonical key already present: never overwritten
  assert.equal(s.json('geosan_design_brief_proj-iya-002').v, 'new');

  // untouched: unknown keys and values that are not valid JSON
  assert.equal(s.getItem('unrelated_key'), 'proj-iyanu-002');
  assert.equal(s.getItem('geosan_qa_runs'), '{not json');

  const migrated = ['geosan_projects', 'geosan_tasks', 'geosan_costs', 'geosan_messages', 'aetherorch_learning_vault']
    .map((k) => s.getItem(k)!).join('\n');
  for (const id of OLD) assert.ok(!migrated.includes(`"${id}"`), `${id} left behind`);
  assert.ok(!migrated.includes('org-ehi-global'));
});

test('idempotent: a second run changes nothing', () => {
  const s = legacyStore();
  migrateLegacyProjectIds(s);
  const once = s.dump();
  const report = migrateLegacyProjectIds(s);
  assert.deepEqual(s.dump(), once);
  assert.deepEqual(report.rewrittenKeys, []);
  assert.deepEqual(report.renamedKeys, []);
});

test('canonical data and an empty store are left as they are', () => {
  const empty = new MemoryStorage();
  migrateLegacyProjectIds(empty);
  assert.deepEqual(empty.dump(), {});

  const canonical = new MemoryStorage({ geosan_tasks: [{ id: 't', project_id: 'proj-iya-002', org_id: 'org-geosan' }] });
  const before = canonical.dump();
  assert.deepEqual(migrateLegacyProjectIds(canonical).rewrittenKeys, []);
  assert.deepEqual(canonical.dump(), before);
});

// --- Old and new entries for the same project: the canonical one wins ---

test('geosan_projects: the canonical record wins over an old-id record listed first', () => {
  const s = new MemoryStorage({
    geosan_projects: [
      { id: 'proj-iyanu-002', name: 'Iyanu (old)', updated_at: '2026-10-19T00:00:00Z' },
      { id: 'proj-iya-002', name: 'Iyanu (canonical)', updated_at: '2026-01-01T00:00:00Z' }
    ]
  });
  migrateLegacyProjectIds(s);
  assert.deepEqual(s.json('geosan_projects'), [
    { id: 'proj-iya-002', name: 'Iyanu (canonical)', updated_at: '2026-01-01T00:00:00Z' }
  ]);
});

test('geosan_projects: with only old-id records, the most recently updated one is kept', () => {
  const s = new MemoryStorage({
    geosan_projects: [
      { id: 'proj-iya-001', name: 'older', updated_at: '2026-09-01T00:00:00Z' },
      { id: 'proj-iyanu-002', name: 'newer', updated_at: '2026-10-01T00:00:00Z' },
      { id: 'proj-ehi-001', name: 'EHI' }
    ]
  });
  migrateLegacyProjectIds(s);
  assert.deepEqual(s.json('geosan_projects').map((p: { name: string }) => p.name), ['newer', 'EHI']);
  assert.equal(s.json('geosan_projects')[0].id, 'proj-iya-002');
});

test('object keyed by project id: the canonical key wins, whatever the key order', () => {
  const s = new MemoryStorage({
    aetherorch_learning_vault: [
      { id: 'l1', byProject: { 'proj-iya-002': 'canonical', 'proj-iyanu-002': 'old' } },
      { id: 'l2', byProject: { 'proj-iyanu-002': 'old', 'proj-iya-002': 'canonical' } }
    ]
  });
  migrateLegacyProjectIds(s);
  const v = s.json('aetherorch_learning_vault');
  assert.deepEqual(v[0].byProject, { 'proj-iya-002': 'canonical' });
  assert.deepEqual(v[1].byProject, { 'proj-iya-002': 'canonical' });
});

// --- Per-project keys ---

test('ehi.disclosure.project-<id> keys are mapped', () => {
  const s = new MemoryStorage({ 'ehi.disclosure.project-proj-aviation-003': { open: true } });
  migrateLegacyProjectIds(s);
  assert.equal(s.getItem('ehi.disclosure.project-proj-aviation-003'), null);
  assert.deepEqual(s.json('ehi.disclosure.project-proj-aero-003'), { open: true });
});

test('old per-project key next to a canonical one: canonical kept, old removed, nothing reported next load', () => {
  const s = new MemoryStorage({
    'geosan_design_brief_proj-iyanu-002': { v: 'old' },
    'geosan_design_brief_proj-iya-002': { v: 'new' },
    'ehi.disclosure.project-proj-edgepoint-004': { open: false },
    'ehi.disclosure.project-proj-edge-004': { open: true }
  });
  const first = migrateLegacyProjectIds(s);
  assert.equal(s.json('geosan_design_brief_proj-iya-002').v, 'new');
  assert.equal(s.getItem('geosan_design_brief_proj-iyanu-002'), null);
  assert.equal(s.json('ehi.disclosure.project-proj-edge-004').open, true);
  assert.equal(s.getItem('ehi.disclosure.project-proj-edgepoint-004'), null);
  assert.deepEqual(first.skippedKeys, []);
  const second = migrateLegacyProjectIds(s);
  assert.deepEqual(second, { rewrittenKeys: [], renamedKeys: [], skippedKeys: [], droppedKeys: [] });
});

test('two old per-project keys, no canonical one: the most recently updated is kept', () => {
  const s = new MemoryStorage({
    'aetherorch_discovery_proj-iya-001': { projectId: 'proj-iya-001', lastUpdated: '2026-10-10T00:00:00Z', v: 'newer' },
    'aetherorch_discovery_proj-iyanu-002': { projectId: 'proj-iyanu-002', lastUpdated: '2026-09-10T00:00:00Z', v: 'older' }
  });
  migrateLegacyProjectIds(s);
  assert.equal(s.json('aetherorch_discovery_proj-iya-002').v, 'newer');
  assert.equal(s.json('aetherorch_discovery_proj-iya-002').projectId, 'proj-iya-002');
  assert.deepEqual(Object.keys(s.dump()), ['aetherorch_discovery_proj-iya-002']);
});

// --- Single winner and one merge order (same rule as the SQL migration) ---
// Order: latest updated date, then latest created date, then lowest old id.
// A missing / unreadable date counts as oldest. The winner is kept whole.

const names = (s: MemoryStorage) => s.json('geosan_projects').map((p: { name: string }) => p.name);

test('single winner (reviewer case): project fields and monthly_budget_usd come from the same record', () => {
  const s = new MemoryStorage({
    geosan_projects: [
      { id: 'proj-iya-001', name: 'iya-001', monthly_budget_usd: 333, updated_at: '2026-09-01T00:00:00Z' },
      { id: 'proj-iyanu-002', name: 'iyanu-002', monthly_budget_usd: 777, updated_at: '2026-10-15T00:00:00Z', created_at: '2026-08-01T00:00:00Z' }
    ]
  });
  migrateLegacyProjectIds(s);
  assert.deepEqual(s.json('geosan_projects'), [
    { id: 'proj-iya-002', name: 'iyanu-002', monthly_budget_usd: 777, updated_at: '2026-10-15T00:00:00Z', created_at: '2026-08-01T00:00:00Z' }
  ]);
});

test('tie-break: same updated date -> the later created date wins (not list order)', () => {
  const s = new MemoryStorage({
    geosan_projects: [
      { id: 'proj-iyanu-002', name: 'created earlier', monthly_budget_usd: 777, updated_at: '2026-10-01T00:00:00Z', created_at: '2026-08-01T00:00:00Z' },
      { id: 'proj-iya-001', name: 'created later', monthly_budget_usd: 333, updated_at: '2026-10-01T00:00:00Z', created_at: '2026-09-01T00:00:00Z' }
    ]
  });
  migrateLegacyProjectIds(s);
  assert.deepEqual(names(s), ['created later']);
  assert.equal(s.json('geosan_projects')[0].monthly_budget_usd, 333);
});

test('tie-break: same updated and created dates -> the lowest old id wins, whatever the list order', () => {
  for (const order of [['proj-iyanu-002', 'proj-iya-001'], ['proj-iya-001', 'proj-iyanu-002']]) {
    const s = new MemoryStorage({
      geosan_projects: order.map((id) => ({ id, name: `was ${id}`, updated_at: '2026-10-01T00:00:00Z', created_at: '2026-08-01T00:00:00Z' }))
    });
    migrateLegacyProjectIds(s);
    assert.deepEqual(names(s), ['was proj-iya-001'], `order ${order.join(',')}`);
  }
  // no dates at all is also a full tie
  const s = new MemoryStorage({ geosan_projects: [{ id: 'proj-iyanu-002', name: 'b' }, { id: 'proj-iya-001', name: 'a' }] });
  migrateLegacyProjectIds(s);
  assert.deepEqual(names(s), ['a']);
});

test('recency uses the LATEST readable updated date, not the first field that parses', () => {
  const s = new MemoryStorage({
    geosan_projects: [
      // updated_at is older, but lastUpdated (also an updated date) is the newest of all
      { id: 'proj-iyanu-002', name: 'latest via lastUpdated', updated_at: '2026-01-01T00:00:00Z', lastUpdated: '2026-10-10T00:00:00Z' },
      { id: 'proj-iya-001', name: 'middle', updated_at: '2026-05-01T00:00:00Z' }
    ]
  });
  migrateLegacyProjectIds(s);
  assert.deepEqual(names(s), ['latest via lastUpdated']);

  // an unreadable value is skipped, the readable one counts
  const t = new MemoryStorage({
    geosan_projects: [
      { id: 'proj-iya-001', name: 'readable older', updated_at: '2026-05-01T00:00:00Z' },
      { id: 'proj-iyanu-002', name: 'unreadable + newer', updated_at: 'not a date', updatedAt: '2026-10-10T00:00:00Z' }
    ]
  });
  migrateLegacyProjectIds(t);
  assert.deepEqual(names(t), ['unreadable + newer']);
});

test('a missing updated date counts as oldest; created date only breaks a tie', () => {
  const s = new MemoryStorage({
    geosan_projects: [
      { id: 'proj-iya-001', name: 'no updated, new created', created_at: '2026-10-19T00:00:00Z' },
      { id: 'proj-iyanu-002', name: 'old updated', updated_at: '2026-01-01T00:00:00Z' }
    ]
  });
  migrateLegacyProjectIds(s);
  assert.deepEqual(names(s), ['old updated']);
});

test('object keyed by old ids: same tie-break (lowest old id on a full tie)', () => {
  const s = new MemoryStorage({
    aetherorch_learning_vault: [{ id: 'l1', byProject: { 'proj-iyanu-002': { v: 'b' }, 'proj-iya-001': { v: 'a' } } }]
  });
  migrateLegacyProjectIds(s);
  assert.deepEqual(s.json('aetherorch_learning_vault')[0].byProject, { 'proj-iya-002': { v: 'a' } });
});

test('per-project keys: same tie-break (lowest old id on a full tie, not first found)', () => {
  const s = new MemoryStorage({
    'aetherorch_discovery_proj-iyanu-002': { projectId: 'proj-iyanu-002', lastUpdated: '2026-10-10T00:00:00Z', v: 'b' },
    'aetherorch_discovery_proj-iya-001': { projectId: 'proj-iya-001', lastUpdated: '2026-10-10T00:00:00Z', v: 'a' }
  });
  const report = migrateLegacyProjectIds(s);
  assert.equal(s.json('aetherorch_discovery_proj-iya-002').v, 'a');
  assert.deepEqual(report.droppedKeys, ['aetherorch_discovery_proj-iyanu-002']);
  assert.deepEqual(Object.keys(s.dump()), ['aetherorch_discovery_proj-iya-002']);
});

// --- Budget fallback: only the budget falls back to the next-ranked record ---

test('budget fallback: winner has no budget -> next-ranked old record\'s budget; other fields from the winner only', () => {
  const s = new MemoryStorage({
    geosan_projects: [
      { id: 'proj-iya-001', name: 'loser', repo_url: 'loser-repo', monthly_budget_usd: 333, updated_at: '2026-09-01T00:00:00Z' },
      { id: 'proj-iyanu-002', name: 'winner', repo_url: null, updated_at: '2026-10-15T00:00:00Z' }
    ]
  });
  migrateLegacyProjectIds(s);
  assert.deepEqual(s.json('geosan_projects'), [
    { id: 'proj-iya-002', name: 'winner', repo_url: null, updated_at: '2026-10-15T00:00:00Z', monthly_budget_usd: 333 }
  ]);
});

test('budget fallback: canonical record without budget takes the top-ranked old budget (like SQL)', () => {
  const s = new MemoryStorage({
    geosan_projects: [
      { id: 'proj-iya-002', name: 'canonical', updated_at: '2026-01-01T00:00:00Z' },
      { id: 'proj-iya-001', name: 'old', monthly_budget_usd: 333, updated_at: '2026-09-01T00:00:00Z' },
      { id: 'proj-iyanu-002', name: 'newer old', monthly_budget_usd: 777, updated_at: '2026-10-01T00:00:00Z' }
    ]
  });
  migrateLegacyProjectIds(s);
  assert.deepEqual(s.json('geosan_projects'), [
    { id: 'proj-iya-002', name: 'canonical', updated_at: '2026-01-01T00:00:00Z', monthly_budget_usd: 777 }
  ]);
});

test('budget fallback: a winner with its own budget keeps it; no budget anywhere stays without one', () => {
  const s = new MemoryStorage({
    geosan_projects: [
      { id: 'proj-iya-001', name: 'loser', monthly_budget_usd: 333, updated_at: '2026-09-01T00:00:00Z' },
      { id: 'proj-iyanu-002', name: 'winner', monthly_budget_usd: 0, updated_at: '2026-10-15T00:00:00Z' }
    ]
  });
  migrateLegacyProjectIds(s);
  assert.equal(s.json('geosan_projects')[0].monthly_budget_usd, 0, 'an explicit budget (even 0) is the winner\'s own');
  const t = new MemoryStorage({
    geosan_projects: [{ id: 'proj-iya-001', name: 'a' }, { id: 'proj-iyanu-002', name: 'b', updated_at: '2026-10-15T00:00:00Z' }]
  });
  migrateLegacyProjectIds(t);
  assert.deepEqual(t.json('geosan_projects'), [{ id: 'proj-iya-002', name: 'b', updated_at: '2026-10-15T00:00:00Z' }]);
});

// --- Only ISO-8601 style timestamps are readable dates ---

test('date reader: "1" (which Date.parse reads as 2001) is treated as missing', () => {
  const s = new MemoryStorage({
    geosan_projects: [
      { id: 'proj-iya-001', name: 'odd date "1"', updated_at: '1' },
      { id: 'proj-iyanu-002', name: 'real date', updated_at: '1999-01-01T00:00:00Z' }
    ]
  });
  migrateLegacyProjectIds(s);
  assert.deepEqual(names(s), ['real date']);
});

test('date reader: only ISO-8601 style strings are read', () => {
  for (const bad of ['1', '2026', 'Oct 5 2026', '10/05/2026', '2026-02-30', '2026-10-01T24:00:00Z', '1790812800000']) {
    assert.ok(Number.isNaN(parseIsoTimestamp(bad)), bad);
  }
  assert.ok(Number.isNaN(parseIsoTimestamp(1790812800000)), 'numbers are not read');
  const t = Date.UTC(2026, 9, 1);
  for (const good of ['2026-10-01', '2026-10-01T00:00:00Z', '2026-10-01T00:00:00.000Z', '2026-10-01 00:00:00+00', '2026-10-01T01:00:00+01:00', '2026-10-01T01:00:00+0100']) {
    assert.equal(parseIsoTimestamp(good), t, good);
  }
});
