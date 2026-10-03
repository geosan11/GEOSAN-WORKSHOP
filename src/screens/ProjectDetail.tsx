import React, { useState, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useProjects } from '../hooks/useProjects';
import { useTasks } from '../hooks/useTasks';
import { useCosts } from '../hooks/useCosts';
import { useQA } from '../hooks/useQA';
import { useNavigation, ProjectTab } from '../lib/navigation';
import { StatusPill } from '../components/StatusPill';
import { SeverityBadge } from '../components/SeverityBadge';
import { TaskDetailDrawer } from '../components/TaskDetailDrawer';
import { TaskDisclosureRow } from '../components/disclosure';
import { ProjectOverview } from '../components/ProjectOverview';
import { HarnessStatus } from '../components/HarnessStatus';
import { ProjectChatTab } from '../components/ProjectChatTab';
import { LoadingState } from '../components/LoadingState';
import { QueryError } from '../components/QueryError';
import { EmptyState } from '../components/EmptyState';
import { AgentTask, QARun, TaskStatus, TaskType } from '../lib/types';
import { projectMonthlySpend } from '../lib/cost';
import { formatCost, formatDateTime, formatRelative, formatTokens } from '../lib/format';
import { useToast } from '../components/Toast';
import { triggerServerGitSync } from '../lib/github';
import { GitHubLogo, VercelLogo } from '../components/ServiceLogos';
import { DiscoveryScreen } from './DiscoveryScreen';
import {
  ArrowLeft,
  ExternalLink,
  GitBranch,
  Layers,
  Activity,
  DollarSign,
  ShieldCheck,
  Settings as SettingsIcon,
  MessageSquare,
  Clock,
  Play,
  Check,
  AlertTriangle,
  Lock,
  Unlock,
  Plus,
  RefreshCw,
  ArrowUpDown,
  Compass
} from 'lucide-react';

interface ProjectDetailProps {
  projectId: string;
  initialTab?: ProjectTab;
}

