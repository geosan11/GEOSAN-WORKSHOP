import React, { useState, useMemo } from 'react';
import { useProjects } from '../hooks/useProjects';
import { useTasks } from '../hooks/useTasks';
import { useCosts } from '../hooks/useCosts';
import { useQA } from '../hooks/useQA';
import { useNavigation, ProjectTab } from '../lib/navigation';
import { StatusPill } from '../components/StatusPill';
import { TaskDetailDrawer } from '../components/TaskDetailDrawer';
import { TaskWorkspace } from '../components/session/TaskWorkspace';
import { RepoAnalyzer } from '../components/RepoAnalyzer';
import { MultiAccountComponentHub } from '../components/MultiAccountComponentHub';
import { ReferenceBoard } from '../components/ReferenceBoard';
import { ProjectChatTab } from '../components/ProjectChatTab';
import { NewTaskModal } from '../components/NewTaskModal';
import { LoadingState } from '../components/LoadingState';
import { QueryError } from '../components/QueryError';
import { EmptyState } from '../components/EmptyState';
import { AgentTask, QAFinding, TaskType } from '../lib/types';
import { projectMonthlySpend } from '../lib/cost';
import { formatCost, formatRelative } from '../lib/format';
import { useToast } from '../components/Toast';
import {
  loadProjectDiscovery,
  saveProjectDiscovery,
  UI_SDLC_PHASES,
  ProjectDiscoveryState
} from '../lib/sdlcDiscovery';
import {
  Layers,
  ShieldCheck,
  DollarSign,
  Cpu,
  FileText,
  User,
  Plus,
  Play,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Save,
  MessageSquare
} from 'lucide-react';

interface ProjectDetailProps {
  projectId: string;
  initialTab?: ProjectTab;
  initialTaskId?: string;
}

