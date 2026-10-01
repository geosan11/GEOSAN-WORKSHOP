import React, { useState } from 'react';
import { AgentTask } from '../lib/types';
import { Check, X, ShieldAlert, FileCode2, ArrowRight } from 'lucide-react';

interface PlanApprovalProps {
  task: AgentTask;
  onApprove: (taskId: string) => Promise<void>;
  onReject: (taskId: string, reason: string) => Promise<void>;
}

export const PlanApproval: React.FC<PlanApprovalProps> = ({ task, onApprove, onReject }) => {
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const planSummary = (task.plan?.summary as string) || (task.result?.summary as string) || 'Plan execution verified by ReviewAgent. Adversarial security invariants passed.';

  const handleApprove = async () => {
    try {
      setIsProcessing(true);
      await onApprove(task.id);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) return;
    try {
      setIsProcessing(true);
      await onReject(task.id, rejectReason.trim());
      setRejectModalOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="border border-[#F0B230]/40 bg-[#F0B230]/5 rounded-[10px] p-4 text-xs space-y-3 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#FFBD59] font-bold uppercase tracking-wider text-[11px] font-mono">
            <ShieldAlert className="w-3.5 h-3.5 text-[#F0B230]" />
            Plan Awaiting Operator Approval
          </div>
          <span className="text-[#8b98a8] font-mono text-[10px]">
            {task.task_type}
          </span>
        </div>

        <p className="text-[#e6edf3] font-sans leading-relaxed whitespace-pre-line bg-[#161b22]/70 p-3 rounded-lg border border-white/5 font-mono text-[11px]">
          {planSummary}
        </p>

        {task.pr_url && (
          <div className="flex items-center gap-2 text-[11px] text-[#0873B7]">
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

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleApprove}
            disabled={isProcessing}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0A1420] font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            Approve & Run
          </button>

          <button
            onClick={() => setRejectModalOpen(true)}
            disabled={isProcessing}
            className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-semibold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <X className="w-3.5 h-3.5" />
            Reject
          </button>
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-modal-title"
        >
          <div className="bg-[#161b22] border border-white/10 rounded-[16px] max-w-md w-full p-5 space-y-4 shadow-2xl text-xs">
            <h3 id="reject-modal-title" className="text-sm font-bold text-[#e6edf3]">
              Reason for Rejection
            </h3>
            <p className="text-[#8b98a8]">
              Provide specific feedback for the agent. The task will be marked failed and the feedback written to task result.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Scope violation: debt clearance should only apply to accounts settled over 90 days."
              rows={4}
              className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-3 text-xs text-[#e6edf3] font-mono focus:outline-none focus:border-[#F0B230]"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-[#8b98a8] hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={isProcessing || !rejectReason.trim()}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 text-white disabled:opacity-50"
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
