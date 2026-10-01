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
import { CostChart } from '../components/CostChart';
import { CostPieChart } from '../components/CostPieChart';
import { ProjectChatTab } from '../components/ProjectChatTab';
import { LoadingState } from '../components/LoadingState';
import { QueryError } from '../components/QueryError';
import { EmptyState } from '../components/EmptyState';
import { AgentTask, QARun, TaskStatus, TaskType } from '../lib/types';
import { projectMonthlySpend, dailySpendTrend, spendByProvider } from '../lib/cost';
import { formatCost, formatDateTime, formatRelative, formatTokens } from '../lib/format';
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
  Plus
} from 'lucide-react';

interface ProjectDetailProps {
  projectId: string;
  initialTab?: ProjectTab;
}

export const ProjectDetailScreen: React.FC<ProjectDetailProps> = ({
  projectId,
  initialTab = 'overview'
}) => {
  const { navigate, back } = useNavigation();
  const { projects, loading: pLoading } = useProjects();
  const { tasks, loading: tLoading, refetch: tRefetch, approveTask, rejectTask, cancelTask, retryTask } = useTasks(projectId);
  const { costEvents } = useCosts(projectId);
  const { qaRuns } = useQA(projectId);

  const [activeTab, setActiveTab] = useState<ProjectTab>(initialTab);
  const [selectedTask, setSelectedTask] = useState<AgentTask | null>(null);

  // Sorting & Filtering for Tasks
  const [taskSort, setTaskSort] = useState<'date' | 'status' | 'type'>('date');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const project = projects.find((p) => p.id === projectId) || projects[0];

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
  const spendTrend = dailySpendTrend(costEvents, projectId, 30);
  const providerSpend = spendByProvider(costEvents, projectId);

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

        <div className="flex items-center gap-3">
          <StatusPill status={project.status} size="md" />

          {project.repo_url && (
            <a
              href={project.repo_url}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-[#161b22] hover:bg-[#1c2333] border border-white/5 text-xs font-mono text-[#8b98a8] hover:text-[#e6edf3] transition-colors flex items-center gap-1.5"
            >
              <GitBranch className="w-3.5 h-3.5" />
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
              <ExternalLink className="w-3.5 h-3.5" />
              Live Deployment
            </a>
          )}
        </div>
      </div>

      {/* Internal Tabs: overview | tasks | qa | costs | settings */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/5 pb-2">
        {(
          [
            { id: 'overview', label: 'OVERVIEW', icon: Activity },
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

      {/* ── TAB 1: OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#161b22] border border-white/5 space-y-1">
              <span className="text-[10px] font-mono text-[#8b98a8] uppercase">UPTIME HEALTH</span>
              <div className="text-xl font-bold font-mono text-emerald-400">
                {project.uptime_pct || 99.9}%
              </div>
              <span className="text-[11px] text-[#8b98a8]">Status: {project.health_status || 'healthy'}</span>
            </div>

            <div className="p-4 rounded-xl bg-[#161b22] border border-white/5 space-y-1">
              <span className="text-[10px] font-mono text-[#8b98a8] uppercase">MONTHLY SPEND</span>
              <div className="text-xl font-bold font-mono text-[#FFBD59]">
                {formatCost(monthSpend)}
              </div>
              <span className="text-[11px] text-[#8b98a8]">Budget: {formatCost(project.monthly_budget_usd || 1000)}</span>
            </div>

            <div className="p-4 rounded-xl bg-[#161b22] border border-white/5 space-y-1">
              <span className="text-[10px] font-mono text-[#8b98a8] uppercase">TOTAL AGENT TASKS</span>
              <div className="text-xl font-bold font-mono text-[#e6edf3]">
                {tasks.length}
              </div>
              <span className="text-[11px] text-[#8b98a8]">{tasks.filter((t) => t.status === 'running').length} in progress</span>
            </div>

            <div className="p-4 rounded-xl bg-[#161b22] border border-white/5 space-y-1">
              <span className="text-[10px] font-mono text-[#8b98a8] uppercase">QA RUNS & FINDINGS</span>
              <div className="text-xl font-bold font-mono text-[#0873B7]">
                {qaRuns.length} runs
              </div>
              <span className="text-[11px] text-[#8b98a8]">
                {qaRuns.reduce((sum, r) => sum + r.findings_count, 0)} open issues
              </span>
            </div>
          </div>

          {/* Instructions Block */}
          <div className="p-5 rounded-xl bg-[#161b22] border border-white/5 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#FFBD59] font-mono">
              Agent System Instructions (Coding Standards & Governance)
            </h3>
            <p className="text-xs font-mono text-[#e6edf3] bg-[#0d1117] p-3 rounded-lg border border-white/5 whitespace-pre-line leading-relaxed">
              {project.agent_instructions || 'No special policy defined for this vertical.'}
            </p>
          </div>
        </div>
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
            <div className="bg-[#161b22] border border-white/5 rounded-xl overflow-hidden">
              {/* Virtualized List Container */}
              <div
                ref={taskParentRef}
                className="max-h-[520px] overflow-auto divide-y divide-white/5"
              >
                <div
                  style={{
                    height: `${taskVirtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative'
                  }}
                >
                  {taskVirtualizer.getVirtualItems().map((virtualRow) => {
                    const task = sortedTasks[virtualRow.index];
                    return (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start}px)`
                        }}
                        className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-[#1c2333] transition-colors cursor-pointer text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <StatusPill status={task.status} size="sm" />
                          <div className="min-w-0">
                            <span className="font-mono text-[10px] text-[#FFBD59] block">
                              {task.task_type}
                            </span>
                            <p className="text-[#e6edf3] font-medium truncate max-w-md">
                              {task.prompt}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0 text-right font-mono text-[11px] text-[#8b98a8]">
                          <span className="hidden sm:inline">
                            {task.assigned_agent || 'Coordinator'}
                          </span>
                          <span>{formatRelative(task.created_at)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="p-4 rounded-xl bg-[#161b22] border border-white/5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#FFBD59] font-mono">
                30-Day Daily Spend Trend
              </h3>
              <CostChart data={spendTrend} />
            </div>

            <div className="p-4 rounded-xl bg-[#161b22] border border-white/5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#FFBD59] font-mono">
                Spend by Foundation Model Provider
              </h3>
              <CostPieChart byProvider={providerSpend} />
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
