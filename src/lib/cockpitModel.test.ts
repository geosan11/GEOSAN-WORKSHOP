import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  topBarModel,
  spendTileModel,
  providersTileModel,
  databaseTileModel,
  githubTileModel,
  agentsModel,
  activityFeedModel,
  filterActivityLogs,
  redactSecrets,
  sanitizePayloadForExport,
  exportActivityLogsAsJson,
  parseGitHubRepo,
} from './cockpitModel';
import type { ProjectLogItem } from '../hooks/useProjectRealtime';
import { Project, CostEvent, AgentTask, QARun } from './types';

const FORBIDDEN_WORDS = [
  'K8S',
  'ops/sec',
  'CPU',
  'MEM',
  'latency',
  'Monthly burn',
  'alive',
  'heartbeat',
];

function assertNoForbiddenCopy(obj: unknown, context: string): void {
  const json = JSON.stringify(obj);
  for (const word of FORBIDDEN_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    assert.equal(
      regex.test(json),
      false,
      `Forbidden word "${word}" found in ${context}: ${json}`
    );
  }
}

// ----------------------------------------------------------------------------
// topBarModel Tests
// ----------------------------------------------------------------------------
test('topBarModel: empty data yields default title, null repo, Supabase env, and disabled proxy', () => {
  const model = topBarModel({});
  assert.equal(model.title, 'Cockpit');
  assert.equal(model.repoLabel, null);
  assert.equal(model.envLabel, 'Supabase');
  assert.equal(model.proxyLabel, 'Proxy disabled');
  assertNoForbiddenCopy(model, 'topBarModel(empty)');
});

