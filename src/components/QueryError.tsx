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
    <div className="flex flex-col items-center justify-center p-8 rounded-xl bg-[#161b22] border border-red-500/20 text-center gap-3">
      <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <p className="text-xs text-[#e6edf3] font-medium max-w-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1c2333] hover:bg-[#252f44] text-[#F0B230] border border-[#F0B230]/30 transition-colors flex items-center gap-1.5"
          aria-label="Retry query"
        >
          <RotateCw className="w-3.5 h-3.5" />
          Retry
        </button>
      )}
    </div>
  );
};
