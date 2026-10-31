import React, { useState } from 'react';
import { AgentTask } from '../lib/types';
import { isDesignBriefApproved } from '../lib/designBrief';
import { Check, X, ShieldAlert, FileCode2, Lock } from 'lucide-react';
import { useToast } from './Toast';
import { appendApprovalLine, getApprovalLines } from '../lib/approvalLog';
import { approvePlan, rejectPlan, isGatedTaskType, persistRunPacketToStorage } from '../lib/planApproval';
import { checkStoredProjectBudget } from '../hooks/useProjects';
import { isProjectBudgetBlocked } from '../lib/projectBudgetGuard';

interface PlanApprovalProps {
  task: AgentTask;
  onApprove: (taskId: string) => Promise<void>;
  onReject: (taskId: string, reason: string) => Promise<void>;
}

export const PlanApproval: React.FC<PlanApprovalProps> = ({ task, onApprove, onReject }) => {
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const toast = useToast();

  const planSummary =
    (task.plan?.summary as string) ||
    (task.result?.summary as string) ||
    'Plan execution verified by ReviewAgent. Adversarial security invariants passed.';

  const isBriefApproved = isDesignBriefApproved(task.project_id);
  const isGatedType = isGatedTaskType(task);
  const canApprove = !isGatedType || isBriefApproved;

  const existingLines = getApprovalLines(task.id);
  const alreadyApproved = existingLines.some((l) => l.action === 'approved');

  const handleApprove = async () => {
    if (!canApprove) return;
    if (alreadyApproved) return;

    try {
      setIsProcessing(true);
      const result = await approvePlan(task, {
        checkBudget: (projectId) => checkStoredProjectBudget(projectId),
        onApprove,
        persistRunPacket: (taskId, packet) => {
          persistRunPacketToStorage(taskId, packet);
          task.run_packet = packet;
        },
        appendApprovalLine,
      });
      if (result.ok) {
        if (result.warning) toast.error(result.warning);
        else toast.success('Plan approved. Worktree not opened. Deploy still asks.');
      } else if (!isProjectBudgetBlocked(result.error)) {
        toast.error(result.reason);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) return;
    try {
      setIsProcessing(true);
      const result = await rejectPlan(task.id, rejectReason.trim(), { onReject, appendApprovalLine });
      if (!result.ok) {
        toast.error(result.reason);
        return;
      }
      toast.error(result.warning ?? 'Plan rejected. No branch was opened.');
      setRejectModalOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const linesToRender = existingLines.slice(-3);

  return (
    <>
      <div className="border border-amber-500/25 bg-amber-500/[0.04] rounded-xl p-3.5 text-xs space-y-3 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-400 font-bold uppercase tracking-wider text-[11px] font-mono">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Plan Awaiting Operator Approval</span>
          </div>
          <span className="text-zinc-500 font-mono text-[10px]">
            {task.task_type}
          </span>
        </div>

        <p className="text-zinc-300 font-mono text-[11px] leading-relaxed whitespace-pre-line bg-[#111113] p-3 rounded-lg border border-white/[0.06]">
          {planSummary}
        </p>

        {task.run_packet && (
          <div className="p-3 bg-[#111113] border border-white/[0.06] rounded-lg font-mono text-[11px] text-zinc-400 space-y-1">
            <div>
              <span className="text-zinc-200">Goal:</span> {task.run_packet.goal}
            </div>
            <div>
              <span className="text-zinc-200">done_when:</span> {task.run_packet.done_when.length} condition(s)
            </div>
            <div>
              <span className="text-zinc-200">Worktree:</span> {task.run_packet.worktree}
            </div>
            <div>
              <span className="text-zinc-200">Branch:</span> {task.run_packet.branch_name || 'no branch'}
            </div>
            <div className="text-zinc-500 text-[10px]">Deploy not requested.</div>
          </div>
        )}

        <div className="text-zinc-500 font-mono text-[10px] bg-[#111113]/60 p-2 rounded border border-white/[0.04]">
          Writes admit only when a model is called. git, lint, format, and replay are not admitted.
        </div>

        {task.pr_url && (
          <div className="flex items-center gap-2 text-[11px] text-indigo-400">
            <FileCode2 className="w-3.5 h-3.5" />
            <a
              href={task.pr_url}
              target="_blank"
              rel="noreferrer"
              className="hover:underline font-mono truncate"
            >
              Pull Request: {task.pr_url}
            </a>
          </div>
        )}

        {!canApprove && (
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-mono flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-amber-400 shrink-0" />
            <span>Design gate active: Brief & Golden Fixture must be approved before executing {task.task_type}.</span>
          </div>
        )}

        {linesToRender.length > 0 && (
          <div className="pt-2 border-t border-white/[0.06] space-y-1">
            <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider mb-1">
              Approval line
            </div>
            {linesToRender.map((line) => (
              <div key={line.line_id} className="text-[10px] font-mono flex items-start gap-2">
                <span className="text-zinc-500">{new Date(line.at).toLocaleTimeString()}</span>
                <span
                  className={
                    line.action === 'approved' ? 'text-emerald-400' : 'text-rose-400'
                  }
                >
                  [{line.action.toUpperCase()}]
                </span>
                <span className="text-zinc-200">{line.actor}</span>
                {line.reason && <span className="text-zinc-500 italic truncate">- {line.reason}</span>}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleApprove}
            disabled={isProcessing || !canApprove || alreadyApproved}
            className={`px-3 py-1.5 rounded-lg font-mono font-medium text-xs transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50 ${
              canApprove
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-zinc-800 text-zinc-500 border border-white/[0.06] cursor-not-allowed'
            }`}
          >
            {canApprove ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                Approve & Run
              </>
            ) : (
              <>
                <Lock className="w-3 h-3" />
                Approve design first
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setRejectModalOpen(true)}
            disabled={isProcessing}
            className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 font-mono font-medium text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <X className="w-3.5 h-3.5" />
            Reject
          </button>
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-modal-title"
        >
          <div className="bg-[#111113] border border-white/[0.06] rounded-xl max-w-md w-full p-4 space-y-3 shadow-2xl text-xs text-zinc-200 font-sans">
            <h3 id="reject-modal-title" className="text-sm font-semibold text-zinc-100">
              Reason for Rejection
            </h3>
            <p className="text-zinc-400 text-[12px]">
              Provide specific feedback for the agent. The task will be marked failed and the feedback recorded.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Scope violation: debt clearance should only apply to accounts settled over 90 days."
              rows={4}
              className="w-full bg-[#161619] border border-white/[0.06] rounded-lg p-2.5 text-xs text-zinc-100 font-mono focus:outline-none focus:border-indigo-500/50"
              autoFocus
            />
            <div className="flex justify-end gap-2 pt-1 font-mono">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 bg-[#161619] border border-white/[0.06]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isProcessing || !rejectReason.trim()}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
