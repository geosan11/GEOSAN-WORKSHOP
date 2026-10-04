import React, { useState } from 'react';
import { useProjects } from '../hooks/useProjects';
import { useTasks } from '../hooks/useTasks';
import { useCosts } from '../hooks/useCosts';
import { useQA } from '../hooks/useQA';
import { useNavigation } from '../lib/navigation';
import { ProjectCard } from '../components/ProjectCard';
import { ProjectDisclosureCard } from '../components/disclosure';
import { LiveActivityFeed } from '../components/LiveActivityFeed';
import { TaskDetailDrawer } from '../components/TaskDetailDrawer';
import { PendingActionsBar } from '../components/PendingActionsBar';
import { LoadingState } from '../components/LoadingState';
import { QueryError } from '../components/QueryError';
import { EmptyState } from '../components/EmptyState';
import { AgentTask } from '../lib/types';
import { projectMonthlySpend } from '../lib/cost';
import { formatCost } from '../lib/format';
import { FolderGit2, Activity, Play, Plus, RefreshCw, Zap } from 'lucide-react';
import { NewProjectModal } from '../components/NewProjectModal';

export const PortfolioScreen: React.FC = () => {
  const { navigate } = useNavigation();
  const { projects, loading: pLoading, error: pError, refetch: pRefetch } = useProjects();
  const { tasks, loading: tLoading, error: tError, refetch: tRefetch, approveTask, rejectTask, cancelTask, retryTask } = useTasks();
  const { costEvents, loading: cLoading, refetch: cRefetch } = useCosts();
  const { qaFindings, refetch: qRefetch } = useQA();

  const [selectedTask, setSelectedTask] = useState<AgentTask | null>(null);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);

  const handleRefreshAll = async () => {
    await Promise.all([pRefetch(), tRefetch(), cRefetch(), qRefetch()]);
  };

  const runningTasksCount = tasks.filter((t) => t.status === 'running').length;
  const monthTotalSpend = projectMonthlySpend(costEvents);

  if (pLoading && projects.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <LoadingState type="cards" count={3} />
      </div>
    );
  }

  if (pError) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <QueryError message="Failed to load managed portfolio projects. Retry?" onRetry={pRefetch} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Portfolio Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2 text-[#8b98a8] text-xs font-mono mb-1">
            <span>EHI Global Enterprise</span>
            <span>·</span>
            <span className="text-[#F0B230]">4 Managed Verticals</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#e6edf3]">
            Managed Project Portfolio
          </h1>
        </div>

        {/* Global Summary Chips */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-[#161b22] border border-white/5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#F0B230] animate-pulse" />
            <span className="text-[#8b98a8]">RUNNING TASKS:</span>
            <span className="font-bold text-[#FFBD59]">{runningTasksCount}</span>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-[#161b22] border border-white/5 flex items-center gap-2">
            <span className="text-[#8b98a8]">MONTH SPEND:</span>
            <span className="font-bold text-emerald-400">{formatCost(monthTotalSpend)}</span>
          </div>

          <button
            onClick={() => setIsNewProjectModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#F0B230] to-[#FFBD59] text-[#0A1420] font-bold text-xs hover:opacity-95 transition-all shadow-sm flex items-center gap-1.5"
            aria-label="Initialize new project"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Project</span>
          </button>

          <button
            onClick={handleRefreshAll}
            className="p-2 rounded-lg bg-[#161b22] hover:bg-[#1c2333] border border-white/5 text-[#8b98a8] hover:text-[#e6edf3] transition-colors"
            title="Refresh portfolio"
            aria-label="Refresh portfolio data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Pending Actions Triage Bar (from DASHBOARD UI DESIGN) */}
      <PendingActionsBar
        tasks={tasks}
        qaFindings={qaFindings}
        projects={projects}
        onOpenTask={setSelectedTask}
      />

      {/* Main Layout: 2/3 Grid + 1/3 Live Activity Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Project Cards (8 cols on desktop) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#8b98a8] font-mono flex items-center gap-2">
              <FolderGit2 className="w-3.5 h-3.5 text-[#F0B230]" />
              Client Repositories & Verticals
            </h2>
            <button
              onClick={() => navigate({ kind: 'console' })}
              className="text-xs font-semibold text-[#F0B230] hover:text-[#FFBD59] flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Dispatch New Task
            </button>
          </div>

          {projects.length === 0 ? (
            <EmptyState
              title="No Projects Registered"
              description="No managed client projects found. Initialize your first project to start autonomous SDLC orchestration."
              actionLabel="Initialize Project"
              onAction={() => setIsNewProjectModalOpen(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((proj) => {
                const projSpend = projectMonthlySpend(costEvents, proj.id);
                return (
                  <ProjectDisclosureCard
                    key={proj.id}
                    project={proj}
                    monthlySpend={projSpend}
                    tasks={tasks}
                    qaFindings={qaFindings}
                    onOpenProject={(id) => navigate({ kind: 'project', projectId: id, tab: 'overview' })}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Live Activity Feed Sidebar (4 cols on desktop) */}
        <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-white/5 pt-6 lg:pt-0 lg:pl-6">
          <LiveActivityFeed
            tasks={tasks}
            onSelectTask={(task) => setSelectedTask(task)}
          />
        </div>
      </div>

      {/* Sliding Task Detail Drawer */}
      <TaskDetailDrawer
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onApprove={approveTask}
        onReject={rejectTask}
        onCancel={cancelTask}
        onRetry={async (id) => {
          const newTask = await retryTask(id);
          setSelectedTask(newTask);
        }}
      />

      {/* Modal to Initialize New Project */}
      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
      />
    </div>
  );
};
