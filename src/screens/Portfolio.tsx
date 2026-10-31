import React, { useMemo, useState } from 'react';
import { useProjects } from '../hooks/useProjects';
import { useTasks } from '../hooks/useTasks';
import { useQA } from '../hooks/useQA';
import { useNavigation } from '../lib/navigation';
import { LoadingState } from '../components/LoadingState';
import { QueryError } from '../components/QueryError';
import { StatusPill } from '../components/StatusPill';
import { PlanApproval } from '../components/PlanApproval';
import { TaskDetailDrawer } from '../components/TaskDetailDrawer';
import { AgentTask } from '../lib/types';
import { formatRelative } from '../lib/format';
import { isProjectBudgetBlocked } from '../lib/projectBudgetGuard';
import {
  Clock,
  ShieldAlert,
  PlayCircle,
  ArrowRight,
  User,
  RefreshCw,
} from 'lucide-react';

const QUEUE_PREVIEW = 5;

export const PortfolioScreen: React.FC = () => {
  const { navigate } = useNavigation();
  const { projects, loading: pLoading, error: pError, refetch: pRefetch } = useProjects();
  const {
    tasks,
    loading: tLoading,
    error: tError,
    refetch: tRefetch,
    approveTask,
    rejectTask,
    cancelTask,
    retryTask,
  } = useTasks();
  const { qaFindings, loading: qLoading, error: qError, refetch: qRefetch } = useQA();

  const [selectedTask, setSelectedTask] = useState<AgentTask | null>(null);
  const [showAllApprovals, setShowAllApprovals] = useState(false);
  const [showAllFindings, setShowAllFindings] = useState(false);
  const [showAllRunning, setShowAllRunning] = useState(false);

  const awaitingTasks = useMemo(
    () => tasks.filter((t) => t.status === 'awaiting_approval' || t.status === 'proposed'),
    [tasks]
  );
  const openP0Findings = useMemo(
    () =>
      qaFindings.filter(
        (f) => f.status === 'open' && (f.severity === 'critical' || f.severity === 'high')
      ),
    [qaFindings]
  );
  const runningTasks = useMemo(() => tasks.filter((t) => t.status === 'running'), [tasks]);

  const handleRefreshAll = async () => {
    await Promise.all([pRefetch(), tRefetch(), qRefetch()]);
  };

  if (pLoading && tasks.length === 0) {
    return (
      <div className="min-h-full p-4 sm:p-6 max-w-4xl mx-auto space-y-4 font-sans text-zinc-200">
        <LoadingState type="cards" count={2} />
      </div>
    );
  }

  if (pError || tError) {
    return (
      <div className="min-h-full p-6 max-w-md mx-auto text-center font-sans space-y-4 pt-12">
        <QueryError message="Failed to load portfolio telemetry." onRetry={handleRefreshAll} />
      </div>
    );
  }

  const visibleApprovals = showAllApprovals ? awaitingTasks : awaitingTasks.slice(0, QUEUE_PREVIEW);
  const visibleFindings = showAllFindings ? openP0Findings : openP0Findings.slice(0, QUEUE_PREVIEW);
  const visibleRunning = showAllRunning ? runningTasks : runningTasks.slice(0, QUEUE_PREVIEW);

  return (
    <div className="min-h-full p-4 sm:p-6 max-w-4xl mx-auto space-y-4 font-sans text-zinc-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[18px] sm:text-[20px] font-semibold text-zinc-100 tracking-tight">
              Portfolio
            </h1>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/25">
              Inbox
            </span>
          </div>
          <p className="text-[13px] text-zinc-400 font-normal">
            Orient on what needs you, decide the next gate, then approve or open the run.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefreshAll}
          className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium text-zinc-300 hover:text-zinc-100 bg-[#161619] hover:bg-[#1f2025] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-150 ease-out flex items-center gap-1.5 focus-visible:ring-1 focus-visible:ring-indigo-500/50 outline-none active:scale-[0.98] self-start sm:self-auto"
          title="Refresh Inbox"
          aria-label="Refresh Inbox"
        >
          <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Orientation Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" aria-label="Portfolio orientation counts">
        <a
          href="#queue-approvals"
          className="p-3 rounded-xl bg-[#111113] border border-white/[0.06] hover:border-amber-500/30 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-3.5 h-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-zinc-200 font-mono">Approvals</p>
              <p className="text-[11px] text-zinc-500 truncate">Waiting on you</p>
            </div>
          </div>
          <span className="text-xl font-bold font-mono tabular-nums text-amber-400">
            {awaitingTasks.length}
          </span>
        </a>

        <a
          href="#queue-findings"
          className="p-3 rounded-xl bg-[#111113] border border-white/[0.06] hover:border-rose-500/30 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-3.5 h-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-zinc-200 font-mono">P0 findings</p>
              <p className="text-[11px] text-zinc-500 truncate">Open Verify</p>
            </div>
          </div>
          <span className="text-xl font-bold font-mono tabular-nums text-rose-400">
            {openP0Findings.length}
          </span>
        </a>

        <a
          href="#queue-working"
          className="p-3 rounded-xl bg-[#111113] border border-white/[0.06] hover:border-emerald-500/30 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <PlayCircle className="w-3.5 h-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-zinc-200 font-mono">Working</p>
              <p className="text-[11px] text-zinc-500 truncate">Live agents</p>
            </div>
          </div>
          <span className="text-xl font-bold font-mono tabular-nums text-emerald-400">
            {runningTasks.length}
          </span>
        </a>
      </div>

      {/* Three Core Queues */}
      <div className="space-y-4">
        {/* 1. Approvals Queue */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-[#111113] border border-white/[0.06] space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="queue-approvals"
                  className="text-xs font-semibold text-zinc-200 font-mono uppercase tracking-wider"
                >
                  Approvals
                </h2>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 tabular-nums">
                  {awaitingTasks.length}
                </span>
              </div>
              <p className="text-[12px] text-zinc-400 font-sans mt-0.5">
                Plans and tasks blocked on operator sign-off.
              </p>
            </div>
          </div>

          {awaitingTasks.length === 0 ? (
            <p className="text-xs font-mono text-zinc-500 py-4 text-center">
              Nothing waiting for approval.
            </p>
          ) : (
            <div className="space-y-3">
              {visibleApprovals.map((task) => {
                const project = projects.find((p) => p.id === task.project_id);
                return (
                  <div
                    key={task.id}
                    className="p-3 rounded-lg bg-[#161619] border border-amber-500/25 space-y-3"
                  >
                    <button
                      type="button"
                      onClick={() => navigate({ kind: 'runs', runId: task.id })}
                      className="w-full text-left space-y-2 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-zinc-100 font-mono group-hover:text-indigo-300 transition-colors">
                              {project?.name.split(' (')[0] || task.project_id}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              {task.task_type}
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-500 font-mono block">
                            {task.id}
                          </span>
                        </div>
                        <StatusPill status={task.status} />
                      </div>
                      <p className="text-xs text-zinc-300 font-mono line-clamp-2">
                        {task.prompt}
                      </p>
                    </button>

                    <div>
                      <PlanApproval task={task} onApprove={approveTask} onReject={rejectTask} />
                    </div>

                    <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-zinc-500">
                      <span>{formatRelative(task.created_at)}</span>
                      <button
                        type="button"
                        onClick={() => navigate({ kind: 'runs', runId: task.id })}
                        className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 uppercase tracking-wider"
                      >
                        Open run <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {awaitingTasks.length > QUEUE_PREVIEW && (
                <button
                  type="button"
                  onClick={() => setShowAllApprovals((v) => !v)}
                  className="w-full py-2 rounded-lg text-xs font-mono text-zinc-400 hover:text-zinc-200 bg-[#161619] hover:bg-[#1f2025] border border-white/[0.06] transition-colors"
                >
                  {showAllApprovals
                    ? 'Show fewer'
                    : `Show ${awaitingTasks.length - QUEUE_PREVIEW} more`}
                </button>
              )}
            </div>
          )}
        </div>

        {/* 2. P0 Findings Queue */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-[#111113] border border-white/[0.06] space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="queue-findings"
                  className="text-xs font-semibold text-zinc-200 font-mono uppercase tracking-wider"
                >
                  P0 findings
                </h2>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20 tabular-nums">
                  {openP0Findings.length}
                </span>
              </div>
              <p className="text-[12px] text-zinc-400 font-sans mt-0.5">
                Critical and high invariant failures that need Verify.
              </p>
            </div>
          </div>

          {openP0Findings.length === 0 ? (
            <p className="text-xs font-mono text-zinc-500 py-4 text-center">
              No open P0 findings.
            </p>
          ) : (
            <div className="space-y-3">
              {visibleFindings.map((finding) => {
                const targetProjectId =
                  finding.project_id || (finding as { projectId?: string }).projectId || '';
                const project = projects.find((p) => p.id === targetProjectId);
                return (
                  <button
                    key={finding.id}
                    type="button"
                    disabled={!targetProjectId}
                    onClick={() =>
                      targetProjectId &&
                      navigate({
                        kind: 'project',
                        projectId: targetProjectId,
                        tab: 'verify',
                      })
                    }
                    className="p-3 rounded-lg bg-[#161619] border border-white/[0.06] hover:border-rose-500/30 transition-colors w-full text-left space-y-2 group disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-zinc-100 font-mono group-hover:text-rose-300 transition-colors">
                        {project?.name.split(' (')[0] || targetProjectId || 'No project'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        P0
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono block">
                      {finding.id}
                    </span>
                    <h4 className="text-xs font-semibold text-zinc-200">{finding.title}</h4>
                    {finding.description && (
                      <p className="text-[11px] text-zinc-400 font-mono line-clamp-2">
                        {finding.description}
                      </p>
                    )}
                    <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-zinc-500">
                      <span>{finding.component || 'Regression'}</span>
                      <span className="text-rose-400 font-medium flex items-center gap-1 uppercase tracking-wider">
                        Open Verify <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </button>
                );
              })}

              {openP0Findings.length > QUEUE_PREVIEW && (
                <button
                  type="button"
                  onClick={() => setShowAllFindings((v) => !v)}
                  className="w-full py-2 rounded-lg text-xs font-mono text-zinc-400 hover:text-zinc-200 bg-[#161619] hover:bg-[#1f2025] border border-white/[0.06] transition-colors"
                >
                  {showAllFindings
                    ? 'Show fewer'
                    : `Show ${openP0Findings.length - QUEUE_PREVIEW} more`}
                </button>
              )}
            </div>
          )}
        </div>

        {/* 3. Working Agents Queue */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-[#111113] border border-white/[0.06] space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="queue-working"
                  className="text-xs font-semibold text-zinc-200 font-mono uppercase tracking-wider"
                >
                  Working
                </h2>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 tabular-nums">
                  {runningTasks.length}
                </span>
              </div>
              <p className="text-[12px] text-zinc-400 font-sans mt-0.5">
                Agents currently executing — watch, do not block.
              </p>
            </div>
          </div>

          {runningTasks.length === 0 ? (
            <p className="text-xs font-mono text-zinc-500 py-4 text-center">
              No tasks currently running.
            </p>
          ) : (
            <div className="space-y-3">
              {visibleRunning.map((task) => {
                const project = projects.find((p) => p.id === task.project_id);
                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => navigate({ kind: 'runs', runId: task.id })}
                    className="p-3 rounded-lg bg-[#161619] border border-white/[0.06] hover:border-emerald-500/30 transition-colors w-full text-left space-y-2 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-zinc-100 font-mono group-hover:text-emerald-300 transition-colors">
                            {project?.name.split(' (')[0] || task.project_id}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-white/[0.06]">
                            {task.task_type}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono block">
                          {task.id}
                        </span>
                      </div>
                      <StatusPill status="running" />
                    </div>
                    <p className="text-xs text-zinc-400 font-mono line-clamp-2">
                      {task.prompt}
                    </p>
                    <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-zinc-500">
                      <span className="flex items-center gap-1 text-zinc-400">
                        <User className="w-3 h-3 text-emerald-400" />
                        {task.assigned_agent || 'Coordinator'}
                      </span>
                      <span className="text-emerald-400 font-medium flex items-center gap-1 uppercase tracking-wider">
                        View live <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </button>
                );
              })}

              {runningTasks.length > QUEUE_PREVIEW && (
                <button
                  type="button"
                  onClick={() => setShowAllRunning((v) => !v)}
                  className="w-full py-2 rounded-lg text-xs font-mono text-zinc-400 hover:text-zinc-200 bg-[#161619] hover:bg-[#1f2025] border border-white/[0.06] transition-colors"
                >
                  {showAllRunning
                    ? 'Show fewer'
                    : `Show ${runningTasks.length - QUEUE_PREVIEW} more`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <TaskDetailDrawer
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onApprove={approveTask}
        onReject={rejectTask}
        onCancel={cancelTask}
        onRetry={async (id) => {
          try {
            await retryTask(id);
            setSelectedTask(null);
          } catch (err) {
            if (!isProjectBudgetBlocked(err)) throw err;
          }
        }}
      />
    </div>
  );
};
