import React, { useState } from 'react';
import { ProjectRegistry, ProjectVertical } from '../types';
import { DeploymentBadge } from './DeploymentBadge';
import { GitHubLogo, SupabaseLogo, VercelLogo } from './ServiceLogos';
import {
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Bot,
  Activity,
  DollarSign,
  Layers,
  ArrowUpRight,
  GitBranch,
  GitCommit,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Github,
  RefreshCw
} from 'lucide-react';

interface PortfolioViewProps {
  projects: ProjectRegistry[];
  onSelectProject: (projectId: string) => void;
  onOpenTaskModalForProject?: (projectId: string) => void;
  onSyncProjectRepo?: (projectId: string) => void;
  activeTasksCountByProject: Record<string, number>;
  openFindingsCountByProject: Record<string, number>;
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({
  projects,
  onSelectProject,
  onOpenTaskModalForProject,
  onSyncProjectRepo,
  activeTasksCountByProject,
  openFindingsCountByProject
}) => {
  const [verticalFilter, setVerticalFilter] = useState<string>('all');
  const [refreshingProjectId, setRefreshingProjectId] = useState<string | null>(null);

  const filteredProjects = projects.filter((p) => {
    if (verticalFilter === 'all') return true;
    return p.vertical === verticalFilter;
  });

  const totalSpend = projects.reduce((acc, p) => acc + p.current_spend_usd, 0);
  const totalBudget = projects.reduce((acc, p) => acc + p.monthly_budget_usd, 0);
  const totalOpenFindings = Object.values(openFindingsCountByProject).reduce(
    (a, b) => a + b,
    0
  );

  const totalDrifted = projects.filter((p) => p.repo_sync?.state === 'drifted').length;

  const handleManualSync = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    setRefreshingProjectId(projectId);
    if (onSyncProjectRepo) {
      onSyncProjectRepo(projectId);
    }
    setTimeout(() => {
      setRefreshingProjectId(null);
    }, 1200);
  };