test('topBarModel: partial data with project name but no repo', () => {
  const project: Project = {
    id: 'proj-1',
    org_id: 'org-test',
    name: 'Logistics Engine',
    slug: 'logistics-engine',
    vertical: 'logistics',
    repo_url: null,
    vercel_deployment_url: null,
    status: 'building',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const model = topBarModel({ projects: [project], isDemoMode: false, proxyState: 'disabled' });
  assert.equal(model.title, 'Logistics Engine');
  assert.equal(model.repoLabel, null);
  assert.equal(model.envLabel, 'Supabase');
  assert.equal(model.proxyLabel, 'Proxy disabled');
  assertNoForbiddenCopy(model, 'topBarModel(partial)');
});

test('topBarModel: full data parses various GitHub repo URL formats and proxy states', () => {
  const makeProj = (url: string): Project => ({
    id: 'proj-2',
    org_id: 'org-test',
    name: 'TaskPulse AI',
    slug: 'taskpulse-ai',
    vertical: 'productivity',
    github_repo_url: url,
    repo_url: url,
    vercel_deployment_url: null,
    status: 'production',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // HTTPS with .git
  const m1 = topBarModel({
    projects: [makeProj('https://github.com/geosan11/taskpulse.git')],
    isDemoMode: true,
    proxyState: 'reachable',
  });
  assert.equal(m1.title, 'TaskPulse AI');
  assert.equal(m1.repoLabel, 'geosan11/taskpulse');
  assert.equal(m1.envLabel, 'Demo mode');
  assert.equal(m1.proxyLabel, 'Proxy connected');

  // SSH format
  const m2 = topBarModel({
    projects: [makeProj('git@github.com:geosan-ai/workshop-core.git')],
    isDemoMode: false,
    proxyState: 'unreachable',
  });
  assert.equal(m2.repoLabel, 'geosan-ai/workshop-core');
  assert.equal(m2.proxyLabel, 'Proxy unreachable');

  // Direct owner/repo format
  const m3 = topBarModel({
    projects: [makeProj('geosan-ai/fleet-monitor')],
    proxyState: 'unknown',
  });
  assert.equal(m3.repoLabel, 'geosan-ai/fleet-monitor');
  assert.equal(m3.proxyLabel, 'Checking proxy…');

  // Refused format
  const m4 = topBarModel({
    projects: [makeProj('geosan-ai/fleet-monitor')],
    proxyState: 'refused',
  });
  assert.equal(m4.proxyLabel, 'Proxy refused (sign in as owner / repo not assigned)');

  assertNoForbiddenCopy({ m1, m2, m3, m4 }, 'topBarModel(full)');
});

test('topBarModel: all 5 proxy state labels match PR 2 requirements exactly', () => {
  assert.equal(topBarModel({ proxyState: 'reachable' }).proxyLabel, 'Proxy connected');
  assert.equal(
    topBarModel({ proxyState: 'refused' }).proxyLabel,
    'Proxy refused (sign in as owner / repo not assigned)'
  );
  assert.equal(topBarModel({ proxyState: 'unreachable' }).proxyLabel, 'Proxy unreachable');
  assert.equal(topBarModel({ proxyState: 'disabled' }).proxyLabel, 'Proxy disabled');
  assert.equal(topBarModel({ proxyState: 'unknown' }).proxyLabel, 'Checking proxy…');
});

test('parseGitHubRepo: helper correctly validates and extracts owner/repo', () => {
  assert.equal(parseGitHubRepo(null), null);
  assert.equal(parseGitHubRepo(''), null);
  assert.equal(parseGitHubRepo('https://notgithub.com/org/repo'), null);
  assert.equal(parseGitHubRepo('invalid-slug'), null);
  assert.equal(parseGitHubRepo('https://github.com/foo/bar'), 'foo/bar');
  assert.equal(parseGitHubRepo('git@github.com:foo/bar.git'), 'foo/bar');
  assert.equal(parseGitHubRepo('foo/bar'), 'foo/bar');
});

// ----------------------------------------------------------------------------
// spendTileModel Tests
// ----------------------------------------------------------------------------
test('spendTileModel: empty data returns honest empty state without delta', () => {
  const model = spendTileModel({});
  assert.equal(model.title, 'Spend this week');
  assert.equal(model.label, 'Spend this week');
  assert.equal(model.total, null);
  assert.equal(model.formattedTotal, null);
  assert.equal(model.capUsd, null);
  assert.equal(model.formattedCap, null);
  assert.equal(model.percent, null);
  assert.equal(model.level, null);
  assert.equal(model.emptyState, 'No spend recorded this week');
  assert.equal(model.hasData, false);
  assertNoForbiddenCopy(model, 'spendTileModel(empty)');
});

test('spendTileModel: empty-with-cap returns emptyState but preserves cap and 0 percent ok level', () => {
  const model = spendTileModel({ costEvents: [], capUsd: 3.0 });
  assert.equal(model.total, null);
  assert.equal(model.formattedTotal, null);
  assert.equal(model.capUsd, 3.0);
  assert.equal(model.formattedCap, '$3.00');
  assert.equal(model.percent, 0);
  assert.equal(model.level, 'ok');
  assert.equal(model.emptyState, 'No spend recorded this week');
  assert.equal(model.hasData, false);
  assertNoForbiddenCopy(model, 'spendTileModel(empty-with-cap)');
});

test('spendTileModel: partial data with cost events outside current week', () => {
  const pastDate = new Date('2025-01-01T12:00:00Z');
  const pastEvents: CostEvent[] = [
    {
      id: 'cost-1',
      org_id: 'org-test',
      project_id: 'proj-1',
      task_id: 'task-1',
      provider: 'anthropic',
      model: 'claude-3-5-sonnet',
      tokens_input: 100,
      tokens_output: 50,
      cost_usd: 12.5,
      attributed_to: null,
      created_at: pastDate.toISOString(),
    },
  ];

  const now = new Date('2026-11-04T12:00:00Z');
  const model = spendTileModel({ costEvents: pastEvents, now });
  assert.equal(model.total, null);
  assert.equal(model.emptyState, 'No spend recorded this week');
  assert.equal(model.hasData, false);
  assertNoForbiddenCopy(model, 'spendTileModel(partial)');
});

test('spendTileModel: full data sums this ISO week events precisely without delta', () => {
  const now = new Date('2026-11-04T12:00:00Z'); // W45 of 2026
  const events: CostEvent[] = [
    {
      id: 'cost-1',
      org_id: 'org-test',
      project_id: 'proj-1',
      task_id: 'task-1',
      provider: 'anthropic',
      model: 'claude-3-5-sonnet',
      tokens_input: 1000,
      tokens_output: 500,
      cost_usd: 0.42,
      attributed_to: null,
      created_at: '2026-11-03T10:00:00Z', // Same week
    },
    {
      id: 'cost-2',
      org_id: 'org-test',
      project_id: 'proj-1',
      task_id: 'task-2',
      provider: 'deepseek',
      model: 'deepseek-r1',
      tokens_input: 5000,
      tokens_output: 2000,
      cost_usd: 1.08,
      attributed_to: null,
      created_at: '2026-11-04T08:00:00Z', // Same week
    },
    {
      id: 'cost-past',
      org_id: 'org-test',
      project_id: 'proj-1',
      task_id: 'task-0',
      provider: 'openai',
      model: 'gpt-4o',
      tokens_input: 200,
      tokens_output: 100,
      cost_usd: 5.0,
      attributed_to: null,
      created_at: '2026-10-20T10:00:00Z', // Previous month
    },
  ];

  const model = spendTileModel({ costEvents: events, now });
  assert.equal(model.hasData, true);
  assert.equal(model.emptyState, null);
  assert.equal(model.total, 1.5);
  assert.equal(model.formattedTotal, '$1.50');
  assert.equal(model.capUsd, null);
  assert.equal(model.formattedCap, null);
  assert.equal(model.percent, null);
  assert.equal(model.level, null);
  // Check no delta or monthly burn property exists
  assert.equal('delta' in (model as unknown as Record<string, unknown>), false);
  assert.equal('monthlyBurn' in (model as unknown as Record<string, unknown>), false);
  assertNoForbiddenCopy(model, 'spendTileModel(full)');
});

test('spendTileModel: cap thresholds ok (<80%), warn (80-99%), over (>=100%) and no cap', () => {
  const makeEvent = (cost_usd: number): CostEvent => ({
    id: 'c-test',
    org_id: 'org-1',
    project_id: 'proj-1',
    task_id: null,
    provider: 'anthropic',
    model: 'claude-3-5-sonnet',
    tokens_input: 10,
    tokens_output: 10,
    cost_usd,
    attributed_to: null,
    created_at: new Date('2026-11-04T12:00:00Z').toISOString(),
  });
  const now = new Date('2026-11-04T12:00:00Z');

  // ok: spend $1.50 vs cap $3.00 = 50% (<80%)
  const okModel = spendTileModel({
    costEvents: [makeEvent(1.5)],
    capUsd: 3.0,
    now,
  });
  assert.equal(okModel.capUsd, 3.0);
  assert.equal(okModel.formattedCap, '$3.00');
  assert.equal(okModel.percent, 50);
  assert.equal(okModel.level, 'ok');

  // warn: spend $2.40 vs cap $3.00 = 80% (80-99%)
  const warnModel80 = spendTileModel({
    costEvents: [makeEvent(2.4)],
    capUsd: 3.0,
    now,
  });
  assert.equal(warnModel80.percent, 80);
  assert.equal(warnModel80.level, 'warn');

  // warn: spend $2.97 vs cap $3.00 = 99% (80-99%)
  const warnModel99 = spendTileModel({
    costEvents: [makeEvent(2.97)],
    capUsd: 3.0,
    now,
  });
  assert.equal(warnModel99.percent, 99);
  assert.equal(warnModel99.level, 'warn');

  // over: spend $3.00 vs cap $3.00 = 100% (>=100%)
  const overModel100 = spendTileModel({
    costEvents: [makeEvent(3.0)],
    capUsd: 3.0,
    now,
  });
  assert.equal(overModel100.percent, 100);
  assert.equal(overModel100.level, 'over');

  // over: spend $4.50 vs cap $3.00 = 150% (>=100%)
  const overModel150 = spendTileModel({
    costEvents: [makeEvent(4.5)],
    capUsd: 3.0,
    now,
  });
  assert.equal(overModel150.percent, 150);
  assert.equal(overModel150.level, 'over');

  // no cap: capUsd undefined or <= 0
  const noCapModel = spendTileModel({
    costEvents: [makeEvent(1.5)],
    capUsd: 0,
    now,
  });
  assert.equal(noCapModel.capUsd, null);
  assert.equal(noCapModel.formattedCap, null);
  assert.equal(noCapModel.percent, null);
  assert.equal(noCapModel.level, null);
  assert.equal(noCapModel.formattedTotal, '$1.50');

  assertNoForbiddenCopy({ okModel, warnModel80, warnModel99, overModel100, noCapModel }, 'spendTileModel(cap thresholds)');
});

// ----------------------------------------------------------------------------
// providersTileModel Tests
// ----------------------------------------------------------------------------
test('providersTileModel: empty data yields honest empty state', () => {
  const model = providersTileModel({});
  assert.equal(model.title, 'AI providers');
  assert.equal(model.label, 'AI providers');
  assert.deepEqual(model.providers, []);
  assert.deepEqual(model.models, []);
  assert.deepEqual(model.chips, []);
  assert.equal(model.moreCount, 0);
  assert.equal(model.emptyState, 'No AI providers used yet');
  assert.equal(model.hasData, false);
  assertNoForbiddenCopy(model, 'providersTileModel(empty)');
});

test('providersTileModel: partial data extracts distinct providers even with blanks', () => {
  const events: CostEvent[] = [
    {
      id: 'c-1',
      org_id: 'org-1',
      project_id: 'p-1',
      task_id: null,
      provider: 'google',
      model: 'gemini-1.5-pro',
      tokens_input: 100,
      tokens_output: 100,
      cost_usd: 0.05,
      attributed_to: null,
      created_at: new Date().toISOString(),
    },
    {
      id: 'c-2',
      org_id: 'org-1',
      project_id: 'p-1',
      task_id: null,
      provider: 'google',
      model: 'gemini-1.5-pro', // Duplicate
      tokens_input: 100,
      tokens_output: 100,
      cost_usd: 0.05,
      attributed_to: null,
      created_at: new Date().toISOString(),
    },
  ];

  const model = providersTileModel({ costEvents: events });
  assert.equal(model.hasData, true);
  assert.equal(model.emptyState, null);
  assert.deepEqual(model.providers, ['google']);
  assert.deepEqual(model.models, ['gemini-1.5-pro']);
  assert.deepEqual(model.chips, ['gemini-1.5-pro']);
  assert.equal(model.moreCount, 0);
  assertNoForbiddenCopy(model, 'providersTileModel(partial)');
});

test('providersTileModel: full data extracts distinct providers and models', () => {
  const events: CostEvent[] = [
    {
      id: 'c-1',
      org_id: 'org-1',
      project_id: 'p-1',
      task_id: null,
      provider: 'anthropic',
      model: 'claude-3-5-sonnet',
      tokens_input: 100,
      tokens_output: 100,
      cost_usd: 0.1,
      attributed_to: null,
      created_at: new Date().toISOString(),
    },
    {
      id: 'c-2',
      org_id: 'org-1',
      project_id: 'p-1',
      task_id: null,
      provider: 'deepseek',
      model: 'deepseek-r1',
      tokens_input: 100,
      tokens_output: 100,
      cost_usd: 0.05,
      attributed_to: null,
      created_at: new Date().toISOString(),
    },
    {
      id: 'c-3',
      org_id: 'org-1',
      project_id: 'p-1',
      task_id: null,
      provider: 'openai',
      model: 'gpt-4o',
      tokens_input: 100,
      tokens_output: 100,
      cost_usd: 0.15,
      attributed_to: null,
      created_at: new Date().toISOString(),
    },
  ];

  const model = providersTileModel({ costEvents: events });
  assert.equal(model.hasData, true);
  assert.equal(model.emptyState, null);
  assert.deepEqual(model.providers, ['anthropic', 'deepseek', 'openai']);
  assert.deepEqual(model.models, ['claude-3-5-sonnet', 'deepseek-r1', 'gpt-4o']);
  assert.deepEqual(model.chips, ['claude-3-5-sonnet', 'deepseek-r1', 'gpt-4o']);
  assert.equal(model.moreCount, 0);
  assertNoForbiddenCopy(model, 'providersTileModel(full)');
});

test('providersTileModel: caps chips at 6 and computes +N more', () => {
  const modelNames = [
    'gpt-4o',
    'gpt-4o-mini',
    'claude-3-5-sonnet',
    'claude-3-5-haiku',
    'deepseek-r1',
    'deepseek-v3',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
  ];

  const events: CostEvent[] = modelNames.map((name, i) => ({
    id: `c-${i}`,
    org_id: 'org-1',
    project_id: 'p-1',
    task_id: null,
    provider: 'openai',
    model: name,
    tokens_input: 100,
    tokens_output: 100,
    cost_usd: 0.01,
    attributed_to: null,
    created_at: new Date().toISOString(),
  }));

  const model = providersTileModel({ costEvents: events });
  assert.equal(model.hasData, true);
  assert.equal(model.models.length, 8);
  assert.equal(model.chips.length, 6);
  assert.deepEqual(model.chips, modelNames.slice(0, 6));
  assert.equal(model.moreCount, 2);
  assert.equal(model.overflowCount, 2);
  assertNoForbiddenCopy(model, 'providersTileModel(+N more)');
});

// ----------------------------------------------------------------------------
// databaseTileModel Tests
// ----------------------------------------------------------------------------
test('databaseTileModel: maps connection error, demo mode, and connected state', () => {
  // Empty/default -> Connected
  const def = databaseTileModel({});
  assert.equal(def.title, 'Database');
  assert.equal(def.status, 'Connected');
  assert.equal(def.emptyState, 'Connected');
  assertNoForbiddenCopy(def, 'databaseTileModel(default)');

  // Demo mode
  const demo = databaseTileModel({ isDemoMode: true });
  assert.equal(demo.status, 'Demo mode (no Supabase)');
  assert.equal(demo.emptyState, 'Demo mode (no Supabase)');
  assertNoForbiddenCopy(demo, 'databaseTileModel(demo)');

  // Connection error
  const err = databaseTileModel({ connectionError: 'Failed to connect to postgres' });
  assert.equal(err.status, 'Connection error');
  assert.equal(err.emptyState, 'Connection error');
  assertNoForbiddenCopy(err, 'databaseTileModel(error)');

  // Connection error takes precedence over demo mode
  const errDemo = databaseTileModel({ isDemoMode: true, connectionError: new Error('Network timeout') });
  assert.equal(errDemo.status, 'Connection error');
  assertNoForbiddenCopy(errDemo, 'databaseTileModel(error+demo)');
});

// ----------------------------------------------------------------------------
// githubTileModel Tests
// ----------------------------------------------------------------------------
test('githubTileModel: requires reachable proxy, otherwise prompts connection with muted footnote', () => {
  const disabled = githubTileModel({ proxyState: 'disabled' });
  assert.equal(disabled.title, 'GitHub');
  assert.equal(disabled.emptyState, 'Connect the local proxy to see the latest commit');
  assert.equal(disabled.footnote, "CI runs aren't available through the proxy yet.");
  assert.equal(disabled.hasData, false);
  assert.equal(disabled.latestCommit, null);
  assertNoForbiddenCopy(disabled, 'githubTileModel(disabled)');

  const unknownState = githubTileModel({ proxyState: 'unknown' });
  assert.equal(unknownState.emptyState, 'Connect the local proxy to see the latest commit');

  const unreachable = githubTileModel({ proxyState: 'unreachable' });
  assert.equal(unreachable.emptyState, 'Connect the local proxy to see the latest commit');

  const refused = githubTileModel({ proxyState: 'refused' });
  assert.equal(refused.emptyState, 'Connect the local proxy to see the latest commit');

  const reachable = githubTileModel({
    proxyState: 'reachable',
    latestCommit: {
      sha7: '1234567',
      message: 'feat: cockpit updates',
      date: '2026-11-04T12:00:00Z',
    },
  });
  assert.equal(reachable.title, 'GitHub');
  assert.equal(reachable.emptyState, null);
  assert.equal(reachable.hasData, true);
  assert.deepEqual(reachable.latestCommit, {
    sha7: '1234567',
    message: 'feat: cockpit updates',
    date: '2026-11-04T12:00:00Z',
  });
  assert.equal(reachable.footnote, "CI runs aren't available through the proxy yet.");
  assertNoForbiddenCopy(reachable, 'githubTileModel(reachable)');
});

// ----------------------------------------------------------------------------
// agentsModel Tests
// ----------------------------------------------------------------------------
test('agentsModel: empty data returns honest empty state', () => {
  const empty = agentsModel({});
  assert.deepEqual(empty.agents, []);
  assert.equal(empty.totalAgents, 0);
  assert.equal(empty.totalActiveTasks, 0);
  assert.equal(empty.emptyState, 'No active agent tasks');
  assert.equal(empty.hasData, false);
  assertNoForbiddenCopy(empty, 'agentsModel(empty)');
});

test('agentsModel: filters out terminal tasks (done, failed, cancelled)', () => {
  const tasks: AgentTask[] = [
    {
      id: 't-1',
      org_id: 'org-1',
      project_id: 'p-1',
      parent_task_id: null,
      task_type: 'BUILD_FEATURE',
      prompt: 'Build something',
      status: 'done',
      assigned_agent: 'CoordinatorAgent',
      plan: null,
      result: null,
      branch_name: null,
      pr_url: null,
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
    },
    {
      id: 't-2',
      org_id: 'org-1',
      project_id: 'p-1',
      parent_task_id: null,
      task_type: 'FIX_BUG',
      prompt: 'Fix a bug',
      status: 'failed',
      assigned_agent: 'ReviewAgent',
      plan: null,
      result: null,
      branch_name: null,
      pr_url: null,
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
    },
    {
      id: 't-3',
      org_id: 'org-1',
      project_id: 'p-1',
      parent_task_id: null,
      task_type: 'REPORT',
      prompt: 'Generate report',
      status: 'cancelled',
      assigned_agent: 'CoordinatorAgent',
      plan: null,
      result: null,
      branch_name: null,
      pr_url: null,
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
    },
  ];

  const model = agentsModel({ tasks });
  assert.deepEqual(model.agents, []);
  assert.equal(model.totalAgents, 0);
  assert.equal(model.emptyState, 'No active agent tasks');
  assert.equal(model.hasData, false);
  assertNoForbiddenCopy(model, 'agentsModel(terminal only)');
});

test('agentsModel: groups non-terminal tasks by assigned_agent with status counts', () => {
  const tasks: AgentTask[] = [
    {
      id: 't-1',
      org_id: 'org-1',
      project_id: 'p-1',
      parent_task_id: null,
      task_type: 'BUILD_FEATURE',
      prompt: 'Feature 1',
      status: 'running',
      assigned_agent: 'CoordinatorAgent',
      plan: null,
      result: null,
      branch_name: null,
      pr_url: null,
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
    },
    {
      id: 't-2',
      org_id: 'org-1',
      project_id: 'p-1',
      parent_task_id: null,
      task_type: 'BUILD_FEATURE',
      prompt: 'Feature 2',
      status: 'queued',
      assigned_agent: 'CoordinatorAgent',
      plan: null,
      result: null,
      branch_name: null,
      pr_url: null,
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
    },
    {
      id: 't-3',
      org_id: 'org-1',
      project_id: 'p-1',
      parent_task_id: null,
      task_type: 'QA_SECURITY',
      prompt: 'Security audit',
      status: 'awaiting_approval',
      assigned_agent: 'SecurityAuditor',
      plan: null,
      result: null,
      branch_name: null,
      pr_url: null,
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
    },
    {
      id: 't-4',
      org_id: 'org-1',
      project_id: 'p-1',
      parent_task_id: null,
      task_type: 'FIX_BUG',
      prompt: 'Old bug',
      status: 'done', // Should be excluded
      assigned_agent: 'CoordinatorAgent',
      plan: null,
      result: null,
      branch_name: null,
      pr_url: null,
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
    },
  ];

  const model = agentsModel({ tasks });
  assert.equal(model.hasData, true);
  assert.equal(model.emptyState, null);
  assert.equal(model.totalAgents, 2);
  assert.equal(model.totalActiveTasks, 3);

  const coordinator = model.agents.find((a) => a.agent === 'CoordinatorAgent');
  assert.ok(coordinator);
  assert.equal(coordinator.totalTasks, 2);
  assert.equal(coordinator.counts.running, 1);
  assert.equal(coordinator.counts.queued, 1);
  assert.equal(coordinator.counts.awaiting_approval, 0);

  const security = model.agents.find((a) => a.agent === 'SecurityAuditor');
  assert.ok(security);
  assert.equal(security.totalTasks, 1);
  assert.equal(security.counts.running, 0);
  assert.equal(security.counts.queued, 0);
  assert.equal(security.counts.awaiting_approval, 1);

  assertNoForbiddenCopy(model, 'agentsModel(full)');
});

// Helper factories for agent model testing
function makeTestTask(overrides: Partial<AgentTask> = {}): AgentTask {
  return {
    id: overrides.id || `task-${Math.random().toString(36).substring(2, 9)}`,
    org_id: 'org-test',
    project_id: 'proj-test',
    parent_task_id: null,
    task_type: overrides.task_type || 'BUILD_FEATURE',
    prompt: overrides.prompt || 'Default prompt',
    status: overrides.status || 'running',
    assigned_agent: overrides.assigned_agent !== undefined ? overrides.assigned_agent : 'WorkerAgent',
    plan: null,
    result: null,
    branch_name: overrides.branch_name !== undefined ? overrides.branch_name : null,
    pr_url: overrides.pr_url !== undefined ? overrides.pr_url : null,
    created_at: overrides.created_at || '2026-11-04T10:00:00.000Z',
    started_at: overrides.started_at !== undefined ? overrides.started_at : null,
    completed_at: overrides.completed_at !== undefined ? overrides.completed_at : null,
    goal: overrides.goal,
  };
}

function makeTestQaRun(overrides: Partial<QARun> = {}): QARun {
  return {
    id: overrides.id || `qa-${Math.random().toString(36).substring(2, 9)}`,
    org_id: 'org-test',
    project_id: 'proj-test',
    task_id: overrides.task_id !== undefined ? overrides.task_id : null,
    run_type: 'explore',
    target_url: 'http://localhost:3000',
    target_platform: 'web',
    role_tested: null,
    status: overrides.status || 'completed',
    engine_used: null,
    findings_count: 0,
    replay_script_path: null,
    created_at: overrides.created_at || '2026-11-04T12:00:00.000Z',
    completed_at: null,
  };
}

test('agentsModel: grouping by real assigned_agent incl. null/blank → Unassigned', () => {
  const tasks = [
    makeTestTask({ id: 't-null', assigned_agent: null, status: 'running' }),
    makeTestTask({ id: 't-empty', assigned_agent: '', status: 'queued' }),
    makeTestTask({ id: 't-spaces', assigned_agent: '   ', status: 'awaiting_approval' }),
    makeTestTask({ id: 't-named', assigned_agent: 'SpecialAgent', status: 'running' }),
  ];

  const model = agentsModel({ tasks });
  assert.equal(model.totalAgents, 2);
  assert.equal(model.totalActiveTasks, 4);

  const unassigned = model.agents.find((a) => a.agent === 'Unassigned');
  assert.ok(unassigned);
  assert.equal(unassigned.totalTasks, 3);
  assert.equal(unassigned.counts.running, 1);
  assert.equal(unassigned.counts.queued, 1);
  assert.equal(unassigned.counts.awaiting_approval, 1);

  const named = model.agents.find((a) => a.agent === 'SpecialAgent');
  assert.ok(named);
  assert.equal(named.totalTasks, 1);
  assert.equal(named.counts.running, 1);
});

test('agentsModel: terminal tasks excluded from agents and task counts', () => {
  const tasks = [
    makeTestTask({ id: 't-done', assigned_agent: 'DoneAgentOnly', status: 'done' }),
    makeTestTask({ id: 't-failed', assigned_agent: 'DoneAgentOnly', status: 'failed' }),
    makeTestTask({ id: 't-cancelled', assigned_agent: 'CancelledAgent', status: 'cancelled' }),
    makeTestTask({ id: 't-proposed', assigned_agent: 'ProposedAgent', status: 'proposed' }),
    makeTestTask({ id: 't-blocked', assigned_agent: 'BlockedAgent', status: 'blocked' }),
    makeTestTask({ id: 't-active', assigned_agent: 'ActiveAgent', status: 'running' }),
    makeTestTask({ id: 't-terminal-also', assigned_agent: 'ActiveAgent', status: 'done' }),
  ];

  const model = agentsModel({ tasks });
  assert.equal(model.totalAgents, 1);
  assert.equal(model.totalActiveTasks, 1);
  assert.equal(model.agents[0].agent, 'ActiveAgent');
  assert.equal(model.agents[0].totalTasks, 1);
});

test('agentsModel: status priority running > awaiting_approval > queued', () => {
  const agent1Tasks = [
    makeTestTask({ id: 't1-run', assigned_agent: 'Agent1', status: 'running' }),
    makeTestTask({ id: 't1-await', assigned_agent: 'Agent1', status: 'awaiting_approval' }),
    makeTestTask({ id: 't1-queue', assigned_agent: 'Agent1', status: 'queued' }),
  ];

  const agent2Tasks = [
    makeTestTask({ id: 't2-await', assigned_agent: 'Agent2', status: 'awaiting_approval' }),
    makeTestTask({ id: 't2-queue', assigned_agent: 'Agent2', status: 'queued' }),
  ];

  const agent3Tasks = [
    makeTestTask({ id: 't3-queue', assigned_agent: 'Agent3', status: 'queued' }),
  ];

  const model = agentsModel({ tasks: [...agent1Tasks, ...agent2Tasks, ...agent3Tasks] });
  const a1 = model.agents.find((a) => a.agent === 'Agent1');
  const a2 = model.agents.find((a) => a.agent === 'Agent2');
  const a3 = model.agents.find((a) => a.agent === 'Agent3');

  assert.equal(a1?.status, 'running');
  assert.equal(a1?.statusLabel, 'Running');

  assert.equal(a2?.status, 'awaiting_approval');
  assert.equal(a2?.statusLabel, 'Awaiting approval');

  assert.equal(a3?.status, 'queued');
  assert.equal(a3?.statusLabel, 'Queued');
});

test('agentsModel: currentTask selection rules incl. goal vs prompt first line and 90-char cap', () => {
  // Agent running: newest by started_at wins
  const runningTasks = [
    makeTestTask({
      id: 't-run-old',
      assigned_agent: 'Runner',
      status: 'running',
      started_at: '2026-11-04T10:00:00.000Z',
      goal: 'Older running goal',
    }),
    makeTestTask({
      id: 't-run-new',
      assigned_agent: 'Runner',
      status: 'running',
      started_at: '2026-11-04T12:00:00.000Z',
      goal: 'Newest running goal',
    }),
  ];
  const m1 = agentsModel({ tasks: runningTasks });
  assert.equal(m1.agents[0].currentTask.id, 't-run-new');
  assert.equal(m1.agents[0].currentTask.title, 'Newest running goal');

  // Agent awaiting: oldest by created_at wins
  const awaitingTasks = [
    makeTestTask({
      id: 't-await-newer',
      assigned_agent: 'Approver',
      status: 'awaiting_approval',
      created_at: '2026-11-04T11:00:00.000Z',
      prompt: 'Newer awaiting prompt',
    }),
    makeTestTask({
      id: 't-await-older',
      assigned_agent: 'Approver',
      status: 'awaiting_approval',
      created_at: '2026-11-04T09:00:00.000Z',
      prompt: 'Older awaiting prompt',
    }),
  ];
  const m2 = agentsModel({ tasks: awaitingTasks });
  assert.equal(m2.agents[0].currentTask.id, 't-await-older');

  // Agent queued: oldest by created_at wins
  const queuedTasks = [
    makeTestTask({
      id: 't-queue-newer',
      assigned_agent: 'Queuer',
      status: 'queued',
      created_at: '2026-11-04T11:00:00.000Z',
    }),
    makeTestTask({
      id: 't-queue-older',
      assigned_agent: 'Queuer',
      status: 'queued',
      created_at: '2026-11-04T08:00:00.000Z',
    }),
  ];
  const m3 = agentsModel({ tasks: queuedTasks });
  assert.equal(m3.agents[0].currentTask.id, 't-queue-older');

  // Title rules:
  // (a) goal non-empty wins over prompt
  const tGoal = makeTestTask({
    id: 't-goal',
    assigned_agent: 'TitleTest',
    status: 'running',
    goal: 'Goal wins over prompt',
    prompt: 'Prompt first line\nSecond line',
  });
  assert.equal(agentsModel({ tasks: [tGoal] }).agents[0].currentTask.title, 'Goal wins over prompt');

  // (b) empty or whitespace goal falls back to prompt first line
  const tPromptFallback = makeTestTask({
    id: 't-pf',
    assigned_agent: 'TitleTest',
    status: 'running',
    goal: '   ',
    prompt: 'First line of prompt\nSecond line of prompt\nThird line',
  });
  assert.equal(agentsModel({ tasks: [tPromptFallback] }).agents[0].currentTask.title, 'First line of prompt');

  // (c) 90-char cap on goal
  const longGoal = 'X'.repeat(120);
  const tLongGoal = makeTestTask({
    id: 't-lg',
    assigned_agent: 'TitleTest',
    status: 'running',
    goal: longGoal,
  });
  const longGoalTitle = agentsModel({ tasks: [tLongGoal] }).agents[0].currentTask.title;
  assert.equal(longGoalTitle.length, 90);
  assert.equal(longGoalTitle, 'X'.repeat(90));

  // (d) 90-char cap on prompt first line
  const longPrompt = 'Y'.repeat(150) + '\nnext line';
  const tLongPrompt = makeTestTask({
    id: 't-lp',
    assigned_agent: 'TitleTest',
    status: 'running',
    goal: '',
    prompt: longPrompt,
  });
  const longPromptTitle = agentsModel({ tasks: [tLongPrompt] }).agents[0].currentTask.title;
  assert.equal(longPromptTitle.length, 90);
  assert.equal(longPromptTitle, 'Y'.repeat(90));
});

test('agentsModel: sinceIso choice (started_at for running, else created_at)', () => {
  // Running with started_at
  const runWithStart = makeTestTask({
    id: 't-rs',
    assigned_agent: 'A1',
    status: 'running',
    created_at: '2026-11-04T08:00:00.000Z',
    started_at: '2026-11-04T09:30:00.000Z',
  });
  assert.equal(agentsModel({ tasks: [runWithStart] }).agents[0].currentTask.sinceIso, '2026-11-04T09:30:00.000Z');

  // Running without started_at (fallback to created_at)
  const runWithoutStart = makeTestTask({
    id: 't-rns',
    assigned_agent: 'A2',
    status: 'running',
    created_at: '2026-11-04T08:00:00.000Z',
    started_at: null,
  });
  assert.equal(agentsModel({ tasks: [runWithoutStart] }).agents[0].currentTask.sinceIso, '2026-11-04T08:00:00.000Z');

  // Awaiting approval (uses created_at even if started_at exists)
  const awaitTask = makeTestTask({
    id: 't-aw',
    assigned_agent: 'A3',
    status: 'awaiting_approval',
    created_at: '2026-11-04T07:15:00.000Z',
    started_at: '2026-11-04T07:20:00.000Z',
  });
  assert.equal(agentsModel({ tasks: [awaitTask] }).agents[0].currentTask.sinceIso, '2026-11-04T07:15:00.000Z');

  // Queued (uses created_at)
  const queuedTask = makeTestTask({
    id: 't-q',
    assigned_agent: 'A4',
    status: 'queued',
    created_at: '2026-11-04T06:00:00.000Z',
    started_at: null,
  });
  assert.equal(agentsModel({ tasks: [queuedTask] }).agents[0].currentTask.sinceIso, '2026-11-04T06:00:00.000Z');
});

test('agentsModel: lastQa only by task_id match (qaRun with no or other task_id must NOT attach)', () => {
  const agentTasks = [
    makeTestTask({ id: 't-alpha-active', assigned_agent: 'AlphaAgent', status: 'running' }),
    makeTestTask({ id: 't-alpha-terminal', assigned_agent: 'AlphaAgent', status: 'done' }),
    makeTestTask({ id: 't-beta-active', assigned_agent: 'BetaAgent', status: 'running' }),
  ];

  const qaRuns: QARun[] = [
    makeTestQaRun({ id: 'qa-null', task_id: null, status: 'failed', created_at: '2026-11-04T15:00:00.000Z' }),
    makeTestQaRun({ id: 'qa-empty', task_id: '', status: 'failed', created_at: '2026-11-04T15:00:00.000Z' }),
    makeTestQaRun({ id: 'qa-unrelated', task_id: 't-other', status: 'failed', created_at: '2026-11-04T15:00:00.000Z' }),
    // Older QA on active task
    makeTestQaRun({ id: 'qa-alpha-old', task_id: 't-alpha-active', status: 'failed', created_at: '2026-11-04T10:00:00.000Z' }),
    // Newest QA on terminal task belonging to AlphaAgent (any status of task)
    makeTestQaRun({ id: 'qa-alpha-new', task_id: 't-alpha-terminal', status: 'completed', created_at: '2026-11-04T12:00:00.000Z' }),
  ];

  const model = agentsModel({ tasks: agentTasks, qaRuns });

  // BetaAgent has no matching qaRun -> null
  const beta = model.agents.find((a) => a.agent === 'BetaAgent');
  assert.ok(beta);
  assert.equal(beta.lastQa, null);

  // AlphaAgent matches newest QA run by created_at across all its tasks
  const alpha = model.agents.find((a) => a.agent === 'AlphaAgent');
  assert.ok(alpha);
  assert.ok(alpha.lastQa);
  assert.equal(alpha.lastQa.status, 'completed');
  assert.equal(alpha.lastQa.created_at, '2026-11-04T12:00:00.000Z');
});

test('agentsModel: sort order running first, then awaiting_approval, then queued, then by agent name', () => {
  const tasks = [
    makeTestTask({ id: 't-1', assigned_agent: 'ZetaAgent', status: 'running' }),
    makeTestTask({ id: 't-2', assigned_agent: 'BetaAgent', status: 'running' }),
    makeTestTask({ id: 't-3', assigned_agent: 'OmegaAgent', status: 'awaiting_approval' }),
    makeTestTask({ id: 't-4', assigned_agent: 'AlphaAgent', status: 'awaiting_approval' }),
    makeTestTask({ id: 't-5', assigned_agent: 'GammaAgent', status: 'queued' }),
    makeTestTask({ id: 't-6', assigned_agent: 'DeltaAgent', status: 'queued' }),
  ];

  const model = agentsModel({ tasks });
  const names = model.agents.map((a) => a.agent);

  assert.deepEqual(names, [
    'BetaAgent',   // running (B < Z)
    'ZetaAgent',   // running
    'AlphaAgent',  // awaiting_approval (A < O)
    'OmegaAgent',  // awaiting_approval
    'DeltaAgent',  // queued (D < G)
    'GammaAgent',  // queued
  ]);
});

test('agentsModel: forbidden-words check extended to full agents output', () => {
  const tasks = [
    makeTestTask({
      id: 't-1',
      assigned_agent: 'CoordinatorAgent',
      status: 'running',
      branch_name: 'feat/cockpit',
      pr_url: 'https://github.com/geosan/repo/pull/12',
      started_at: '2026-11-04T10:00:00.000Z',
      goal: 'Deliver cockpit agent cards without slop',
    }),
  ];
  const qaRuns = [
    makeTestQaRun({
      id: 'qa-1',
      task_id: 't-1',
      status: 'completed',
      created_at: '2026-11-04T11:00:00.000Z',
    }),
  ];

  const model = agentsModel({ tasks, qaRuns });
  assertNoForbiddenCopy(model, 'agentsModel(full extended)');

  const json = JSON.stringify(model);
  assert.equal(json.includes('"progress"'), false, 'agents model should not include progress field');
  assert.equal(/\b\d+%\b/.test(json), false, 'agents model should not include percent strings');
});

// ----------------------------------------------------------------------------
// Activity Feed Model & Pure Selectors (PR 4)
// ----------------------------------------------------------------------------
test('activityFeedModel: empty data yields honest empty state and zero counts', () => {
  const empty1 = activityFeedModel({});
  assert.equal(empty1.hasData, false);
  assert.equal(empty1.emptyState, 'No activity recorded yet');
  assert.equal(empty1.items.length, 0);
  assert.equal(empty1.totalCount, 0);
  assert.deepEqual(empty1.counts, { all: 0, errors: 0, status: 0, agent: 0 });

  const empty2 = activityFeedModel({ logs: [], tasks: [] });
  assert.equal(empty2.hasData, false);
  assert.equal(empty2.emptyState, 'No activity recorded yet');
  assert.equal(empty2.items.length, 0);
  assert.equal(empty2.totalCount, 0);
  assert.deepEqual(empty2.counts, { all: 0, errors: 0, status: 0, agent: 0 });
});

test('activityFeedModel: unifies project_logs and agent task state events in reverse chronological order', () => {
  const t1 = '2026-11-04T10:00:00.000Z';
  const t2 = '2026-11-04T11:00:00.000Z';
  const t3 = '2026-11-04T12:00:00.000Z';

  const logs: ProjectLogItem[] = [
    {
      id: 'log-1',
      project_id: 'p-1',
      timestamp: '11:00:00',
      agent: 'CodingAgent',
      provider: 'deepseek',
      actionType: 'code',
      level: 'info',
      message: 'Generated migration patch',
      payload: {
        created_at: t2,
        diff: '+ CREATE TABLE audit_events();',
      },
    },
  ];

  const tasks: AgentTask[] = [
    {
      id: 'task-1',
      org_id: 'org-1',
      project_id: 'p-1',
      parent_task_id: null,
      task_type: 'BUILD_FEATURE',
      prompt: 'Implement issue filter',
      goal: 'Issue filter bar',
      status: 'done',
      assigned_agent: 'ReviewAgent',
      plan: null,
      result: {
        diff: '+ export function filterIssues() {}',
      },
      branch_name: 'feat/filter',
      pr_url: 'https://github.com/geosan11/taskpulse/pull/12',
      created_at: t1,
      started_at: t1,
      completed_at: t3,
    },
  ];

  const feed = activityFeedModel({ logs, tasks });
  assert.equal(feed.hasData, true);
  assert.equal(feed.emptyState, null);
  assert.equal(feed.totalCount, 2);
  assert.equal(feed.items.length, 2);

  // Newest first: task-1 completed at t3 (12:00), log-1 at t2 (11:00)
  assert.equal(feed.items[0].id, 'task-1-terminal');
  assert.equal(feed.items[0].actionType, 'TASK_DONE');
  assert.equal(feed.items[0].diff, '+ export function filterIssues() {}');

  assert.equal(feed.items[1].id, 'log-1');
  assert.equal(feed.items[1].actionType, 'code');
  assert.equal(feed.items[1].diff, '+ CREATE TABLE audit_events();');
});

test('activityFeedModel: caps at 200 rows when input has 1,000 rows and completes in under 100 ms', () => {
  const thousandLogs: ProjectLogItem[] = [];
  const baseTime = new Date('2026-11-04T10:00:00.000Z').getTime();

  for (let i = 0; i < 1000; i++) {
    const iso = new Date(baseTime + i * 1000).toISOString();
    thousandLogs.push({
      id: `log-${i}`,
      project_id: 'p-perf',
      timestamp: iso.slice(11, 19),
      agent: i % 2 === 0 ? 'CodingAgent' : 'ReviewAgent',
      provider: 'anthropic',
      actionType: i % 5 === 0 ? 'error' : 'code',
      level: i % 5 === 0 ? 'error' : 'info',
      message: `Perf event ${i} executed`,
      payload: {
        created_at: iso,
        tokens_used: i * 10,
      },
    });
  }

  const startTime = performance.now();
  const feed = activityFeedModel({ logs: thousandLogs });
  const durationMs = performance.now() - startTime;

  assert.equal(feed.totalCount, 1000);
  assert.equal(feed.items.length, 200);
  assert.equal(feed.counts.all, 200);
  assert.ok(
    durationMs < 100,
    `activityFeedModel took ${durationMs.toFixed(2)} ms, expected < 100 ms`
  );

  // The 200 items should be the 200 newest (log-999 down to log-800)
  assert.equal(feed.items[0].id, 'log-999');
  assert.equal(feed.items[199].id, 'log-800');
});

test('filterActivityLogs: filters correctly for all, errors, status, and agent tabs', () => {
  const items = [
    {
      id: 'item-1',
      timestamp: '10:00:00',
      timestampIso: '2026-11-04T10:00:00Z',
      agent: 'CodingAgent',
      actionType: 'code',
      level: 'info' as const,
      message: 'Synthesized patch',
      source: 'project_log' as const,
    },
    {
      id: 'item-2',
      timestamp: '10:01:00',
      timestampIso: '2026-11-04T10:01:00Z',
      agent: 'ReviewAgent',
      actionType: 'error_audit',
      level: 'error' as const,
      message: 'Invariant failure in policy',
      source: 'project_log' as const,
    },
    {
      id: 'item-3',
      timestamp: '10:02:00',
      timestampIso: '2026-11-04T10:02:00Z',
      agent: 'Supervisor',
      actionType: 'STATUS_TOGGLE',
      level: 'info' as const,
      message: 'Operator paused agent executions',
      source: 'project_log' as const,
      payload: { agent_assignments_status: 'paused' },
    },
    {
      id: 'item-4',
      timestamp: '10:03:00',
      timestampIso: '2026-11-04T10:03:00Z',
      agent: 'CoordinatorAgent',
      actionType: 'TASK_RUNNING',
      level: 'info' as const,
      message: 'Task running: Setup test suite',
      source: 'task_state' as const,
    },
    {
      id: 'item-5',
      timestamp: '10:04:00',
      timestampIso: '2026-11-04T10:04:00Z',
      agent: 'System',
      actionType: 'sys_ping',
      level: 'info' as const,
      message: 'System initialization',
      source: 'project_log' as const,
    },
  ];

  // ALL tab
  const allFiltered = filterActivityLogs(items, 'all');
  assert.equal(allFiltered.length, 5);

  // ERRORS tab
  const errorsFiltered = filterActivityLogs(items, 'errors');
  assert.equal(errorsFiltered.length, 1);
  assert.equal(errorsFiltered[0].id, 'item-2');

  // STATUS tab
  const statusFiltered = filterActivityLogs(items, 'status');
  assert.equal(statusFiltered.length, 2);
  const statusIds = statusFiltered.map((i) => i.id);
  assert.ok(statusIds.includes('item-3'));
  assert.ok(statusIds.includes('item-4'));

  // AGENT tab: CodingAgent, ReviewAgent, Supervisor, CoordinatorAgent (excludes System)
  const agentFiltered = filterActivityLogs(items, 'agent');
  assert.equal(agentFiltered.length, 4);
  assert.ok(!agentFiltered.some((i) => i.id === 'item-5'));
});

test('activityFeedModel: realtime update reflects new log items immediately', () => {
  const initialLogs: ProjectLogItem[] = [
    {
      id: 'log-1',
      project_id: 'p-1',
      timestamp: '10:00:00',
      agent: 'CodingAgent',
      provider: 'deepseek',
      actionType: 'code',
      level: 'info',
      message: 'First log item',
      payload: { created_at: '2026-11-04T10:00:00Z' },
    },
  ];

  const feed1 = activityFeedModel({ logs: initialLogs });
  assert.equal(feed1.items.length, 1);
  assert.equal(feed1.items[0].id, 'log-1');

  // Realtime push: new log item arrives
  const newLog: ProjectLogItem = {
    id: 'log-2',
    project_id: 'p-1',
    timestamp: '10:05:00',
    agent: 'ReviewAgent',
    provider: 'anthropic',
    actionType: 'review',
    level: 'info',
    message: 'Second log item arrived via realtime',
    payload: { created_at: '2026-11-04T10:05:00Z' },
  };

  const feed2 = activityFeedModel({ logs: [newLog, ...initialLogs] });
  assert.equal(feed2.items.length, 2);
  assert.equal(feed2.items[0].id, 'log-2');
  assert.equal(feed2.items[1].id, 'log-1');
  assert.equal(feed2.counts.all, 2);
});

test('redactSecrets: redacts GitHub tokens, provider keys, Bearer headers, and JWTs', () => {
  const rawGhp = 'ghp_abcdef1234567890abcdef123456';
  assert.equal(redactSecrets(rawGhp), 'ghp_***');

  const rawPat = 'github_pat_11ABCD0123456789_abcdefghijklmnopqrstuvwxyz';
  assert.equal(redactSecrets(rawPat), 'github_pat_***');

  const rawGho = 'gho_1234567890abcdef1234567890';
  assert.equal(redactSecrets(rawGho), 'gho_***');

  const rawSk = 'sk-proj-1234567890abcdefghijklmnopqrst';
  assert.equal(redactSecrets(rawSk), 'sk-***');

  const rawBearer = 'Authorization: Bearer mySecretToken12345.abc';
  assert.equal(redactSecrets(rawBearer), 'Authorization: Bearer ***');

  const rawJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
  assert.equal(redactSecrets(rawJwt), 'eyJ***');

  const rawAssignment = 'database connection string password="secret_pwd_99" host=db';
  const redactedAssignment = redactSecrets(rawAssignment);
  assert.ok(!redactedAssignment.includes('secret_pwd_99'));
  assert.ok(redactedAssignment.includes('[REDACTED]'));
});

test('exportActivityLogsAsJson: allow-list filtering and sensitive payload redaction', () => {
  const secretToken = 'ghp_super_secret_token_12345678';
  const openAiKey = 'sk-proj-open_ai_secret_key_1234567';

  const feedItems = [
    {
      id: 'log-export-1',
      timestamp: '14:22:18',
      timestampIso: '2026-11-04T14:22:18.000Z',
      agent: 'CodingAgent',
      actionType: 'code',
      level: 'info' as const,
      message: `Generated patch using ${openAiKey}`,
      source: 'project_log' as const,
      diff: `+ git remote set-url origin https://${secretToken}@github.com/repo`,
      payload: {
        model: 'deepseek-r1',
        tokens_used: 1200,
        // Disallowed / sensitive fields that must NOT appear in export:
        database_password: 'super_secret_db_password',
        internal_auth_secret: 'secret_12345',
        arbitrary_unlisted_field: 'should_be_stripped',
      },
    },
  ];

  const exportedJson = exportActivityLogsAsJson(feedItems);
  const parsed = JSON.parse(exportedJson);

  assert.equal(Array.isArray(parsed), true);
  assert.equal(parsed.length, 1);

  const item = parsed[0];
  // Allowed top-level fields
  assert.equal(item.id, 'log-export-1');
  assert.equal(item.agent, 'CodingAgent');
  assert.equal(item.actionType, 'code');
  assert.equal(item.level, 'info');

  // Secrets in message and diff must be redacted
  assert.ok(!exportedJson.includes(secretToken), 'ghp token must not leak in exported JSON');
  assert.ok(!exportedJson.includes(openAiKey), 'sk token must not leak in exported JSON');
  assert.ok(item.message.includes('sk-***'));
  assert.ok(item.diff.includes('ghp_***'));

  // Disallowed payload fields stripped
  assert.equal(item.payload.model, 'deepseek-r1');
  assert.equal(item.payload.tokens_used, 1200);
  assert.equal(item.payload.database_password, undefined);
  assert.equal(item.payload.internal_auth_secret, undefined);
  assert.equal(item.payload.arbitrary_unlisted_field, undefined);
  assert.ok(!exportedJson.includes('super_secret_db_password'));
});

// ----------------------------------------------------------------------------
// Global Forbidden Copy Invariant Test
// ----------------------------------------------------------------------------
test('anti-slop invariant: zero selector outputs contain forbidden words', () => {
  const allOutputs = [
    topBarModel({}),
    topBarModel({ isDemoMode: true, proxyState: 'reachable' }),
    topBarModel({ proxyState: 'refused' }),
    topBarModel({ proxyState: 'unreachable' }),
    topBarModel({ proxyState: 'unknown' }),
    spendTileModel({}),
    spendTileModel({ capUsd: 3.0 }),
    spendTileModel({
      costEvents: [
        {
          id: 'c-1',
          org_id: 'org-1',
          project_id: 'p-1',
          task_id: null,
          provider: 'anthropic',
          model: 'claude-3-5-sonnet',
          tokens_input: 10,
          tokens_output: 10,
          cost_usd: 1.0,
          attributed_to: null,
          created_at: new Date().toISOString(),
        },
      ],
      capUsd: 3.0,
    }),
    providersTileModel({}),
    providersTileModel({
      costEvents: [
        {
          id: 'c-1',
          org_id: 'org-1',
          project_id: 'p-1',
          task_id: null,
          provider: 'anthropic',
          model: 'claude-3-5-sonnet',
          tokens_input: 10,
          tokens_output: 10,
          cost_usd: 1.0,
          attributed_to: null,
          created_at: new Date().toISOString(),
        },
      ],
    }),
    databaseTileModel({ isDemoMode: false }),
    databaseTileModel({ isDemoMode: true }),
    databaseTileModel({ connectionError: 'fail' }),
    githubTileModel({ proxyState: 'disabled' }),
    githubTileModel({ proxyState: 'refused' }),
    githubTileModel({
      proxyState: 'reachable',
      latestCommit: { sha7: '1234567', message: 'test', date: '2026-11-04T12:00:00Z' },
    }),
    agentsModel({}),
    agentsModel({
      tasks: [
        {
          id: 't-1',
          org_id: 'o-1',
          project_id: 'p-1',
          parent_task_id: null,
          task_type: 'BUILD_FEATURE',
          prompt: 'run',
          status: 'running',
          assigned_agent: 'Worker',
          plan: null,
          result: null,
          branch_name: null,
          pr_url: null,
          created_at: new Date().toISOString(),
          started_at: null,
          completed_at: null,
        },
      ],
    }),
    activityFeedModel({}),
    activityFeedModel({
      logs: [
        {
          id: 'l-1',
          project_id: 'p-1',
          timestamp: '14:22:04',
          agent: 'Supervisor',
          provider: 'local',
          actionType: 'status',
          level: 'info',
          message: 'Initialized plan',
        },
      ],
    }),
    exportActivityLogsAsJson([
      {
        id: 'l-1',
        timestamp: '14:22:04',
        timestampIso: new Date().toISOString(),
        agent: 'Supervisor',
        actionType: 'status',
        level: 'info',
        message: 'Initialized plan',
        source: 'project_log',
      },
    ]),
  ];

  for (let i = 0; i < allOutputs.length; i++) {
    assertNoForbiddenCopy(allOutputs[i], `output[${i}]`);
  }
});
