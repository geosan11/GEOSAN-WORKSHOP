import React from 'react';
import { Project, AgentTask, QAFinding } from '../../lib/types';
import { Disclosure } from './Disclosure';
import { StatusPill } from '../StatusPill';
import { formatCost, formatRelative } from '../../lib/format';
import { useNavigation } from '../../lib/navigation';
import {
  ExternalLink,
  GitBranch,
  Activity,
  DollarSign,
  Clock,
  ArrowRight,
  MessageSquare,
  Plus,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

interface ProjectDisclosureCardProps {
  project: Project;
  monthlySpend?: number;
  tasks?: AgentTask[];
  qaFindings?: QAFinding[];
  onOpenProject: (projectId: string) => void;
}

export const ProjectDisclosureCard: React.FC<ProjectDisclosureCardProps> = ({
  project,
  monthlySpend = 0,
  tasks = [],
  qaFindings = [],
  onOpenProject
}) => {
  const { navigate } = useNavigation();

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

  // Project task stats
  const projectTasks = tasks.filter((t) => t.project_id === project.id);
  const runningCount = projectTasks.filter((t) => t.status === 'running').length;
  const approvalCount = projectTasks.filter((t) => t.status === 'awaiting_approval').length;
  const doneCount = projectTasks.filter((t) => t.status === 'done').length;

  // Open QA findings
  const openFindings = qaFindings.filter((f) => f.status === 'open');

  // L0: Ambient Header & KPIs
  const summaryContent = (
    <div className="space-y-3">
      {/* Top line: Health dot & Status pill */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2" title={`Health: ${health.label}`}>
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${health.ping}`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${health.color}`} />
          </span>
          <span className="text-[11px] font-mono text-[#8b98a8]">{project.vertical}</span>
        </div>

        <StatusPill status={project.status} size="sm" />
      </div>

      {/* Project Title */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-[#e6edf3] group-hover:text-[#FFBD59] transition-colors">
          {project.name}
        </h3>
      </div>

      {/* Instructions excerpt */}
      {project.agent_instructions && (
        <p className="text-xs text-[#8b98a8] line-clamp-1 leading-relaxed">
          {project.agent_instructions}
        </p>
      )}

      {/* Bottom KPI bar */}
      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs font-mono text-[#8b98a8]">
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

  // L1: In-Card Focus Breakdown & Fast Triggers
  const detailContent = (
    <div className="space-y-3.5 pt-1">
      {/* Task breakdown chips */}
      <div className="space-y-1">
        <span className="text-[10px] font-mono uppercase text-[#8b98a8]">
          Active Pipeline Telemetry
        </span>
        <div className="grid grid-cols-3 gap-2 font-mono text-[10px]">
          <div className="p-2 rounded bg-[#0d1117] border border-white/5 space-y-0.5">
            <span className="text-[#8b98a8] block">RUNNING</span>
            <span className={`font-bold ${runningCount > 0 ? 'text-[#F0B230]' : 'text-[#8b98a8]'}`}>
              {runningCount} tasks
            </span>
          </div>

          <div className="p-2 rounded bg-[#0d1117] border border-white/5 space-y-0.5">
            <span className="text-[#8b98a8] block">AWAITING SIGN-OFF</span>
            <span className={`font-bold ${approvalCount > 0 ? 'text-[#FFBD59]' : 'text-[#8b98a8]'}`}>
              {approvalCount} PRs
            </span>
          </div>

          <div className="p-2 rounded bg-[#0d1117] border border-white/5 space-y-0.5">
            <span className="text-[#8b98a8] block">COMPLETED</span>
            <span className="text-emerald-400 font-bold">
              {doneCount} tasks
            </span>
          </div>
        </div>
      </div>

      {/* Links & Repository Context */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {project.repo_url && (
          <a
            href={project.repo_url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="px-2.5 py-1 rounded bg-[#0d1117] hover:bg-[#161b22] border border-white/5 text-[11px] font-mono text-[#8b98a8] hover:text-[#e6edf3] flex items-center gap-1.5 transition-colors"
          >
            <GitBranch className="w-3 h-3 text-[#F0B230]" />
            <span>Repository</span>
          </a>
        )}

        {project.vercel_deployment_url && (
          <a
            href={project.vercel_deployment_url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="px-2.5 py-1 rounded bg-[#0d1117] hover:bg-[#161b22] border border-white/5 text-[11px] font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Live Webhook</span>
          </a>
        )}

        <div className="ml-auto text-[10px] font-mono text-[#8b98a8]">
          Branch: <span className="text-cyan-400">{project.git_branch || 'main'}</span>
        </div>
      </div>

      {/* Action Buttons & L2 Navigation */}
      <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate({ kind: 'console' });
            }}
            className="px-3 py-1.5 rounded-lg bg-[#F0B230]/15 hover:bg-[#F0B230] text-[#FFBD59] hover:text-[#0A1420] text-xs font-bold transition-all flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Dispatch
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate({ kind: 'project', projectId: project.id, tab: 'chat' });
            }}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#8b98a8] hover:text-white text-xs font-bold transition-all flex items-center gap-1"
          >
            <MessageSquare className="w-3 h-3 text-[#F0B230]" />
            Agent Chat
          </button>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenProject(project.id);
          }}
          className="text-xs font-bold text-[#F0B230] hover:text-[#FFBD59] flex items-center gap-1 font-mono transition-colors"
        >
          <span>L2 Deep View</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  return (
    <Disclosure
      persistKey={`project-${project.id}`}
      summary={summaryContent}
      detail={detailContent}
      variant="card"
      ariaLabel={`Project ${project.name}`}
      className="group"
    />
  );
};
