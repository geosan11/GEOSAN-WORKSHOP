import React from 'react';
import { ProjectStatus, TaskStatus } from '../lib/types';
import { CheckCircle2, Clock, PlayCircle, AlertCircle, ShieldAlert } from 'lucide-react';

interface StatusPillProps {
  status: ProjectStatus | TaskStatus | 'healthy' | 'degraded' | 'down';
  size?: 'sm' | 'md';
}

export const StatusPill: React.FC<StatusPillProps> = ({ status, size = 'sm' }) => {
  const getStyleAndIcon = () => {
    switch (status) {
      case 'awaiting_approval':
        return {
          bg: 'bg-amber-500/15 border-amber-500/50 text-amber-400',
          icon: <Clock className="w-3 h-3 text-amber-400 animate-pulse" />,
          label: 'Waiting on you'
        };
      case 'running':
      case 'building':
        return {
          bg: 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400',
          icon: <PlayCircle className="w-3 h-3 text-emerald-400 animate-spin" />,
          label: 'Working'
        };
      case 'failed':
      case 'down':
        return {
          bg: 'bg-rose-500/15 border-rose-500/50 text-rose-400',
          icon: <AlertCircle className="w-3 h-3 text-rose-400" />,
          label: 'Failed'
        };
      case 'done':
      case 'production':
      case 'healthy':
        return {
          bg: 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400',
          icon: <CheckCircle2 className="w-3 h-3 text-emerald-400" />,
          label: 'Healthy'
        };
      case 'queued':
      case 'proposed':
      case 'planning':
      case 'testing':
      case 'blocked':
      case 'cancelled':
      case 'degraded':
      default:
        return {
          bg: 'bg-slate-800/80 border-slate-700/60 text-slate-400',
          icon: <Clock className="w-3 h-3 text-slate-400" />,
          label: 'Queued'
        };
    }
  };

  const { bg, icon, label } = getStyleAndIcon();
  const paddingClass = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[6px] border font-mono font-semibold tracking-wider ${bg} ${paddingClass}`}
      role="status"
      aria-label={`Status: ${label}`}
    >
      {icon}
      <span>{label}</span>
    </span>
  );
};
