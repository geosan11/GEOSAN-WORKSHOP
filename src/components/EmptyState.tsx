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
    <div className="flex flex-col items-center justify-center p-8 rounded-[var(--radius-card)] bg-card border border-app text-center my-4">
      <div className="w-10 h-10 rounded-[var(--radius-control)] bg-app border border-app flex items-center justify-center text-muted mb-3">
        {icon || <Inbox className="w-5 h-5" />}
      </div>
      <h3 className="text-sm font-semibold text-main mb-1">{title}</h3>
      <p className="text-xs text-muted max-w-sm mb-4 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="btn btn-primary"
        >
          <Plus className="w-3.5 h-3.5" />
          {actionLabel}
        </button>
      )}
    </div>
  );
};
