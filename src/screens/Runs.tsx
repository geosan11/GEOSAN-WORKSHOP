import React, { useEffect, useMemo, useState } from 'react';
import { useProjects } from '../hooks/useProjects';
import { useTasks } from '../hooks/useTasks';
import { useToast } from '../components/Toast';
import { StatusPill } from '../components/StatusPill';
import { LoadingState } from '../components/LoadingState';
import { QueryError } from '../components/QueryError';
import { EmptyState } from '../components/EmptyState';
import { SessionEventTimeline } from '../components/session/SessionEventTimeline';
import { SessionMetadataPanel } from '../components/session/SessionMetadataPanel';
import { ReportIssueModal } from '../components/session/ReportIssueModal';
import { TaskType } from '../lib/types';
import { formatCost, formatRelative } from '../lib/format';
import {
  buildSessionMetadata,
  buildSessionTraceEvents,
  formatTraceAsPrompt,
} from '../lib/sessionTrace';
import {
  Plus,
  ArrowLeft,
  Check,
  X,
  ShieldAlert,
} from 'lucide-react';
import { PageHeader, SectionCard } from '../components/ui';

type RunFilter = 'all' | 'needs_you' | 'working' | 'done';

interface RunsScreenProps {
  initialRunId?: string;
}

export const RunsScreen: React.FC<RunsScreenProps> = ({ initialRunId }) => {
  const toast = useToast();
  const { projects } = useProjects();
  const { tasks, loading, error, refetch, createTask, approveTask, rejectTask } = useTasks();

  const [selectedRunId, setSelectedRunId] = useState<string | undefined>(initialRunId);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [taskType, setTaskType] = useState<TaskType>('BUILD_FEATURE');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [promptText, setPromptText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [runFilter, setRunFilter] = useState<RunFilter>('all');

  useEffect(() => {
    if (initialRunId) setSelectedRunId(initialRunId);
  }, [initialRunId]);

  const needsYou = useMemo(
    () => tasks.filter((t) => t.status === 'awaiting_approval' || t.status === 'proposed'),
    [tasks]
  );
  const working = useMemo(
    () => tasks.filter((t) => t.status === 'running' || t.status === 'queued' || t.status === 'blocked'),
    [tasks]
  );
  const done = useMemo(
    () => tasks.filter((t) => t.status === 'done' || t.status === 'failed' || t.status === 'cancelled'),
    [tasks]
  );
  const filteredTasks = useMemo(() => {
    switch (runFilter) {
      case 'needs_you':
        return needsYou;
      case 'working':
        return working;
      case 'done':
        return done;
      default:
        return tasks;
    }
  }, [runFilter, tasks, needsYou, working, done]);

  useEffect(() => {
    if (!selectedProjectId && projects[0]?.id) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const selectedRun = tasks.find((t) => t.id === selectedRunId);
  const traceEvents = useMemo(
    () => (selectedRun ? buildSessionTraceEvents(selectedRun) : []),
    [selectedRun]
  );
  const sessionMeta = useMemo(
    () => (selectedRun ? buildSessionMetadata(selectedRun) : null),
    [selectedRun]
  );

  const handleApproveGate = async (taskId: string) => {
    try {
      // approveTask already toasts success — avoid a second toast.
      await approveTask(taskId);
    } catch {
      toast.error('Failed to approve plan');
    }
  };

  const handleRejectGate = async (taskId: string) => {
    try {
      await rejectTask(taskId);
      setSelectedRunId(undefined);
    } catch {
      toast.error('Failed to reject plan');
    }
  };

  const handleCreateRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim()) return;
    const proj = projects.find((p) => p.id === selectedProjectId) || projects[0];
    if (!proj) {
      toast.error('Create or select a project before dispatching a run');
      return;
    }
    try {
      setIsSubmitting(true);
      const created = await createTask({
        org_id: proj.org_id || 'org-geosan',
        project_id: proj.id,
        task_type: taskType,
        prompt: promptText.trim(),
      });
      setPromptText('');
      setIsCreatingTask(false);
      setSelectedRunId(created.id);
    } catch {
      toast.error('Failed to create run');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && tasks.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <LoadingState type="table" count={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <QueryError message="Failed to load runs. Retry?" onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 font-sans">
      <PageHeader
        eyebrow="Operate"
        title={selectedRun ? 'Run detail' : 'Runs'}
        lede={
          selectedRun
            ? 'Session traces, metadata, and approval gates for this execution.'
            : 'Skim the list, open a run for traces and gates. Detail is the only place for session tooling.'
        }
        actions={
          !selectedRun ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setTaskType('BUILD_FEATURE');
                  setIsCreatingTask(true);
                }}
                className="px-3 py-1.5 rounded-lg btn-gold font-mono text-xs font-bold flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Build feature
              </button>
              <button
                type="button"
                onClick={() => {
                  setTaskType('FIX_BUG');
                  setIsCreatingTask(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-card border border-app text-muted font-mono text-xs font-bold hover:text-main hover:bg-white/5 transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Fix bug
              </button>
            </>
          ) : null
        }
      />

      {isCreatingTask && !selectedRun && (
        <form
          onSubmit={handleCreateRun}
          className="p-5 rounded-xl section-card border-[color:var(--color-primary)]/30 space-y-4 font-mono text-xs"
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-emerald-400 uppercase">
              Dispatch New Execution Run ({taskType})
            </span>
            <button
              type="button"
              onClick={() => setIsCreatingTask(false)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase text-slate-400 block mb-1">Target Vertical:</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-2 text-xs text-slate-200"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase text-slate-400 block mb-1">Execution Mode:</label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value as TaskType)}
                className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-2 text-xs text-slate-200"
              >
                <option value="BUILD_FEATURE">BUILD FEATURE</option>
                <option value="FIX_BUG">FIX BUG</option>
                <option value="QA_SECURITY">QA SECURITY</option>
                <option value="DEPLOY">DEPLOY</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase text-slate-400 block mb-1">Instruction Prompt:</label>
            <textarea
              required
              rows={3}
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="e.g. Implement dual-read waybill settlement validator on Kano Hub reconnect queue..."
              className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-3 text-xs text-slate-200 focus:border-emerald-400 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreatingTask(false)}
              className="px-3 py-1.5 rounded-lg bg-white/5 text-slate-400 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !promptText.trim()}
              className="px-4 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 disabled:opacity-50"
            >
              {isSubmitting ? 'Starting…' : 'Start Run'}
            </button>
          </div>
        </form>
      )}

      {/* DETAIL VIEW OR LIST VIEW */}
      {selectedRun && sessionMeta ? (
        <div className="space-y-4">
          <button
            onClick={() => setSelectedRunId(undefined)}
            className="text-xs font-mono text-emerald-400 hover:underline flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Runs List
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 space-y-4">
              <SessionEventTimeline
                events={traceEvents}
                live={sessionMeta.live}
                sessionId={selectedRun.id}
                onCopyPrompt={async () => {
                  try {
                    await navigator.clipboard.writeText(formatTraceAsPrompt(traceEvents, sessionMeta));
                    toast.success('Agent traces copied as prompt');
                  } catch {
                    toast.error('Could not copy traces');
                  }
                }}
                onDownloadJson={() => {
                  const blob = new Blob(
                    [JSON.stringify({ meta: sessionMeta, events: traceEvents }, null, 2)],
                    { type: 'application/json' }
                  );
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `session-${selectedRun.id}-traces.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success('Downloaded session traces JSON');
                }}
                onReportIssue={() => setReportOpen(true)}
              />

              {selectedRun.status === 'awaiting_approval' && (
                <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/50 space-y-4">
                  <div className="flex items-center gap-2 text-amber-400 font-bold uppercase text-xs">
                    <ShieldAlert className="w-4 h-4" />
                    Approval gate · write
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed font-sans">
                    Read is silent. This step writes a branch and opens a pull request. Deploy still asks every time.
                  </p>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => handleApproveGate(selectedRun.id)}
                      className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-md"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      Approve
                    </button>

                    <button
                      onClick={() => handleRejectGate(selectedRun.id)}
                      className="px-4 py-2.5 rounded-xl border border-rose-500/50 text-rose-400 hover:bg-rose-500/10 font-bold text-xs transition-colors flex items-center gap-1.5"
                    >
                      <X className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-5 space-y-4">
              <SessionMetadataPanel meta={sessionMeta} />
            </div>
          </div>

          <ReportIssueModal
            open={reportOpen}
            sessionId={selectedRun.id}
            onClose={() => setReportOpen(false)}
            onSubmitted={() => toast.success('Session issue report saved')}
          />
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          title="No runs yet"
          description="Dispatch a build or fix to open a session trace with metadata and issue reporting."
          actionLabel="Build feature"
          onAction={() => {
            setTaskType('BUILD_FEATURE');
            setIsCreatingTask(true);
          }}
        />
      ) : (
        <div className="space-y-4">
          <div
            className="grid grid-cols-3 gap-3"
            aria-label="Runs orientation counts"
          >
            <button
              type="button"
              onClick={() => setRunFilter('needs_you')}
              className={`p-3 rounded-xl section-card text-left transition-colors ${runFilter === 'needs_you' ? 'border-[color:var(--color-primary)]/50' : ''}`}
            >
              <p className="text-meta">Needs you</p>
              <p className="text-lg font-display font-bold tabular-nums text-amber-300">
                {needsYou.length}
              </p>
            </button>
            <button
              type="button"
              onClick={() => setRunFilter('working')}
              className={`p-3 rounded-xl section-card text-left transition-colors ${runFilter === 'working' ? 'border-[color:var(--color-primary)]/50' : ''}`}
            >
              <p className="text-meta">Working</p>
              <p className="text-lg font-display font-bold tabular-nums text-emerald-300">
                {working.length}
              </p>
            </button>
            <button
              type="button"
              onClick={() => setRunFilter('all')}
              className={`p-3 rounded-xl section-card text-left transition-colors ${runFilter === 'all' ? 'border-[color:var(--color-primary)]/50' : ''}`}
            >
              <p className="text-meta">All runs</p>
              <p className="text-lg font-display font-bold tabular-nums text-main">
                {tasks.length}
              </p>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap" role="tablist" aria-label="Run filters">
            {(
              [
                ['all', 'All'],
                ['needs_you', 'Needs you'],
                ['working', 'Working'],
                ['done', 'Done'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={runFilter === id}
                onClick={() => setRunFilter(id)}
                className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all ${runFilter === id
                  ? 'bg-primary-container text-primary border border-[color:var(--color-primary)]/40'
                  : 'text-muted hover:text-main hover:bg-white/5 border border-transparent'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>

          <SectionCard
            flush
            title="Execution list"
            description="Open a row for traces, metadata, and report-issue. Detail stays off this list."
          >
            {filteredTasks.length === 0 ? (
              <p className="p-6 text-center text-xs font-mono text-muted">
                No runs in this filter.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-app border-b border-app text-muted text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Title</th>
                      <th className="py-3 px-4">Vertical</th>
                      <th className="py-3 px-4">State</th>
                      <th className="py-3 px-4 text-right">Cost</th>
                      <th className="py-3 px-4 text-right">Age</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredTasks.map((task) => {
                      const project = projects.find((p) => p.id === task.project_id);
                      return (
                        <tr
                          key={task.id}
                          onClick={() => setSelectedRunId(task.id)}
                          className="hover:bg-white/5 transition-colors cursor-pointer group"
                        >
                          <td className="py-3.5 px-4 font-bold text-main max-w-md">
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.2 rounded bg-white/5 text-[10px] text-muted">
                                {task.task_type}
                              </span>
                              <span className="truncate font-sans">{task.prompt}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-muted">
                            {project?.name.split(' (')[0] || task.project_id}
                          </td>
                          <td className="py-3.5 px-4">
                            <StatusPill status={task.status} size="sm" />
                          </td>
                          <td className="py-3.5 px-4 text-right text-primary font-bold tabular-nums">
                            {formatCost(task.cost_usd || 0.0045)}
                          </td>
                          <td className="py-3.5 px-4 text-right text-muted">
                            {formatRelative(task.created_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      )}
    </div>
  );
};
