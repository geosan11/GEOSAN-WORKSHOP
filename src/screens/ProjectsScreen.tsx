import React, { useState } from 'react';
import { useProjects } from '../hooks/useProjects';
import { useTasks } from '../hooks/useTasks';
import { useNavigation } from '../lib/navigation';
import { formatRelative } from '../lib/format';
import { QueryError } from '../components/QueryError';
import { Plus, Link2, Clock, Bot, ArrowRight } from 'lucide-react';
import { WorkshopProjectModal, WorkshopModalMode } from '../components/WorkshopProjectModal';
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

  // Skeleton loader matching exact final card dimensions
  if (loading && projects.length === 0) {
    return (
      <div className="min-h-full p-4 sm:p-6 max-w-4xl mx-auto space-y-4 font-sans">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="h-5 w-24 bg-zinc-800/60 rounded animate-pulse" />
          <div className="flex items-center gap-2">
            <div className="h-7 w-28 bg-zinc-800/60 rounded-lg animate-pulse" />
            <div className="h-7 w-28 bg-zinc-800/60 rounded-lg animate-pulse" />
          </div>
        </div>

        <div className="space-y-2">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="p-3 sm:p-3.5 rounded-xl bg-[#111113] border border-white/[0.06] space-y-2.5 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="h-4 w-48 bg-zinc-800/60 rounded" />
                <div className="h-4 w-16 bg-zinc-800/60 rounded" />
              </div>
              <div className="h-1 w-full bg-zinc-800/50 rounded-full" />
              <div className="h-3.5 w-3/4 bg-zinc-800/40 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-full p-6 max-w-md mx-auto text-center font-sans space-y-4 pt-12">
        <QueryError message="Failed to load projects." onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="min-h-full p-4 sm:p-6 max-w-4xl mx-auto space-y-4 font-sans text-zinc-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
        <div>
          <h1 className="text-[18px] sm:text-[20px] font-semibold text-zinc-100 tracking-tight">
            Projects
          </h1>
          <p className="text-[13px] text-zinc-400 font-normal">
            Autonomous agent fleets and active worktrees.
          </p>
        </div>

        {/* Two Quiet but Clear Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={openAttachExisting}
            className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium text-zinc-300 hover:text-zinc-100 bg-[#161619] hover:bg-[#1f2025] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-150 ease-out flex items-center gap-1.5 focus-visible:ring-1 focus-visible:ring-indigo-500/50 outline-none active:scale-[0.98]"
          >
            <Link2 className="w-3.5 h-3.5 text-zinc-400" />
            <span>+ Attach Existing</span>
          </button>
          <button
            type="button"
            onClick={openNewProject}
            className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium text-white bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/40 shadow-xs transition-all duration-150 ease-out flex items-center gap-1.5 focus-visible:ring-1 focus-visible:ring-indigo-500/50 outline-none active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>+ New Project</span>
          </button>
        </div>
      </div>

      {/* Empty State: Single sentence + two buttons */}
      {projects.length === 0 ? (
        <div className="py-16 text-center space-y-4 max-w-md mx-auto font-sans">
          <p className="text-[13px] text-zinc-400">
            No active projects found. Create a project to start planning or attach an existing repository.
          </p>
          <div className="flex items-center justify-center gap-2 pt-1 font-mono">
            <button
              type="button"
              onClick={openAttachExisting}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-zinc-100 bg-[#161619] hover:bg-[#1f2025] border border-white/[0.06] transition-all duration-150 ease-out flex items-center gap-1.5"
            >
              <Link2 className="w-3.5 h-3.5 text-zinc-400" />
              <span>+ Attach Existing</span>
            </button>
            <button
              type="button"
              onClick={openNewProject}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/40 transition-all duration-150 ease-out flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ New Project</span>
            </button>
          </div>
        </div>
      ) : (
        /* Vertical list of compact project cards */
        <div className="space-y-2">
          {projects.map((project) => {
            const status = project.status || 'planning';
            const progress = typeof project.progress === 'number' ? project.progress : 0;

            const statusColors: Record<string, string> = {
              production: 'bg-emerald-950/60 text-emerald-400 border-emerald-500/25',
              testing: 'bg-amber-950/60 text-amber-300 border-amber-500/25',
              building: 'bg-indigo-950/60 text-indigo-300 border-indigo-500/25',
              planning: 'bg-zinc-900 text-zinc-400 border-zinc-700/50',
            };
            const statusClass = statusColors[status] || statusColors.planning;

            const relativeTime = project.updated_at ? formatRelative(project.updated_at) : 'Just now';
            const advisorName = project.advisor_agent_name || 'CoordinatorAgent';

            return (
              <div
                key={project.id}
                onClick={() => navigate({ kind: 'project', projectId: project.id, tab: 'work' })}
                className="group relative p-3 sm:p-3.5 rounded-xl bg-[#111113] hover:bg-[#141417] border border-white/[0.06] hover:border-white/[0.12] transition-colors duration-150 ease-out cursor-pointer focus-visible:ring-1 focus-visible:ring-indigo-500/50 outline-none"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate({ kind: 'project', projectId: project.id, tab: 'work' });
                  }
                }}
              >
                {/* Row 1: Name + Status Badge (12px height text) */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <h2 className="text-[14px] sm:text-[15px] font-medium text-zinc-100 group-hover:text-white transition-colors truncate">
                      {project.name.split(' (')[0]}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`h-4 px-1.5 py-0.5 rounded text-[10px] leading-[12px] font-mono uppercase font-bold tracking-wider border ${statusClass} tabular-nums`}
                    >
                      {status}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-300 transition-colors duration-150 ease-out opacity-0 group-hover:opacity-100 hidden sm:block" />
                  </div>
                </div>

                {/* Row 2: Thin 4px progress bar + % */}
                <div className="mt-2.5 flex items-center gap-2.5">
                  <div className="flex-1 h-1 bg-[#1a1a1e] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400 font-medium tabular-nums shrink-0">
                    {progress}%
                  </span>
                </div>

                {/* Row 3: One-line next step + Progressive disclosure on hover (relative time & last agent) */}
                <div className="mt-2 flex items-center justify-between text-[12px] text-zinc-400">
                  <p className="line-clamp-1 text-zinc-400 group-hover:text-zinc-300 transition-colors font-sans pr-2">
                    {project.next_step || 'Awaiting next supervisor instruction'}
                  </p>

                  {/* Smooth reveal on hover without layout jump */}
                  <div className="shrink-0 flex items-center gap-2 font-mono text-[11px] text-zinc-500 group-hover:text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ease-out whitespace-nowrap">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-zinc-500" />
                      <span>{relativeTime}</span>
                    </span>
                    <span className="text-zinc-600">·</span>
                    <span className="flex items-center gap-1 text-indigo-400/90">
                      <Bot className="w-3 h-3" />
                      <span>{advisorName}</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Workshop Project Modal */}
      <WorkshopProjectModal
        isOpen={isModalOpen}
        initialMode={modalMode}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(createdId) => {
          setIsModalOpen(false);
          refetch();
          navigate({ kind: 'project', projectId: createdId, tab: 'work' });
        }}
      />
    </div>
  );
};
