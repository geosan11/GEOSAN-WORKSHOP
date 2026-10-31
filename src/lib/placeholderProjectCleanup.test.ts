import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PLACEHOLDER_PROJECT_IDS,
  PER_PROJECT_KEY_PREFIXES,
  cleanupPlaceholderProjects,
  isPlaceholderProjectId,
  type StorageLike,
} from './placeholderProjectCleanup';
import { DEFAULT_WORKSPACE_ID } from './workspace';
import { projectsFromStorage } from '../hooks/useProjects';

class MemoryStorage implements StorageLike {
  private readonly map = new Map<string, string>();
  public writes: string[] = [];

  constructor(initial?: Record<string, string>) {
    if (initial) {
      for (const [k, v] of Object.entries(initial)) {
        this.map.set(k, v);
      }
    }
  }

  get length(): number {
    return this.map.size;
  }

  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }

  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.writes.push(key);
    this.map.set(key, String(value));
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  readJson<T = unknown>(key: string): T {
    const raw = this.getItem(key);
    assert.notEqual(raw, null, `Expected key "${key}" to exist`);
    return JSON.parse(raw!) as T;
  }

  snapshot(): Record<string, string> {
    return Object.fromEntries(this.map.entries());
  }
}

const EXPECTED_EIGHT_IDS = [
  'proj-ehi-001',
  'proj-iya-002',
  'proj-iyanu-002',
  'proj-iya-001',
  'proj-aero-003',
  'proj-aviation-003',
  'proj-edge-004',
  'proj-edgepoint-004',
];

test('geosan_projects: removes all 8 placeholder project ids (old and canonical) and keeps real projects', () => {
  assert.deepEqual([...PLACEHOLDER_PROJECT_IDS], EXPECTED_EIGHT_IDS);
  for (const id of EXPECTED_EIGHT_IDS) {
    assert.equal(isPlaceholderProjectId(id), true);
  }
  assert.equal(isPlaceholderProjectId('proj-real-001'), false);

  const storage = new MemoryStorage({
    geosan_projects: JSON.stringify([
      ...EXPECTED_EIGHT_IDS.map((id) => ({ id, name: `Placeholder ${id}` })),
      { id: 'proj-real-001', name: 'Real Alpha' },
      { id: 'proj-real-002', name: 'Real Beta' },
    ]),
  });

  const report = cleanupPlaceholderProjects(storage);
  assert.deepEqual(storage.readJson('geosan_projects'), [
    { id: 'proj-real-001', name: 'Real Alpha' },
    { id: 'proj-real-002', name: 'Real Beta' },
  ]);
  assert.deepEqual(report.removedEntries, { geosan_projects: 8 });
});

test('geosan_tasks: removes placeholder tasks across old and canonical ids and keeps other projects', () => {
  const storage = new MemoryStorage({
    geosan_tasks: JSON.stringify([
      { id: 'task-1', project_id: 'proj-ehi-001', title: 'EHI task' },
      { id: 'task-2', project_id: 'proj-iyanu-002', title: 'Iyanu canonical task' },
      { id: 'task-3', projectId: 'proj-edge-004', title: 'Edge old id camelCase task' },
      { id: 'task-real', project_id: 'proj-real-001', title: 'Real task' },
    ]),
  });

  const report = cleanupPlaceholderProjects(storage);
  assert.deepEqual(storage.readJson('geosan_tasks'), [
    { id: 'task-real', project_id: 'proj-real-001', title: 'Real task' },
  ]);
  assert.deepEqual(report.removedEntries, { geosan_tasks: 3 });
});

test('geosan_costs: removes placeholder cost records and keeps other projects', () => {
  const storage = new MemoryStorage({
    geosan_costs: JSON.stringify([
      { id: 'cost-1', project_id: 'proj-iya-002', cost_usd: 1.25 },
      { id: 'cost-2', project_id: 'proj-aviation-003', cost_usd: 2.5 },
      { id: 'cost-real', project_id: 'proj-real-001', cost_usd: 3.75 },
    ]),
  });

  const report = cleanupPlaceholderProjects(storage);
  assert.deepEqual(storage.readJson('geosan_costs'), [
    { id: 'cost-real', project_id: 'proj-real-001', cost_usd: 3.75 },
  ]);
  assert.deepEqual(report.removedEntries, { geosan_costs: 2 });
});

test('geosan_qa_runs: removes placeholder QA runs and keeps other projects', () => {
  const storage = new MemoryStorage({
    geosan_qa_runs: JSON.stringify([
      { id: 'run-ehi', project_id: 'proj-ehi-001', status: 'passed' },
      { id: 'run-aero', project_id: 'proj-aero-003', status: 'failed' },
      { id: 'run-real', project_id: 'proj-real-001', status: 'passed' },
    ]),
  });

  const report = cleanupPlaceholderProjects(storage);
  assert.deepEqual(storage.readJson('geosan_qa_runs'), [
    { id: 'run-real', project_id: 'proj-real-001', status: 'passed' },
  ]);
  assert.deepEqual(report.removedEntries, { geosan_qa_runs: 2 });
});

