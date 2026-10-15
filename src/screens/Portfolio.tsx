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
import { PageHeader, SectionCard } from '../components/ui';
import { AgentTask } from '../lib/types';
import { formatRelative } from '../lib/format';
import { Clock, ShieldAlert, PlayCircle, ArrowRight, User, RefreshCw } from 'lucide-react';

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
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <LoadingState type="cards" count={2} />
      </div>
    );
  }

  if (pError || tError) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <QueryError message="Failed to load inbox telemetry. Retry?" onRetry={handleRefreshAll} />
      </div>
    );
  }

  const visibleApprovals = showAllApprovals ? awaitingTasks : awaitingTasks.slice(0, QUEUE_PREVIEW);
  const visibleFindings = showAllFindings ? openP0Findings : openP0Findings.slice(0, QUEUE_PREVIEW);
  const visibleRunning = showAllRunning ? runningTasks : runningTasks.slice(0, QUEUE_PREVIEW);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 font-sans">
      <PageHeader
        eyebrow="Home"
        title="Inbox"
        lede="Orient on what needs you, decide the next gate, then approve or open the run."
        actions={
          <button
            type="button"
            onClick={handleRefreshAll}
            className="p-2 rounded-lg bg-card hover:bg-white/5 border border-app text-muted hover:text-main transition-colors"
            title="Refresh Inbox"
            aria-label="Refresh Inbox"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        }
      />

      {/* Orient — three counts only */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" aria-label="Inbox orientation counts">
        <a
          href="#queue-approvals"
          className="p-3.5 rounded-xl section-card flex items-center justify-between gap-3 hover:border-[color:var(--color-primary)]/40 transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-meta">Approvals</p>
              <p className="text-xs text-muted truncate">Waiting on you</p>
            </div>
          </div>
          <span className="text-lg font-display font-bold tabular-nums text-amber-300">
            {awaitingTasks.length}
          </span>
        </a>

        <a
          href="#queue-findings"
          className="p-3.5 rounded-xl section-card flex items-center justify-between gap-3 hover:border-rose-500/40 transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/40 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
            </div>
            <div className="min-w-0">
              <p className="text-meta">P0 findings</p>
              <p className="text-xs text-muted truncate">Open Verify</p>
            </div>
          </div>
          <span className="text-lg font-display font-bold tabular-nums text-rose-300">
            {openP0Findings.length}
          </span>
        </a>

        <a
          href="#queue-working"
          className="p-3.5 rounded-xl section-card flex items-center justify-between gap-3 hover:border-emerald-500/40 transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center shrink-0">
              <PlayCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-meta">Working</p>
              <p className="text-xs text-muted truncate">Live agents</p>
            </div>
          </div>
          <span className="text-lg font-display font-bold tabular-nums text-emerald-300">
            {runningTasks.length}
          </span>
        </a>
      </div>

      {/* Decide + Act — three queues */}
      <div className="space-y-5">
        <SectionCard
          title={
            <span id="queue-approvals" className="scroll-mt-20">
              Approvals
            </span>
          }
          description="Plans and tasks blocked on operator sign-off."
          actions={
            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono text-[10px] font-bold">
              {awaitingTasks.length}
            </span>
          }
        >
          {awaitingTasks.length === 0 ? (
            <p className="text-xs font-mono text-muted py-4 text-center">Nothing waiting for approval.</p>
          ) : (
            <div className="space-y-3">
              {visibleApprovals.map((task) => {
                const project = projects.find((p) => p.id === task.project_id);
                return (
                  <div
                    key={task.id}
                    className="p-4 rounded-xl bg-app border border-amber-500/35 hover:border-amber-400/60 transition-all space-y-3"
                  >
                    <button
                      type="button"
                      onClick={() => navigate({ kind: 'runs', runId: task.id })}
                      className="w-full text-left space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-amber-300 font-mono">
                              {project?.name.split(' (')[0] || task.project_id}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 font-mono font-bold">
                              {task.task_type}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted font-mono">{task.id}</span>
                        </div>
                        <StatusPill status={task.status} />
                      </div>
                      <p className="text-xs text-main font-mono line-clamp-2">{task.prompt}</p>
                    </button>

                    <div>
                      <PlanApproval task={task} onApprove={approveTask} onReject={rejectTask} />
                    </div>

                    <div className="pt-2 border-t border-app flex items-center justify-between text-[10px] font-mono text-muted">
                      <span>{formatRelative(task.created_at)}</span>
                      <button
                        type="button"
                        onClick={() => navigate({ kind: 'runs', runId: task.id })}
                        className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
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
                  className="w-full py-2 text-xs font-mono text-muted hover:text-main border border-dashed border-app rounded-lg"
                >
                  {showAllApprovals
                    ? 'Show fewer'
                    : `Show ${awaitingTasks.length - QUEUE_PREVIEW} more`}
                </button>
              )}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title={
            <span id="queue-findings" className="scroll-mt-20">
              P0 findings
            </span>
          }
          description="Critical and high invariant failures that need Verify."
          actions={
            <span className="px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-300 font-mono text-[10px] font-bold">
              {openP0Findings.length}
            </span>
          }
        >
          {openP0Findings.length === 0 ? (
            <p className="text-xs font-mono text-muted py-4 text-center">No open P0 findings.</p>
          ) : (
            <div className="space-y-3">
              {visibleFindings.map((finding) => {
                const targetProjectId =
                  finding.project_id || (finding as { projectId?: string }).projectId || 'proj-aero-003';
                const project = projects.find((p) => p.id === targetProjectId);
                return (
                  <button
                    key={finding.id}
                    type="button"
                    onClick={() =>
                      navigate({
                        kind: 'project',
                        projectId: targetProjectId,
                        tab: 'verify',
                      })
                    }
                    className="w-full text-left p-4 rounded-xl bg-rose-950/20 border border-rose-500/40 hover:border-rose-400/70 transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-rose-300 font-mono">
                            {project?.name.split(' (')[0] || targetProjectId}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-500/40 font-mono font-bold uppercase">
                            P0
                          </span>
                        </div>
                        <span className="text-[10px] text-muted font-mono">{finding.id}</span>
                      </div>
                    </div>
                    <h4 className="text-xs font-bold text-main">{finding.title}</h4>
                    {finding.description && (
                      <p className="text-[11px] text-muted font-mono line-clamp-2">
                        {finding.description}
                      </p>
                    )}
                    <div className="pt-2 border-t border-app flex items-center justify-between text-[10px] font-mono text-muted">
                      <span>{finding.component || 'Regression'}</span>
                      <span className="text-rose-400 font-bold flex items-center gap-1">
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
                  className="w-full py-2 text-xs font-mono text-muted hover:text-main border border-dashed border-app rounded-lg"
                >
                  {showAllFindings
                    ? 'Show fewer'
                    : `Show ${openP0Findings.length - QUEUE_PREVIEW} more`}
                </button>
              )}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title={
            <span id="queue-working" className="scroll-mt-20">
              Working
            </span>
          }
          description="Agents currently executing — watch, do not block."
          actions={
            <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold">
              {runningTasks.length}
            </span>
          }
        >
          {runningTasks.length === 0 ? (
            <p className="text-xs font-mono text-muted py-4 text-center">No tasks currently running.</p>
          ) : (
            <div className="space-y-3">
              {visibleRunning.map((task) => {
                const project = projects.find((p) => p.id === task.project_id);
                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => navigate({ kind: 'runs', runId: task.id })}
                    className="w-full text-left p-4 rounded-xl bg-app border border-emerald-500/30 hover:border-emerald-400/60 transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-main font-mono">
                            {project?.name.split(' (')[0] || task.project_id}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                            {task.task_type}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted font-mono">{task.id}</span>
                      </div>
                      <StatusPill status="running" />
                    </div>
                    <p className="text-xs text-muted font-mono line-clamp-2">{task.prompt}</p>
                    <div className="pt-2 border-t border-app flex items-center justify-between text-[10px] font-mono text-muted">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-emerald-400" />
                        {task.assigned_agent || 'Coordinator'}
                      </span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
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
                  className="w-full py-2 text-xs font-mono text-muted hover:text-main border border-dashed border-app rounded-lg"
                >
                  {showAllRunning
                    ? 'Show fewer'
                    : `Show ${runningTasks.length - QUEUE_PREVIEW} more`}
                </button>
              )}
            </div>
          )}
        </SectionCard>
      </div>

      <TaskDetailDrawer
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onApprove={approveTask}
        onReject={rejectTask}
        onCancel={cancelTask}
        onRetry={async (id) => {
          await retryTask(id);
          setSelectedTask(null);
        }}
      />
    </div>
  );
};
