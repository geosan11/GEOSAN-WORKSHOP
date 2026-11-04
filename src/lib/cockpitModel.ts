import { getIsoWeekKey } from './budget';
import type { Project, CostEvent, AgentTask, TaskType, QARun } from './types';

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
