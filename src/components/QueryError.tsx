import React from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

interface QueryErrorProps {
  message?: string;
  onRetry?: () => void;
}

export const QueryError: React.FC<QueryErrorProps> = ({
  message = 'Failed to load records. Retry?',
  onRetry
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 rounded-[var(--radius-card)] bg-card border border-error/30 text-center gap-3">
      <div className="w-10 h-10 rounded-[var(--radius-control)] bg-[color:var(--color-danger-tint)] flex items-center justify-center text-[color:var(--color-danger-text)]">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <p className="text-xs text-main font-medium max-w-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn btn-quiet mt-1"
          aria-label="Retry query"
        >
          <RotateCw className="w-3.5 h-3.5" />
          Retry
        </button>
      )}
    </div>
  );
};
