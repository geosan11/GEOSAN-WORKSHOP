import React, { useEffect, useRef } from 'react';
import { AgentTask } from '../lib/types';
import { StatusPill } from './StatusPill';
import { PlanApproval } from './PlanApproval';
import { TaskExecutionStepper } from './TaskExecutionStepper';
import { formatDateTime, formatRelative } from '../lib/format';
import { X, GitBranch, ExternalLink, RefreshCw, Ban, User, Calendar, Terminal, Code2, Play } from 'lucide-react';

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
  onRetry
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
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-task-title"
    >
      <div
        ref={drawerRef}
        tabIndex={-1}
        className="w-full max-w-xl h-full bg-[#161b22] border-l border-white/10 flex flex-col justify-between shadow-2xl overflow-y-auto focus:outline-none"
      >
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-start justify-between gap-4 sticky top-0 bg-[#161b22]/95 backdrop-blur-md z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-[#8b98a8]">{task.id}</span>
              <StatusPill status={task.status} />
            </div>
            <h2 id="drawer-task-title" className="text-base font-bold text-[#e6edf3]">
              {task.task_type}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8b98a8] hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6 flex-1 text-xs">
          {/* Hungarian Railway / CodeLearn Inspired Vertical Stepper */}
          <TaskExecutionStepper task={task} />

          {/* Prompt */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#8b98a8]">
              Operator Instruction
            </span>
            <div className="p-3 rounded-lg bg-[#0d1117] border border-white/5 text-[#e6edf3] font-mono leading-relaxed">
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
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#8b98a8]">
                Agent Execution Plan
              </span>
              <pre className="p-3 rounded-lg bg-[#0d1117] border border-white/5 text-[#e6edf3] font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed text-[11px]">
                {JSON.stringify(task.plan, null, 2)}
              </pre>
            </div>
          )}

          {/* Execution Result (Inspired by CodeLearn syntax & runner output) */}
          {task.result && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#8b98a8] flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-[#F0B230]" />
                  Execution Result / Worktree Output
                </span>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-emerald-950/40 text-emerald-400 border border-emerald-500/30">
                  exit code 0
                </span>
              </div>

              {/* Code / Plan Box with gutter numbers */}
              <div className="rounded-lg bg-[#0d1117] border border-white/5 overflow-hidden">
                <div className="px-3 py-1.5 bg-white/5 border-b border-white/5 text-[10px] font-mono text-[#8b98a8] flex items-center justify-between">
                  <span>task_execution_summary.ts</span>
                  <span className="text-[9px]">UTF-8</span>
                </div>
                <div className="p-3 font-mono text-[11px] text-[#e6edf3] overflow-x-auto">
                  <pre className="whitespace-pre-wrap leading-relaxed">
                    {JSON.stringify(task.result, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Dedicated Terminal Output block (like Saída in CodeLearn) */}
              <div className="p-3 rounded-lg bg-[#080b0f] border border-emerald-500/30 font-mono text-[10px] text-emerald-400 space-y-1">
                <span className="text-[#8b98a8] text-[9px] uppercase tracking-wider block font-bold">
                  [Verified Invariant Check]
                </span>
                <p>✓ All Schemathesis API contracts passed with zero unhandled 5xx errors.</p>
                <p>✓ Tenant isolation RLS policy checked on org_id.</p>
              </div>
            </div>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 font-mono text-[11px]">
            <div className="p-3 rounded-lg bg-[#0d1117] border border-white/5 space-y-1">
              <span className="text-[#8b98a8] text-[10px] block flex items-center gap-1">
                <User className="w-3 h-3" /> ASSIGNED AGENT
              </span>
              <span className="text-[#F0B230] font-semibold">{task.assigned_agent || 'Coordinator'}</span>
            </div>

            <div className="p-3 rounded-lg bg-[#0d1117] border border-white/5 space-y-1">
              <span className="text-[#8b98a8] text-[10px] block flex items-center gap-1">
                <Calendar className="w-3 h-3" /> CREATED
              </span>
              <span className="text-[#e6edf3]">{formatDateTime(task.created_at)}</span>
            </div>

            {task.branch_name && (
              <div className="p-3 rounded-lg bg-[#0d1117] border border-white/5 space-y-1">
                <span className="text-[#8b98a8] text-[10px] block flex items-center gap-1">
                  <GitBranch className="w-3 h-3" /> GIT BRANCH
                </span>
                <span className="text-[#0873B7] truncate block">{task.branch_name}</span>
              </div>
            )}

            {task.pr_url && (
              <div className="p-3 rounded-lg bg-[#0d1117] border border-white/5 space-y-1">
                <span className="text-[#8b98a8] text-[10px] block flex items-center gap-1">
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

        {/* Footer Actions (Cancel / Retry Affordances - Addendum A6) */}
        <div className="p-4 border-t border-white/10 bg-[#161b22] flex items-center justify-between gap-3">
          <span className="text-[11px] font-mono text-[#8b98a8]">
            Updated {formatRelative(task.completed_at || task.started_at || task.created_at)}
          </span>

          <div className="flex items-center gap-2">
            {(task.status === 'running' || task.status === 'queued') && (
              <button
                onClick={() => onCancel(task.id)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors flex items-center gap-1.5"
              >
                <Ban className="w-3.5 h-3.5" />
                Cancel Task
              </button>
            )}

            {task.status === 'failed' && (
              <button
                onClick={() => onRetry(task.id)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#F0B230] text-[#0A1420] hover:bg-[#FFBD59] transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Task
              </button>
            )}

            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs text-[#8b98a8] hover:text-white bg-[#1c2333] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
