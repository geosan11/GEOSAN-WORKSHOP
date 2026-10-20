import React from 'react';
import { ProjectStatus, TaskStatus } from '../lib/types';

interface StatusPillProps {
  status: ProjectStatus | TaskStatus | 'healthy' | 'degraded' | 'down';
  size?: 'sm' | 'md';
}

/**
 * Stamped status mark — geometric, uppercase, no soft candy pills.
 */
export const StatusPill: React.FC<StatusPillProps> = ({ status, size = 'sm' }) => {
  const getStyle = () => {
    switch (status) {
      case 'awaiting_approval':
        return { cls: 'stamp stamp-warn', label: 'Waiting on you' };
      case 'running':
      case 'building':
        return { cls: 'stamp stamp-success', label: 'Working' };
      case 'failed':
      case 'down':
        return { cls: 'stamp stamp-danger', label: 'Failed' };
      case 'done':
      case 'production':
      case 'healthy':
        return { cls: 'stamp stamp-success', label: 'Healthy' };
      case 'queued':
      case 'proposed':
      case 'planning':
      case 'testing':
      case 'blocked':
      case 'cancelled':
      case 'degraded':
      default:
        return { cls: 'stamp', label: status === 'degraded' ? 'Degraded' : 'Queued' };
    }
  };

  const { cls, label } = getStyle();
  const sizeClass = size === 'md' ? 'text-[0.6875rem] px-2 py-1' : '';

  return (
    <span className={`${cls} ${sizeClass}`} role="status" aria-label={`Status: ${label}`}>
      <span
        className="w-1.5 h-1.5 rounded-[1px] bg-current shrink-0"
        aria-hidden="true"
      />
      {label}
    </span>
  );
};
