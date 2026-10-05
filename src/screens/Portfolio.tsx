import React, { useState } from 'react';
import { useProjects } from '../hooks/useProjects';
import { useTasks } from '../hooks/useTasks';
import { useQA } from '../hooks/useQA';
import { useNavigation } from '../lib/navigation';
import { LoadingState } from '../components/LoadingState';
import { QueryError } from '../components/QueryError';
import { StatusPill } from '../components/StatusPill';
import { PlanApproval } from '../components/PlanApproval';
import { PendingActionsBar } from '../components/PendingActionsBar';
import { TaskDetailDrawer } from '../components/TaskDetailDrawer';
import { AgentTask, QAFinding } from '../lib/types';
import { formatRelative, formatDateTime } from '../lib/format';
import { Inbox, Clock, ShieldAlert, PlayCircle, ArrowRight, User, RefreshCw } from 'lucide-react';

export const PortfolioScreen: React.FC = () => {
  const { navigate } = useNavigation();
  const { projects, loading: pLoading, error: pError, refetch: pRefetch } = useProjects();
  const { tasks, loading: tLoading, error: tError, refetch: tRefetch, approveTask, rejectTask, cancelTask, retryTask } = useTasks();
  const { qaFindings, loading: qLoading, error: qError, refetch: qRefetch } = useQA();

  const [selectedTask, setSelectedTask] = useState<AgentTask | null>(null);

  // Left Column: "Waiting on you" -> awaiting_approval tasks and open P0 findings
  const awaitingTasks = tasks.filter((t) => t.status === 'awaiting_approval');
  const openP0Findings = qaFindings.filter(
    (f) => f.status === 'open' && (f.severity === 'critical' || f.severity === 'high')
  );

  // Right Column: "Working" -> running tasks
  const runningTasks = tasks.filter((t) => t.status === 'running');

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

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Top Header: Single H1 & Lede */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/5">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#e6edf3]">
            Inbox
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Operator triage queue. Approvals, invariant gate locks, and active agent executions.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefreshAll}
          className="p-2 rounded-lg bg-[#161b22] hover:bg-[#1c2333] border border-white/10 text-slate-400 hover:text-white transition-colors self-start sm:self-auto"
          title="Refresh Inbox"
          aria-label="Refresh Inbox"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Pending Actions & Triage Bar */}
      <PendingActionsBar
        tasks={tasks}
        qaFindings={qaFindings}
        projects={projects}
        onOpenTask={(task) => navigate({ kind: 'runs', runId: task.id })}
      />

      {/* Two Columns on desktop, stacked below 768px */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* LEFT COLUMN: "Waiting on you" (Amber) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono">
                Waiting on you
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono text-[10px] font-bold">
              {awaitingTasks.length + openP0Findings.length} items
            </span>
          </div>

          {awaitingTasks.length === 0 && openP0Findings.length === 0 ? (
            <div className="p-8 rounded-xl bg-[#161b22] border border-white/5 text-center text-xs font-mono text-slate-400">
              Nothing is waiting.
            </div>
          ) : (
            <div className="space-y-3">
              {/* 1. Awaiting Approval Tasks */}
              {awaitingTasks.map((task) => {
                const project = projects.find((p) => p.id === task.project_id);
                return (
                  <div
                    key={task.id}
                    onClick={() => navigate({ kind: 'runs', runId: task.id })}
                    className="p-4 rounded-xl bg-[#161b22] border border-amber-500/40 hover:border-amber-400/70 transition-all cursor-pointer space-y-3 shadow-sm group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-amber-300 font-mono">
                            {project?.name.split(' (')[0] || task.project_id}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 font-mono font-bold">
                            {task.task_type}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">{task.id}</span>
                      </div>
                      <StatusPill status="awaiting_approval" />
                    </div>

                    <p className="text-xs text-slate-200 font-mono line-clamp-2">
                      {task.prompt}
                    </p>

                    {/* Inline PlanApproval Gate Widget */}
                    <div onClick={(e) => e.stopPropagation()}>
                      <PlanApproval task={task} onApprove={approveTask} onReject={rejectTask} />
                    </div>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>{formatRelative(task.created_at)}</span>
                      <span className="text-amber-400 group-hover:text-amber-300 font-bold flex items-center gap-1">
                        Open Run Trace <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* 2. Open P0 Findings */}
              {openP0Findings.map((finding) => {
                const targetProjectId = finding.project_id || (finding as any).projectId || 'proj-aero-003';
                const project = projects.find((p) => p.id === targetProjectId);
                return (
                  <div
                    key={finding.id}
                    onClick={() =>
                      navigate({
                        kind: 'project',
                        projectId: targetProjectId,
                        tab: 'verify'
                      })
                    }
                    className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/40 hover:border-rose-400/70 transition-all cursor-pointer space-y-2 shadow-sm group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-rose-300 font-mono">
                            {project?.name.split(' (')[0] || targetProjectId}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-500/40 font-mono font-bold uppercase">
                            P0 Invariant Failure
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">{finding.id}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-500/40 text-[10px] font-mono font-bold">
                        P0
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-100">{finding.title}</h4>
                    {finding.description && (
                      <p className="text-[11px] text-slate-400 font-mono line-clamp-2">
                        {finding.description}
                      </p>
                    )}

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>{finding.component || 'Regression'}</span>
                      <span className="text-rose-400 group-hover:text-rose-300 font-bold flex items-center gap-1">
                        Open Project Verify <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: "Working" (Emerald) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
            <div className="flex items-center gap-2">
              <PlayCircle className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
                Working
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold">
              {runningTasks.length} active
            </span>
          </div>

          {runningTasks.length === 0 ? (
            <div className="p-8 rounded-xl bg-[#161b22] border border-white/5 text-center text-xs font-mono text-slate-400">
              No tasks currently running.
            </div>
          ) : (
            <div className="space-y-3">
              {runningTasks.map((task) => {
                const project = projects.find((p) => p.id === task.project_id);
                return (
                  <div
                    key={task.id}
                    onClick={() => navigate({ kind: 'runs', runId: task.id })}
                    className="p-4 rounded-xl bg-[#161b22] border border-emerald-500/30 hover:border-emerald-400/60 transition-all cursor-pointer space-y-2 shadow-sm group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-200 font-mono">
                            {project?.name.split(' (')[0] || task.project_id}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                            {task.task_type}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">{task.id}</span>
                      </div>
                      <StatusPill status="running" />
                    </div>

                    <p className="text-xs text-slate-300 font-mono line-clamp-2">
                      {task.prompt}
                    </p>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span className="flex items-center gap-1 text-slate-400">
                        <User className="w-3 h-3 text-emerald-400" />
                        {task.assigned_agent || 'Coordinator'}
                      </span>
                      <span className="text-emerald-400 group-hover:text-emerald-300 font-bold flex items-center gap-1">
                        View Live Trace <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

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
