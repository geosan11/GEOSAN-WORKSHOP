import React from 'react';
import { DeploymentStatus } from '../types';
import { CheckCircle2, Loader2, Clock, AlertTriangle, XCircle, Activity } from 'lucide-react';

interface DeploymentBadgeProps {
  status: DeploymentStatus;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export const DeploymentBadge: React.FC<DeploymentBadgeProps> = ({
  status,
  size = 'md',
  showLabel = true
}) => {
  // Normalize variations (e.g. 'live' / 'deployed', 'pending' / 'queued')
  const normalized = status.toLowerCase();

  switch (normalized) {
    case 'live':
    case 'deployed':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-mono font-medium rounded-full transition-colors ${
            size === 'sm'
              ? 'px-2 py-0.5 text-[10px] bg-emerald-950/50 text-emerald-300 border border-emerald-500/40'
              : 'px-2.5 py-1 text-xs bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-950'
          }`}
          title="Deployment is live and healthy on edge production"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
          </span>
          {showLabel && <span>Live</span>}
        </span>
      );

    case 'deploying':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-mono font-medium rounded-full transition-colors ${
            size === 'sm'
              ? 'px-2 py-0.5 text-[10px] bg-cyan-950/50 text-cyan-300 border border-cyan-500/40'
              : 'px-2.5 py-1 text-xs bg-cyan-950/60 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-950'
          }`}
          title="Build & release pipeline currently running"
        >
          <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
          {showLabel && <span>Deploying</span>}
        </span>
      );

    case 'pending':
    case 'queued':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-mono font-medium rounded-full transition-colors ${
            size === 'sm'
              ? 'px-2 py-0.5 text-[10px] bg-slate-900/80 text-slate-300 border border-slate-700/60'
              : 'px-2.5 py-1 text-xs bg-slate-900/90 text-slate-300 border border-slate-700 shadow-sm shadow-slate-950'
          }`}
          title="Deployment queued, awaiting build runner worker"
        >
          <Clock className="w-3 h-3 text-slate-400" />
          {showLabel && <span>Pending</span>}
        </span>
      );

    case 'degraded':
    case 'stale':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-mono font-medium rounded-full transition-colors ${
            size === 'sm'
              ? 'px-2 py-0.5 text-[10px] bg-amber-950/50 text-amber-300 border border-amber-500/40'
              : 'px-2.5 py-1 text-xs bg-amber-950/60 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-950'
          }`}
          title="Performance degradation or outdated build version detected"
        >
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          {showLabel && <span>Degraded</span>}
        </span>
      );

    case 'failed':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-mono font-medium rounded-full transition-colors ${
            size === 'sm'
              ? 'px-2 py-0.5 text-[10px] bg-rose-950/50 text-rose-300 border border-rose-500/40'
              : 'px-2.5 py-1 text-xs bg-rose-950/60 text-rose-300 border border-rose-500/40 shadow-sm shadow-rose-950'
          }`}
          title="Deployment build or health check failed"
        >
          <XCircle className="w-3 h-3 text-rose-400" />
          {showLabel && <span>Failed</span>}
        </span>
      );
  }
};
