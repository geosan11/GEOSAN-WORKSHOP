import React from 'react';
import { ProjectStatus, TaskStatus } from '../lib/types';
import { CheckCircle2, Clock, PlayCircle, AlertCircle, XCircle, ShieldAlert, PauseCircle } from 'lucide-react';

interface StatusPillProps {
  status: ProjectStatus | TaskStatus;
  size?: 'sm' | 'md';
}

export const StatusPill: React.FC<StatusPillProps> = ({ status, size = 'sm' }) => {
  const getStyleAndIcon = () => {
    switch (status) {
      case 'running':
      case 'building':
        return {
          bg: 'bg-[#F0B230]/10 border-[#F0B230]/40 text-[#FFBD59]',
          icon: <PlayCircle className="w-3 h-3 text-[#F0B230] animate-spin" />,
          label: status.toUpperCase()
        };
      case 'awaiting_approval':
        return {
          bg: 'bg-amber-500/15 border-amber-500/50 text-amber-300',
          icon: <Clock className="w-3 h-3 text-amber-400 animate-pulse" />,
          label: 'AWAITING APPROVAL'
        };
      case 'done':
      case 'production':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300',
          icon: <CheckCircle2 className="w-3 h-3 text-emerald-400" />,
          label: status.toUpperCase()
        };
      case 'testing':
        return {
          bg: 'bg-[#0873B7]/15 border-[#0873B7]/50 text-cyan-300',
          icon: <Clock className="w-3 h-3 text-cyan-400" />,
          label: 'TESTING'
        };
      case 'queued':
      case 'planning':
        return {
          bg: 'bg-slate-800/80 border-slate-700 text-slate-300',
          icon: <Clock className="w-3 h-3 text-slate-400" />,
          label: status.toUpperCase()
        };
      case 'blocked':
        return {
          bg: 'bg-orange-950/40 border-orange-500/40 text-orange-300',
          icon: <PauseCircle className="w-3 h-3 text-orange-400" />,
          label: 'BLOCKED'
        };
      case 'failed':
        return {
          bg: 'bg-red-950/40 border-red-500/40 text-red-300',
          icon: <AlertCircle className="w-3 h-3 text-red-400" />,
          label: 'FAILED'
        };
      case 'cancelled':
        return {
          bg: 'bg-slate-900 border-slate-800 text-slate-500',
          icon: <XCircle className="w-3 h-3 text-slate-500" />,
          label: 'CANCELLED'
        };
      case 'monitoring':
        return {
          bg: 'bg-purple-950/40 border-purple-500/40 text-purple-300',
          icon: <ShieldAlert className="w-3 h-3 text-purple-400" />,
          label: 'MONITORING'
        };
      default:
        return {
          bg: 'bg-slate-900 border-slate-800 text-slate-400',
          icon: <Clock className="w-3 h-3 text-slate-400" />,
          label: String(status).toUpperCase()
        };
    }
  };

  const { bg, icon, label } = getStyleAndIcon();
  const paddingClass = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[6px] border font-mono font-semibold tracking-wider ${bg} ${paddingClass}`}
      role="status"
      aria-label={`Status: ${status}`}
    >
      {icon}
      <span>{label}</span>
    </span>
  );
};