export const ProjectDetailScreen: React.FC<ProjectDetailProps> = ({
  projectId,
  initialTab = 'work',
  initialTaskId
}) => {
  const toast = useToast();
  const { navigate } = useNavigation();
  const { projects, loading: pLoading } = useProjects();
  const { tasks, loading: tLoading, refetch: tRefetch, createTask, approveTask, rejectTask, cancelTask, retryTask } = useTasks(projectId);
  const { costEvents } = useCosts(projectId);
  const { qaFindings, qaRuns, refetch: qRefetch } = useQA(projectId);

  // Map legacy tabs to the 5 official groups
  const normalizeTab = (tab: ProjectTab): 'work' | 'verify' | 'money' | 'system' | 'spec' => {
    if (tab === 'qa') return 'verify';
    if (tab === 'costs') return 'money';
    if (tab === 'codebase' || tab === 'components' || tab === 'settings') return 'system';
    if (tab === 'discovery' || tab === 'design') return 'spec';
    if (tab === 'overview' || tab === 'session' || tab === 'tasks' || tab === 'chat') return 'work';
    return tab;
  };

  const [activeGroup, setActiveGroup] = useState<'work' | 'verify' | 'money' | 'system' | 'spec'>(
    normalizeTab(initialTab)
  );
  const [activeTaskId, setActiveTaskId] = useState<string | undefined>(initialTaskId);
  const [selectedTask, setSelectedTask] = useState<AgentTask | null>(null);
  const [openWorkspace, setOpenWorkspace] = useState(Boolean(initialTaskId));
  const [dispatchedFixIds, setDispatchedFixIds] = useState<Record<string, boolean>>({});

  // Sub-views for Work & Verify
  const [workView, setWorkView] = useState<'tasks' | 'chat'>('tasks');
  const [verifyView, setVerifyView] = useState<'findings' | 'runs'>('findings');
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [hardStopEnabled, setHardStopEnabled] = useState(false);

  // Discovery Answers State for Spec group
  const [discoveryState, setDiscoveryState] = useState<ProjectDiscoveryState>(() =>
    loadProjectDiscovery(projectId)
  );

  const project = projects.find((p) => p.id === projectId) || projects[0];

  // Filter tasks for this project
  const projectTasks = useMemo(() => {
    return tasks.filter((t) => t.project_id === projectId);
  }, [tasks, projectId]);

  // Filter QA findings for this project only
  const projectFindings = useMemo(() => {
    return qaFindings.filter(
      (f) => f.project_id === projectId || qaRuns.find((r) => r.id === f.run_id)?.project_id === projectId
    );
  }, [qaFindings, qaRuns, projectId]);

  // Filter QA runs for this project only
  const projectRuns = useMemo(() => {
    return qaRuns.filter((r) => r.project_id === projectId);
  }, [qaRuns, projectId]);

  const monthSpend = projectMonthlySpend(costEvents, projectId);

  const handleDispatchTaskFromModal = async (params: {
    projectId: string;
    taskType: TaskType;
    prompt: string;
    model: string;
    spawnSubagents: boolean;
  }) => {
    try {
      const created = await createTask({
        org_id: project?.org_id || 'org-geosan',
        project_id: params.projectId,
        task_type: params.taskType,
        prompt: params.prompt
      });
      setIsDispatchModalOpen(false);
      toast.success(`Task ${created.id} dispatched to Coordinator`);
      setActiveTaskId(created.id);
      setOpenWorkspace(true);
      await tRefetch();
    } catch {
      toast.error('Failed to dispatch task');
    }
  };

  // Dispatch fix creates task via existing task API without approving it
  const handleDispatchFix = async (finding: QAFinding) => {
    try {
      await createTask({
        org_id: project?.org_id || 'org-geosan',
        project_id: projectId,
        task_type: 'FIX_BUG',
        prompt: `Fix QA regression: ${finding.title}. Invariant component: ${finding.component || 'codebase'}. Steps: ${Array.isArray(finding.reproduction_steps) ? finding.reproduction_steps.join('; ') : ''}`
      });
      setDispatchedFixIds((prev) => ({ ...prev, [finding.id]: true }));
      toast.success(`Fix queued for ${finding.id}`);
    } catch {
      toast.error('Failed to dispatch fix task');
    }
  };

  const handleDiscoveryChange = (questionId: string, val: string) => {
    setDiscoveryState((prev) => ({
      ...prev,
      answers: { ...prev.answers, [questionId]: val }
    }));
  };

  const handleSaveSpec = () => {
    saveProjectDiscovery(discoveryState);
    toast.success('Spec answers saved successfully');
  };

  if (pLoading && !project) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <LoadingState type="cards" count={2} />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <QueryError message="Project not found." onRetry={() => navigate({ kind: 'projects' })} />
      </div>
    );
  }

  const groups = [
    { id: 'work', label: 'Work', icon: Layers, count: projectTasks.length },
    { id: 'verify', label: 'Verify', icon: ShieldCheck, count: projectFindings.length },
    { id: 'money', label: 'Money', icon: DollarSign },
    { id: 'system', label: 'System', icon: Cpu },
    { id: 'spec', label: 'Spec', icon: FileText }
  ] as const;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 font-sans">
      {/* 5 Project Navigation Groups Bar */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3 font-mono text-xs overflow-x-auto">
        {groups.map((g) => {
          const Icon = g.icon;
          const isActive = activeGroup === g.id;
          return (
            <button
              key={g.id}
              onClick={() => {
                setActiveGroup(g.id);
                setOpenWorkspace(false);
              }}
              className={`px-3.5 py-2 rounded-lg font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{g.label}</span>
              {'count' in g && g.count !== undefined && (
                <span className="px-1.5 py-0.2 rounded bg-white/5 text-[10px] text-slate-300">
                  {g.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── GROUP 1: WORK ── */}
      {activeGroup === 'work' && (
        <div className="space-y-4">
          {openWorkspace ? (
            <div className="space-y-3">
              <button
                onClick={() => setOpenWorkspace(false)}
                className="text-xs font-mono text-emerald-400 hover:underline flex items-center gap-1"
              >
                ← Back to Task List
              </button>
              <TaskWorkspace
                taskId={activeTaskId || projectTasks[0]?.id}
                project={project}
                onBack={() => setOpenWorkspace(false)}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setWorkView('tasks')}
                    className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all flex items-center gap-1.5 ${
                      workView === 'tasks'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Tasks & Worktrees ({projectTasks.length})
                  </button>
                  <button
                    onClick={() => setWorkView('chat')}
                    className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all flex items-center gap-1.5 ${
                      workView === 'chat'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Agent Chat
                  </button>
                </div>

                <button
                  onClick={() => setIsDispatchModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold hover:bg-emerald-900/60 transition-colors flex items-center gap-1.5 self-start sm:self-auto shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Dispatch Action
                </button>
              </div>

              {workView === 'chat' ? (
                <div className="bg-[#161b22] border border-white/10 rounded-xl overflow-hidden p-2 shadow-lg">
                  <ProjectChatTab project={project} />
                </div>
              ) : (
                <>
                  {projectTasks.length === 0 ? (
                    <EmptyState
                      title="No Tasks for this Project"
                      description="No tasks currently registered for this vertical."
                      actionLabel="Dispatch First Task"
                      onAction={() => setIsDispatchModalOpen(true)}
                    />
                  ) : (
                    <div className="bg-[#161b22] border border-white/10 rounded-xl overflow-hidden divide-y divide-white/5">
                      {projectTasks.map((task) => (
                        <div
                          key={task.id}
                          onClick={() => {
                            setActiveTaskId(task.id);
                            setOpenWorkspace(true);
                          }}
                          className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#1c2333] transition-colors cursor-pointer text-xs font-mono group"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="flex items-center gap-1 text-slate-400">
                                <User className="w-3.5 h-3.5 text-emerald-400" />
                                {task.assigned_agent || 'CoordinatorAgent'}
                              </span>
                              <span className="text-slate-600">·</span>
                              <span className="text-slate-400">{task.id}</span>
                            </div>
                            <p className="text-slate-200 font-sans font-medium line-clamp-1">
                              {task.prompt}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <StatusPill status={task.status} />
                            <span className="text-slate-500 text-[10px] hidden md:inline">
                              {formatRelative(task.created_at)}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── GROUP 2: VERIFY ── */}
      {activeGroup === 'verify' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-100 font-mono">
                QA Verification for {project.name.split(' (')[0]}
              </h2>
              <p className="text-xs text-slate-400">
                Autonomous crawler regressions, invariant failures, and test runs for this vertical only.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setVerifyView('findings')}
                className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all flex items-center gap-1.5 ${
                  verifyView === 'findings'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Findings ({projectFindings.length})
              </button>
              <button
                onClick={() => setVerifyView('runs')}
                className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all flex items-center gap-1.5 ${
                  verifyView === 'runs'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Play className="w-3.5 h-3.5" />
                QA Runs ({projectRuns.length})
              </button>
            </div>
          </div>

          {verifyView === 'runs' ? (
            projectRuns.length === 0 ? (
              <div className="p-8 rounded-xl bg-[#161b22] border border-white/5 text-center text-xs font-mono text-slate-400">
                No QA execution runs recorded for this vertical yet.
              </div>
            ) : (
              <div className="bg-[#161b22] border border-white/10 rounded-xl overflow-hidden divide-y divide-white/5 font-mono text-xs">
                {projectRuns.map((run) => (
                  <div
                    key={run.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#1c2333]/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100">{run.id}</span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-slate-300 uppercase">
                          {run.run_type || 'explore'}
                        </span>
                        {(run as any).target_platform && (
                          <span className="text-[10px] text-slate-500">
                            platform: {(run as any).target_platform}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {(run as any).target_url || `Task reference: ${run.task_id || 'manual trigger'}`}
                      </p>
                      {(run as any).execution_speed && (
                        <p className="text-[10px] text-slate-500">
                          Speed: {(run as any).execution_speed} · Nodes inspected: {(run as any).dom_nodes_inspected || 0}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          run.status === 'completed'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                            : run.status === 'failed'
                            ? 'bg-rose-950 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-950 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {run.status}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {formatRelative((run as any).started_at || (run as any).created_at || new Date().toISOString())}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            projectFindings.length === 0 ? (
              <div className="p-8 rounded-xl bg-[#161b22] border border-white/5 text-center text-xs font-mono text-emerald-400 flex flex-col items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <span>Zero invariant failures or QA regressions found for this vertical.</span>
              </div>
            ) : (
              <div className="bg-[#161b22] border border-white/10 rounded-xl overflow-hidden divide-y divide-white/5">
                {projectFindings.map((finding) => {
                  const isFixDispatched = dispatchedFixIds[finding.id];
                  return (
                    <div
                      key={finding.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4 text-xs font-mono hover:bg-[#1c2333]/50 transition-colors"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                              finding.severity === 'critical'
                                ? 'bg-rose-950 text-rose-400 border border-rose-500/40'
                                : 'bg-amber-950 text-amber-400 border border-amber-500/40'
                            }`}
                          >
                            {finding.severity}
                          </span>
                          <span className="text-slate-200 font-bold text-sm font-sans">{finding.title}</span>
                        </div>
                        {finding.description && (
                          <p className="text-slate-400 font-sans text-xs leading-relaxed">
                            {finding.description}
                          </p>
                        )}
                        <div className="text-[10px] text-slate-500">
                          Component: <span className="text-slate-300">{finding.component || 'codebase'}</span> · ID: {finding.id}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2 self-start sm:self-center">
                        {isFixDispatched ? (
                          <span className="px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Fix queued
                          </span>
                        ) : (
                          <button
                            onClick={() => handleDispatchFix(finding)}
                            className="px-3 py-1.5 rounded-lg bg-[#F0B230] text-[#0A1420] hover:bg-[#FFBD59] font-bold text-xs transition-colors flex items-center gap-1 shadow-sm"
                          >
                            Dispatch fix
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      )}

      {/* ── GROUP 3: PROJECT MONEY ── */}
      {activeGroup === 'money' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-100 font-mono">
              Project Spend ({project.name.split(' (')[0]})
            </h2>
            <p className="text-xs text-slate-400">
              Current calendar month inference burn for this vertical only.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
            <div className="p-4 rounded-xl bg-[#161b22] border border-white/5 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase block">Vertical Month Spend</span>
              <span className="text-2xl font-bold text-emerald-400 tabular-nums">
                {formatCost(monthSpend)}
              </span>
              <span className="text-[10px] text-slate-500 block">Attributed model calls</span>
            </div>

            <div className="p-4 rounded-xl bg-[#161b22] border border-white/5 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase block">Monthly Budget Limit</span>
              <span className="text-2xl font-bold text-slate-100 tabular-nums">
                {formatCost(project.monthly_budget_usd || 1000)}
              </span>
              <span className="text-[10px] text-slate-500 block">Configured threshold</span>
            </div>

            <div className="p-4 rounded-xl bg-[#161b22] border border-white/5 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase block">Consumption Ratio</span>
              <span className="text-2xl font-bold text-cyan-400 tabular-nums">
                {Math.round((monthSpend / (project.monthly_budget_usd || 1000)) * 100)}%
              </span>
              <span className="text-[10px] text-slate-500 block">Of vertical limit</span>
            </div>
          </div>
        </div>
      )}

      {/* ── GROUP 4: SYSTEM ── */}
      {activeGroup === 'system' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-100 font-mono">
              System, Codebase & MCP Plane
            </h2>
            <p className="text-xs text-slate-400">
              Repository analysis findings as rows, MCP rows, and execution budgets.
            </p>
          </div>

          {/* Project Budget & Invariant Thresholds */}
          <div className="p-5 rounded-2xl bg-[#161b22] border border-white/10 space-y-4 font-mono text-xs shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-slate-100 uppercase">
                  Vertical Budget & Rate Invariants
                </span>
              </div>
              <span className="text-[10px] text-slate-400">
                Hard boundary for {project.name.split(' (')[0]}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-[#0d1117] border border-white/5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 uppercase block">Monthly Budget Limit</span>
                  <button
                    onClick={() => {
                      const newB = window.prompt('Set new Monthly Budget (USD):', String(project.monthly_budget_usd || 1000));
                      if (newB && !isNaN(Number(newB))) {
                        project.monthly_budget_usd = Number(newB);
                        toast.success(`Budget updated to ${formatCost(Number(newB))}`);
                        // Force a re-render
                        setHardStopEnabled((prev) => prev);
                      }
                    }}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 uppercase font-bold"
                  >
                    Edit
                  </button>
                </div>
                <span className="text-base font-bold text-slate-100">{formatCost(project.monthly_budget_usd || 1000)}</span>
                <span className="text-[10px] text-slate-500 block">Inference allocation</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0d1117] border border-white/5 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase block">Hard Stop Enforcement</span>
                <div className="flex items-center justify-between pt-0.5">
                  <span className={`text-xs font-bold ${hardStopEnabled ? 'text-rose-400' : 'text-slate-400'}`}>
                    {hardStopEnabled ? 'Locked on Overrun' : 'Warning Only (80%)'}
                  </span>
                  <button
                    onClick={() => {
                      setHardStopEnabled(!hardStopEnabled);
                      toast.info(`Hard-stop ${!hardStopEnabled ? 'enabled' : 'disabled'} for ${project.id}`);
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
                      hardStopEnabled
                        ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {hardStopEnabled ? 'Armed' : 'Toggle'}
                  </button>
                </div>
                <span className="text-[10px] text-slate-500 block">Prevents runaway loops</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0d1117] border border-white/5 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase block">Worktree Isolation</span>
                <span className="text-xs font-bold text-emerald-400 block pt-0.5">Strict (Isolated git worktree)</span>
                <span className="text-[10px] text-slate-500 block">Read silent · Write gated</span>
              </div>
            </div>
          </div>

          <RepoAnalyzer project={project} onTaskDispatched={() => setActiveGroup('work')} />

          <MultiAccountComponentHub />
        </div>
      )}

      {/* ── GROUP 5: SPEC ── */}
      {activeGroup === 'spec' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <div>
              <h2 className="text-sm font-bold text-slate-100 font-mono">
                Project Spec & Discovery Answers
              </h2>
              <p className="text-xs text-slate-400">
                Discovery decisions rendered as one unified document. Unanswered questions are amber textareas.
              </p>
            </div>

            <button
              onClick={handleSaveSpec}
              className="px-4 py-2 rounded-lg bg-[#F0B230] text-[#0A1420] font-bold text-xs hover:bg-[#FFBD59] transition-colors flex items-center gap-1.5 shadow-sm font-mono"
            >
              <Save className="w-3.5 h-3.5" />
              Save Spec Answers
            </button>
          </div>

          {/* Unified Document of all Questions across phases */}
          <div className="space-y-4">
            {UI_SDLC_PHASES.flatMap((phase) => phase.questions).map((q) => {
              const currentVal = discoveryState.answers[q.id] || '';
              const isUnanswered = currentVal.trim().length === 0;

              return (
                <div
                  key={q.id}
                  className={`p-4 rounded-xl bg-[#161b22] border transition-all space-y-2 text-xs font-mono ${
                    isUnanswered
                      ? 'border-amber-500/50 bg-amber-500/5'
                      : 'border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100 font-sans text-sm">
                      {q.title}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        isUnanswered
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {isUnanswered ? 'Unanswered' : 'Answered'}
                    </span>
                  </div>

                  <p className="text-slate-300 font-sans text-xs">{q.question}</p>

                  <textarea
                    rows={isUnanswered ? 3 : 2}
                    value={currentVal}
                    onChange={(e) => handleDiscoveryChange(q.id, e.target.value)}
                    placeholder={`Document specification decision for ${q.title}...`}
                    className={`w-full rounded-lg p-2.5 text-xs text-slate-200 font-mono focus:outline-none transition-colors ${
                      isUnanswered
                        ? 'bg-[#0d1117] border border-amber-500/40 focus:border-amber-400 placeholder:text-amber-500/40'
                        : 'bg-[#0d1117] border border-white/10 focus:border-emerald-400'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Reference Design Brief */}
          <div className="pt-4 border-t border-white/10">
            <h3 className="text-xs font-bold text-slate-300 uppercase font-mono mb-3">
              Design Brief & Golden Fixtures
            </h3>
            <ReferenceBoard project={project} onDesignApproved={() => tRefetch()} />
          </div>
        </div>
      )}

      {/* Sliding Task Drawer Fallback */}
      <TaskDetailDrawer
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onApprove={approveTask}
        onReject={rejectTask}
        onCancel={cancelTask}
        onRetry={async (id) => {
          await retryTask(id);
          setSelectedTask(null);
        }}
      />

      {/* Interactive Task Dispatch Modal */}
      <NewTaskModal
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        projects={projects as any}
        initialProjectId={projectId}
        onDispatchTask={handleDispatchTaskFromModal}
      />
    </div>
  );
};