test('geosan_qa_findings: removes findings by placeholder project_id and findings of a removed run, keeping others', () => {
  const storage = new MemoryStorage({
    geosan_qa_runs: JSON.stringify([
      { id: 'run-removed', project_id: 'proj-edgepoint-004' },
      { id: 'run-kept', project_id: 'proj-real-001' },
    ]),
    geosan_qa_findings: JSON.stringify([
      { id: 'finding-direct', project_id: 'proj-ehi-001', run_id: 'run-other' },
      { id: 'finding-via-run', run_id: 'run-removed', title: 'Orphaned by removed run' },
      { id: 'finding-kept', project_id: 'proj-real-001', run_id: 'run-kept', title: 'Valid finding' },
    ]),
  });

  const report = cleanupPlaceholderProjects(storage);
  assert.deepEqual(storage.readJson('geosan_qa_findings'), [
    { id: 'finding-kept', project_id: 'proj-real-001', run_id: 'run-kept', title: 'Valid finding' },
  ]);
  assert.equal(report.removedEntries.geosan_qa_findings, 2);
});

test('geosan_conversations: removes placeholder conversations and keeps other projects', () => {
  const storage = new MemoryStorage({
    geosan_conversations: JSON.stringify([
      { id: 'conv-iya', project_id: 'proj-iya-001', title: 'Iya old id chat' },
      { id: 'conv-edge', project_id: 'proj-edge-004', title: 'Edge chat' },
      { id: 'conv-real', project_id: 'proj-real-001', title: 'Real chat' },
    ]),
  });

  const report = cleanupPlaceholderProjects(storage);
  assert.deepEqual(storage.readJson('geosan_conversations'), [
    { id: 'conv-real', project_id: 'proj-real-001', title: 'Real chat' },
  ]);
  assert.deepEqual(report.removedEntries, { geosan_conversations: 2 });
});

test('geosan_messages: removes messages by placeholder project_id and messages of a removed conversation, keeping others', () => {
  const storage = new MemoryStorage({
    geosan_conversations: JSON.stringify([
      { id: 'conv-removed', project_id: 'proj-ehi-001' },
      { id: 'conv-kept', project_id: 'proj-real-001' },
    ]),
    geosan_messages: JSON.stringify([
      { id: 'msg-direct', project_id: 'proj-aviation-003', conversation_id: 'conv-standalone', content: 'Placeholder msg' },
      { id: 'msg-via-conv', conversation_id: 'conv-removed', content: 'Belongs to removed conversation' },
      { id: 'msg-kept', project_id: 'proj-real-001', conversation_id: 'conv-kept', content: 'Kept msg' },
    ]),
  });

  const report = cleanupPlaceholderProjects(storage);
  assert.deepEqual(storage.readJson('geosan_messages'), [
    { id: 'msg-kept', project_id: 'proj-real-001', conversation_id: 'conv-kept', content: 'Kept msg' },
  ]);
  assert.equal(report.removedEntries.geosan_messages, 2);
});

test('geosan_linked_components: removes records with placeholder projectId and keeps other projects', () => {
  const storage = new MemoryStorage({
    geosan_linked_components: JSON.stringify([
      { id: 'comp-1', projectId: 'proj-ehi-001', name: 'Header' },
      { id: 'comp-2', projectId: 'proj-iyanu-002', name: 'Footer' },
      { id: 'comp-real', projectId: 'proj-real-001', name: 'Dashboard' },
    ]),
  });

  const report = cleanupPlaceholderProjects(storage);
  assert.deepEqual(storage.readJson('geosan_linked_components'), [
    { id: 'comp-real', projectId: 'proj-real-001', name: 'Dashboard' },
  ]);
  assert.deepEqual(report.removedEntries, { geosan_linked_components: 2 });
});

test('geosan_session_issue_reports: removes reports whose sessionId matches a removed task id and keeps others', () => {
  const storage = new MemoryStorage({
    geosan_tasks: JSON.stringify([
      { id: 'task-placeholder-session', project_id: 'proj-ehi-001' },
      { id: 'task-real-session', project_id: 'proj-real-001' },
    ]),
    geosan_session_issue_reports: JSON.stringify([
      { id: 'rep-1', sessionId: 'task-placeholder-session', category: 'Timeout', description: 'Timed out' },
      { id: 'rep-2', sessionId: 'other-session', projectId: 'proj-aero-003', category: 'Proxy', description: 'Proxy issue' },
      { id: 'rep-kept', sessionId: 'task-real-session', category: 'Navigation', description: 'Kept report' },
    ]),
  });

  const report = cleanupPlaceholderProjects(storage);
  assert.deepEqual(storage.readJson('geosan_session_issue_reports'), [
    { id: 'rep-kept', sessionId: 'task-real-session', category: 'Navigation', description: 'Kept report' },
  ]);
  assert.equal(report.removedEntries.geosan_session_issue_reports, 2);
});

