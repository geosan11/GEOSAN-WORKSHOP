import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LEGACY_PROJECT_ID_MAP,
  canonicalProjectId,
  migrateLegacyProjectIds,
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
