import React from 'react';
import { AlertOctagon, AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface SeverityBadgeProps {
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity }) => {
  const config = {
    critical: {
      bg: 'stamp-danger',
      icon: <AlertOctagon className="w-3 h-3" />,
      label: 'CRITICAL'
    },
    high: {
      bg: 'stamp-warn',
      icon: <AlertTriangle className="w-3 h-3" />,
      label: 'HIGH'
    },
    medium: {
      bg: 'stamp-primary',
      icon: <AlertCircle className="w-3 h-3" />,
      label: 'MEDIUM'
    },
    low: {
      bg: '',
      icon: <Info className="w-3 h-3" />,
      label: 'LOW'
    }
  };

  const { bg, icon, label } = config[severity] || config.low;

  return (
    <span
      className={`stamp ${bg}`}
      role="status"
      aria-label={`Severity: ${severity}`}
    >
      {icon}
      <span>{label}</span>
    </span>
  );
};
