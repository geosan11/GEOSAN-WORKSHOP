import React, { useState } from 'react';
import { AgentTask } from '../lib/types';
import { useDataProvider } from '../lib/dataProvider';
import { useToast } from './Toast';
import { Check, X, Sparkles, ArrowRight, Layers } from 'lucide-react';

interface ProposedTaskCardProps {
  task: AgentTask;
  onResolved?: () => void;
}

export const ProposedTaskCard: React.FC<ProposedTaskCardProps> = ({ task, onResolved }) => {
  const dataProvider = useDataProvider();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const confirm = async () => {
    try {
      setLoading(true);
      await dataProvider.confirmProposedTask(task.id);
      toast.success('Task confirmed and dispatched to Coordinator');
      onResolved?.();
    } catch {
      toast.error('Failed to confirm task');
    } finally {
      setLoading(false);
    }
  };

  const dismiss = async () => {
    try {
      setLoading(true);
      await dataProvider.dismissProposedTask(task.id);
      toast.info('Proposed task dismissed');
      onResolved?.();
    } catch {
      toast.error('Failed to dismiss task');
    } finally {
      setLoading(false);
    }
  };

  const rationale = (task.plan?.rationale as string) || (task.plan?.summary as string);

  return (
    <div className="mx-1 my-3 p-4 rounded-[10px] bg-[#F0B230]/5 border border-[#F0B230]/40 space-y-3 relative text-xs shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[#FFBD59] font-mono text-[11px] font-bold uppercase">
          <Sparkles className="w-3.5 h-3.5 text-[#F0B230]" />
          Proposed Task by Agent
        </div>
        <span className="text-[#8b98a8] font-mono text-[10px]">
          {task.task_type}
        </span>
      </div>

      <div className="space-y-1">
        <p className="text-[#e6edf3] font-mono font-semibold text-xs leading-relaxed">
          {task.prompt}
        </p>
        {rationale && (
          <p className="text-[#8b98a8] font-sans italic text-[11px] leading-relaxed">
            "{rationale}"
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-white/5">
        <button
          onClick={confirm}
          disabled={loading}
          className="px-3.5 py-1.5 rounded-lg bg-[#F0B230] text-[#0A1420] text-xs font-bold hover:bg-[#FFBD59] transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
        >
          <Check className="w-3.5 h-3.5 stroke-[3]" />
          Confirm & Dispatch
        </button>

        <button
          onClick={dismiss}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg bg-[#161b22] hover:bg-[#1c2333] text-[#8b98a8] hover:text-white border border-white/5 text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          <X className="w-3.5 h-3.5" />
          Dismiss
        </button>
      </div>
    </div>
  );
};