test('aetherorch_learning_vault: removes records with placeholder projectId and keeps other projects', () => {
  const storage = new MemoryStorage({
    aetherorch_learning_vault: JSON.stringify([
      { id: 'learn-1', projectId: 'proj-edgepoint-004', insight: 'Old insight' },
      { id: 'learn-2', projectId: 'proj-iya-002', insight: 'Another placeholder insight' },
      { id: 'learn-real', projectId: 'proj-real-001', insight: 'Real insight' },
    ]),
  });

  const report = cleanupPlaceholderProjects(storage);
  assert.deepEqual(storage.readJson('aetherorch_learning_vault'), [
    { id: 'learn-real', projectId: 'proj-real-001', insight: 'Real insight' },
  ]);
  assert.deepEqual(report.removedEntries, { aetherorch_learning_vault: 2 });
});

test('aether_recent_destinations: removes project-<id> strings for all 8 placeholder ids and keeps other entries', () => {
  const storage = new MemoryStorage({
    aether_recent_destinations: JSON.stringify([
      ...EXPECTED_EIGHT_IDS.map((id) => `project-${id}`),
      'project-proj-real-001',
      'runs',
      'settings',
    ]),
  });

  const report = cleanupPlaceholderProjects(storage);
  assert.deepEqual(storage.readJson('aether_recent_destinations'), [
    'project-proj-real-001',
    'runs',
    'settings',
  ]);
  assert.deepEqual(report.removedEntries, { aether_recent_destinations: 8 });
});

test('unknown other geosan_* list: removes placeholder entries and keeps other projects', () => {
  const storage = new MemoryStorage({
    geosan_custom_snapshots: JSON.stringify([
      { id: 'snap-1', project_id: 'proj-ehi-001' },
      { id: 'snap-2', projectId: 'proj-aviation-003' },
      { id: 'snap-real', project_id: 'proj-real-001' },
    ]),
  });

  const report = cleanupPlaceholderProjects(storage);
  assert.deepEqual(storage.readJson('geosan_custom_snapshots'), [
    { id: 'snap-real', project_id: 'proj-real-001' },
  ]);
  assert.deepEqual(report.removedEntries, { geosan_custom_snapshots: 2 });
});

test('per-project keys: deletes aetherorch_discovery_<id>, geosan_design_brief_<id>, ehi.disclosure.project-<id>, geosan_project_logs_<id> for placeholder ids and keeps others', () => {
  assert.deepEqual([...PER_PROJECT_KEY_PREFIXES], [
    'aetherorch_discovery_',
    'geosan_design_brief_',
    'ehi.disclosure.project-',
    'geosan_project_logs_',
  ]);

  const initial: Record<string, string> = {};
  const expectedRemovedKeys: string[] = [];
  for (const prefix of PER_PROJECT_KEY_PREFIXES) {
    for (const id of EXPECTED_EIGHT_IDS) {
      const key = `${prefix}${id}`;
      initial[key] = JSON.stringify({ projectId: id });
      expectedRemovedKeys.push(key);
    }
    initial[`${prefix}proj-real-001`] = JSON.stringify({ projectId: 'proj-real-001' });
  }

  const storage = new MemoryStorage(initial);
  const report = cleanupPlaceholderProjects(storage);

  for (const removedKey of expectedRemovedKeys) {
    assert.equal(storage.getItem(removedKey), null, `Expected ${removedKey} to be deleted`);
  }
  for (const prefix of PER_PROJECT_KEY_PREFIXES) {
    const keptKey = `${prefix}proj-real-001`;
    assert.deepEqual(storage.readJson(keptKey), { projectId: 'proj-real-001' });
  }
  assert.deepEqual(report.removedKeys.sort(), expectedRemovedKeys.sort());
});

