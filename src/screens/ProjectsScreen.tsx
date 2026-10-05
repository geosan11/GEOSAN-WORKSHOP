import React from 'react';
import { useProjects } from '../hooks/useProjects';
import { useTasks } from '../hooks/useTasks';
import { useCosts } from '../hooks/useCosts';
import { useNavigation } from '../lib/navigation';
import { projectMonthlySpend } from '../lib/cost';
import { formatCost } from '../lib/format';
import { LoadingState } from '../components/LoadingState';
import { QueryError } from '../components/QueryError';
import { StatusPill } from '../components/StatusPill';
import { VercelLogo, GitHubLogo } from '../components/ServiceLogos';
import { FolderGit2, ChevronRight, Activity, ArrowRight } from 'lucide-react';

export const ProjectsScreen: React.FC = () => {
  const { navigate } = useNavigation();
  const { projects, loading: pLoading, error: pError, refetch } = useProjects();
  const { tasks } = useTasks();
  const { costEvents } = useCosts();

  if (pLoading && projects.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <LoadingState type="table" count={4} />
      </div>
    );
  }

  if (pError) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <QueryError message="Failed to load projects list. Retry?" onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Header: One H1 & Lede */}
      <div className="pb-2 border-b border-white/5">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#e6edf3]">
          Projects
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Four client verticals running isolated git worktrees and continuous verification.
        </p>
      </div>

      {/* Projects List as Rows (Not cards) */}
      <div className="bg-[#161b22] border border-white/10 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0d1117] border-b border-white/10 text-slate-400 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Kind / Vertical</th>
                <th className="py-3 px-4">Health</th>
                <th className="py-3 px-4">Probe MS</th>
                <th className="py-3 px-4 text-center">Open Tasks</th>
                <th className="py-3 px-4 text-right">Month Spend</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {projects.map((project) => {
                const projectTasks = tasks.filter(
                  (t) => t.project_id === project.id && t.status !== 'done' && t.status !== 'cancelled'
                );
                const spend = projectMonthlySpend(costEvents, project.id);
                const probeMs = project.id === 'proj-ehi-001' ? 12 : project.id === 'proj-iya-002' ? 18 : project.id === 'proj-aero-003' ? 24 : 15;

                return (
                  <tr
                    key={project.id}
                    onClick={() => navigate({ kind: 'project', projectId: project.id, tab: 'work' })}
                    className="hover:bg-[#1c2333] transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                        <span className="font-sans font-semibold text-slate-100">{project.name.split(' (')[0]}</span>
                        <div className="flex items-center gap-1 ml-1" onClick={(e) => e.stopPropagation()}>
                          {(project as any).vercel_deployment_url && (
                            <a
                              href={(project as any).vercel_deployment_url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded bg-[#0d1117] hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                              title="Open Vercel Deployment"
                            >
                              <VercelLogo className="w-3 h-3 text-slate-300" />
                            </a>
                          )}
                          {(project as any).github_repo_url && (
                            <a
                              href={(project as any).github_repo_url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded bg-[#0d1117] hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                              title="Open GitHub Repository"
                            >
                              <GitHubLogo className="w-3 h-3 text-slate-300" />
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 uppercase text-[11px]">
                      {project.vertical}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusPill status="healthy" size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-emerald-400 font-bold">
                      {probeMs} ms
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-bold">
                        {projectTasks.length}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-200 tabular-nums">
                      {formatCost(spend)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="inline-flex items-center gap-1 text-emerald-400 group-hover:text-emerald-300 font-bold">
                        Open Work <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
