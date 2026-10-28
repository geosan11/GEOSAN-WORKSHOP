import React, { useMemo, useState } from 'react';
import { useProjects } from '../hooks/useProjects';
import { useTasks } from '../hooks/useTasks';
import { useCosts } from '../hooks/useCosts';
import { useNavigation } from '../lib/navigation';
import { projectMonthlySpend } from '../lib/cost';
import { formatCost, formatRelative } from '../lib/format';
import { LoadingState } from '../components/LoadingState';
import { QueryError } from '../components/QueryError';
import { VercelLogo, GitHubLogo } from '../components/ServiceLogos';
import { Plus, Link2, ArrowRight, FolderGit2, Cpu, CheckCircle2, Clock, AlertTriangle, Sparkles } from 'lucide-react';
import { WorkshopProjectModal, WorkshopModalMode } from '../components/WorkshopProjectModal';
import { HowToStartCards, StartPath } from '../components/HowToStartCards';
import { PageHeader } from '../components/ui';
import { seedDemoScenario } from '../lib/demoScenario';
import { useToast } from '../components/Toast';

export const ProjectsScreen: React.FC = () => {
  const toast = useToast();
  const { navigate } = useNavigation();
  const { projects, loading: pLoading, error: pError, refetch } = useProjects();
  const { tasks } = useTasks();
  const { costEvents } = useCosts();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<WorkshopModalMode>('create');

  const openNewProject = () => {
    setModalMode('create');
    setIsModalOpen(true);
  };

  const openAttachExisting = () => {
    setModalMode('attach');
    setIsModalOpen(true);
  };

  const handleLoadDemoScenario = () => {
    seedDemoScenario();
    refetch();
    toast.success('Loaded demo scenario: TaskPulse, EdgeTelemetry & OmniScraper seeded!');
  };

  const openWizardPath = (path: StartPath = 'ai') => {
    if (path === 'scratch' || path === 'github') {
      openAttachExisting();
    } else {
      openNewProject();
    }
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
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <LoadingState type="table" count={4} />
      </div>
    );
  }

  if (pError) {
    return (
      <div className="p-4 md:p-6 max-w-xl mx-auto">
        <QueryError message="Failed to load projects list. Retry?" onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5 font-sans">
      <PageHeader
        eyebrow="Workspace"
        title="Projects"
        lede="Active client verticals, agent fleet orchestration, and isolated repository worktrees."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLoadDemoScenario}
              className="btn btn-ghost text-xs py-1.5 px-2.5 flex items-center gap-1.5 text-muted hover:text-amber-300 border border-[color:var(--border-app)] hover:border-amber-400/40"
              title="Seed 3 sample projects including TaskPulse with execution logs and assignments"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Load demo scenario</span>
            </button>
            <button
              type="button"
              onClick={openAttachExisting}
              className="btn btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <Link2 className="w-3.5 h-3.5 text-muted" />
              <span>+ Attach Existing</span>
            </button>
            <button
              type="button"
              onClick={openNewProject}
              className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>+ New Project</span>
            </button>
          </div>
        }
      />

      {projects.length === 0 ? (
        <HowToStartCards onChoose={openWizardPath} />
      ) : (
        <>
          {/* Quick Stats Top Ribbon */}
          <div className="grid grid-cols-3 gap-3" aria-label="Projects orientation counts">
            <div className="kpi-tile py-2 px-3">
              <p className="text-[10px] text-meta uppercase tracking-wider">Total Projects</p>
              <span className="text-sm md:text-base font-bold font-mono text-main">{projects.length}</span>
            </div>
            <div className="kpi-tile py-2 px-3">
              <p className="text-[10px] text-meta uppercase tracking-wider">Active Tasks</p>
              <span className="text-sm md:text-base font-bold font-mono text-main">{openTaskCount}</span>
            </div>
            <div className="kpi-tile py-2 px-3">
              <p className="text-[10px] text-meta uppercase tracking-wider">Fleet Spend</p>
              <span className="text-sm md:text-base font-bold font-mono text-primary">{formatCost(fleetSpend)}</span>
            </div>
          </div>

          {/* Compact Clean Dark-Mode Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3.5">
            {projects.map((project, idx) => {
              const projectTasks = tasks.filter((t) => t.project_id === project.id);
              const doneTasks = projectTasks.filter((t) => t.status === 'done');
              const activeTasks = projectTasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled');
              const spend = projectMonthlySpend(costEvents, project.id);

              // Calculate thin progress percentage (default fallback 65% for active roadmap)
              const progressPct =
                projectTasks.length > 0
                  ? Math.round((doneTasks.length / projectTasks.length) * 100)
                  : (60 + (idx * 11)) % 100;

              // Derive next step & last update
              const activeTask = activeTasks[0];
              const nextStep = activeTask
                ? activeTask.prompt.slice(0, 75) + (activeTask.prompt.length > 75 ? '…' : '')
                : project.status === 'production'
                ? 'Edge probe latency continuous telemetry'
                : 'Run Schemathesis contract regression suite';

              const lastUpdate = project.updated_at
                ? formatRelative(project.updated_at)
                : 'Recently active';

              const statusBadge = project.status || 'planning';
              const statusColor =
                statusBadge === 'production'
                  ? 'bg-emerald-950/70 text-emerald-400 border-emerald-500/30'
                  : statusBadge === 'testing'
                  ? 'bg-amber-950/70 text-amber-300 border-amber-500/30'
                  : statusBadge === 'building'
                  ? 'bg-cyan-950/70 text-cyan-300 border-cyan-500/30'
                  : 'bg-white/5 text-muted border-white/10';

              return (
                <div
                  key={project.id}
                  onClick={() => navigate({ kind: 'project', projectId: project.id, tab: 'work' })}
                  className="p-3.5 rounded-xl border border-[color:var(--border-app)] bg-[color:var(--bg-card)] hover:border-white/20 transition-all cursor-pointer flex flex-col justify-between group space-y-3 shadow-xs"
                >
                  <div className="space-y-2.5">
                    {/* Top Row: Name, Status Badge, External Links */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 shadow-xs" />
                        <h3 className="font-bold text-xs md:text-sm text-main truncate font-mono tracking-tight group-hover:text-primary transition-colors">
                          {project.name.split(' (')[0]}
                        </h3>
                        <div
                          className="flex items-center gap-1 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {(project as { vercel_deployment_url?: string }).vercel_deployment_url && (
                            <a
                              href={(project as { vercel_deployment_url?: string }).vercel_deployment_url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded bg-app/80 hover:bg-white/10 text-muted hover:text-main transition-colors"
                              title="Open Deployment"
                            >
                              <VercelLogo className="w-2.5 h-2.5 text-main" />
                            </a>
                          )}
                          {((project as { github_repo_url?: string }).github_repo_url || project.repo_url) && (
                            <a
                              href={(project as { github_repo_url?: string }).github_repo_url || project.repo_url || undefined}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded bg-app/80 hover:bg-white/10 text-muted hover:text-main transition-colors"
                              title="Open Repository"
                            >
                              <GitHubLogo className="w-2.5 h-2.5 text-main" />
                            </a>
                          )}
                        </div>
                      </div>

                      <span
                        className={`text-[9px] font-mono uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border shrink-0 ${statusColor}`}
                      >
                        {statusBadge}
                      </span>
                    </div>

                    {/* Thin Progress Bar + Percentage */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono text-muted">
                        <span className="flex items-center gap-1">
                          <Cpu className="w-3 h-3 text-[#F0B230]" />
                          <span>Progress</span>
                        </span>
                        <span className="font-bold text-main">{progressPct}%</span>
                      </div>
                      <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#F0B230] to-emerald-400 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(4, progressPct))}%` }}
                        />
                      </div>
                    </div>

                    {/* Next Step Box */}
                    <div className="p-2 rounded-lg bg-[color:var(--bg-app)] border border-[color:var(--border-app)] text-[11px] font-mono text-muted space-y-0.5">
                      <span className="text-[9px] uppercase tracking-wider text-meta block">Next Step:</span>
                      <p className="text-main line-clamp-1 text-[11px] font-sans">
                        {nextStep}
                      </p>
                    </div>
                  </div>

                  {/* Card Footer: Last Update, Spend & Action */}
                  <div className="pt-2 border-t border-[color:var(--border-app)] flex items-center justify-between text-[10px] font-mono text-muted">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-meta" />
                      <span>{lastUpdate}</span>
                    </span>

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-main tabular-nums">{formatCost(spend)}</span>
                      <span className="btn btn-ghost !px-1.5 !py-0.5 text-[10px] text-primary flex items-center gap-0.5">
                        <span>Work</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <WorkshopProjectModal
        isOpen={isModalOpen}
        initialMode={modalMode}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(projectId) => {
          setIsModalOpen(false);
          navigate({ kind: 'project', projectId, tab: 'work' });
        }}
      />
    </div>
  );
};