test('other projects parent_task_id and cost task_id pointing at a removed task become null', () => {
  const storage = new MemoryStorage({
    geosan_tasks: JSON.stringify([
      { id: 'task-removed', project_id: 'proj-ehi-001', parent_task_id: null },
      { id: 'task-real-root', project_id: 'proj-real-001', parent_task_id: null },
      { id: 'task-real-linked', project_id: 'proj-real-001', parent_task_id: 'task-removed' },
      { id: 'task-real-kept-parent', project_id: 'proj-real-001', parent_task_id: 'task-real-root' },
    ]),
    geosan_costs: JSON.stringify([
      { id: 'cost-linked-to-removed', project_id: 'proj-real-001', task_id: 'task-removed', cost_usd: 1.5 },
      { id: 'cost-linked-to-kept', project_id: 'proj-real-001', task_id: 'task-real-root', cost_usd: 2.0 },
    ]),
  });

  const report = cleanupPlaceholderProjects(storage);

  assert.deepEqual(storage.readJson('geosan_tasks'), [
    { id: 'task-real-root', project_id: 'proj-real-001', parent_task_id: null },
    { id: 'task-real-linked', project_id: 'proj-real-001', parent_task_id: null },
    { id: 'task-real-kept-parent', project_id: 'proj-real-001', parent_task_id: 'task-real-root' },
  ]);
  assert.deepEqual(storage.readJson('geosan_costs'), [
    { id: 'cost-linked-to-removed', project_id: 'proj-real-001', task_id: null, cost_usd: 1.5 },
    { id: 'cost-linked-to-kept', project_id: 'proj-real-001', task_id: 'task-real-root', cost_usd: 2.0 },
  ]);
  assert.deepEqual(report.removedEntries, { geosan_tasks: 1 });
});

test('non-JSON values are left untouched and reported once in skippedKeys', () => {
  const storage = new MemoryStorage({
    geosan_projects: '{not-valid-json',
    geosan_tasks: JSON.stringify([{ id: 'task-ehi', project_id: 'proj-ehi-001' }]),
    geosan_costs: 'broken-costs-json',
    geosan_font_scale: 'medium',
  });

  const report = cleanupPlaceholderProjects(storage);

  assert.equal(storage.getItem('geosan_projects'), '{not-valid-json');
  assert.equal(storage.getItem('geosan_costs'), 'broken-costs-json');
  assert.equal(storage.getItem('geosan_font_scale'), 'medium');
  assert.deepEqual(report.skippedKeys.sort(), [
    'geosan_costs',
    'geosan_font_scale',
    'geosan_projects',
  ]);
});

test('idempotence, empty storage no-op, and accurate report counts', () => {
  const empty = new MemoryStorage();
  assert.deepEqual(cleanupPlaceholderProjects(empty), {
    removedEntries: {},
    removedKeys: [],
    skippedKeys: [],
    movedWorkspaceIds: {},
  });
  assert.equal(empty.length, 0);

  const populated = new MemoryStorage({
    geosan_projects: JSON.stringify([
      { id: 'proj-ehi-001' },
      { id: 'proj-iya-002' },
      { id: 'proj-real-001' },
    ]),
    geosan_tasks: JSON.stringify([
      { id: 't-ehi', project_id: 'proj-ehi-001' },
      { id: 't-real', project_id: 'proj-real-001', parent_task_id: 't-ehi' },
    ]),
    aether_recent_destinations: JSON.stringify(['project-proj-ehi-001', 'project-proj-real-001']),
    'aetherorch_discovery_proj-ehi-001': '{"step":1}',
    'geosan_design_brief_proj-iya-002': '{"brief":true}',
    'geosan_project_logs_proj-real-001': '[]',
    geosan_broken: 'not-json',
  });

  const firstReport = cleanupPlaceholderProjects(populated);
  assert.deepEqual(firstReport, {
    removedEntries: {
      geosan_projects: 2,
      geosan_tasks: 1,
      aether_recent_destinations: 1,
    },
    removedKeys: [
      'aetherorch_discovery_proj-ehi-001',
      'geosan_design_brief_proj-iya-002',
    ],
    skippedKeys: ['geosan_broken'],
    movedWorkspaceIds: {},
  });

  const afterFirst = populated.snapshot();
  const secondReport = cleanupPlaceholderProjects(populated);
  assert.deepEqual(secondReport, {
    removedEntries: {},
    removedKeys: [],
    skippedKeys: ['geosan_broken'],
    movedWorkspaceIds: {},
  });
  assert.deepEqual(populated.snapshot(), afterFirst);
});

test('workspace id move - geosan_projects: rewrites both legacy ids to DEFAULT_WORKSPACE_ID, preserves count/order/fields, and leaves DEFAULT_WORKSPACE_ID untouched', () => {
  const storage = new MemoryStorage({
    geosan_projects: JSON.stringify([
      { id: 'proj-real-1', org_id: 'org-ehi-global', name: 'First', monthly_budget_usd: 500 },
      { id: 'proj-real-2', org_id: 'org-geosan', workspace_id: 'org-ehi-global', name: 'Second', monthly_budget_usd: 800 },
      { id: 'proj-real-3', org_id: DEFAULT_WORKSPACE_ID, name: 'Third', monthly_budget_usd: 1200 },
    ]),
  });

  const report = cleanupPlaceholderProjects(storage);
  assert.deepEqual(storage.readJson('geosan_projects'), [
    { id: 'proj-real-1', org_id: DEFAULT_WORKSPACE_ID, name: 'First', monthly_budget_usd: 500 },
    { id: 'proj-real-2', org_id: DEFAULT_WORKSPACE_ID, workspace_id: DEFAULT_WORKSPACE_ID, name: 'Second', monthly_budget_usd: 800 },
    { id: 'proj-real-3', org_id: DEFAULT_WORKSPACE_ID, name: 'Third', monthly_budget_usd: 1200 },
  ]);
  assert.deepEqual(report.movedWorkspaceIds, { geosan_projects: 2 });
});