export const ProjectDetailScreen: React.FC<ProjectDetailProps> = ({
  projectId,
  initialTab = 'overview'
}) => {
  const toast = useToast();
  const { navigate, back } = useNavigation();
  const { projects, loading: pLoading } = useProjects();
  const { tasks, loading: tLoading, refetch: tRefetch, approveTask, rejectTask, cancelTask, retryTask } = useTasks(projectId);
  const { costEvents } = useCosts(projectId);
  const { qaRuns } = useQA(projectId);

  const [activeTab, setActiveTab] = useState<ProjectTab>(initialTab);
  const [selectedTask, setSelectedTask] = useState<AgentTask | null>(null);

  // Git Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSummary, setSyncSummary] = useState<string | null>(null);

  // Sorting & Filtering for Tasks
  const [taskSort, setTaskSort] = useState<'date' | 'status' | 'type'>('date');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const project = projects.find((p) => p.id === projectId) || projects[0];

  const handleGitSync = async () => {
    if (!project) return;
    try {
      setIsSyncing(true);
      const repoUrl =
        project.repo_url ||
        (project as any).github_repo_url ||
        `https://github.com/ehi-logistics/${project.id}`;
      const branch = (project as any).git_branch || 'main';

      const result = await triggerServerGitSync({
        projectId: project.id,
        repoUrl,
        branch,
        action: 'sync'
      });

      if (result.success) {
        setSyncSummary(result.localCommitHash);
        toast.success(result.message || `Git pull/push complete: origin/${result.branch} synced!`);
      } else {
        toast.error(result.message || 'Git sync failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to trigger git sync workflow');
    } finally {
      setIsSyncing(false);
    }
  };

  // Filtered & Sorted Tasks
  const sortedTasks = useMemo(() => {
    let list = tasks.filter((t) => t.project_id === projectId);
    if (statusFilter !== 'all') {
      list = list.filter((t) => t.status === statusFilter);
    }
    return list.sort((a, b) => {
      if (taskSort === 'date') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (taskSort === 'status') {
        return a.status.localeCompare(b.status);
      }
      return a.task_type.localeCompare(b.task_type);
    });
  }, [tasks, projectId, statusFilter, taskSort]);

  // Virtualized Tasks List container ref (Addendum A9)
  const taskParentRef = useRef<HTMLDivElement>(null);
  const taskVirtualizer = useVirtualizer({
    count: sortedTasks.length,
    getScrollElement: () => taskParentRef.current,
    estimateSize: () => 64,
    overscan: 5
  });

  const monthSpend = projectMonthlySpend(costEvents, projectId);
  const budgetLimit = project?.monthly_budget_usd || 1000;
  const budgetUsedPct = Math.round((monthSpend / budgetLimit) * 100);

  if (pLoading && !project) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <LoadingState type="cards" count={2} />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <QueryError message="Project not found." onRetry={back} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Navigation Bar: Back arrow, Title, Links, Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button
            onClick={back}
            className="p-2 rounded-lg bg-[#161b22] hover:bg-[#1c2333] border border-white/5 text-[#8b98a8] hover:text-[#e6edf3] transition-colors"
            aria-label="Back to portfolio"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#8b98a8]">
              <span>{project.vertical}</span>
              <span>·</span>
              <span className="text-[#FFBD59]">{project.id}</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#e6edf3]">
              {project.name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <StatusPill status={project.status} size="md" />
          <HarnessStatus />

          {/* Secure Server-Side Git Pull/Push Sync Button */}
          <button
            type="button"
            onClick={handleGitSync}
            disabled={isSyncing}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-medium transition-all flex items-center gap-1.5 shadow-sm ${
              isSyncing
                ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300 cursor-wait'
                : syncSummary
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50'
                : 'bg-[#161b22] hover:bg-[#1c2333] border-white/10 hover:border-cyan-500/40 text-cyan-400 hover:text-cyan-300'
            }`}
            title="Trigger secure server-side Git pull & push workflow"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-cyan-400' : 'text-cyan-400'}`}
            />
            <span>{isSyncing ? 'Syncing...' : syncSummary ? `Sync (${syncSummary})` : 'Sync'}</span>
          </button>

          {project.repo_url && (
            <a
              href={project.repo_url}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-[#161b22] hover:bg-[#1c2333] border border-white/5 text-xs font-mono text-[#8b98a8] hover:text-[#e6edf3] transition-colors flex items-center gap-1.5"
            >
              <GitHubLogo className="w-3.5 h-3.5 text-slate-300" />
              Repository
            </a>
          )}

          {project.vercel_deployment_url && (
            <a
              href={project.vercel_deployment_url}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-[#161b22] hover:bg-[#1c2333] border border-white/5 text-xs font-mono text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1.5"
            >
              <VercelLogo className="w-3 h-3 text-emerald-400" />
              Live Deployment
            </a>
          )}
        </div>
      </div>

      {/* Internal Tabs: overview | discovery | tasks | qa | costs | settings */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/5 pb-2">
        {(
          [
            { id: 'overview', label: 'OVERVIEW', icon: Activity },
            { id: 'discovery', label: 'SDLC DISCOVERY', icon: Compass },
            { id: 'tasks', label: `TASKS (${sortedTasks.length})`, icon: Layers },
            { id: 'qa', label: `QA RUNS (${qaRuns.length})`, icon: ShieldCheck },
            { id: 'costs', label: 'COSTS & BURN', icon: DollarSign },
            { id: 'settings', label: 'SETTINGS & BUDGET', icon: SettingsIcon }
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                isActive
                  ? 'bg-[#F0B230]/15 text-[#FFBD59] border border-[#F0B230]/40'
                  : 'text-[#8b98a8] hover:text-white hover:bg-[#161b22]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── TAB: SDLC DISCOVERY ── */}
      {activeTab === 'discovery' && (
        <DiscoveryScreen initialProjectId={projectId} />
      )}

      {/* ── TAB 1: OVERVIEW ── */}
      {activeTab === 'overview' && (
        <ProjectOverview
          project={project}
          tasks={tasks}
          costEvents={costEvents}
          qaRuns={qaRuns}
          onNavigateToTab={setActiveTab}
          onDispatchTask={() => navigate({ kind: 'console' })}
        />
      )}

      {/* ── TAB 2: TASKS (Virtualized Table - Addendum A9) ── */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#161b22] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-[#e6edf3] font-mono focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="queued">Queued</option>
                <option value="running">Running</option>
                <option value="awaiting_approval">Awaiting Approval</option>
                <option value="done">Done</option>
                <option value="failed">Failed</option>
                <option value="blocked">Blocked</option>
              </select>

              <select
                value={taskSort}
                onChange={(e) => setTaskSort(e.target.value as 'date' | 'status' | 'type')}
                className="bg-[#161b22] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-[#e6edf3] font-mono focus:outline-none"
              >
                <option value="date">Sort by Date</option>
                <option value="status">Sort by Status</option>
                <option value="type">Sort by Task Type</option>
              </select>
            </div>

            <button
              onClick={() => navigate({ kind: 'console' })}
              className="px-3 py-1.5 rounded-lg bg-[#F0B230] text-[#0A1420] text-xs font-bold hover:bg-[#FFBD59] transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Dispatch Instruction
            </button>
          </div>

          {sortedTasks.length === 0 ? (
            <EmptyState
              title="No Tasks Found"
              description="No tasks match the selected criteria for this project."
              actionLabel="Dispatch New Task"
              onAction={() => navigate({ kind: 'console' })}
            />
          ) : (
            <div className="bg-[#161b22] border border-white/5 rounded-xl overflow-hidden divide-y divide-white/5">
              {sortedTasks.map((task) => (
                <TaskDisclosureRow
                  key={task.id}
                  task={task}
                  onOpenDrawer={setSelectedTask}
                  onApprove={approveTask}
                  onReject={rejectTask}
                  onCancel={cancelTask}
                  onRetry={retryTask}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: QA RUNS ── */}
      {activeTab === 'qa' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8b98a8] font-mono">
              Autonomous QA Runs for {project.name}
            </h3>
            <button
              onClick={() => navigate({ kind: 'qa' })}
              className="text-xs font-semibold text-[#F0B230] hover:underline"
            >
              Open Global QA Workbench →
            </button>
          </div>

          {qaRuns.length === 0 ? (
            <EmptyState
              title="No QA Runs Recorded"
              description="No autonomous test executions recorded for this vertical."
              actionLabel="Launch QA Test"
              onAction={() => navigate({ kind: 'qa' })}
            />
          ) : (
            <div className="bg-[#161b22] border border-white/5 rounded-xl overflow-hidden divide-y divide-white/5">
              {qaRuns.map((run) => (
                <div
                  key={run.id}
                  onClick={() => navigate({ kind: 'qa' })}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-[#1c2333] transition-colors cursor-pointer text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#FFBD59] uppercase">{run.run_type}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {run.target_platform.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[#8b98a8] font-mono text-[11px]">{run.target_url}</p>
                  </div>

                  <div className="flex items-center gap-4 font-mono text-[11px]">
                    <span className="text-red-400 font-bold">{run.findings_count} findings</span>
                    <span className="text-[#8b98a8]">{formatRelative(run.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: COSTS ── */}
      {activeTab === 'costs' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-[#161b22] border border-white/5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#FFBD59] font-mono">
                  Project Ledger & Shared Budget Status
                </h3>
                <p className="text-[11px] text-[#8b98a8]">
                  Tracked under the weekly shared budget ledger (400 calls, $3.00 cap, 60/30/10 tier distribution).
                </p>
              </div>
              <HarnessStatus />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-3.5 rounded-lg bg-[#0d1117] border border-white/5 space-y-1">
                <span className="text-[10px] text-[#8b98a8] uppercase block">Current Month Spend</span>
                <span className="text-xl font-bold text-cyan-400 tabular-nums">{formatCost(monthSpend)}</span>
              </div>
              <div className="p-3.5 rounded-lg bg-[#0d1117] border border-white/5 space-y-1">
                <span className="text-[10px] text-[#8b98a8] uppercase block">Monthly Budget Cap</span>
                <span className="text-xl font-bold text-[#e6edf3] tabular-nums">{formatCost(project.monthly_budget_usd || 1000)}</span>
              </div>
              <div className="p-3.5 rounded-lg bg-[#0d1117] border border-white/5 space-y-1">
                <span className="text-[10px] text-[#8b98a8] uppercase block">Budget Consumption</span>
                <span className={`text-xl font-bold tabular-nums ${budgetUsedPct > 80 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {budgetUsedPct}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: SETTINGS & BUDGET ── */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl bg-[#161b22] border border-white/5 rounded-xl p-5 space-y-5 text-xs font-mono">
          <h3 className="text-sm font-bold text-[#e6edf3]">Budget & Execution Thresholds</h3>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] uppercase text-[#8b98a8] block mb-1">
                Monthly Limit (USD)
              </label>
              <input
                type="number"
                defaultValue={project.monthly_budget_usd || 1000}
                className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-2.5 text-xs text-[#e6edf3]"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-[#0d1117] border border-white/5">
              <div>
                <span className="font-bold text-[#e6edf3] block">Hard Stop Enforcement</span>
                <span className="text-[11px] text-[#8b98a8]">
                  Automatically suspend all queued tasks if spend exceeds monthly limit.
                </span>
              </div>
              <span className="text-emerald-400 font-bold">ACTIVE</span>
            </div>
          </div>
        </div>
      )}

      {/* Sliding Task Drawer */}
      <TaskDetailDrawer
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onApprove={approveTask}
        onReject={rejectTask}
        onCancel={cancelTask}
        onRetry={async (id) => {
          const newTask = await retryTask(id);
          setSelectedTask(newTask);
        }}
      />
    </div>
  );
};
