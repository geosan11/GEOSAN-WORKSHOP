import React from 'react';
import { AlertOctagon, AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface SeverityBadgeProps {
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity }) => {
  const config = {
    critical: {
      bg: 'bg-red-500/15 border-red-500/50 text-red-400',
      icon: <AlertOctagon className="w-3 h-3 text-red-400" />,
      label: 'CRITICAL'
    },
    high: {
      bg: 'bg-orange-500/15 border-orange-500/50 text-orange-400',
      icon: <AlertTriangle className="w-3 h-3 text-orange-400" />,
      label: 'HIGH'
    },
    medium: {
      bg: 'bg-[#F0B230]/15 border-[#F0B230]/40 text-[#FFBD59]',
      icon: <AlertCircle className="w-3 h-3 text-[#F0B230]" />,
      label: 'MEDIUM'
    },
    low: {
      bg: 'bg-slate-800/90 border-slate-700 text-slate-300',
      icon: <Info className="w-3 h-3 text-slate-400" />,
      label: 'LOW'
    }
  };

  const { bg, icon, label } = config[severity] || config.low;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] border text-[10px] font-mono font-bold tracking-wider ${bg}`}
      role="status"
      aria-label={`Severity: ${severity}`}
    >
      {icon}
      <span>{label}</span>
    </span>
  );
};