test('workspace id move - geosan_tasks: rewrites both legacy ids to DEFAULT_WORKSPACE_ID, preserves count/order/fields, and leaves DEFAULT_WORKSPACE_ID untouched', () => {
  const storage = new MemoryStorage({
    geosan_tasks: JSON.stringify([
      { id: 't-1', project_id: 'proj-real-1', org_id: 'org-ehi-global', title: 'Alpha' },
      { id: 't-2', project_id: 'proj-real-1', orgId: 'org-geosan', title: 'Beta' },
      { id: 't-3', project_id: 'proj-real-1', org_id: DEFAULT_WORKSPACE_ID, title: 'Gamma' },
    ]),
  });

  const report = cleanupPlaceholderProjects(storage);
  assert.deepEqual(storage.readJson('geosan_tasks'), [
    { id: 't-1', project_id: 'proj-real-1', org_id: DEFAULT_WORKSPACE_ID, title: 'Alpha' },
    { id: 't-2', project_id: 'proj-real-1', orgId: DEFAULT_WORKSPACE_ID, title: 'Beta' },
    { id: 't-3', project_id: 'proj-real-1', org_id: DEFAULT_WORKSPACE_ID, title: 'Gamma' },
  ]);
  assert.deepEqual(report.movedWorkspaceIds, { geosan_tasks: 2 });
});

test('workspace id move - geosan_costs: rewrites both legacy ids to DEFAULT_WORKSPACE_ID, preserves count/order/fields, and leaves DEFAULT_WORKSPACE_ID untouched', () => {
  const storage = new MemoryStorage({
    geosan_costs: JSON.stringify([
      { id: 'c-1', project_id: 'proj-real-1', org_id: 'org-ehi-global', cost_usd: 1.1 },
      { id: 'c-2', project_id: 'proj-real-1', workspace_id: 'org-geosan', cost_usd: 2.2 },
      { id: 'c-3', project_id: 'proj-real-1', org_id: DEFAULT_WORKSPACE_ID, cost_usd: 3.3 },
    ]),
  });

  const report = cleanupPlaceholderProjects(storage);
  assert.deepEqual(storage.readJson('geosan_costs'), [
    { id: 'c-1', project_id: 'proj-real-1', org_id: DEFAULT_WORKSPACE_ID, cost_usd: 1.1 },
    { id: 'c-2', project_id: 'proj-real-1', workspace_id: DEFAULT_WORKSPACE_ID, cost_usd: 2.2 },
    { id: 'c-3', project_id: 'proj-real-1', org_id: DEFAULT_WORKSPACE_ID, cost_usd: 3.3 },
  ]);
  assert.deepEqual(report.movedWorkspaceIds, { geosan_costs: 2 });
});

test('workspace id move - geosan_qa_runs: rewrites both legacy ids to DEFAULT_WORKSPACE_ID, preserves count/order/fields, and leaves DEFAULT_WORKSPACE_ID untouched', () => {
  const storage = new MemoryStorage({
    geosan_qa_runs: JSON.stringify([
      { id: 'r-1', project_id: 'proj-real-1', org_id: 'org-ehi-global', status: 'passed' },
      { id: 'r-2', project_id: 'proj-real-1', workspaceId: 'org-geosan', status: 'failed' },
      { id: 'r-3', project_id: 'proj-real-1', org_id: DEFAULT_WORKSPACE_ID, status: 'running' },
    ]),
  });

  const report = cleanupPlaceholderProjects(storage);
  assert.deepEqual(storage.readJson('geosan_qa_runs'), [
    { id: 'r-1', project_id: 'proj-real-1', org_id: DEFAULT_WORKSPACE_ID, status: 'passed' },
    { id: 'r-2', project_id: 'proj-real-1', workspaceId: DEFAULT_WORKSPACE_ID, status: 'failed' },
    { id: 'r-3', project_id: 'proj-real-1', org_id: DEFAULT_WORKSPACE_ID, status: 'running' },
  ]);
  assert.deepEqual(report.movedWorkspaceIds, { geosan_qa_runs: 2 });
});

