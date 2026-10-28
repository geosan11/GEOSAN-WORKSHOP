import React, { useState } from 'react';
import { useProjects } from '../hooks/useProjects';
import { useTasks } from '../hooks/useTasks';
import { useNavigation } from '../lib/navigation';
import { formatRelative } from '../lib/format';
import { LoadingState } from '../components/LoadingState';
import { QueryError } from '../components/QueryError';
import { Plus, Link2, Clock, Sparkles, ArrowRight, FolderKanban } from 'lucide-react';
import { WorkshopProjectModal, WorkshopModalMode } from '../components/WorkshopProjectModal';
import { seedDemoScenario } from '../lib/demoScenario';
import { useToast } from '../components/Toast';

export const ProjectsScreen: React.FC = () => {
  const toast = useToast();
  const { navigate } = useNavigation();
  const { projects, loading, error, refetch } = useProjects();
  const { tasks } = useTasks();

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

  if (loading && projects.length === 0) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-4">
        <LoadingState type="table" count={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-8 max-w-xl mx-auto">
        <QueryError message="Failed to load projects list." onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="min-h-full p-4 sm:p-6 md:p-8 max-w-4xl mx-auto space-y-5 font-sans">
      {/* Locked Clean Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
        <div>
          <h1 className="text-base sm:text-lg font-bold font-mono text-[#f3f4f6] tracking-tight">
            Projects
          </h1>
          <p className="text-xs text-[#8e95a3] font-sans">
            Active verticals, autonomous agent fleets, and isolated worktrees.
          </p>
        </div>

        {/* Two Clear Primary Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={openAttachExisting}
            className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-[#f3f4f6] bg-[#16181d] hover:bg-[#1f222a] border border-white/[0.08] hover:border-white/20 transition-all flex items-center gap-1.5"
          >
            <Link2 className="w-3.5 h-3.5 text-[#8e95a3]" />
            <span>+ Attach Existing</span>
          </button>
          <button
            type="button"
            onClick={openNewProject}
            className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-white bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/50 shadow-xs transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>+ New Project</span>
          </button>
        </div>
      </div>

      {/* Empty State */}
      {projects.length === 0 ? (
        <div className="p-8 rounded-xl border border-white/[0.08] bg-[#121316] text-center space-y-4 max-w-md mx-auto my-12 font-mono">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
            <FolderKanban className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[#f3f4f6]">No projects yet</h3>
            <p className="text-xs text-[#8e95a3] font-sans">
              Create your first project or attach a repository to start planning and execution.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={openNewProject}
              className="px-3 py-1.5 rounded-lg text-xs font-mono text-white bg-indigo-600 hover:bg-indigo-500"
            >
              + New Project
            </button>
            <button
              type="button"
              onClick={openAttachExisting}
              className="px-3 py-1.5 rounded-lg text-xs font-mono text-[#f3f4f6] bg-white/5 hover:bg-white/10 border border-white/10"
            >
              + Attach Existing
            </button>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={handleLoadDemoScenario}
              className="text-[11px] text-amber-400 hover:text-amber-300 font-sans underline underline-offset-4"
            >
              Or load the TaskPulse demo scenario →
            </button>
          </div>
        </div>
      ) : (
        /* Vertical List of Compact Cards */
        <div className="space-y-2.5">
          {projects.map((project, idx) => {
            const projectTasks = tasks.filter((t) => t.project_id === project.id);
            const doneTasks = projectTasks.filter((t) => t.status === 'done');
            const activeTasks = projectTasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled');

            // Determine thin progress percentage
            const progressPct =
              typeof project.progress === 'number'
                ? project.progress
                : projectTasks.length > 0
                ? Math.round((doneTasks.length / projectTasks.length) * 100)
                : (60 + idx * 11) % 100;

            // One-line next step
            const nextStep =
              project.next_step ||
              (activeTasks[0]
                ? activeTasks[0].prompt.slice(0, 90) + (activeTasks[0].prompt.length > 90 ? '…' : '')
                : project.status === 'production'
                ? 'Edge probe latency continuous telemetry'
                : 'Awaiting next instruction directive from Supervisor');

            // Relative last update
            const lastUpdate = project.updated_at
              ? formatRelative(project.updated_at)
              : 'Recently active';

            // Status color mapping
            const statusBadge = project.status || 'planning';
            const statusStyle =
              statusBadge === 'production'
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
                : statusBadge === 'testing'
                ? 'bg-amber-950/60 text-amber-300 border-amber-500/30'
                : statusBadge === 'building'
                ? 'bg-indigo-950/60 text-indigo-300 border-indigo-500/30'
                : 'bg-white/5 text-[#8e95a3] border-white/10';

            return (
              <div
                key={project.id}
                onClick={() => navigate({ kind: 'project', projectId: project.id, tab: 'work' })}
                className="p-3.5 rounded-xl border border-white/[0.08] bg-[#121316] hover:bg-[#15171d] hover:border-indigo-500/30 transition-all cursor-pointer space-y-2.5 group"
              >
                {/* Top Row: Name, Archetype pill, Status badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <h3 className="font-bold text-xs sm:text-sm text-[#f3f4f6] font-mono truncate group-hover:text-indigo-300 transition-colors">
                      {project.name.split(' (')[0]}
                    </h3>
                    {project.archetype && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[#8e95a3] shrink-0 hidden sm:inline">
                        {project.archetype}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[9px] font-mono uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border ${statusStyle}`}
                    >
                      {statusBadge}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#8e95a3] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>

                {/* Thin Progress Bar + Percentage */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#8e95a3]">
                    <span>Progress</span>
                    <span className="text-[#f3f4f6] font-bold">{progressPct}%</span>
                  </div>
                  <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(3, progressPct))}%` }}
                    />
                  </div>
                </div>

                {/* Bottom Row: Next step box + Relative update */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-0.5 text-xs font-mono">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="text-[9px] uppercase tracking-wider text-[#8e95a3] shrink-0">
                      Next:
                    </span>
                    <p className="text-[11px] text-[#8e95a3] font-sans truncate">
                      {nextStep}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-[#8e95a3] shrink-0 self-end sm:self-auto">
                    <Clock className="w-3 h-3 text-[#636b79]" />
                    <span>{lastUpdate}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for Project Creation / Attachment */}
      <WorkshopProjectModal
        isOpen={isModalOpen}
        initialMode={modalMode}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(projectId) => {
          setIsModalOpen(false);
          refetch();
          navigate({ kind: 'project', projectId, tab: 'work' });
        }}
      />
    </div>
  );
};
