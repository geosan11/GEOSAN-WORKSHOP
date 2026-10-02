import React from 'react';
import { AgentTask } from '../../lib/types';
import { Disclosure } from './Disclosure';
import { StatusPill } from '../StatusPill';
import { formatRelative, formatDateTime, formatCost } from '../../lib/format';
import { GitBranch, ExternalLink, RefreshCw, Ban, User, Calendar, Terminal, ArrowRight, CheckCircle2, XCircle } from 'lucide-react';

interface TaskDisclosureRowProps {
  task: AgentTask;
  onOpenDrawer?: (task: AgentTask) => void;
  onApprove?: (taskId: string) => Promise<unknown>;
  onReject?: (taskId: string, reason: string) => Promise<unknown>;
  onCancel?: (taskId: string) => Promise<unknown>;
  onRetry?: (taskId: string) => Promise<unknown>;
}

export const TaskDisclosureRow: React.FC<TaskDisclosureRowProps> = ({
  task,
  onOpenDrawer,
  onApprove,
  onReject,
  onCancel,
  onRetry
}) => {
  // L0: Ambient Summary
  const summaryContent = (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-1">
      <div className="flex items-center gap-2.5 min-w-0">
        <StatusPill status={task.status} size="sm" />
        <span className="font-mono text-[11px] font-bold text-[#FFBD59] shrink-0">
          {task.task_type}
        </span>
        <span className="font-mono text-[10px] text-[#8b98a8] shrink-0 hidden sm:inline">
          {task.id}
        </span>
        <span className="text-xs text-[#e6edf3] font-sans truncate">
          {task.prompt}
        </span>
      </div>

      <div className="flex items-center gap-3 font-mono text-[10px] text-[#8b98a8] shrink-0">
        <span className="flex items-center gap-1">
          <User className="w-3 h-3 text-[#F0B230]" />
          {task.assigned_agent || 'Coordinator'}
        </span>
        <span>·</span>
        <span>{formatRelative(task.created_at)}</span>
      </div>
    </div>
  );

  // L1: Focus Detail
  const detailContent = (
    <div className="space-y-3 pt-1">
      {/* Full Prompt */}
      <div className="space-y-1">
        <span className="text-[10px] font-mono uppercase text-[#8b98a8]">
          Full Instruction Prompt
        </span>
        <div className="p-2.5 rounded-lg bg-[#0d1117] border border-white/5 font-mono text-xs text-[#e6edf3] leading-relaxed">
          {task.prompt}
        </div>
      </div>

      {/* Plan Preview if present */}
      {task.plan && (
        <div className="space-y-1">
          <span className="text-[10px] font-mono uppercase text-[#8b98a8]">
            Generated Plan Steps
          </span>
          <div className="p-2.5 rounded-lg bg-[#0d1117] border border-white/5 font-mono text-[11px] text-[#8b98a8] max-h-32 overflow-y-auto">
            {typeof task.plan === 'object' ? (
              <pre className="whitespace-pre-wrap">{JSON.stringify(task.plan, null, 2)}</pre>
            ) : (
              String(task.plan)
            )}
          </div>
        </div>
      )}

      {/* Metadata & Context */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[10px]">
        <div className="p-2 rounded bg-[#0d1117] border border-white/5 space-y-0.5">
          <span className="text-[#8b98a8] block">BRANCH</span>
          <span className="text-cyan-400 truncate block">
            {task.branch_name || 'main'}
          </span>
        </div>

        <div className="p-2 rounded bg-[#0d1117] border border-white/5 space-y-0.5">
          <span className="text-[#8b98a8] block">EST. COST</span>
          <span className="text-emerald-400 font-bold block">
            {task.cost_usd ? formatCost(task.cost_usd) : '$0.00'}
          </span>
        </div>

        <div className="p-2 rounded bg-[#0d1117] border border-white/5 space-y-0.5">
          <span className="text-[#8b98a8] block">CREATED</span>
          <span className="text-[#e6edf3] truncate block">
            {formatDateTime(task.created_at)}
          </span>
        </div>

        <div className="p-2 rounded bg-[#0d1117] border border-white/5 space-y-0.5">
          <span className="text-[#8b98a8] block">PROJECT</span>
          <span className="text-[#FFBD59] truncate block">
            {task.project_id}
          </span>
        </div>
      </div>

      {/* Action Affordances & Deep Inspection Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
        <div className="flex items-center gap-2">
          {task.status === 'awaiting_approval' && onApprove && onReject && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onApprove(task.id);
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Approve PR Plan
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onReject(task.id, 'Operator rejected from quick disclosure');
                }}
                className="px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900 border border-red-500/30 text-red-300 text-xs font-bold transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                Reject
              </button>
            </>
          )}

          {task.status === 'failed' && onRetry && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRetry(task.id);
              }}
              className="px-3 py-1.5 rounded-lg bg-[#F0B230]/20 hover:bg-[#F0B230] text-[#FFBD59] hover:text-[#0A1420] text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Task
            </button>
          )}

          {(task.status === 'running' || task.status === 'queued') && onCancel && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCancel(task.id);
              }}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#8b98a8] hover:text-white text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <Ban className="w-3.5 h-3.5" />
              Cancel Execution
            </button>
          )}
        </div>

        {onOpenDrawer && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDrawer(task);
            }}
            className="text-xs font-bold text-[#F0B230] hover:text-[#FFBD59] flex items-center gap-1 transition-colors font-mono ml-auto"
          >
            <span>L2 Deep Inspect (Full Pipeline & Diff)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <Disclosure
      persistKey={`task-${task.id}`}
      summary={summaryContent}
      detail={detailContent}
      variant="row"
      ariaLabel={`Task ${task.id} ${task.task_type}`}
    />
  );
};