test('workspace id move - geosan_qa_findings: rewrites both legacy ids to DEFAULT_WORKSPACE_ID, preserves count/order/fields, and leaves DEFAULT_WORKSPACE_ID untouched', () => {
  const storage = new MemoryStorage({
    geosan_qa_findings: JSON.stringify([
      { id: 'f-1', project_id: 'proj-real-1', org_id: 'org-ehi-global', severity: 'high' },
      { id: 'f-2', project_id: 'proj-real-1', org_id: 'org-geosan', severity: 'low' },
      { id: 'f-3', project_id: 'proj-real-1', org_id: DEFAULT_WORKSPACE_ID, severity: 'medium' },
    ]),
  });

  const report = cleanupPlaceholderProjects(storage);
  assert.deepEqual(storage.readJson('geosan_qa_findings'), [
    { id: 'f-1', project_id: 'proj-real-1', org_id: DEFAULT_WORKSPACE_ID, severity: 'high' },
    { id: 'f-2', project_id: 'proj-real-1', org_id: DEFAULT_WORKSPACE_ID, severity: 'low' },
    { id: 'f-3', project_id: 'proj-real-1', org_id: DEFAULT_WORKSPACE_ID, severity: 'medium' },
  ]);
  assert.deepEqual(report.movedWorkspaceIds, { geosan_qa_findings: 2 });
});

test('workspace id move - geosan_conversations: rewrites both legacy ids to DEFAULT_WORKSPACE_ID, preserves count/order/fields, and leaves DEFAULT_WORKSPACE_ID untouched', () => {
  const storage = new MemoryStorage({
    geosan_conversations: JSON.stringify([
      { id: 'cv-1', project_id: 'proj-real-1', org_id: 'org-ehi-global', title: 'Conv 1' },
      { id: 'cv-2', project_id: 'proj-real-1', org_id: 'org-geosan', title: 'Conv 2' },
      { id: 'cv-3', project_id: 'proj-real-1', org_id: DEFAULT_WORKSPACE_ID, title: 'Conv 3' },
    ]),
  });

  const report = cleanupPlaceholderProjects(storage);
  assert.deepEqual(storage.readJson('geosan_conversations'), [
    { id: 'cv-1', project_id: 'proj-real-1', org_id: DEFAULT_WORKSPACE_ID, title: 'Conv 1' },
    { id: 'cv-2', project_id: 'proj-real-1', org_id: DEFAULT_WORKSPACE_ID, title: 'Conv 2' },
    { id: 'cv-3', project_id: 'proj-real-1', org_id: DEFAULT_WORKSPACE_ID, title: 'Conv 3' },
  ]);
  assert.deepEqual(report.movedWorkspaceIds, { geosan_conversations: 2 });
});

test('workspace id move - geosan_messages: rewrites both legacy ids to DEFAULT_WORKSPACE_ID, preserves count/order/fields, and leaves DEFAULT_WORKSPACE_ID untouched', () => {
  const storage = new MemoryStorage({
    geosan_messages: JSON.stringify([
      { id: 'm-1', project_id: 'proj-real-1', org_id: 'org-ehi-global', content: 'Hello' },
      { id: 'm-2', project_id: 'proj-real-1', org_id: 'org-geosan', content: 'World' },
      { id: 'm-3', project_id: 'proj-real-1', org_id: DEFAULT_WORKSPACE_ID, content: 'Done' },
    ]),
  });

  const report = cleanupPlaceholderProjects(storage);
  assert.deepEqual(storage.readJson('geosan_messages'), [
    { id: 'm-1', project_id: 'proj-real-1', org_id: DEFAULT_WORKSPACE_ID, content: 'Hello' },
    { id: 'm-2', project_id: 'proj-real-1', org_id: DEFAULT_WORKSPACE_ID, content: 'World' },
    { id: 'm-3', project_id: 'proj-real-1', org_id: DEFAULT_WORKSPACE_ID, content: 'Done' },
  ]);
  assert.deepEqual(report.movedWorkspaceIds, { geosan_messages: 2 });
});

test('workspace id move - geosan_linked_components: rewrites both legacy ids to DEFAULT_WORKSPACE_ID, preserves count/order/fields, and leaves DEFAULT_WORKSPACE_ID untouched', () => {
  const storage = new MemoryStorage({
    geosan_linked_components: JSON.stringify([
      { id: 'lc-1', projectId: 'proj-real-1', orgId: 'org-ehi-global', name: 'Nav' },
      { id: 'lc-2', projectId: 'proj-real-1', workspaceId: 'org-geosan', name: 'Hero' },
      { id: 'lc-3', projectId: 'proj-real-1', orgId: DEFAULT_WORKSPACE_ID, name: 'Card' },
    ]),
  });

  const report = cleanupPlaceholderProjects(storage);
  assert.deepEqual(storage.readJson('geosan_linked_components'), [
    { id: 'lc-1', projectId: 'proj-real-1', orgId: DEFAULT_WORKSPACE_ID, name: 'Nav' },
    { id: 'lc-2', projectId: 'proj-real-1', workspaceId: DEFAULT_WORKSPACE_ID, name: 'Hero' },
    { id: 'lc-3', projectId: 'proj-real-1', orgId: DEFAULT_WORKSPACE_ID, name: 'Card' },
  ]);
  assert.deepEqual(report.movedWorkspaceIds, { geosan_linked_components: 2 });
});

