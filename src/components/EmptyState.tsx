import React from 'react';
import { Inbox, Plus } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 rounded-[10px] bg-[#161b22] border border-white/5 text-center my-4">
      <div className="w-10 h-10 rounded-full bg-[#1c2333] flex items-center justify-center text-[#8b98a8] mb-3">
        {icon || <Inbox className="w-5 h-5 text-[#8b98a8]" />}
      </div>
      <h3 className="text-sm font-semibold text-[#e6edf3] mb-1">{title}</h3>
      <p className="text-xs text-[#8b98a8] max-w-sm mb-4 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#F0B230] text-[#0A1420] hover:bg-[#FFBD59] transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          {actionLabel}
        </button>
      )}
    </div>
  );
};
