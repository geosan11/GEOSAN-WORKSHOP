import React, { useState, useMemo, useEffect } from 'react';
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
  User,
  Plus,
  ArrowRight,
  CheckCircle2,
  Save,
  MessageSquare,
  ChevronRight,
} from 'lucide-react';
import { PageHeader, SectionCard } from '../components/ui';

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

  type Surface = 'work' | 'verify';

  const resolveEntry = (tab: ProjectTab) => ({
    surface: (tab === 'qa' || tab === 'verify' ? 'verify' : 'work') as Surface,
    openSpec: tab === 'spec' || tab === 'discovery' || tab === 'design',
    openSystem: tab === 'system' || tab === 'codebase' || tab === 'components' || tab === 'settings',
    openChat: tab === 'chat',
  });

  const entry = resolveEntry(initialTab);
  const [surface, setSurface] = useState<Surface>(entry.surface);
  const [activeTaskId, setActiveTaskId] = useState<string | undefined>(initialTaskId);
  const [selectedTask, setSelectedTask] = useState<AgentTask | null>(null);
  const [openWorkspace, setOpenWorkspace] = useState(Boolean(initialTaskId));
  const [dispatchedFixIds, setDispatchedFixIds] = useState<Record<string, boolean>>({});
  const [specOpen, setSpecOpen] = useState(entry.openSpec);
  const [systemOpen, setSystemOpen] = useState(entry.openSystem);
  const [chatOpen, setChatOpen] = useState(entry.openChat);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
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

  const nextActionTask = useMemo(() => {
    const open = projectTasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled');
    return (
      open.find((t) => t.status === 'awaiting_approval' || t.status === 'proposed') ||
      open.find((t) => t.status === 'running') ||
      open[0] ||
      null
    );
  }, [projectTasks]);

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

  const unansweredCount = useMemo(() => {
    return UI_SDLC_PHASES.flatMap((phase) => phase.questions).filter(
      (q) => !(discoveryState.answers[q.id] || '').trim()
    ).length;
  }, [discoveryState]);

  useEffect(() => {
    const next = resolveEntry(initialTab);
    setSurface(next.surface);
    if (next.openSystem) setSystemOpen(true);
    if (next.openChat) setChatOpen(true);
    const loaded = loadProjectDiscovery(projectId);
    const missing = UI_SDLC_PHASES.flatMap((phase) => phase.questions).some(
      (q) => !(loaded.answers[q.id] || '').trim()
    );
    if (next.openSpec || missing) setSpecOpen(true);
  }, [initialTab, projectId]);

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
    { id: 'work' as const, label: 'Work', icon: Layers, count: projectTasks.length },
    { id: 'verify' as const, label: 'Verify', icon: ShieldCheck, count: projectFindings.length },
  ];

  const budget = project.monthly_budget_usd || 1000;
  const spendRatio = Math.round((monthSpend / budget) * 100);

  const selectGroup = (id: Surface) => {
    setSurface(id);
    setOpenWorkspace(false);
    navigate({ kind: 'project', projectId, tab: id });
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 font-sans">
      <PageHeader
        eyebrow="Build · Project"
        title={project.name.split(' (')[0]}
        lede={
          nextActionTask
            ? `Next: ${nextActionTask.status.replace(/_/g, ' ')} · ${nextActionTask.prompt.slice(0, 80)}${nextActionTask.prompt.length > 80 ? '…' : ''}`
            : `${project.vertical} · Open Work to dispatch the first agent action.`
        }
        actions={
          surface === 'work' && !openWorkspace ? (
            <button
              type="button"
              onClick={() => setIsDispatchModalOpen(true)}
              className="btn btn-primary"
            >
              <Plus className="w-3.5 h-3.5" />
              Dispatch
            </button>
          ) : null
        }
      />

      <div
        className="flex items-center gap-1.5 border-b border-app pb-3 font-mono text-xs overflow-x-auto"
        role="tablist"
        aria-label="Project workspace groups"
      >
        {groups.map((g) => {
          const Icon = g.icon;
          const isActive = surface === g.id;
          return (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => selectGroup(g.id)}
              className={`px-3.5 py-2 rounded-lg font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${isActive
                ? 'bg-primary-container text-primary border border-[color:var(--color-primary)]/40 shadow-sm'
                : 'text-muted hover:text-main hover:bg-white/5'
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


      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="kpi-tile">
          <div>
            <span className="text-meta block mb-1">Month spend</span>
            <span className="kpi-tile-value text-main">{formatCost(monthSpend)}</span>
          </div>
        </div>
        <div className="kpi-tile">
          <div>
            <span className="text-meta block mb-1">Budget</span>
            <span className="kpi-tile-value text-main">{formatCost(budget)}</span>
          </div>
        </div>
        <div className="kpi-tile">
          <div>
            <span className="text-meta block mb-1">Of limit</span>
            <span className="kpi-tile-value text-primary">{spendRatio}%</span>
          </div>
        </div>
      </div>

      {/* ── GROUP 5: SPEC ── */}
      {surface === 'work' && !openWorkspace && (
        <section className="section-card overflow-hidden">
          <button type="button" className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left" aria-expanded={specOpen} onClick={() => setSpecOpen((v) => !v)}>
            <span>
              <span className="text-section-title block">Spec</span>
              <span className="text-lede text-[0.75rem]">{unansweredCount > 0 ? `${unansweredCount} unanswered` : 'Discovery answers'}</span>
            </span>
            <ChevronRight className={`w-4 h-4 text-muted transition-transform ${specOpen ? 'rotate-90' : ''}`} />
          </button>
          {specOpen ? <div className="border-t border-app p-4 md:p-5 space-y-6">
            <div className="flex items-center justify-end">

              <button type="button" onClick={handleSaveSpec} className="btn btn-primary">
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
                    className={`p-4 rounded-[var(--radius-card)] bg-card border space-y-2 text-xs ${isUnanswered
                      ? 'border-[color:var(--color-warning)]'
                      : 'border-app'
                      }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-main font-sans text-sm">
                        {q.title}
                      </span>
                      <span className={`stamp ${isUnanswered ? 'stamp-warn' : 'stamp-success'}`}>
                        {isUnanswered ? 'Unanswered' : 'Answered'}
                      </span>
                    </div>

                    <p className="text-muted font-sans text-xs">{q.question}</p>

                    <textarea
                      rows={isUnanswered ? 3 : 2}
                      value={currentVal}
                      onChange={(e) => handleDiscoveryChange(q.id, e.target.value)}
                      placeholder={`Decision for ${q.title}`}
                      className="field w-full font-mono text-xs"
                    />
                  </div>
                );
              })}
            </div>

            {/* Reference Design Brief */}
            <div className="pt-4 border-t border-app">
              <h3 className="text-section-title mb-3">
                Design brief
              </h3>
              <ReferenceBoard project={project} onDesignApproved={() => tRefetch()} />
            </div>
          </div> : null}
        </section>
      )}


      {/* ── GROUP 1: WORK ── */}
      {surface === 'work' && (
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
              {nextActionTask && (
                <SectionCard
                  title="Next action"
                  description="Highest-priority open task for this vertical."
                  actions={
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTaskId(nextActionTask.id);
                        setOpenWorkspace(true);
                      }}
                      className="btn btn-primary"
                    >
                      Open <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  }
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 text-muted">
                        <User className="w-3.5 h-3.5 text-primary" />
                        <span>{nextActionTask.assigned_agent || 'CoordinatorAgent'}</span>
                        <span>·</span>
                        <span>{nextActionTask.id}</span>
                      </div>
                      <p className="text-main font-sans font-medium line-clamp-2">
                        {nextActionTask.prompt}
                      </p>
                    </div>
                    <StatusPill status={nextActionTask.status} />
                  </div>
                </SectionCard>
              )}

              {projectTasks.length === 0 ? (
                <EmptyState
                  title="No Tasks for this Project"
                  description="No tasks currently registered for this vertical."
                  actionLabel="Dispatch First Task"
                  onAction={() => setIsDispatchModalOpen(true)}
                />
              ) : (
                <SectionCard flush title="All tasks" description="Open a row for the session workspace.">
                  <div className="divide-y divide-white/5">
                    {projectTasks.map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => {
                          setActiveTaskId(task.id);
                          setOpenWorkspace(true);
                        }}
                        className="w-full text-left p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/5 transition-colors text-xs font-mono group"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 text-muted">
                              <User className="w-3.5 h-3.5 text-primary" />
                              {task.assigned_agent || 'CoordinatorAgent'}
                            </span>
                            <span className="text-slate-600">·</span>
                            <span className="text-muted">{task.id}</span>
                          </div>
                          <p className="text-main font-sans font-medium line-clamp-1">
                            {task.prompt}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <StatusPill status={task.status} />
                          <span className="text-muted text-[10px] hidden md:inline">
                            {formatRelative(task.created_at)}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-muted group-hover:text-primary transition-colors" />
                        </div>
                      </button>
                    ))}
                  </div>
                </SectionCard>
              )}
              <section className="section-card overflow-hidden">
                <button type="button" className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left" aria-expanded={chatOpen} onClick={() => setChatOpen((v) => !v)}>
                  <span className="inline-flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-primary" />
                    <span className="text-section-title">Agent chat</span>
                  </span>
                  <ChevronRight className={`w-4 h-4 text-muted transition-transform ${chatOpen ? 'rotate-90' : ''}`} />
                </button>
                {chatOpen ? (
                  <div className="border-t border-app p-2">
                    <ProjectChatTab project={project} />
                  </div>
                ) : null}
              </section>
            </div>
          )}
        </div>
      )}

      {/* ── GROUP 4: SYSTEM ── */}
      {surface === 'work' && !openWorkspace && (
        <section className="section-card overflow-hidden">
          <button type="button" className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left" aria-expanded={systemOpen} onClick={() => setSystemOpen((v) => !v)}>
            <span>
              <span className="text-section-title block">System</span>
              <span className="text-lede text-[0.75rem]">Repos, MCP, and budget limits</span>
            </span>
            <ChevronRight className={`w-4 h-4 text-muted transition-transform ${systemOpen ? 'rotate-90' : ''}`} />
          </button>
          {systemOpen ? <div className="border-t border-app p-4 md:p-5 space-y-6">

            {/* Project Budget & Invariant Thresholds */}
            <div className="rounded-[var(--radius-card)] bg-app border border-app p-4 space-y-4 font-mono text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-app pb-3">
                <span className="text-section-title">Budget limits</span>
                <span className="text-meta normal-case tracking-normal">
                  {project.name.split(' (')[0]}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-[var(--radius-control)] bg-card border border-app space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-meta">Monthly budget</span>
                    <button
                      type="button"
                      onClick={() => {
                        const newB = window.prompt('Set new Monthly Budget (USD):', String(project.monthly_budget_usd || 1000));
                        if (newB && !isNaN(Number(newB))) {
                          project.monthly_budget_usd = Number(newB);
                          toast.success(`Budget updated to ${formatCost(Number(newB))}`);
                          setHardStopEnabled((prev) => prev);
                        }
                      }}
                      className="text-meta text-primary"
                    >
                      Edit
                    </button>
                  </div>
                  <span className="text-base font-bold text-main">{formatCost(project.monthly_budget_usd || 1000)}</span>
                </div>

                <div className="p-3 rounded-[var(--radius-control)] bg-card border border-app space-y-1">
                  <span className="text-meta block">Hard stop</span>
                  <div className="flex items-center justify-between pt-0.5 gap-2">
                    <span className={`text-xs font-bold ${hardStopEnabled ? 'text-[color:var(--color-error)]' : 'text-muted'}`}>
                      {hardStopEnabled ? 'Locked on overrun' : 'Warning at 80%'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setHardStopEnabled(!hardStopEnabled);
                        toast.info(`Hard-stop ${!hardStopEnabled ? 'enabled' : 'disabled'} for ${project.id}`);
                      }}
                      className="btn btn-ghost !py-1"
                    >
                      {hardStopEnabled ? 'Armed' : 'Toggle'}
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-[var(--radius-control)] bg-card border border-app space-y-1">
                  <span className="text-meta block">Worktree</span>
                  <span className="text-xs font-bold text-main block">Isolated git worktree</span>
                  <span className="text-meta normal-case tracking-normal block">Read silent · write gated</span>
                </div>
              </div>
            </div>

            <RepoAnalyzer project={project} onTaskDispatched={() => selectGroup('work')} />

            <MultiAccountComponentHub />
          </div> : null}
        </section>
      )}


      {surface === 'verify' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-section-title">QA verification</h2>
            <p className="text-lede text-[0.75rem]">Findings for this vertical. Runs stay under Evidence.</p>
          </div>

          {projectFindings.length === 0 ? (
            <div className="section-card p-8 text-center text-xs font-mono text-[color:var(--color-success)] flex flex-col items-center gap-2">
              <CheckCircle2 className="w-6 h-6" />
              <span>No open findings for this vertical.</span>
            </div>
          ) : (
            <div className="section-card overflow-hidden divide-y divide-[color:var(--border-app)]">
              {projectFindings.map((finding) => {
                const isFixDispatched = dispatchedFixIds[finding.id];
                return (
                  <div key={finding.id} className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4 text-xs font-mono">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`stamp ${finding.severity === 'critical' ? 'stamp-danger' : 'stamp-warn'}`}>
                          {finding.severity}
                        </span>
                        <span className="text-main font-bold text-sm font-sans">{finding.title}</span>
                      </div>
                      {finding.description ? (
                        <p className="text-muted font-sans text-xs leading-relaxed">{finding.description}</p>
                      ) : null}
                      <div className="text-[10px] text-muted">
                        Component: <span className="text-main">{finding.component || 'codebase'}</span> · {finding.id}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {isFixDispatched ? (
                        <span className="stamp stamp-success">Fix queued</span>
                      ) : (
                        <button type="button" onClick={() => handleDispatchFix(finding)} className="btn btn-primary">
                          Dispatch fix
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <section className="section-card overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
              aria-expanded={evidenceOpen}
              onClick={() => setEvidenceOpen((v) => !v)}
            >
              <span>
                <span className="text-section-title block">Evidence</span>
                <span className="text-lede text-[0.75rem]">{projectRuns.length} QA runs</span>
              </span>
              <ChevronRight className={`w-4 h-4 text-muted transition-transform ${evidenceOpen ? 'rotate-90' : ''}`} />
            </button>
            {evidenceOpen ? (
              <div className="border-t border-app p-4 space-y-2">
                {projectRuns.length === 0 ? (
                  <p className="text-lede text-[0.75rem]">No QA runs recorded for this vertical yet.</p>
                ) : (
                  projectRuns.map((run) => (
                    <div key={run.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                      <div className="min-w-0">
                        <span className="text-main font-bold">{run.id}</span>
                        <span className="text-muted"> · {run.run_type || 'explore'}</span>
                        <p className="text-muted truncate">{(run as { target_url?: string }).target_url || run.task_id || 'manual trigger'}</p>
                      </div>
                      <span className="stamp">{run.status}</span>
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </section>
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