test('workspace id move - geosan_session_issue_reports: rewrites both legacy ids to DEFAULT_WORKSPACE_ID, preserves count/order/fields, and leaves DEFAULT_WORKSPACE_ID untouched', () => {
  const storage = new MemoryStorage({
    geosan_session_issue_reports: JSON.stringify([
      { id: 'ir-1', sessionId: 's-1', org_id: 'org-ehi-global', category: 'Timeout' },
      { id: 'ir-2', sessionId: 's-2', orgId: 'org-geosan', category: 'Proxy' },
      { id: 'ir-3', sessionId: 's-3', org_id: DEFAULT_WORKSPACE_ID, category: 'Navigation' },
    ]),
  });

  const report = cleanupPlaceholderProjects(storage);
  assert.deepEqual(storage.readJson('geosan_session_issue_reports'), [
    { id: 'ir-1', sessionId: 's-1', org_id: DEFAULT_WORKSPACE_ID, category: 'Timeout' },
    { id: 'ir-2', sessionId: 's-2', orgId: DEFAULT_WORKSPACE_ID, category: 'Proxy' },
    { id: 'ir-3', sessionId: 's-3', org_id: DEFAULT_WORKSPACE_ID, category: 'Navigation' },
  ]);
  assert.deepEqual(report.movedWorkspaceIds, { geosan_session_issue_reports: 2 });
});

test('workspace id move - per-project geosan_project_logs_<id>: rewrites both legacy ids to DEFAULT_WORKSPACE_ID, preserves count/order/fields, and leaves DEFAULT_WORKSPACE_ID untouched', () => {
  const key = 'geosan_project_logs_proj-real-1';
  const storage = new MemoryStorage({
    [key]: JSON.stringify([
      { id: 'log-1', org_id: 'org-ehi-global', message: 'Step 1' },
      { id: 'log-2', workspace_id: 'org-geosan', message: 'Step 2' },
      { id: 'log-3', org_id: DEFAULT_WORKSPACE_ID, message: 'Step 3' },
    ]),
  });

  const report = cleanupPlaceholderProjects(storage);
  assert.deepEqual(storage.readJson(key), [
    { id: 'log-1', org_id: DEFAULT_WORKSPACE_ID, message: 'Step 1' },
    { id: 'log-2', workspace_id: DEFAULT_WORKSPACE_ID, message: 'Step 2' },
    { id: 'log-3', org_id: DEFAULT_WORKSPACE_ID, message: 'Step 3' },
  ]);
  assert.deepEqual(report.movedWorkspaceIds, { [key]: 2 });
});

test('workspace id move - unknown geosan_* list: rewrites both legacy ids to DEFAULT_WORKSPACE_ID, preserves count/order/fields, and leaves DEFAULT_WORKSPACE_ID untouched', () => {
  const storage = new MemoryStorage({
    geosan_custom_audit: JSON.stringify([
      { id: 'aud-1', project_id: 'proj-real-1', org_id: 'org-ehi-global', action: 'create' },
      { id: 'aud-2', project_id: 'proj-real-1', workspaceId: 'org-geosan', action: 'update' },
      { id: 'aud-3', project_id: 'proj-real-1', org_id: DEFAULT_WORKSPACE_ID, action: 'verify' },
    ]),
  });

  const report = cleanupPlaceholderProjects(storage);
  assert.deepEqual(storage.readJson('geosan_custom_audit'), [
    { id: 'aud-1', project_id: 'proj-real-1', org_id: DEFAULT_WORKSPACE_ID, action: 'create' },
    { id: 'aud-2', project_id: 'proj-real-1', workspaceId: DEFAULT_WORKSPACE_ID, action: 'update' },
    { id: 'aud-3', project_id: 'proj-real-1', org_id: DEFAULT_WORKSPACE_ID, action: 'verify' },
  ]);
  assert.deepEqual(report.movedWorkspaceIds, { geosan_custom_audit: 2 });
});

