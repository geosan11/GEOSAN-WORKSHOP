import React, { useState } from 'react';
import { AgentTask, Project, TaskStatus } from '../lib/types';
import { getMappedStatusLabel } from './session/TaskWorkspace';
import { formatRelative } from '../lib/format';
import { EmptyState } from './EmptyState';
import { HarnessStatus } from './HarnessStatus';
import {
  Layers,
  Clock,
  User,
  GitBranch,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  FolderGit2,
  FileCode,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ShieldAlert
} from 'lucide-react';

interface FleetBoardProps {
  tasks: AgentTask[];
  projects: Project[];
  onSelectTask: (task: AgentTask) => void;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
}

const KANBAN_COLUMNS: Array<{
  id: TaskStatus;
  title: string;
  dotColor: string;
  badgeBg: string;
}> = [
  { id: 'proposed', title: 'Proposed', dotColor: 'bg-purple-400', badgeBg: 'bg-purple-950/40 text-purple-300 border-purple-500/30' },
  { id: 'queued', title: 'Queued', dotColor: 'bg-cyan-400', badgeBg: 'bg-cyan-950/40 text-cyan-300 border-cyan-500/30' },
  { id: 'running', title: 'Working', dotColor: 'bg-[#F0B230]', badgeBg: 'bg-[#F0B230]/20 text-[#FFBD59] border-[#F0B230]/40' },
  { id: 'awaiting_approval', title: 'Needs you', dotColor: 'bg-amber-400', badgeBg: 'bg-amber-950/40 text-amber-300 border-amber-500/30' },
  { id: 'blocked', title: 'Blocked', dotColor: 'bg-red-400', badgeBg: 'bg-red-950/40 text-red-300 border-red-500/30' },
  { id: 'done', title: 'Done', dotColor: 'bg-emerald-400', badgeBg: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30' }
];

export const FleetBoard: React.FC<FleetBoardProps> = ({
  tasks,
  projects,
  onSelectTask,
  onRefresh,
  isRefreshing = false
}) => {
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [showArchivedTerminal, setShowArchivedTerminal] = useState(false);

  // Group tasks by status
  const tasksByColumn: Record<string, AgentTask[]> = {};
  KANBAN_COLUMNS.forEach((col) => {
    tasksByColumn[col.id] = [];
  });

  const failedTasks: AgentTask[] = [];
  const cancelledTasks: AgentTask[] = [];

  tasks.forEach((task) => {
    if (task.status === 'failed') {
      failedTasks.push(task);
    } else if (task.status === 'cancelled') {
      cancelledTasks.push(task);
    } else if (tasksByColumn[task.status]) {
      tasksByColumn[task.status].push(task);
    } else {
      // Fallback
      if (tasksByColumn['proposed']) tasksByColumn['proposed'].push(task);
    }
  });

  const getProject = (projectId: string) =>
    projects.find((p) => p.id === projectId);

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Fleet Top Bar with Gateway Harness & Refresh */}
      <div className="p-3.5 rounded-2xl bg-[#161b22] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-[#8b98a8]">
            <Layers className="w-4 h-4 text-[#F0B230]" />
            <span className="font-bold text-[#e6edf3]">Fleet Session Board</span>
            <span>·</span>
            <span>{tasks.length} total tasks</span>
          </div>

          <HarnessStatus />
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#8b98a8] hover:text-[#e6edf3] transition-colors border border-white/5 disabled:opacity-50 flex items-center gap-1.5 text-[11px]"
              title="Refetch tasks from local store (does not force upstream pull)"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Tasks</span>
            </button>
          )}
        </div>
      </div>

      {/* ── DESKTOP 6-COLUMN KANBAN BOARD (hidden on small screens, becomes list) ── */}
      <div className="hidden lg:grid grid-cols-6 gap-3 min-h-[580px] items-start">
        {KANBAN_COLUMNS.map((col) => {
          const colTasks = tasksByColumn[col.id] || [];

          return (
            <div
              key={col.id}
              className="bg-[#161b22]/70 border border-white/5 rounded-2xl p-2.5 flex flex-col min-h-[540px] space-y-2.5 shadow-sm"
            >
              {/* Column Header */}
              <div className="px-2 py-1.5 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                  <span className="font-bold text-[#e6edf3] text-[11px] uppercase tracking-wider">
                    {col.title}
                  </span>
                </div>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold border ${col.badgeBg}`}>
                  {colTasks.length}
                </span>
              </div>

              {/* Tasks List in Column */}
              <div className="flex-1 space-y-2 overflow-y-auto max-h-[640px] pr-0.5">
                {colTasks.length === 0 ? (
                  <div className="p-4 text-center my-6 text-[#8b98a8] text-[11px]">
                    <div className="w-6 h-6 rounded-full bg-white/5 mx-auto mb-1.5 flex items-center justify-center text-[#8b98a8]">
                      ·
                    </div>
                    <span>No {col.title.toLowerCase()}</span>
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const proj = getProject(task.project_id);
                    const title = task.prompt.split('\n')[0] || task.id;
                    const statusMeta = getMappedStatusLabel(task.status, task.pr_url);
                    const isHovered = hoveredTaskId === task.id;

                    const lastWorklog =
                      (task.result?.summary as string) ||
                      (task.plan?.summary as string) ||
                      task.prompt.split('\n')[1] ||
                      'Execution thread active.';

                    return (
                      <div
                        key={task.id}
                        onClick={() => onSelectTask(task)}
                        onMouseEnter={() => setHoveredTaskId(task.id)}
                        onMouseLeave={() => setHoveredTaskId(null)}
                        onFocus={() => setHoveredTaskId(task.id)}
                        onBlur={() => setHoveredTaskId(null)}
                        tabIndex={0}
                        className="group relative p-3 rounded-xl bg-[#0d1117] border border-white/5 hover:border-[#F0B230]/40 transition-all cursor-pointer shadow-sm space-y-2 select-none focus:outline-none focus:ring-1 focus:ring-[#F0B230]"
                      >
                        {/* Task Title */}
                        <h4 className="font-bold text-[#e6edf3] text-xs leading-snug line-clamp-2 group-hover:text-[#FFBD59] transition-colors">
                          {title}
                        </h4>

                        {/* Project & Vertical */}
                        <div className="text-[10px] text-[#8b98a8] space-y-0.5 font-sans">
                          <div className="text-[#FFBD59] font-mono font-semibold truncate">
                            {proj?.name || task.project_id}
                          </div>
                          <div className="text-[#8b98a8] truncate">
                            {proj?.vertical || 'General'}
                          </div>
                        </div>

                        {/* Footer Strip */}
                        <div className="pt-1.5 border-t border-white/5 flex items-center justify-between text-[10px] text-[#8b98a8]">
                          <span className="flex items-center gap-1 truncate max-w-[90px]">
                            <User className="w-2.5 h-2.5 text-[#F0B230]" />
                            <span className="truncate">{task.assigned_agent || 'Coordinator'}</span>
                          </span>

                          <span>{formatRelative(task.created_at)}</span>
                        </div>

                        {/* PR Chip if set */}
                        {task.pr_url && (
                          <div className="mt-1 flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-cyan-950/40 text-cyan-300 border border-cyan-500/30">
                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">PR Active</span>
                          </div>
                        )}

                        {/* ── HOVER / FOCUS PREVIEW CARD (Devin requirement) ── */}
                        {isHovered && (
                          <div className="absolute z-30 left-full top-0 ml-2 w-64 p-3 rounded-xl bg-[#161b22] border border-[#F0B230]/40 shadow-2xl text-[11px] space-y-2 pointer-events-none animate-in fade-in duration-150">
                            <div className="flex items-center justify-between pb-1 border-b border-white/5">
                              <span className={`px-2 py-0.2 rounded-full text-[9px] font-bold ${statusMeta.badgeClass}`}>
                                {statusMeta.label}
                              </span>
                              <span className="text-[10px] text-[#8b98a8]">{task.id}</span>
                            </div>

                            <div className="space-y-1">
                              <span className="text-[9px] uppercase text-[#8b98a8] block">Last Worklog Activity:</span>
                              <p className="text-slate-300 font-sans text-[11px] leading-relaxed line-clamp-3">
                                {lastWorklog}
                              </p>
                            </div>

                            {task.branch_name && (
                              <div className="flex items-center gap-1.5 text-cyan-300 text-[10px]">
                                <GitBranch className="w-3 h-3 shrink-0" />
                                <span className="truncate">{task.branch_name}</span>
                              </div>
                            )}

                            {task.pr_url && (
                              <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] truncate">
                                <ExternalLink className="w-3 h-3 shrink-0" />
                                <span className="truncate">{task.pr_url}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Done Column: Collapsed Row under Done for Failed and Cancelled */}
              {col.id === 'done' && (failedTasks.length > 0 || cancelledTasks.length > 0) && (
                <div className="mt-2 pt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setShowArchivedTerminal(!showArchivedTerminal)}
                    className="w-full text-left p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-[#8b98a8] flex items-center justify-between transition-colors"
                  >
                    <span>
                      Archived ({failedTasks.length} failed, {cancelledTasks.length} cancelled)
                    </span>
                    <ChevronDown
                      className={`w-3 h-3 transition-transform ${showArchivedTerminal ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {showArchivedTerminal && (
                    <div className="mt-2 space-y-1.5">
                      {[...failedTasks, ...cancelledTasks].map((termTask) => (
                        <div
                          key={termTask.id}
                          onClick={() => onSelectTask(termTask)}
                          className="p-2 rounded-lg bg-[#0d1117] border border-white/5 hover:border-white/15 text-[10px] cursor-pointer space-y-1"
                        >
                          <div className="flex items-center justify-between text-[#8b98a8]">
                            <span className={termTask.status === 'failed' ? 'text-red-400' : 'text-[#8b98a8]'}>
                              {termTask.status}
                            </span>
                            <span>{formatRelative(termTask.created_at)}</span>
                          </div>
                          <p className="text-slate-300 line-clamp-1">{termTask.prompt}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── MOBILE VIEW: BOARD BECOMES LIST (Devin requirement) ── */}
      <div className="block lg:hidden space-y-3">
        <div className="text-xs font-mono text-[#8b98a8] pb-1 border-b border-white/5">
          Mobile Fleet View (List Mode)
        </div>
        {tasks.map((task) => {
          const proj = getProject(task.project_id);
          const statusMeta = getMappedStatusLabel(task.status, task.pr_url);

          return (
            <div
              key={task.id}
              onClick={() => onSelectTask(task)}
              className="p-3.5 rounded-xl bg-[#161b22] border border-white/5 space-y-2 cursor-pointer hover:border-[#F0B230]/40 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusMeta.badgeClass}`}>
                  {statusMeta.label}
                </span>
                <span className="text-[10px] text-[#8b98a8]">{formatRelative(task.created_at)}</span>
              </div>

              <h4 className="font-bold text-[#e6edf3] text-xs leading-snug">
                {task.prompt.split('\n')[0]}
              </h4>

              <div className="flex items-center justify-between text-[11px] text-[#8b98a8] pt-1 border-t border-white/5">
                <span>{proj?.name || task.project_id}</span>
                <span>{task.assigned_agent || 'Coordinator'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
