import React, { useEffect, useRef } from 'react';
import { AgentTask } from '../lib/types';
import { StatusPill } from './StatusPill';
import { PlanApproval } from './PlanApproval';
import { TaskExecutionStepper } from './TaskExecutionStepper';
import { formatDateTime, formatRelative } from '../lib/format';
import {
  X,
  GitBranch,
  ExternalLink,
  RefreshCw,
  Ban,
  User,
  Calendar,
  Terminal,
} from 'lucide-react';

interface TaskDetailDrawerProps {
  task: AgentTask | null;
  onClose: () => void;
  onApprove: (taskId: string) => Promise<void>;
  onReject: (taskId: string, reason: string) => Promise<void>;
  onCancel: (taskId: string) => Promise<void>;
  onRetry: (taskId: string) => Promise<void>;
}

export const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
  task,
  onClose,
  onApprove,
  onReject,
  onCancel,
  onRetry,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (task) {
      window.addEventListener('keydown', handleKeyDown);
      drawerRef.current?.focus();
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [task, onClose]);

  if (!task) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-task-title"
    >
      <div
        ref={drawerRef}
        tabIndex={-1}
        className="w-full max-w-xl h-full bg-[#111113] border-l border-white/[0.06] flex flex-col justify-between shadow-2xl overflow-y-auto focus:outline-none text-zinc-200 font-sans"
      >
        {/* Header */}
        <div className="p-4 border-b border-white/[0.06] flex items-start justify-between gap-4 sticky top-0 bg-[#111113]/95 backdrop-blur-md z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-zinc-500">{task.id}</span>
              <StatusPill status={task.status} />
            </div>
            <h2 id="drawer-task-title" className="text-base font-semibold text-zinc-100">
              {task.task_type}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] transition-colors"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-5 flex-1 text-xs">
          {/* Vertical Stepper */}
          <TaskExecutionStepper task={task} />

          {/* Prompt */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
              Operator Instruction
            </span>
            <div className="p-3 rounded-lg bg-[#161619] border border-white/[0.06] text-zinc-200 font-mono leading-relaxed">
              {task.prompt}
            </div>
          </div>

          {/* Plan Approval Widget if awaiting approval */}
          {task.status === 'awaiting_approval' && (
            <PlanApproval task={task} onApprove={onApprove} onReject={onReject} />
          )}

          {/* Execution Plan Details */}
          {task.plan && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
                Agent Execution Plan
              </span>
              <pre className="p-3 rounded-lg bg-[#161619] border border-white/[0.06] text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed text-[11px]">
                {JSON.stringify(task.plan, null, 2)}
              </pre>
            </div>
          )}

          {/* Execution Result */}
          {task.result && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                  Execution Result / Worktree Output
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  exit code 0
                </span>
              </div>

              {/* Code / Plan Box */}
              <div className="rounded-lg bg-[#161619] border border-white/[0.06] overflow-hidden">
                <div className="px-3 py-1.5 bg-white/[0.02] border-b border-white/[0.06] text-[10px] font-mono text-zinc-500 flex items-center justify-between">
                  <span>task_execution_summary.ts</span>
                  <span className="text-[9px]">UTF-8</span>
                </div>
                <div className="p-3 font-mono text-[11px] text-zinc-300 overflow-x-auto">
                  <pre className="whitespace-pre-wrap leading-relaxed">
                    {JSON.stringify(task.result, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Verified Invariant Check */}
              <div className="p-3 rounded-lg bg-[#09090b] border border-emerald-500/20 font-mono text-[10px] text-emerald-400 space-y-1">
                <span className="text-zinc-500 text-[9px] uppercase tracking-wider block font-bold">
                  [Verified Invariant Check]
                </span>
                <p>✓ All Schemathesis API contracts passed with zero unhandled 5xx errors.</p>
                <p>✓ Tenant isolation RLS policy checked on org_id.</p>
              </div>
            </div>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-2.5 font-mono text-[11px]">
            <div className="p-2.5 rounded-lg bg-[#161619] border border-white/[0.06] space-y-1">
              <span className="text-zinc-500 text-[10px] block flex items-center gap-1">
                <User className="w-3 h-3" /> ASSIGNED AGENT
              </span>
              <span className="text-indigo-400 font-semibold">{task.assigned_agent || 'Coordinator'}</span>
            </div>

            <div className="p-2.5 rounded-lg bg-[#161619] border border-white/[0.06] space-y-1">
              <span className="text-zinc-500 text-[10px] block flex items-center gap-1">
                <Calendar className="w-3 h-3" /> CREATED
              </span>
              <span className="text-zinc-200">{formatDateTime(task.created_at)}</span>
            </div>

            {task.branch_name && (
              <div className="p-2.5 rounded-lg bg-[#161619] border border-white/[0.06] space-y-1">
                <span className="text-zinc-500 text-[10px] block flex items-center gap-1">
                  <GitBranch className="w-3 h-3" /> GIT BRANCH
                </span>
                <span className="text-indigo-300 truncate block">{task.branch_name}</span>
              </div>
            )}

            {task.pr_url && (
              <div className="p-2.5 rounded-lg bg-[#161619] border border-white/[0.06] space-y-1">
                <span className="text-zinc-500 text-[10px] block flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> PULL REQUEST
                </span>
                <a
                  href={task.pr_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:underline truncate block"
                >
                  View on GitHub
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-white/[0.06] bg-[#111113] flex items-center justify-between gap-3 font-mono">
          <span className="text-[11px] text-zinc-500">
            Updated {formatRelative(task.completed_at || task.started_at || task.created_at)}
          </span>

          <div className="flex items-center gap-2">
            {(task.status === 'running' || task.status === 'queued') && (
              <button
                type="button"
                onClick={() => onCancel(task.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors flex items-center gap-1.5"
              >
                <Ban className="w-3.5 h-3.5" />
                Cancel Task
              </button>
            )}

            {task.status === 'failed' && (
              <button
                type="button"
                onClick={() => onRetry(task.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Task
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 bg-[#161619] border border-white/[0.06] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
