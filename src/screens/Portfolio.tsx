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
            className="btn btn-ghost"
            title="Refresh Inbox"
            aria-label="Refresh Inbox"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" aria-label="Inbox orientation counts">
        <a href="#queue-approvals" className="kpi-tile">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="kpi-tile-icon text-[color:var(--color-warning-text)]">
              <Clock className="w-3.5 h-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-meta">Approvals</p>
              <p className="text-[0.6875rem] text-muted truncate">Waiting on you</p>
            </div>
          </div>
          <span className="kpi-tile-value text-[color:var(--color-warning-text)]">{awaitingTasks.length}</span>
        </a>

        <a href="#queue-findings" className="kpi-tile">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="kpi-tile-icon text-[color:var(--color-danger-text)]">
              <ShieldAlert className="w-3.5 h-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-meta">P0 findings</p>
              <p className="text-[0.6875rem] text-muted truncate">Open Verify</p>
            </div>
          </div>
          <span className="kpi-tile-value text-[color:var(--color-danger-text)]">{openP0Findings.length}</span>
        </a>

        <a href="#queue-working" className="kpi-tile">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="kpi-tile-icon text-[color:var(--color-success-text)]">
              <PlayCircle className="w-3.5 h-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-meta">Working</p>
              <p className="text-[0.6875rem] text-muted truncate">Live agents</p>
            </div>
          </div>
          <span className="kpi-tile-value text-[color:var(--color-success-text)]">{runningTasks.length}</span>
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
          actions={<span className="stamp stamp-warn">{awaitingTasks.length}</span>}
        >
          {awaitingTasks.length === 0 ? (
            <p className="text-xs font-mono text-muted py-4 text-center">Nothing waiting for approval.</p>
          ) : (
            <div className="space-y-3">
              {visibleApprovals.map((task) => {
                const project = projects.find((p) => p.id === task.project_id);
                return (
                  <div key={task.id} className="queue-item queue-item-warn space-y-3">
                    <button
                      type="button"
                      onClick={() => navigate({ kind: 'runs', runId: task.id })}
                      className="w-full text-left space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-main font-mono">
                              {project?.name.split(' (')[0] || task.project_id}
                            </span>
                            <span className="stamp stamp-warn">{task.task_type}</span>
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
                        className="text-primary hover:brightness-110 font-bold flex items-center gap-1 uppercase tracking-wide"
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
                  className="btn btn-ghost w-full"
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
          actions={<span className="stamp stamp-danger">{openP0Findings.length}</span>}
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
                    className="queue-item queue-item-danger w-full text-left space-y-2"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-main font-mono">
                        {project?.name.split(' (')[0] || targetProjectId}
                      </span>
                      <span className="stamp stamp-danger">P0</span>
                    </div>
                    <span className="text-[10px] text-muted font-mono block">{finding.id}</span>
                    <h4 className="text-xs font-bold text-main">{finding.title}</h4>
                    {finding.description && (
                      <p className="text-[11px] text-muted font-mono line-clamp-2">
                        {finding.description}
                      </p>
                    )}
                    <div className="pt-2 border-t border-app flex items-center justify-between text-[10px] font-mono text-muted">
                      <span>{finding.component || 'Regression'}</span>
                      <span className="text-[color:var(--color-danger-text)] font-bold flex items-center gap-1 uppercase tracking-wide">
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
                  className="btn btn-ghost w-full"
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
          actions={<span className="stamp stamp-success">{runningTasks.length}</span>}
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
                    className="queue-item queue-item-success w-full text-left space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-main font-mono">
                            {project?.name.split(' (')[0] || task.project_id}
                          </span>
                          <span className="stamp">{task.task_type}</span>
                        </div>
                        <span className="text-[10px] text-muted font-mono">{task.id}</span>
                      </div>
                      <StatusPill status="running" />
                    </div>
                    <p className="text-xs text-muted font-mono line-clamp-2">{task.prompt}</p>
                    <div className="pt-2 border-t border-app flex items-center justify-between text-[10px] font-mono text-muted">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-[color:var(--color-success-text)]" />
                        {task.assigned_agent || 'Coordinator'}
                      </span>
                      <span className="text-[color:var(--color-success-text)] font-bold flex items-center gap-1 uppercase tracking-wide">
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
                  className="btn btn-ghost w-full"
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
