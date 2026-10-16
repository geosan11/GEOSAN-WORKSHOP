import React, { useMemo, useState } from 'react';
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
import { ArrowRight, Plus } from 'lucide-react';
import { ProjectWizardModal } from '../components/ProjectWizardModal';
import { HowToStartCards, StartPath } from '../components/HowToStartCards';
import { PageHeader, SectionCard } from '../components/ui';

export const ProjectsScreen: React.FC = () => {
  const { navigate } = useNavigation();
  const { projects, loading: pLoading, error: pError, refetch } = useProjects();
  const { tasks } = useTasks();
  const { costEvents } = useCosts();
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardTemplateId, setWizardTemplateId] = useState('fintech-ledger');

  const openWizard = (path: StartPath = 'ai') => {
    if (path === 'scratch') {
      setWizardTemplateId('scratch');
      setWizardStep(2);
    } else if (path === 'github') {
      setWizardTemplateId('scratch');
      setWizardStep(2);
    } else {
      setWizardTemplateId('fintech-ledger');
      setWizardStep(1);
    }
    setIsWizardOpen(true);
  };

  const openTaskCount = useMemo(
    () => tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled').length,
    [tasks]
  );
  const fleetSpend = useMemo(
    () => projects.reduce((sum, p) => sum + projectMonthlySpend(costEvents, p.id), 0),
    [projects, costEvents]
  );

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
      <PageHeader
        eyebrow="Build"
        title="Projects"
        lede="Client verticals with isolated worktrees. Open Work to continue, or start a new vertical."
        actions={
          <button
            type="button"
            onClick={() => openWizard('ai')}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Project</span>
          </button>
        }
      />

      {projects.length === 0 ? (
        <HowToStartCards onChoose={openWizard} />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3" aria-label="Projects orientation counts">
            <div className="kpi-tile">
              <p className="text-meta">Projects</p>
              <span className="kpi-tile-value text-main">{projects.length}</span>
            </div>
            <div className="kpi-tile">
              <p className="text-meta">Open tasks</p>
              <span className="kpi-tile-value text-main">{openTaskCount}</span>
            </div>
            <div className="kpi-tile">
              <p className="text-meta">Month spend</p>
              <span className="kpi-tile-value text-primary">{formatCost(fleetSpend)}</span>
            </div>
          </div>

          <SectionCard
            flush
            title="All projects"
            description="One row per vertical — open Work for the next action."
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-app border-b border-app text-meta">
                  <tr>
                    <th className="py-3 px-4 font-normal">Name</th>
                    <th className="py-3 px-4 font-normal">Vertical</th>
                    <th className="py-3 px-4 font-normal">Health</th>
                    <th className="py-3 px-4 text-center font-normal">Open</th>
                    <th className="py-3 px-4 text-right font-normal">Spend</th>
                    <th className="py-3 px-4 text-right font-normal"> </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {projects.map((project) => {
                    const projectTasks = tasks.filter(
                      (t) =>
                        t.project_id === project.id &&
                        t.status !== 'done' &&
                        t.status !== 'cancelled'
                    );
                    const spend = projectMonthlySpend(costEvents, project.id);

                    return (
                      <tr
                        key={project.id}
                        onClick={() =>
                          navigate({ kind: 'project', projectId: project.id, tab: 'work' })
                        }
                        className="list-row cursor-pointer group"
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-[1px] bg-emerald-400 shrink-0" />
                            <span className="font-display font-bold text-sm tracking-tight text-main">
                              {project.name.split(' (')[0]}
                            </span>
                            <div
                              className="flex items-center gap-1 ml-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {(project as { vercel_deployment_url?: string })
                                .vercel_deployment_url && (
                                  <a
                                    href={
                                      (project as { vercel_deployment_url?: string })
                                        .vercel_deployment_url
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1 rounded bg-app hover:bg-white/10 text-muted hover:text-main transition-colors"
                                    title="Open Vercel Deployment"
                                  >
                                    <VercelLogo className="w-3 h-3" />
                                  </a>
                                )}
                              {((project as { github_repo_url?: string }).github_repo_url ||
                                project.repo_url) && (
                                  <a
                                    href={
                                      (project as { github_repo_url?: string }).github_repo_url ||
                                      project.repo_url ||
                                      undefined
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1 rounded bg-app hover:bg-white/10 text-muted hover:text-main transition-colors"
                                    title="Open GitHub Repository"
                                  >
                                    <GitHubLogo className="w-3 h-3" />
                                  </a>
                                )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-muted uppercase text-[11px]">
                          {project.vertical}
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusPill status="healthy" size="sm" />
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="stamp">{projectTasks.length}</span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-main tabular-nums">
                          {formatCost(spend)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            className="btn btn-ghost !px-2 !py-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate({ kind: 'project', projectId: project.id, tab: 'work' });
                            }}
                          >
                            Open Work <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </>
      )}

      <ProjectWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        initialStep={wizardStep}
        initialTemplateId={wizardTemplateId}
        onSuccess={(projectId) => {
          setIsWizardOpen(false);
          navigate({ kind: 'project', projectId, tab: 'work' });
        }}
      />
    </div>
  );
};
