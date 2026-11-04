import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  topBarModel,
  spendTileModel,
  providersTileModel,
  databaseTileModel,
  githubTileModel,
  agentsModel,
  parseGitHubRepo,
} from './cockpitModel';
import { Project, CostEvent, AgentTask } from './types';

const FORBIDDEN_WORDS = [
  'K8S',
  'ops/sec',
  'CPU',
  'MEM',
  'latency',
  'Monthly burn',
  'alive',
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
  ];

  for (let i = 0; i < allOutputs.length; i++) {
    assertNoForbiddenCopy(allOutputs[i], `output[${i}]`);
  }
});
