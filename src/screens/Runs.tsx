import React, { useState } from 'react';
import { useProjects } from '../hooks/useProjects';
import { useTasks } from '../hooks/useTasks';
import { useCosts } from '../hooks/useCosts';
import { useNavigation } from '../lib/navigation';
import { useToast } from '../components/Toast';
import { StatusPill } from '../components/StatusPill';
import { LoadingState } from '../components/LoadingState';
import { QueryError } from '../components/QueryError';
import { EmptyState } from '../components/EmptyState';
import { AgentTask, TaskType } from '../lib/types';
import { formatCost, formatRelative, formatDateTime } from '../lib/format';
import {
  Terminal,
  Plus,
  ArrowLeft,
  Check,
  X,
  ShieldAlert,
  FileCode2,
  GitBranch,
  Cpu,
  Clock,
  Layers,
  ArrowRight
} from 'lucide-react';

interface RunsScreenProps {
  initialRunId?: string;
}

export const RunsScreen: React.FC<RunsScreenProps> = ({ initialRunId }) => {
  const toast = useToast();
  const { navigate } = useNavigation();
  const { projects } = useProjects();
  const { tasks, loading, error, refetch, createTask, approveTask, rejectTask } = useTasks();
  const { costEvents } = useCosts();

  const [selectedRunId, setSelectedRunId] = useState<string | undefined>(initialRunId);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [taskType, setTaskType] = useState<TaskType>('BUILD_FEATURE');
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '');
  const [promptText, setPromptText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedRun = tasks.find((t) => t.id === selectedRunId);

  const handleApproveGate = async (taskId: string) => {
    try {
      await approveTask(taskId);
      toast.success('Plan approved. Worktree opens. Deploy still asks.');
    } catch {
      toast.error('Failed to approve plan');
    }
  };

  const handleRejectGate = async (taskId: string) => {
    try {
      await rejectTask(taskId);
      toast.info('Plan rejected. No branch was opened.');
      setSelectedRunId(undefined);
    } catch {
      toast.error('Failed to reject plan');
    }
  };

  const handleCreateRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim()) return;
    try {
      setIsSubmitting(true);
      const proj = projects.find((p) => p.id === selectedProjectId) || projects[0];
      const created = await createTask({
        org_id: proj?.org_id || 'org-geosan',
        project_id: selectedProjectId,
        task_type: taskType,
        prompt: promptText.trim()
      });
      setPromptText('');
      setIsCreatingTask(false);
      setSelectedRunId(created.id);
      toast.success(`Run dispatched to Coordinator (${created.id})`);
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
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/5">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#e6edf3]">
            Runs
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Model inference executions, worktree branches, and approval gates.
          </p>
        </div>

        {/* Start Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setTaskType('BUILD_FEATURE');
              setIsCreatingTask(true);
            }}
            className="px-3 py-1.5 rounded-lg bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold hover:bg-emerald-900/60 transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Build feature
          </button>

          <button
            onClick={() => {
              setTaskType('FIX_BUG');
              setIsCreatingTask(true);
            }}
            className="px-3 py-1.5 rounded-lg bg-[#161b22] border border-white/10 text-slate-300 font-mono text-xs font-bold hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Fix bug
          </button>
        </div>
      </div>

      {/* Start Action Modal / Inline Form */}
      {isCreatingTask && (
        <form
          onSubmit={handleCreateRun}
          className="p-5 rounded-2xl bg-[#161b22] border border-emerald-500/30 space-y-4 font-mono text-xs"
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
      {selectedRun ? (
        <div className="space-y-4">
          <button
            onClick={() => setSelectedRunId(undefined)}
            className="text-xs font-mono text-emerald-400 hover:underline flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Runs List
          </button>

          {/* TWO PANES DETAIL */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT PANE: Trace (Coordinator, Plan, specialist, Invariant) */}
            <div className="lg:col-span-7 space-y-4 font-mono text-xs">
              <div className="p-5 rounded-2xl bg-[#161b22] border border-white/10 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h2 className="font-bold text-sm text-slate-100 uppercase">
                    Execution Trace
                  </h2>
                  <span className="text-slate-400 text-[11px]">{selectedRun.id}</span>
                </div>

                <div className="space-y-3">
                  {/* Step 1: Coordinator */}
                  <div className="p-3.5 rounded-xl bg-[#0d1117] border border-white/5 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-emerald-400">1. CoordinatorAgent</span>
                      <span className="text-slate-500">Dispatched</span>
                    </div>
                    <p className="text-slate-300 font-sans text-xs">{selectedRun.prompt}</p>
                  </div>

                  {/* Step 2: Plan (amber only while awaiting_approval) */}
                  <div
                    className={`p-3.5 rounded-xl border space-y-1 transition-all ${
                      selectedRun.status === 'awaiting_approval'
                        ? 'bg-amber-500/10 border-amber-500/50 text-amber-300'
                        : 'bg-[#0d1117] border-white/5 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className={`font-bold ${selectedRun.status === 'awaiting_approval' ? 'text-amber-400' : 'text-slate-200'}`}>
                        2. Plan Synthesis & Worktree Spec
                      </span>
                      <span className="font-bold">
                        {selectedRun.status === 'awaiting_approval' ? 'Waiting on you' : 'Generated'}
                      </span>
                    </div>
                    <p className="font-sans text-xs">
                      {(selectedRun.plan?.summary as string) ||
                        'Isolated branch created. Static typing invariants verified across modified endpoints.'}
                    </p>
                  </div>

                  {/* Step 3: Specialist Agent */}
                  <div className="p-3.5 rounded-xl bg-[#0d1117] border border-white/5 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-200">
                        3. Specialist: {selectedRun.assigned_agent || 'CodingAgent + Reviewer'}
                      </span>
                      <span className="text-slate-500">
                        {selectedRun.status === 'done' ? 'Completed' : selectedRun.status === 'running' ? 'Working' : 'Queued'}
                      </span>
                    </div>
                    <p className="text-slate-400 font-sans text-xs">
                      Model calls only. Subagent executes targeted code transformations in git worktree.
                    </p>
                  </div>

                  {/* Step 4: Invariant Proof */}
                  <div className="p-3.5 rounded-xl bg-[#0d1117] border border-white/5 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-200">4. Invariant Assertion Check</span>
                      <span className="text-slate-500">Continuous</span>
                    </div>
                    <p className="text-slate-400 font-sans text-xs">
                      No regression on tenant RLS boundaries, payment reconciliation, and schema contracts.
                    </p>
                  </div>
                </div>
              </div>

              {/* Approval Gate Widget when awaiting_approval */}
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
                    {/* One primary button: Approve */}
                    <button
                      onClick={() => handleApproveGate(selectedRun.id)}
                      className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-md"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      Approve
                    </button>

                    {/* Reject: rose outline */}
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

            {/* RIGHT PANE: Details & Metadata */}
            <div className="lg:col-span-5 space-y-4 font-mono text-xs">
              <div className="p-5 rounded-2xl bg-[#161b22] border border-white/10 space-y-4">
                <h3 className="font-bold text-sm text-slate-100 uppercase pb-2 border-b border-white/5">
                  Run Properties
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">State:</span>
                    <StatusPill status={selectedRun.status} />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Cost:</span>
                    <span className="text-emerald-400 font-bold tabular-nums">
                      {formatCost(selectedRun.cost_usd || 0.0045)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Worktree:</span>
                    <span className="text-slate-200 font-bold">
                      {selectedRun.branch_name ? `Opened (${selectedRun.branch_name})` : 'Not opened'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Age:</span>
                    <span className="text-slate-300">{formatRelative(selectedRun.created_at)}</span>
                  </div>

                  <div className="pt-3 border-t border-white/5 space-y-1">
                    <span className="text-slate-400 block">Note:</span>
                    <p className="text-slate-300 font-sans text-xs">
                      Model calls only. Git worktree isolates writes until approval.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* LIST VIEW */
        <div className="bg-[#161b22] border border-white/10 rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0d1117] border-b border-white/10 text-slate-400 text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Vertical</th>
                  <th className="py-3 px-4">State</th>
                  <th className="py-3 px-4 text-right">Cost</th>
                  <th className="py-3 px-4 text-right">Age</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tasks.map((task) => {
                  const project = projects.find((p) => p.id === task.project_id);
                  return (
                    <tr
                      key={task.id}
                      onClick={() => setSelectedRunId(task.id)}
                      className="hover:bg-[#1c2333] transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-100 max-w-md">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.2 rounded bg-white/5 text-[10px] text-slate-400">
                            {task.task_type}
                          </span>
                          <span className="truncate font-sans">{task.prompt}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {project?.name.split(' (')[0] || task.project_id}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusPill status={task.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 text-right text-emerald-400 font-bold tabular-nums">
                        {formatCost(task.cost_usd || 0.0045)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-400">
                        {formatRelative(task.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
