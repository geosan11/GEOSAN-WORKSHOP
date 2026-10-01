import React from 'react';
import { Project } from '../lib/types';
import { StatusPill } from './StatusPill';
import { formatCost, formatRelative } from '../lib/format';
import { ExternalLink, GitBranch, Activity, DollarSign, Clock, ChevronRight } from 'lucide-react';

interface ProjectCardProps {
  project: Project;
  monthlySpend?: number;
  activeTasksCount?: number;
  onClick: (projectId: string) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  monthlySpend = 0,
  activeTasksCount = 0,
  onClick
}) => {
  const getHealthDot = () => {
    switch (project.health_status) {
      case 'healthy':
        return { color: 'bg-emerald-400', label: 'Healthy', ping: 'bg-emerald-400' };
      case 'degraded':
        return { color: 'bg-amber-400', label: 'Degraded', ping: 'bg-amber-400' };
      case 'down':
        return { color: 'bg-red-400', label: 'Down', ping: 'bg-red-400' };
      default:
        return { color: 'bg-emerald-400', label: 'Operational', ping: 'bg-emerald-400' };
    }
  };

  const health = getHealthDot();

  return (
    <div
      onClick={() => onClick(project.id)}
      className="group relative p-5 rounded-[10px] bg-[#161b22] hover:bg-[#1c2333] border border-white/5 hover:border-[#F0B230]/40 transition-all cursor-pointer flex flex-col justify-between shadow-lg"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(project.id);
        }
      }}
      aria-label={`Open project details for ${project.name}`}
    >
      <div>
        {/* Top line: Health dot & Status pill */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2" title={`Health: ${health.label}`}>
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${health.ping}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${health.color}`} />
            </span>
            <span className="text-[11px] font-mono text-[#8b98a8]">{project.vertical}</span>
          </div>

          <StatusPill status={project.status} size="sm" />
        </div>

        {/* Project Name */}
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[#e6edf3] group-hover:text-[#FFBD59] transition-colors">
            {project.name}
          </h3>
          <ChevronRight className="w-4 h-4 text-[#8b98a8] group-hover:text-[#F0B230] group-hover:translate-x-0.5 transition-all" />
        </div>

        {/* Instructions preview */}
        {project.agent_instructions && (
          <p className="text-xs text-[#8b98a8] mt-2 line-clamp-2 leading-relaxed">
            {project.agent_instructions}
          </p>
        )}
      </div>

      {/* Bottom KPI bar */}
      <div className="mt-5 pt-3.5 border-t border-white/5 flex items-center justify-between text-xs font-mono text-[#8b98a8]">
        <div>
          <span className="text-[10px] uppercase text-[#8b98a8] block font-sans">MONTH SPEND</span>
          <span className="text-sm font-bold text-[#FFBD59] tabular-nums">
            {formatCost(monthlySpend)}
          </span>
        </div>

        <div className="text-right">
          <span className="text-[10px] uppercase text-[#8b98a8] block font-sans">LAST ACTIVITY</span>
          <span className="text-xs text-[#e6edf3]">
            {formatRelative(project.last_activity_at || project.updated_at)}
          </span>
        </div>
      </div>
    </div>
  );
};