test('workspace id move - aetherorch_learning_vault: rewrites both legacy ids to DEFAULT_WORKSPACE_ID, preserves count/order/fields, and leaves DEFAULT_WORKSPACE_ID untouched', () => {
  const storage = new MemoryStorage({
    aetherorch_learning_vault: JSON.stringify([
      { id: 'lv-1', projectId: 'proj-real-1', workspace_id: 'org-ehi-global', insight: 'A' },
      { id: 'lv-2', projectId: 'proj-real-1', workspaceId: 'org-geosan', insight: 'B' },
      { id: 'lv-3', projectId: 'proj-real-1', workspace_id: DEFAULT_WORKSPACE_ID, insight: 'C' },
    ]),
  });

  const report = cleanupPlaceholderProjects(storage);
  assert.deepEqual(storage.readJson('aetherorch_learning_vault'), [
    { id: 'lv-1', projectId: 'proj-real-1', workspace_id: DEFAULT_WORKSPACE_ID, insight: 'A' },
    { id: 'lv-2', projectId: 'proj-real-1', workspaceId: DEFAULT_WORKSPACE_ID, insight: 'B' },
    { id: 'lv-3', projectId: 'proj-real-1', workspace_id: DEFAULT_WORKSPACE_ID, insight: 'C' },
  ]);
  assert.deepEqual(report.movedWorkspaceIds, { aetherorch_learning_vault: 2 });
});

test('workspace id move is idempotent and writes a key only when something changed', () => {
  const storage = new MemoryStorage({
    geosan_projects: JSON.stringify([
      { id: 'proj-real-1', org_id: 'org-ehi-global', name: 'Alpha' },
      { id: 'proj-real-2', org_id: DEFAULT_WORKSPACE_ID, name: 'Beta' },
    ]),
    geosan_tasks: JSON.stringify([
      { id: 'task-real-1', project_id: 'proj-real-1', org_id: DEFAULT_WORKSPACE_ID },
    ]),
  });

  const first = cleanupPlaceholderProjects(storage);
  assert.deepEqual(first.movedWorkspaceIds, { geosan_projects: 1 });
  assert.deepEqual(storage.writes, ['geosan_projects']);

  storage.writes = [];
  const second = cleanupPlaceholderProjects(storage);
  assert.deepEqual(second.movedWorkspaceIds, {});
  assert.deepEqual(storage.writes, []);
});

test('workspace id move leaves non-JSON values untouched across geosan_*, per-project logs, and aetherorch_learning_vault', () => {
  const storage = new MemoryStorage({
    'geosan_project_logs_proj-real-1': 'not-json-logs',
    aetherorch_learning_vault: '{broken-vault',
    geosan_unknown_list: 'plain-string',
  });

  const report = cleanupPlaceholderProjects(storage);
  assert.equal(storage.getItem('geosan_project_logs_proj-real-1'), 'not-json-logs');
  assert.equal(storage.getItem('aetherorch_learning_vault'), '{broken-vault');
  assert.equal(storage.getItem('geosan_unknown_list'), 'plain-string');
  assert.deepEqual(report.movedWorkspaceIds, {});
  assert.deepEqual(storage.writes, []);
  assert.deepEqual(report.skippedKeys.sort(), [
    'aetherorch_learning_vault',
    'geosan_project_logs_proj-real-1',
    'geosan_unknown_list',
  ]);
});

test('owner non-placeholder data under both old workspace ids stays visible via projectsFromStorage with DEFAULT_WORKSPACE_ID', () => {
  const storage = new MemoryStorage({
    geosan_projects: JSON.stringify([
      { id: 'proj-owner-1', org_id: 'org-ehi-global', name: 'Owner Project One', monthly_budget_usd: 1000 },
      { id: 'proj-owner-2', org_id: 'org-geosan', name: 'Owner Project Two', monthly_budget_usd: 2000 },
    ]),
    geosan_tasks: JSON.stringify([
      { id: 'task-owner-1', project_id: 'proj-owner-1', org_id: 'org-ehi-global', title: 'Task One' },
      { id: 'task-owner-2', project_id: 'proj-owner-2', org_id: 'org-geosan', title: 'Task Two' },
    ]),
  });

  const report = cleanupPlaceholderProjects(storage);
  assert.deepEqual(report.removedEntries, {});
  assert.deepEqual(report.movedWorkspaceIds, {
    geosan_projects: 2,
    geosan_tasks: 2,
  });

  const { projects } = projectsFromStorage(storage.getItem('geosan_projects'));
  assert.equal(projects.length, 2);
  assert.deepEqual(projects.map((p) => p.id), ['proj-owner-1', 'proj-owner-2']);
  for (const p of projects) {
    assert.equal(p.org_id, DEFAULT_WORKSPACE_ID);
  }

  const tasks = storage.readJson<Array<{ id: string; org_id: string }>>('geosan_tasks');
  assert.equal(tasks.length, 2);
  assert.deepEqual(tasks.map((t) => t.id), ['task-owner-1', 'task-owner-2']);
  for (const t of tasks) {
    assert.equal(t.org_id, DEFAULT_WORKSPACE_ID);
  }
});
