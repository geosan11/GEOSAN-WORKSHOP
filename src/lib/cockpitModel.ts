import { getIsoWeekKey } from './budget';
import type { Project, CostEvent, AgentTask, TaskType, QARun } from './types';
import type { ProjectLogItem } from '../hooks/useProjectRealtime';

export type ProxyState = 'unknown' | 'reachable' | 'unreachable' | 'disabled' | 'refused';

export interface TopBarModelInput {
  projects?: Project[] | null;
  isDemoMode?: boolean;
  proxyState?: ProxyState;
}

export interface TopBarModel {
  title: string;
  repoLabel: string | null;
  envLabel: 'Supabase' | 'Demo mode';
  proxyLabel: string;
}

export function parseGitHubRepo(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const clean = url.trim().replace(/\.git$/, '');

  // https://github.com/owner/repo or http://github.com/owner/repo
  const httpsMatch = clean.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s]+)\/([^/\s#?]+)/);
  if (httpsMatch) {
    return `${httpsMatch[1]}/${httpsMatch[2]}`;
  }

  // git@github.com:owner/repo
  const sshMatch = clean.match(/^git@github\.com:([^/\s]+)\/([^/\s#?]+)/);
  if (sshMatch) {
    return `${sshMatch[1]}/${sshMatch[2]}`;
  }

  // owner/repo direct format (only if not an http/https url to another domain)
  if (!clean.includes('://') && !clean.includes('@')) {
    const directMatch = clean.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
    if (directMatch) {
      return `${directMatch[1]}/${directMatch[2]}`;
    }
  }

  return null;
}

export function topBarModel(input: TopBarModelInput): TopBarModel {
  const { projects = [], isDemoMode = false, proxyState = 'disabled' } = input;
  const firstProject = projects && projects.length > 0 ? projects[0] : null;
  const title = firstProject?.name?.trim() ? firstProject.name : 'Cockpit';

  const rawRepo = firstProject?.github_repo_url || firstProject?.repo_url || null;
  const repoLabel = parseGitHubRepo(rawRepo);

  const envLabel: 'Supabase' | 'Demo mode' = isDemoMode ? 'Demo mode' : 'Supabase';

  let proxyLabel: string;
  switch (proxyState) {
    case 'reachable':
      proxyLabel = 'Proxy connected';
      break;
    case 'refused':
      proxyLabel = 'Proxy refused (sign in as owner / repo not assigned)';
      break;
    case 'unreachable':
      proxyLabel = 'Proxy unreachable';
      break;
    case 'disabled':
      proxyLabel = 'Proxy disabled';
      break;
    case 'unknown':
    default:
      proxyLabel = 'Checking proxy…';
      break;
  }

  return {
    title,
    repoLabel,
    envLabel,
    proxyLabel,
  };
}

export type SpendLevel = 'ok' | 'warn' | 'over';

export interface SpendTileModelInput {
  costEvents?: CostEvent[] | null;
  capUsd?: number;
  now?: Date;
}

export interface SpendTileModel {
  title: string;
  label: string;
  total: number | null;
  formattedTotal: string | null;
  capUsd: number | null;
  formattedCap: string | null;
  percent: number | null;
  level: SpendLevel | null;
  emptyState: string | null;
  hasData: boolean;
}

export function spendTileModel(input: SpendTileModelInput): SpendTileModel {
  const { costEvents = [], capUsd, now = new Date() } = input;
  const title = 'Spend this week';
  const label = 'Spend this week';

  const hasCap = typeof capUsd === 'number' && capUsd > 0;
  const resolvedCapUsd = hasCap ? capUsd : null;
  const formattedCap = hasCap ? `$${capUsd.toFixed(2)}` : null;

  const computeCapDetails = (spend: number) => {
    if (!hasCap) {
      return { percent: null, level: null };
    }
    const percent = Math.round((spend / capUsd) * 100);
    let level: SpendLevel;
    if (percent < 80) {
      level = 'ok';
    } else if (percent < 100) {
      level = 'warn';
    } else {
      level = 'over';
    }
    return { percent, level };
  };

  if (!costEvents || costEvents.length === 0) {
    const { percent, level } = computeCapDetails(0);
    return {
      title,
      label,
      total: null,
      formattedTotal: null,
      capUsd: resolvedCapUsd,
      formattedCap,
      percent,
      level,
      emptyState: 'No spend recorded this week',
      hasData: false,
    };
  }

  const currentWeekKey = getIsoWeekKey(now);
  const thisWeekEvents = costEvents.filter((event) => {
    if (!event.created_at) return false;
    try {
      const eventDate = new Date(event.created_at);
      if (Number.isNaN(eventDate.getTime())) return false;
      return getIsoWeekKey(eventDate) === currentWeekKey;
    } catch {
      return false;
    }
  });

  if (thisWeekEvents.length === 0) {
    const { percent, level } = computeCapDetails(0);
    return {
      title,
      label,
      total: null,
      formattedTotal: null,
      capUsd: resolvedCapUsd,
      formattedCap,
      percent,
      level,
      emptyState: 'No spend recorded this week',
      hasData: false,
    };
  }

  const total = thisWeekEvents.reduce((acc, curr) => acc + (Number(curr.cost_usd) || 0), 0);
  const formattedTotal = `$${total.toFixed(2)}`;
  const { percent, level } = computeCapDetails(total);

  return {
    title,
    label,
    total,
    formattedTotal,
    capUsd: resolvedCapUsd,
    formattedCap,
    percent,
    level,
    emptyState: null,
    hasData: true,
  };
}

export interface ProvidersTileModelInput {
  costEvents?: CostEvent[] | null;
}

export interface ProvidersTileModel {
  title: string;
  label: string;
  providers: string[];
  models: string[];
  chips: string[];
  moreCount: number;
  overflowCount: number;
  emptyState: string | null;
  hasData: boolean;
}

export function providersTileModel(input: ProvidersTileModelInput): ProvidersTileModel {
  const { costEvents = [] } = input;
  const title = 'AI providers';
  const label = 'AI providers';

  if (!costEvents || costEvents.length === 0) {
    return {
      title,
      label,
      providers: [],
      models: [],
      chips: [],
      moreCount: 0,
      overflowCount: 0,
      emptyState: 'No AI providers used yet',
      hasData: false,
    };
  }

  const providers = Array.from(
    new Set(costEvents.map((e) => e.provider).filter((p): p is CostEvent['provider'] => Boolean(p)))
  );
  const models = Array.from(
    new Set(costEvents.map((e) => e.model).filter((m): m is string => Boolean(m && m.trim())))
  );

  if (providers.length === 0 && models.length === 0) {
    return {
      title,
      label,
      providers: [],
      models: [],
      chips: [],
      moreCount: 0,
      overflowCount: 0,
      emptyState: 'No AI providers used yet',
      hasData: false,
    };
  }

  const allChips = models.length > 0 ? models : providers;
  const chips = allChips.slice(0, 6);
  const moreCount = Math.max(0, allChips.length - 6);

  return {
    title,
    label,
    providers,
    models,
    chips,
    moreCount,
    overflowCount: moreCount,
    emptyState: null,
    hasData: true,
  };
}

export type DatabaseStatus = 'Connected' | 'Demo mode (no Supabase)' | 'Connection error';

export interface DatabaseTileModelInput {
  isDemoMode?: boolean;
  connectionError?: unknown;
}

export interface DatabaseTileModel {
  title: string;
  label: string;
  status: DatabaseStatus;
  emptyState: DatabaseStatus;
}

export function databaseTileModel(input: DatabaseTileModelInput): DatabaseTileModel {
  const { isDemoMode = false, connectionError = null } = input;
  const title = 'Database';
  const label = 'Database';

  let status: DatabaseStatus;
  if (connectionError) {
    status = 'Connection error';
  } else if (isDemoMode) {
    status = 'Demo mode (no Supabase)';
  } else {
    status = 'Connected';
  }

  return {
    title,
    label,
    status,
    emptyState: status,
  };
}

export interface LatestCommitInfo {
  sha7: string;
  message: string;
  date: string;
}

export interface GithubTileModelInput {
  proxyState?: ProxyState;
  latestCommit?: LatestCommitInfo | null;
}

export interface GithubTileModel {
  title: string;
  label: string;
  proxyState: ProxyState;
  latestCommit: LatestCommitInfo | null;
  emptyState: string | null;
  hasData: boolean;
  footnote: string;
}

export function githubTileModel(input: GithubTileModelInput): GithubTileModel {
  const { proxyState = 'disabled', latestCommit = null } = input;
  const title = 'GitHub';
  const label = 'GitHub';
  const footnote = "CI runs aren't available through the proxy yet.";

  if (proxyState !== 'reachable') {
    return {
      title,
      label,
      proxyState,
      latestCommit: null,
      emptyState: 'Connect the local proxy to see the latest commit',
      hasData: false,
      footnote,
    };
  }

  return {
    title,
    label,
    proxyState,
    latestCommit: latestCommit ?? null,
    emptyState: null,
    hasData: true,
    footnote,
  };
}

export interface AgentStatusCounts {
  queued: number;
  running: number;
  awaiting_approval: number;
}

export type AgentCardStatus = 'running' | 'awaiting_approval' | 'queued';

export interface CurrentTaskInfo {
  id: string;
  title: string;
  task_type: TaskType;
  branch_name: string | null;
  pr_url: string | null;
  sinceIso: string;
}

export interface AgentLastQa {
  status: QARun['status'];
  verdict?: QARun['status'];
  created_at: string;
}

export interface AgentGroup {
  agent: string;
  tasks: AgentTask[];
  totalTasks: number;
  counts: AgentStatusCounts;
  status: AgentCardStatus;
  statusLabel: 'Running' | 'Awaiting approval' | 'Queued';
  currentTask: CurrentTaskInfo;
  lastQa: AgentLastQa | null;
}

export type AgentCardModel = AgentGroup;

export interface AgentsModelInput {
  tasks?: AgentTask[] | null;
  qaRuns?: QARun[] | null;
  now?: Date;
}

export interface AgentsModel {
  agents: AgentCardModel[];
  totalAgents: number;
  totalActiveTasks: number;
  emptyState: string | null;
  hasData: boolean;
}

const NON_TERMINAL_STATUSES = new Set<AgentTask['status']>([
  'queued',
  'running',
  'awaiting_approval',
]);

const STATUS_PRIORITY: Record<AgentCardStatus, number> = {
  running: 0,
  awaiting_approval: 1,
  queued: 2,
};

export function computeTaskTitle(task: AgentTask): string {
  if (task.goal && task.goal.trim().length > 0) {
    return task.goal.trim().slice(0, 90);
  }
  const prompt = task.prompt || '';
  const firstLine = prompt.split(/[\r\n]/)[0].trim();
  return firstLine.slice(0, 90);
}

function parseIsoTime(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return isNaN(t) ? 0 : t;
}

function selectCurrentTask(groupTasks: AgentTask[]): AgentTask {
  const runningTasks = groupTasks.filter((t) => t.status === 'running');
  if (runningTasks.length > 0) {
    // Newest running task by started_at (fallback to created_at if started_at missing)
    return [...runningTasks].sort((a, b) => {
      const timeA = parseIsoTime(a.started_at || a.created_at);
      const timeB = parseIsoTime(b.started_at || b.created_at);
      if (timeB !== timeA) return timeB - timeA;
      return a.id.localeCompare(b.id);
    })[0];
  }

  const awaitingTasks = groupTasks.filter((t) => t.status === 'awaiting_approval');
  if (awaitingTasks.length > 0) {
    // Oldest awaiting_approval by created_at
    return [...awaitingTasks].sort((a, b) => {
      const timeA = parseIsoTime(a.created_at);
      const timeB = parseIsoTime(b.created_at);
      if (timeA !== timeB) return timeA - timeB;
      return a.id.localeCompare(b.id);
    })[0];
  }

  const queuedTasks = groupTasks.filter((t) => t.status === 'queued');
  // Oldest queued by created_at
  return [...queuedTasks].sort((a, b) => {
    const timeA = parseIsoTime(a.created_at);
    const timeB = parseIsoTime(b.created_at);
    if (timeA !== timeB) return timeA - timeB;
    return a.id.localeCompare(b.id);
  })[0];
}

export function agentsModel(input: AgentsModelInput): AgentsModel {
  const { tasks = [], qaRuns = [] } = input;

  if (!tasks || tasks.length === 0) {
    return {
      agents: [],
      totalAgents: 0,
      totalActiveTasks: 0,
      emptyState: 'No active agent tasks',
      hasData: false,
    };
  }

  const activeTasks = tasks.filter((t) => NON_TERMINAL_STATUSES.has(t.status));

  if (activeTasks.length === 0) {
    return {
      agents: [],
      totalAgents: 0,
      totalActiveTasks: 0,
      emptyState: 'No active agent tasks',
      hasData: false,
    };
  }

  const groups = new Map<string, AgentTask[]>();

  for (const task of activeTasks) {
    const agentName = task.assigned_agent?.trim() || 'Unassigned';
    const list = groups.get(agentName);
    if (list) {
      list.push(task);
    } else {
      groups.set(agentName, [task]);
    }
  }

  const agents: AgentCardModel[] = Array.from(groups.entries()).map(([agent, groupTasks]) => {
    const counts: AgentStatusCounts = {
      queued: 0,
      running: 0,
      awaiting_approval: 0,
    };

    for (const t of groupTasks) {
      if (t.status === 'queued') counts.queued++;
      else if (t.status === 'running') counts.running++;
      else if (t.status === 'awaiting_approval') counts.awaiting_approval++;
    }

    let status: AgentCardStatus;
    let statusLabel: 'Running' | 'Awaiting approval' | 'Queued';
    if (counts.running > 0) {
      status = 'running';
      statusLabel = 'Running';
    } else if (counts.awaiting_approval > 0) {
      status = 'awaiting_approval';
      statusLabel = 'Awaiting approval';
    } else {
      status = 'queued';
      statusLabel = 'Queued';
    }

    const currentTaskEntity = selectCurrentTask(groupTasks);
    const sinceIso =
      currentTaskEntity.status === 'running'
        ? currentTaskEntity.started_at || currentTaskEntity.created_at
        : currentTaskEntity.created_at;

    const currentTask: CurrentTaskInfo = {
      id: currentTaskEntity.id,
      title: computeTaskTitle(currentTaskEntity),
      task_type: currentTaskEntity.task_type,
      branch_name: currentTaskEntity.branch_name || null,
      pr_url: currentTaskEntity.pr_url || null,
      sinceIso,
    };

    // Find all tasks of this agent (any status: active or terminal)
    const agentAllTasks = tasks.filter(
      (t) => (t.assigned_agent?.trim() || 'Unassigned') === agent
    );
    const agentTaskIds = new Set(agentAllTasks.map((t) => t.id).filter(Boolean));

    let lastQa: AgentLastQa | null = null;
    if (qaRuns && qaRuns.length > 0 && agentTaskIds.size > 0) {
      const matchingQa = qaRuns.filter(
        (qa) => typeof qa.task_id === 'string' && qa.task_id.trim() !== '' && agentTaskIds.has(qa.task_id)
      );

      if (matchingQa.length > 0) {
        const sortedQa = [...matchingQa].sort((a, b) => {
          const timeA = parseIsoTime(a.created_at);
          const timeB = parseIsoTime(b.created_at);
          if (timeB !== timeA) return timeB - timeA;
          return a.id.localeCompare(b.id);
        });
        const newestQa = sortedQa[0];
        lastQa = {
          status: newestQa.status,
          verdict: newestQa.status,
          created_at: newestQa.created_at,
        };
      }
    }

    return {
      agent,
      tasks: groupTasks,
      totalTasks: groupTasks.length,
      counts,
      status,
      statusLabel,
      currentTask,
      lastQa,
    };
  });

  // Sort: running first, then awaiting_approval, then queued, then by agent name
  agents.sort((a, b) => {
    const priorityDiff = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
    if (priorityDiff !== 0) return priorityDiff;
    return a.agent.localeCompare(b.agent);
  });

  return {
    agents,
    totalAgents: agents.length,
    totalActiveTasks: activeTasks.length,
    emptyState: null,
    hasData: true,
  };
}

// ============================================================================
// Activity Feed Model & Pure Selectors (PR 4)
// ============================================================================

export type ActivityLogTab = 'all' | 'errors' | 'status' | 'agent';

export interface ActivityLogItem {
  id: string;
  timestamp: string;
  timestampIso: string;
  agent: string;
  actionType: string;
  level: 'info' | 'error' | 'warn';
  message: string;
  source: 'project_log' | 'task_state';
  diff?: string | null;
  payload?: Record<string, unknown> | null;
}

export interface ActivityFeedInput {
  logs?: ProjectLogItem[] | null;
  tasks?: AgentTask[] | null;
  maxRows?: number;
  now?: Date;
}

export interface ActivityFeedCounts {
  all: number;
  errors: number;
  status: number;
  agent: number;
}

export interface ActivityFeedModel {
  items: ActivityLogItem[];
  totalCount: number;
  hasData: boolean;
  emptyState: string | null;
  counts: ActivityFeedCounts;
}

export function formatLogTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function buildTaskStateEvents(tasks?: AgentTask[] | null): ActivityLogItem[] {
  if (!tasks || tasks.length === 0) return [];
  const events: ActivityLogItem[] = [];

  for (const task of tasks) {
    const agent = task.assigned_agent?.trim() || 'Unassigned';
    const title = computeTaskTitle(task);
    const diff =
      task.result && typeof task.result.diff === 'string' && task.result.diff.trim().length > 0
        ? task.result.diff
        : task.plan && typeof task.plan.diff === 'string' && task.plan.diff.trim().length > 0
        ? task.plan.diff
        : null;

    const basePayload: Record<string, unknown> = {
      task_id: task.id,
      status: task.status,
      task_type: task.task_type,
      branch_name: task.branch_name || null,
      pr_url: task.pr_url || null,
    };
    if (diff) {
      basePayload.diff = diff;
    }

    if (task.status === 'done' || task.status === 'failed' || task.status === 'cancelled') {
      const iso = task.completed_at || task.started_at || task.created_at;
      const isFailed = task.status === 'failed';
      events.push({
        id: `${task.id}-terminal`,
        timestamp: formatLogTime(iso),
        timestampIso: iso,
        agent,
        actionType: `TASK_${task.status.toUpperCase()}`,
        level: isFailed ? 'error' : 'info',
        message: isFailed
          ? `Task failed: ${title}`
          : task.status === 'done'
          ? `Task completed: ${title}`
          : `Task cancelled: ${title}`,
        source: 'task_state',
        diff,
        payload: basePayload,
      });
    } else if (task.status === 'awaiting_approval') {
      const iso = task.started_at || task.created_at;
      events.push({
        id: `${task.id}-awaiting`,
        timestamp: formatLogTime(iso),
        timestampIso: iso,
        agent,
        actionType: 'TASK_AWAITING_APPROVAL',
        level: 'warn',
        message: `Task awaiting approval: ${title}`,
        source: 'task_state',
        diff,
        payload: basePayload,
      });
    } else if (task.status === 'running') {
      const iso = task.started_at || task.created_at;
      events.push({
        id: `${task.id}-running`,
        timestamp: formatLogTime(iso),
        timestampIso: iso,
        agent,
        actionType: 'TASK_RUNNING',
        level: 'info',
        message: `Task running: ${title}`,
        source: 'task_state',
        diff,
        payload: basePayload,
      });
    } else {
      const iso = task.created_at;
      events.push({
        id: `${task.id}-queued`,
        timestamp: formatLogTime(iso),
        timestampIso: iso,
        agent,
        actionType: 'TASK_QUEUED',
        level: 'info',
        message: `Task queued: ${title}`,
        source: 'task_state',
        diff,
        payload: basePayload,
      });
    }
  }

  return events;
}

export function filterActivityLogs(
  items: ActivityLogItem[],
  tab: ActivityLogTab
): ActivityLogItem[] {
  if (tab === 'all') {
    return items;
  }

  if (tab === 'errors') {
    return items.filter(
      (item) =>
        item.level === 'error' ||
        item.actionType.toLowerCase().includes('error') ||
        item.actionType.toLowerCase().includes('failed') ||
        item.message.toLowerCase().includes('error') ||
        item.message.toLowerCase().includes('failed')
    );
  }

  if (tab === 'status') {
    return items.filter(
      (item) =>
        item.source === 'task_state' ||
        item.actionType.toLowerCase().includes('status') ||
        item.actionType.toLowerCase().startsWith('task_') ||
        Boolean(item.payload?.agent_assignments_status) ||
        Boolean(item.payload?.status)
    );
  }

  if (tab === 'agent') {
    return items.filter(
      (item) =>
        Boolean(item.agent && item.agent.trim() !== '' && item.agent.toLowerCase() !== 'system')
    );
  }

  return items;
}

export function redactSecrets(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/(ghp_[a-zA-Z0-9_]{8,})/g, 'ghp_***')
    .replace(/(github_pat_[a-zA-Z0-9_]{10,})/g, 'github_pat_***')
    .replace(/(gho_[a-zA-Z0-9_]{10,})/g, 'gho_***')
    .replace(/(sk-[a-zA-Z0-9_-]{10,})/g, 'sk-***')
    .replace(/(Bearer\s+)[a-zA-Z0-9._-]+/gi, '$1***')
    .replace(/(eyJ[a-zA-Z0-9_-]{8,}\.eyJ[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]+)/g, 'eyJ***')
    .replace(/((?:password|secret|api[_-]?key|token|auth[_-]?token)\s*[:=]\s*["']?)([^\s"',;}{]+)(["']?)/gi, '$1[REDACTED]$3');
}

export const ALLOWED_PAYLOAD_KEYS: ReadonlySet<string> = new Set([
  'model',
  'tokens_input',
  'tokens_output',
  'tokens_used',
  'cost_usd',
  'verdict',
  'invariants_checked',
  'regressions_found',
  'checks_passed',
  'drift_detected',
  'summary',
  'phases',
  'estimated_tokens',
  'estimated_cost_usd',
  'advisor_role',
  'provider',
  'issued_at',
  'agent_assignments_status',
  'task_id',
  'status',
  'task_type',
  'branch_name',
  'pr_url',
  'diff',
  'file',
  'path',
  'updated_at',
  'created_at',
  'checks',
  'name',
  'role',
]);

export function sanitizePayloadForExport(
  payload: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  const result: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(payload)) {
    if (!ALLOWED_PAYLOAD_KEYS.has(key)) {
      continue;
    }
    if (/(password|secret|credential|api[_-]?key|access[_-]?token|auth[_-]?token)/i.test(key)) {
      continue;
    }

    if (val === null || val === undefined) {
      result[key] = val;
    } else if (typeof val === 'string') {
      result[key] = redactSecrets(val);
    } else if (typeof val === 'number' || typeof val === 'boolean') {
      result[key] = val;
    } else if (Array.isArray(val)) {
      result[key] = val.map((item) => {
        if (typeof item === 'string') return redactSecrets(item);
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          return sanitizePayloadForExport(item as Record<string, unknown>);
        }
        return item;
      });
    } else if (typeof val === 'object') {
      result[key] = sanitizePayloadForExport(val as Record<string, unknown>);
    }
  }

  return result;
}

export const ALLOWED_EXPORT_FIELDS = [
  'id',
  'timestamp',
  'timestampIso',
  'agent',
  'actionType',
  'level',
  'message',
  'diff',
  'payload',
] as const;

export function exportActivityLogsAsJson(items: ActivityLogItem[]): string {
  const sanitized = items.map((item) => {
    const entry: Record<string, unknown> = {
      id: item.id,
      timestamp: item.timestamp,
      timestampIso: item.timestampIso,
      agent: item.agent,
      actionType: item.actionType,
      level: item.level,
      message: redactSecrets(item.message),
    };
    if (typeof item.diff === 'string' && item.diff.trim().length > 0) {
      entry.diff = redactSecrets(item.diff);
    } else {
      entry.diff = null;
    }
    if (item.payload) {
      entry.payload = sanitizePayloadForExport(item.payload);
    } else {
      entry.payload = null;
    }
    return entry;
  });

  return JSON.stringify(sanitized, null, 2);
}

export function activityFeedModel(input: ActivityFeedInput): ActivityFeedModel {
  const { logs = [], tasks = [], maxRows = 200, now } = input;
  const rawLogs = logs ?? [];
  const rawTasks = tasks ?? [];

  const taskEvents = buildTaskStateEvents(rawTasks);

  const logEvents: ActivityLogItem[] = rawLogs.map((log) => {
    const diff =
      log.payload && typeof log.payload.diff === 'string' && log.payload.diff.trim().length > 0
        ? log.payload.diff
        : null;

    let timestampIso = '';
    if (typeof log.payload?.created_at === 'string' && !Number.isNaN(new Date(log.payload.created_at).getTime())) {
      timestampIso = log.payload.created_at;
    } else if (typeof log.payload?.updated_at === 'string' && !Number.isNaN(new Date(log.payload.updated_at).getTime())) {
      timestampIso = log.payload.updated_at;
    } else if (typeof log.payload?.issued_at === 'string' && !Number.isNaN(new Date(log.payload.issued_at).getTime())) {
      timestampIso = log.payload.issued_at;
    } else if (!Number.isNaN(new Date(log.timestamp).getTime())) {
      timestampIso = new Date(log.timestamp).toISOString();
    } else {
      const timeMatch = (log.timestamp || '').match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
      if (timeMatch) {
        const base = now ? new Date(now) : new Date();
        base.setHours(parseInt(timeMatch[1], 10), parseInt(timeMatch[2], 10), parseInt(timeMatch[3] || '0', 10), 0);
        timestampIso = base.toISOString();
      } else {
        timestampIso = now ? now.toISOString() : new Date().toISOString();
      }
    }

    const level: 'info' | 'error' | 'warn' =
      log.level === 'error' ? 'error' : log.level === 'warn' ? 'warn' : 'info';

    return {
      id: log.id,
      timestamp: log.timestamp || formatLogTime(timestampIso),
      timestampIso,
      agent: log.agent?.trim() || 'Agent',
      actionType: log.actionType || 'log',
      level,
      message: log.message || '',
      source: 'project_log',
      diff,
      payload: log.payload || null,
    };
  });

  const allCombined = [...logEvents, ...taskEvents];

  allCombined.sort((a, b) => {
    const timeA = parseIsoTime(a.timestampIso);
    const timeB = parseIsoTime(b.timestampIso);
    if (timeB !== timeA) return timeB - timeA;
    return a.id.localeCompare(b.id);
  });

  const max = typeof maxRows === 'number' && maxRows > 0 ? maxRows : 200;
  const items = allCombined.slice(0, max);
  const totalCount = allCombined.length;

  const counts: ActivityFeedCounts = {
    all: items.length,
    errors: filterActivityLogs(items, 'errors').length,
    status: filterActivityLogs(items, 'status').length,
    agent: filterActivityLogs(items, 'agent').length,
  };

  const hasData = items.length > 0;
  const emptyState = hasData ? null : 'No activity recorded yet';

  return {
    items,
    totalCount,
    hasData,
    emptyState,
    counts,
  };
}

