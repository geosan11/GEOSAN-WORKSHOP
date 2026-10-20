import React from 'react';

interface LoadingStateProps {
  type?: 'table' | 'cards' | 'lines' | 'fullscreen';
  count?: number;
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  type = 'lines',
  count = 4,
  message = 'Loading records...'
}) => {
  if (type === 'fullscreen') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-t-gold border-r-transparent border-b-navy border-l-transparent animate-spin" />
        <span className="text-xs font-mono text-muted">{message}</span>
      </div>
    );
  }

  if (type === 'cards') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="h-44 rounded-[var(--radius-card)] bg-card border border-app p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-4 w-32 bg-[color:var(--color-border-strong)] rounded-[var(--radius-stamp)]" />
              <div className="h-4 w-16 bg-[color:var(--color-border)] rounded-[var(--radius-stamp)]" />
            </div>
            <div className="h-3 w-48 bg-[color:var(--color-border)] rounded-[var(--radius-stamp)]" />
            <div className="pt-4 flex justify-between">
              <div className="h-6 w-20 bg-[color:var(--color-border-strong)] rounded-[var(--radius-stamp)]" />
              <div className="h-6 w-12 bg-[color:var(--color-border)] rounded-[var(--radius-stamp)]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="w-full space-y-2.5 animate-pulse">
        <div className="h-10 rounded-[var(--radius-control)] bg-card border border-app w-full" />
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="h-12 rounded-[var(--radius-control)] bg-[color-mix(in_srgb,var(--bg-card)_60%,transparent)] border border-app flex items-center px-4 gap-4">
            <div className="h-3 w-24 bg-[color:var(--color-border-strong)] rounded-[var(--radius-stamp)]" />
            <div className="h-3 w-40 bg-[color:var(--color-border)] rounded-[var(--radius-stamp)] flex-1" />
            <div className="h-4 w-16 bg-[color:var(--color-border-strong)] rounded-[var(--radius-stamp)]" />
            <div className="h-3 w-20 bg-[color:var(--color-border)] rounded-[var(--radius-stamp)]" />
          </div>
        ))}
      </div>
    );
  }

  // Default 'lines'
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-14 rounded-[var(--radius-card)] bg-card border border-app p-3 flex items-center justify-between">
          <div className="space-y-1.5 flex-1">
            <div className="h-3 w-1/3 bg-[color:var(--color-border-strong)] rounded-[var(--radius-stamp)]" />
            <div className="h-2.5 w-1/2 bg-[color:var(--color-border)] rounded-[var(--radius-stamp)]" />
          </div>
          <div className="h-4 w-16 bg-[color:var(--color-border-strong)] rounded-[var(--radius-stamp)]" />
        </div>
      ))}
    </div>
  );
};