  return (
    <div className="space-y-8">
      {/* Portfolio Overview Header & Metric Anchors */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Client Verticals & Project Registry
          </h1>
          <p className="mt-1 text-sm text-slate-400 max-w-2xl">
            Single source of truth tracking multi-tenant client deployments, model spend attribution, and autonomous QA health.
          </p>
        </div>

        {/* Global Portfolio Metrics with Tabular Numbers */}
        <div className="flex items-center gap-6 text-sm text-slate-400 font-mono">
          <div>
            <span className="block text-xs uppercase text-slate-500 font-sans">Active Verticals</span>
            <span className="text-lg font-semibold text-white tabular-nums">{projects.length}</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="block text-xs uppercase text-slate-500 font-sans">Combined Spend</span>
            <span className="text-lg font-semibold text-cyan-400 tabular-nums">
              ${totalSpend.toFixed(2)}
              <span className="text-xs text-slate-500 font-normal"> / ${totalBudget.toFixed(0)}</span>
            </span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="block text-xs uppercase text-slate-500 font-sans">Repo Drift</span>
            <span className={`text-lg font-semibold tabular-nums ${totalDrifted > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {totalDrifted} {totalDrifted === 1 ? 'project' : 'projects'}
            </span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="block text-xs uppercase text-slate-500 font-sans">QA Regressions</span>
            <span className={`text-lg font-semibold tabular-nums ${totalOpenFindings > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {totalOpenFindings}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Segmented Control (Allowed functional interactive button controls) */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
          <button
            onClick={() => setVerticalFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              verticalFilter === 'all'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Verticals ({projects.length})
          </button>
          <button
            onClick={() => setVerticalFilter('logistics')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              verticalFilter === 'logistics'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Logistics
          </button>
          <button
            onClick={() => setVerticalFilter('agriculture')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              verticalFilter === 'agriculture'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Agriculture
          </button>
          <button
            onClick={() => setVerticalFilter('aviation')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              verticalFilter === 'aviation'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Aviation
          </button>
          <button
            onClick={() => setVerticalFilter('fintech')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              verticalFilter === 'fintech'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Fintech
          </button>
        </div>

        <div className="text-xs text-slate-500 font-mono flex items-center gap-4">
          <span>
            RLS Policy: <span className="text-cyan-400">super_admin (full access)</span>
          </span>
        </div>
      </div>

      {/* Projects Grid (Single-Elevation Depth, Zero-Pill Metadata) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filteredProjects.map((project) => {
          const activeTasks = activeTasksCountByProject[project.id] || 0;
          const openFindings = openFindingsCountByProject[project.id] || 0;
          const spendPercent = Math.min(
            100,
            (project.current_spend_usd / project.monthly_budget_usd) * 100
          );
          const isSyncing = refreshingProjectId === project.id;
          const syncInfo = project.repo_sync;
          const isDrifted = syncInfo?.state === 'drifted';

          return (
            <div
              key={project.id}
              className={`group bg-slate-900/60 border rounded-xl p-5 transition-all flex flex-col justify-between ${
                isDrifted
                  ? 'border-slate-800 hover:border-amber-700/60'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                {/* Clean Unboxed Metadata Header (Section 1A: Zero-Pill Discipline) */}
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="capitalize text-slate-300 font-medium">
                      {project.vertical}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize">{project.status}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-slate-400">{project.id}</span>
                  </div>

                  {/* Health indicator and Deployment Status Badge */}
                  <div className="flex items-center gap-2.5">
                    <DeploymentBadge status={project.deployment_status} size="sm" />
                    <div className="flex items-center gap-1.5 border-l border-slate-800 pl-2.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          project.health === 'healthy'
                            ? 'bg-emerald-400'
                            : project.health === 'warning'
                            ? 'bg-amber-400'
                            : 'bg-rose-400'
                        }`}
                      />
                      <span className="capitalize text-slate-400 text-xs">
                        {project.health}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Key Status Bar: Commit Hash & Detailed Deployment Status Badge */}
                <div className="flex items-center justify-between py-1.5 px-2.5 mb-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Commit:</span>
                    <code className="text-cyan-300 bg-slate-900 px-1.5 py-0.5 rounded text-[11px] font-semibold">
                      {project.last_commit_hash}
                    </code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Deployment:</span>
                    <DeploymentBadge status={project.deployment_status} size="sm" />
                  </div>
                </div>

                {/* Project Title & Description */}
                <h3 className="text-lg font-semibold text-white group-hover:text-cyan-400 transition-colors">
                  {project.name}
                </h3>
                <p className="mt-1 text-sm text-slate-400 line-clamp-2 leading-relaxed">
                  {project.description}
                </p>

                {/* GitHub Repo Synchronization & Drift Indicator Block */}
                <div className="mt-3.5 p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-1.5">
                      <GitHubLogo className="w-3.5 h-3.5 text-slate-300" />
                      <a
                        href={project.github_repo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-300 hover:text-cyan-300 truncate max-w-[200px] flex items-center gap-1"
                        title={project.github_repo_url}
                      >
                        {project.github_repo_url.replace('https://github.com/', '')}
                        <ArrowUpRight className="w-2.5 h-2.5 opacity-60" />
                      </a>
                    </div>

                    <button
                      onClick={(e) => handleManualSync(e, project.id)}
                      disabled={isSyncing}
                      className="px-2.5 py-1 rounded text-xs font-mono font-medium text-cyan-300 hover:text-cyan-200 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-800/60 hover:border-cyan-700 transition-colors flex items-center gap-1.5 shadow-sm"
                      title="Fetch latest commit from GitHub repository to refresh deployment and drift status"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-cyan-400' : 'text-cyan-400'}`}
                      />
                      <span>{isSyncing ? 'Refreshing...' : 'Refresh Status'}</span>
                    </button>
                  </div>

                  {/* Drift Status Indicator */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-900 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-slate-400">
                        <GitCommit className="w-3 h-3 text-cyan-400" />
                        <span className="text-slate-500">IDE:</span>
                        <code className="text-cyan-300 bg-slate-900 px-1 py-0.2 rounded">
                          {project.last_commit_hash.slice(0, 7)}
                        </code>
                      </span>

                      {syncInfo && (
                        <span className="flex items-center gap-1 text-slate-400">
                          <span className="text-slate-500">Origin:</span>
                          <code className="text-slate-300 bg-slate-900 px-1 py-0.2 rounded">
                            {syncInfo.remote_commit_hash.slice(0, 7)}
                          </code>
                        </span>
                      )}
                    </div>

                    {/* Sync Indicator Pill/Status */}
                    <div>
                      {isDrifted ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-300 font-semibold bg-amber-950/40 border border-amber-800/60 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="w-3 h-3" />
                          <span>
                            Drift ({syncInfo?.commits_ahead || 0} ahead, {syncInfo?.commits_behind || 0} behind)
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300 bg-emerald-950/40 border border-emerald-800/50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>In Sync</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Drift Summary Note if any */}
                  {syncInfo?.drift_summary && (
                    <div className="text-[11px] text-slate-400 font-sans leading-tight pt-0.5 flex items-start gap-1">
                      <span className="text-slate-500 font-mono">Status:</span>
                      <span className={isDrifted ? 'text-amber-200/90' : 'text-slate-300'}>
                        {syncInfo.drift_summary}
                      </span>
                    </div>
                  )}
                </div>

                {/* Subsystem Endpoints */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/60 grid grid-cols-2 gap-2 text-xs font-mono text-slate-400">
                  <div className="flex items-center gap-1.5 truncate">
                    <SupabaseLogo className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-slate-300 truncate" title={project.supabase_project_url}>
                      {project.supabase_project_url.replace('https://', '')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <VercelLogo className="w-3 h-3 text-white shrink-0" />
                    <a
                      href={project.vercel_deployment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:underline truncate flex items-center gap-1"
                    >
                      {project.vercel_deployment_url.replace('https://', '')}
                      <ArrowUpRight className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Bottom Metrics Bar */}
              <div className="mt-5 pt-4 border-t border-slate-800">
                {/* Spend meter */}
                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">API Spend Allocation</span>
                    <span className="font-mono text-slate-300 tabular-nums">
                      ${project.current_spend_usd.toFixed(2)} / ${project.monthly_budget_usd.toFixed(2)} ({spendPercent.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        spendPercent > 85 ? 'bg-rose-400' : spendPercent > 60 ? 'bg-amber-400' : 'bg-cyan-400'
                      }`}
                      style={{ width: `${spendPercent}%` }}
                    />
                  </div>
                </div>

                {/* Action buttons and Counters */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <Bot className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{activeTasks} active task{activeTasks !== 1 ? 's' : ''}</span>
                    </div>

                    <div className={`flex items-center gap-1.5 ${openFindings > 0 ? 'text-amber-300' : 'text-slate-500'}`}>
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>{openFindings} QA finding{openFindings !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {onOpenTaskModalForProject && (
                      <button
                        onClick={() => onOpenTaskModalForProject(project.id)}
                        className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        + Task
                      </button>
                    )}
                    <button
                      onClick={() => onSelectProject(project.id)}
                      className="px-3 py-1 text-xs font-medium text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 border border-cyan-800/50 hover:border-cyan-700 rounded-lg transition-colors flex items-center gap-1"
                    >
                      Console
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

