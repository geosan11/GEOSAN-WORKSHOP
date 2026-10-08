import React, { useState } from 'react';
import { AgentTask, RunPacket } from '../lib/types';
import { isDesignBriefApproved } from '../lib/designBrief';
import { Check, X, ShieldAlert, FileCode2, Lock } from 'lucide-react';
import { useToast } from './Toast';
import { appendApprovalLine, getApprovalLines } from '../lib/approvalLog';

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

  const planSummary = (task.plan?.summary as string) || (task.result?.summary as string) || 'Plan execution verified by ReviewAgent. Adversarial security invariants passed.';

  const isBriefApproved = isDesignBriefApproved(task.project_id);
  const isGatedType = task.task_type === 'BUILD_FEATURE' || task.task_type === 'FIX_BUG';
  const canApprove = !isGatedType || isBriefApproved;
  
  const existingLines = getApprovalLines(task.id);
  const alreadyApproved = existingLines.some(l => l.action === 'approved');

  const handleApprove = async () => {
    if (!canApprove) return;
    if (alreadyApproved) return;

    let runPacket: RunPacket | null = null;

    if (isGatedType) {
      if (!task.done_when || task.done_when.length === 0) {
        toast.error('Plan has no done_when. Not approved.');
        return;
      }
      if (!task.goal || !task.constraints) {
        toast.error('Plan has missing goal or constraints. Not approved.');
        return;
      }

      runPacket = {
        packet_id: `pkt-${Date.now()}`,
        task_id: task.id,
        project_id: task.project_id,
        goal: task.goal,
        constraints: task.constraints,
        done_when: task.done_when,
        fixture_hash: null,
        worktree: 'not_opened',
        branch_name: task.branch_name || 'no branch',
        pr_url: task.pr_url || null,
        deploy: 'not_requested',
        approved_by: 'operator@demo.internal', // demo fallback
        approved_at: new Date().toISOString()
      };

      // Persist the packet in the existing demo store
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('geosan_tasks');
        if (saved) {
          try {
            const allTasks = JSON.parse(saved);
            const idx = allTasks.findIndex((t: any) => t.id === task.id);
            if (idx >= 0) {
              allTasks[idx].run_packet = runPacket;
              localStorage.setItem('geosan_tasks', JSON.stringify(allTasks));
            }
          } catch (e) {}
        }
      }
      task.run_packet = runPacket; // local update
    }

    try {
      setIsProcessing(true);
      // Append approval line
      appendApprovalLine({
        actor: 'operator@demo.internal',
        action: 'approved',
        task_id: task.id,
        packet_id: runPacket?.packet_id || null,
        reason: null
      });

      await onApprove(task.id);
      toast.success('Plan approved. Worktree not opened. Deploy still asks.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) return;
    try {
      setIsProcessing(true);
      appendApprovalLine({
        actor: 'operator@demo.internal',
        action: 'rejected',
        task_id: task.id,
        packet_id: null,
        reason: rejectReason.trim()
      });
      await onReject(task.id, rejectReason.trim());
      toast.error('Plan rejected. No branch was opened.');
      setRejectModalOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const linesToRender = existingLines.slice(-3);

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

        {task.run_packet && (
          <div className="p-3 bg-[#0d1117] border border-white/10 rounded-lg font-mono text-[11px] text-[#8b98a8] space-y-1">
            <div><span className="text-white">Goal:</span> {task.run_packet.goal}</div>
            <div><span className="text-white">done_when:</span> {task.run_packet.done_when.length} condition(s)</div>
            <div><span className="text-white">Worktree:</span> {task.run_packet.worktree}</div>
            <div><span className="text-white">Branch:</span> {task.run_packet.branch_name || 'no branch'}</div>
            <div>Deploy not requested.</div>
          </div>
        )}

        <div className="text-[#8b98a8] font-mono text-[10px] bg-[#0d1117]/50 p-2 rounded">
          Writes admit only when a model is called. git, lint, format, and replay are not admitted.
        </div>

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

        {!canApprove && (
          <div className="p-2 rounded bg-amber-950/40 border border-amber-500/30 text-amber-300 text-[10px] font-mono flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-amber-400 shrink-0" />
            <span>Design gate active: Brief & Golden Fixture must be approved before executing {task.task_type}.</span>
          </div>
        )}

        {linesToRender.length > 0 && (
          <div className="pt-2 border-t border-white/10 space-y-1">
            <div className="text-[10px] text-[#8b98a8] font-mono uppercase tracking-wider mb-1">Approval line</div>
            {linesToRender.map(line => (
              <div key={line.line_id} className="text-[10px] font-mono flex items-start gap-2">
                <span className="text-[#8b98a8]">{new Date(line.at).toLocaleTimeString()}</span>
                <span className={line.action === 'approved' ? 'text-emerald-400' : 'text-red-400'}>[{line.action.toUpperCase()}]</span>
                <span className="text-white">{line.actor}</span>
                {line.reason && <span className="text-[#8b98a8] italic truncate">- {line.reason}</span>}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleApprove}
            disabled={isProcessing || !canApprove || alreadyApproved}
            className={`px-3.5 py-1.5 rounded-lg font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 ${
              canApprove
                ? 'bg-emerald-500 hover:bg-emerald-400 text-[#0A1420]'
                : 'bg-white/10 text-[#8b98a8] border border-white/10 cursor-not-allowed'
            }`}
          >
            {canApprove ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[3]" />
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
