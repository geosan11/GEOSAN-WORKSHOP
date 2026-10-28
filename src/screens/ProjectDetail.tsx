import React, { useState, useMemo, useEffect } from 'react';
import { useProjects } from '../hooks/useProjects';
import { useTasks } from '../hooks/useTasks';
import { useCosts } from '../hooks/useCosts';
import { useQA } from '../hooks/useQA';
import { useProjectRealtime, ProjectLogItem } from '../hooks/useProjectRealtime';
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
  Pause,
  Play,
  Copy,
  Check,
  Send,
  Sparkles,
  Bot,
  Terminal,
  Activity,
  Clock,
  Code2,
  Github,
  ExternalLink
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
  const [promptDockValue, setPromptDockValue] = useState('');
  const [dockMode, setDockMode] = useState<'supervisor' | 'advisor'>('supervisor');
  const [logFilter, setLogFilter] = useState<'all' | 'errors' | 'status' | 'agent' | 'advice'>('all');
  const [isAdvisorPanelOpen, setIsAdvisorPanelOpen] = useState(false);
  const [advisorPrompt, setAdvisorPrompt] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);

  const defaultLogs: ProjectLogItem[] = useMemo(() => [
    {
      id: 'log-1',
      project_id: projectId,
      timestamp: '14:22:04',
      agent: 'CoordinatorAgent',
      provider: 'anthropic',
      actionType: 'ORCHESTRATE_DISPATCH',
      level: 'info',
      message: 'Verified Git worktree branch and budget quota before dispatch',
      payload: {
        task_id: 'task-dispatch-921',
        branch: 'agent/task-fix-ledger',
        allocated_budget_usd: 0.15,
        invariants_checked: ['RLS_OWNER', 'NO_DIRECT_MAIN_WRITE']
      }
    },
    {
      id: 'log-2',
      project_id: projectId,
      timestamp: '14:22:18',
      agent: 'CodingAgent',
      provider: 'deepseek',
      actionType: 'AST_SYNTHESIS',
      level: 'info',
      message: 'Generated bilateral netting engine patch (diff: +42 / -12 lines)',
      payload: {
        model: 'deepseek-r1',
        tokens_input: 1420,
        tokens_output: 680,
        cost_usd: 0.0012,
        affected_files: ['src/settlement/bilateralNetting.ts']
      }
    },
    {
      id: 'log-3',
      project_id: projectId,
      timestamp: '14:22:45',
      agent: 'ReviewAgent',
      provider: 'anthropic',
      actionType: 'INVARIANT_AUDIT',
      level: 'info',
      message: 'Audited PR changes: 0 security regressions, BigInt arithmetic verified',
      payload: {
        model: 'claude-3-7-sonnet',
        verdict: 'APPROVED_FOR_STAGING',
        checks_passed: 14,
        drift_detected: false
      }
    }
  ], [projectId]);

  // Hook into Realtime + Demo Log & Agent Stream
  const {
    logs: allLogs,
    activeAgents: realtimeAgents,
    agentsPaused,
    appendLog,
    setAgentStatus
  } = useProjectRealtime({
    projectId,
    initialLogs: defaultLogs,
    defaultAgents: ['CoordinatorAgent', 'ReviewAgent']
  });

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

  const statusBadge = project.status || 'planning';
  const statusColor =
    statusBadge === 'production'
      ? 'bg-emerald-950/70 text-emerald-400 border-emerald-500/30'
      : statusBadge === 'testing'
      ? 'bg-amber-950/70 text-amber-300 border-amber-500/30'
      : statusBadge === 'building'
      ? 'bg-cyan-950/70 text-cyan-300 border-cyan-500/30'
      : 'bg-white/5 text-muted border-white/10';

  const activeAgentsList = useMemo(() => {
    return Array.from(new Set(realtimeAgents.filter(Boolean)));
  }, [realtimeAgents]);

  const githubUrl = useMemo(() => {
    if (project.source_type === 'github' && project.source_ref) {
      if (project.source_ref.startsWith('http')) return project.source_ref;
      return `https://github.com/${project.source_ref}`;
    }
    if (project.github_repo_url) return project.github_repo_url;
    if (project.repo_url && project.repo_url.includes('github.com')) return project.repo_url;
    return null;
  }, [project]);

  const advisorRecentLogs = useMemo(() => {
    const advisorName = (project.advisor_agent_name || 'CoordinatorAgent').toLowerCase();
    return allLogs
      .filter((log) => {
        const isAdvice = log.actionType.toLowerCase().includes('advice') || log.actionType.toLowerCase().includes('review');
        const isAdvisor = log.agent.toLowerCase() === advisorName || log.agent.toLowerCase().includes('advisor');
        return isAdvice || isAdvisor;
      })
      .slice(0, 3);
  }, [allLogs, project.advisor_agent_name]);

  const filteredLogs = useMemo(() => {
    return allLogs.filter((log) => {
      const level = 'level' in log ? log.level : 'info';
      if (logFilter === 'errors') return level === 'error' || log.actionType.includes('FAIL') || log.actionType.includes('ERROR');
      if (logFilter === 'status') return log.actionType.includes('STATUS') || log.actionType.includes('ORCHESTRATE');
      if (logFilter === 'agent') return log.agent.includes('Agent') && !log.actionType.includes('ADVICE');
      if (logFilter === 'advice') return log.actionType.toLowerCase().includes('advice') || log.actionType.toLowerCase().includes('review');
      return true;
    });
  }, [allLogs, logFilter]);

  const handleCopyPayload = (id: string, payload: unknown) => {
    try {
      const rawText = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
      navigator.clipboard.writeText(rawText);
      setCopiedLogId(id);
      setTimeout(() => setCopiedLogId(null), 1800);
      toast.success('Log payload copied to clipboard');
    } catch {
      toast.error('Failed to copy payload');
    }
  };

  const handleDockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptDockValue.trim()) return;

    if (dockMode === 'advisor') {
      const advisorName = project.advisor_agent_name || 'CoordinatorAgent';
      const advisorProvider = project.advisor_provider || 'Anthropic';
      const newAdviceLog: ProjectLogItem = {
        id: `log-adv-${Date.now()}`,
        project_id: projectId,
        timestamp: new Date().toLocaleTimeString(),
        agent: advisorName,
        provider: advisorProvider,
        actionType: 'advice',
        level: 'info',
        message: promptDockValue.trim(),
        payload: {
          advisor_role: 'Read-Only Strategic Advisor',
          provider: advisorProvider,
          prompt: promptDockValue.trim(),
          verdict: 'INFORMATIONAL_ADVICE_ONLY',
          constraints: [
            'No direct code synthesis allowed without operator sign-off',
            'Project status mutation disabled for advisor role'
          ],
          dispatched_at: new Date().toISOString()
        }
      };
      appendLog(newAdviceLog);
      toast.success(`Advisor recommendation logged to project`);
      setPromptDockValue('');
      return;
    }

    const newLog: ProjectLogItem = {
      id: `log-${Date.now()}`,
      project_id: projectId,
      timestamp: new Date().toLocaleTimeString(),
      agent: 'Operator',
      provider: 'local',
      actionType: 'prompt',
      level: 'info',
      message: promptDockValue.trim(),
      payload: {
        directive: promptDockValue.trim(),
        channel: 'prompt_dock',
        notified_supervisor: true,
        dispatched_at: new Date().toISOString()
      }
    };

    appendLog(newLog);
    toast.success(`Prompt submitted to Supervisor & project log`);
    setPromptDockValue('');
  };

  const handleAdvisorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!advisorPrompt.trim()) return;

    const advisorName = project.advisor_agent_name || 'CoordinatorAgent';
    const advisorProvider = project.advisor_provider || 'Anthropic';

    // Advisor only recommends/advises, never modifies code or mutates project status
    const newAdviceLog: ProjectLogItem = {
      id: `log-adv-${Date.now()}`,
      project_id: projectId,
      timestamp: new Date().toLocaleTimeString(),
      agent: advisorName,
      provider: advisorProvider,
      actionType: 'advice',
      level: 'info',
      message: `Strategic recommendation: ${advisorPrompt.trim()}`,
      payload: {
        advisor_role: 'Read-Only Strategic Advisor',
        provider: advisorProvider,
        prompt: advisorPrompt.trim(),
        verdict: 'INFORMATIONAL_ADVICE_ONLY',
        constraints: [
          'No direct code synthesis allowed without operator sign-off',
          'Project status mutation disabled for advisor role'
        ],
        recommendations: [
          'Verify tenant RLS isolation on new schema endpoints',
          'Keep prompt tokens optimized within weekly budget ledger'
        ],
        issued_at: new Date().toISOString()
      }
    };

    appendLog(newAdviceLog);
    toast.success(`Advisor recommendation logged to project`);
    setAdvisorPrompt('');
    setIsAdvisorPanelOpen(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 font-sans">
      <PageHeader
        eyebrow="Build · Project"
        title={project.name.split(' (')[0]}
        lede={
          nextActionTask
            ? `Next: ${nextActionTask.status.replace(/_/g, ' ')} · ${nextActionTask.prompt.slice(0, 80)}${nextActionTask.prompt.length > 80 ? '…' : ''}`
            : `${project.vertical} · Real-time monitoring, agent logs, and worktree control.`
        }
        actions={
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-1 rounded border ${statusColor}`}>
              {statusBadge}
            </span>
            {githubUrl && (
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs py-1 px-2.5 rounded-md font-mono font-bold transition-all flex items-center gap-1.5 text-muted hover:text-main bg-white/5 border border-[color:var(--border-app)] hover:border-white/20"
                title="View repository on GitHub"
              >
                <Github className="w-3.5 h-3.5" />
                <span>View on GitHub</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
              </a>
            )}
            <div className="flex items-center gap-1.5 p-0.5 rounded-lg bg-[color:var(--bg-card)] border border-[color:var(--border-app)]">
              <button
                type="button"
                onClick={() => {
                  const nextState = !agentsPaused;
                  setAgentStatus(nextState);
                  toast[nextState ? 'info' : 'success'](
                    nextState ? 'Agents paused (agent_assignments -> paused)' : 'Agents resumed (agent_assignments -> working)'
                  );
                }}
                className={`text-xs py-1 px-2.5 rounded-md font-mono font-bold transition-all flex items-center gap-1.5 ${
                  agentsPaused
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                    : 'text-amber-400/90 border border-amber-500/30 hover:bg-amber-500/10'
                }`}
                title="Pause or resume agent assignments"
              >
                {agentsPaused ? <Play className="w-3 h-3 fill-current" /> : <Pause className="w-3 h-3" />}
                <span>{agentsPaused ? 'Resume' : 'Pause Agents'}</span>
              </button>
            </div>
            {surface === 'work' && !openWorkspace && (
              <button
                type="button"
                onClick={() => setIsDispatchModalOpen(true)}
                className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Dispatch</span>
              </button>
            )}
          </div>
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


      {/* Compact Monitoring Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="kpi-tile p-3">
          <div className="space-y-1">
            <span className="text-[10px] text-meta uppercase tracking-wider block">Current Status / Next Step</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full shrink-0 ${agentsPaused ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              <span className="text-xs font-bold font-mono text-main truncate">
                {agentsPaused ? 'Paused' : project.status.toUpperCase()}
              </span>
            </div>
            <p className="text-[11px] text-muted line-clamp-1 font-sans">
              {nextActionTask ? nextActionTask.prompt : 'Awaiting next instruction directive'}
            </p>
          </div>
        </div>

        <div className="kpi-tile p-3">
          <div className="space-y-1">
            <span className="text-[10px] text-meta uppercase tracking-wider block">Active Agents</span>
            {activeAgentsList.length === 0 ? (
              <span className="text-xs text-muted font-mono italic block py-0.5">
                Waiting for Supervisor
              </span>
            ) : (
              <div className="flex items-center gap-1.5 flex-wrap">
                {activeAgentsList.map((ag) => (
                  <span key={ag} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-[color:var(--border-app)] text-cyan-300">
                    {ag}
                  </span>
                ))}
              </div>
            )}
            <span className="text-[10px] text-meta font-mono block">
              {agentsPaused ? 'Execution halted' : activeAgentsList.length === 0 ? 'No assigned executors' : 'Autonomous loop listening'}
            </span>
          </div>
        </div>

        <div className="kpi-tile p-3">
          <div className="space-y-1">
            <span className="text-[10px] text-meta uppercase tracking-wider block">Last Update</span>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-bold font-mono text-main">
                {project.updated_at ? formatRelative(project.updated_at) : 'Just now'}
              </span>
            </div>
            <span className="text-[10px] text-meta font-mono truncate block">
              Commit: {project.last_commit_hash || 'main-001'}
            </span>
          </div>
        </div>

        <div className="kpi-tile p-3">
          <div className="space-y-1">
            <span className="text-[10px] text-meta uppercase tracking-wider block">Month Spend / Cap</span>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono text-main">{formatCost(monthSpend)}</span>
              <span className="text-[10px] text-primary font-mono font-bold">{spendRatio}% of cap</span>
            </div>
            <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#F0B230] to-emerald-400 rounded-full"
                style={{ width: `${Math.min(100, Math.max(4, spendRatio))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Advisor Quick Action Card */}
      <div className="p-3.5 rounded-xl border border-primary/30 bg-primary-container/20 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-main font-mono">
                  Advisor: {project.advisor_agent_name || 'CoordinatorAgent'}
                </span>
                <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-white/5 text-muted border border-white/10">
                  {project.advisor_provider || 'Anthropic'}
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                  Read-Only Advisory
                </span>
              </div>
              <span className="text-[11px] text-muted font-sans block">
                Assigned strategic reviewer for architecture verification, invariant checks, and budget safety.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAdvisorPanelOpen((v) => !v)}
            className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>{isAdvisorPanelOpen ? 'Close Advisor Dock' : 'Ask Advisor'}</span>
          </button>
        </div>

        {/* Advisor Preview: Last 2-3 Advisor Messages */}
        <div className="pt-2 border-t border-primary/20 font-mono text-xs">
          <span className="text-[10px] text-meta uppercase tracking-wider block mb-1.5">
            Recent Advisor Recommendations ({advisorRecentLogs.length})
          </span>
          {advisorRecentLogs.length === 0 ? (
            <p className="text-[11px] text-muted italic font-sans">
              No recommendations yet. Use "Ask Advisor" or the dock below to request architecture, invariant, or budget review.
            </p>
          ) : (
            <div className="space-y-1.5">
              {advisorRecentLogs.map((item) => (
                <div
                  key={item.id}
                  className="p-2 rounded-lg bg-black/30 border border-primary/20 flex items-start justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="text-primary font-bold">{item.agent}</span>
                      <span className="text-meta">{item.timestamp}</span>
                      <span className="px-1 py-0.2 rounded bg-white/5 text-[9px] uppercase text-muted">
                        {item.actionType}
                      </span>
                    </div>
                    <p className="text-main font-sans text-xs truncate">
                      {item.message}
                    </p>
                  </div>
                  {item.payload && (
                    <button
                      type="button"
                      onClick={() => handleCopyPayload(item.id, item.payload)}
                      className="text-[10px] text-muted hover:text-main shrink-0 p-1 rounded hover:bg-white/5"
                      title="Copy payload"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Focused Advisor Side Panel / Dock */}
      {isAdvisorPanelOpen && (
        <div className="p-4 rounded-xl border border-primary/40 bg-[color:var(--bg-card)] space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="font-bold text-xs text-main font-mono">
                Advisor Strategic Panel · {project.advisor_agent_name || 'CoordinatorAgent'}
              </span>
            </div>
            <span className="text-[10px] text-muted">
              Role: Strategic Read-Only Advisory (No Status Mutation)
            </span>
          </div>

          <form onSubmit={handleAdvisorSubmit} className="space-y-2">
            <textarea
              rows={2}
              value={advisorPrompt}
              onChange={(e) => setAdvisorPrompt(e.target.value)}
              placeholder="Ask the advisor for architecture recommendations, invariant review, or budget sanity checks..."
              className="w-full bg-[color:var(--bg-app)] border border-[color:var(--border-app)] rounded-lg p-2.5 text-xs font-mono text-main placeholder:text-muted focus:outline-none focus:border-primary"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-meta font-mono">
                Logs to project_logs as action_type = 'advice'
              </span>
              <button
                type="submit"
                disabled={!advisorPrompt.trim()}
                className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Recommendation</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Live Chronological Logs Section with Expandable JSONB & Single-Line Dock */}
      <SectionCard
        title="Project Activity & Agent Logs"
        description="Real-time chronological execution log stream with expandable JSONB payloads, output copying, and prompt dock."
      >
        <div className="space-y-3 font-mono text-xs">
          {/* Simple Filter Chips */}
          <div className="flex items-center gap-1.5 flex-wrap pb-1">
            <span className="text-[10px] text-meta uppercase tracking-wider mr-1">Filter:</span>
            {[
              { id: 'all' as const, label: 'All' },
              { id: 'errors' as const, label: 'Errors' },
              { id: 'status' as const, label: 'Status' },
              { id: 'agent' as const, label: 'Agent' },
              { id: 'advice' as const, label: 'Advice' },
            ].map((f) => {
              const active = logFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setLogFilter(f.id)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
                    active
                      ? 'bg-primary text-[#0A1420] font-bold shadow-xs'
                      : 'bg-white/5 text-muted hover:text-main border border-[color:var(--border-app)]'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Chronological Log Rows */}
          <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
            {allLogs.length === 0 ? (
              <div className="p-4 rounded-lg bg-[color:var(--bg-app)] border border-[color:var(--border-app)] text-center text-muted text-xs font-mono">
                No activity yet. Dispatched instructions and supervisor events will stream here in real time.
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-4 rounded-lg bg-[color:var(--bg-app)] border border-[color:var(--border-app)] text-center text-muted text-xs font-mono">
                No logs match the current filter "{logFilter}".
              </div>
            ) : (
              filteredLogs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                const hasPayload = Boolean(log.payload && Object.keys(log.payload).length > 0);
                const rawDiff = typeof (log.payload as any)?.diff === 'string' ? (log.payload as any).diff : null;
                const rawMarkdown = typeof (log.payload as any)?.markdown === 'string' ? (log.payload as any).markdown : null;

                return (
                  <div
                    key={log.id}
                    className="rounded-lg border border-[color:var(--border-app)] bg-[color:var(--bg-app)]/80 hover:border-white/15 transition-all overflow-hidden"
                  >
                    <div
                      onClick={() => hasPayload && setExpandedLogId(isExpanded ? null : log.id)}
                      className={`p-2.5 flex items-center justify-between gap-3 text-xs ${hasPayload ? 'cursor-pointer' : ''}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-[10px] text-meta shrink-0 tabular-nums font-mono">{log.timestamp}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-cyan-300 font-bold shrink-0">
                          {log.agent}
                        </span>
                        <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-white/5 text-meta shrink-0">
                          {log.actionType}
                        </span>
                        <p className="text-main font-sans text-xs truncate">{log.message}</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {hasPayload && (
                          <span className="text-[10px] text-primary flex items-center gap-1 font-mono">
                            <Code2 className="w-3 h-3" />
                            <span>{isExpanded ? 'Hide' : 'Expand'}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expandable Monospace Area (Markdown, Diff, or Formatted JSONB) */}
                    {isExpanded && log.payload && (
                      <div className="p-3 border-t border-[color:var(--border-app)] bg-black/40 space-y-2">
                        <div className="flex items-center justify-between text-[10px] text-meta">
                          <span className="uppercase tracking-wider font-bold">
                            {rawDiff ? 'Diff View' : rawMarkdown ? 'Markdown Note' : 'Structured Payload (JSONB)'}:
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyPayload(log.id, log.payload);
                            }}
                            className="btn btn-ghost !px-2 !py-0.5 text-[10px] text-muted hover:text-main flex items-center gap-1"
                          >
                            {copiedLogId === log.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy Output</span>
                              </>
                            )}
                          </button>
                        </div>

                        {rawDiff ? (
                          <pre className="p-2.5 rounded bg-[#0d1117] border border-white/10 text-[11px] text-cyan-300 font-mono overflow-x-auto max-h-48 leading-relaxed whitespace-pre">
                            {rawDiff}
                          </pre>
                        ) : rawMarkdown ? (
                          <div className="p-2.5 rounded bg-[#0d1117] border border-white/10 text-[11px] text-main font-sans overflow-x-auto max-h-48 leading-relaxed whitespace-pre-wrap">
                            {rawMarkdown}
                          </div>
                        ) : (
                          <pre className="p-2.5 rounded bg-[#0d1117] border border-white/10 text-[11px] text-emerald-300 font-mono overflow-x-auto max-h-48 leading-relaxed">
                            {JSON.stringify(log.payload, null, 2)}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Compact Single-Line Prompt / Redirect Dock with Target Mode */}
          <form
            onSubmit={handleDockSubmit}
            className="pt-2 border-t border-[color:var(--border-app)] flex items-center gap-2"
          >
            {/* Target mode pill */}
            <div className="p-0.5 rounded-lg bg-black/40 border border-white/10 flex items-center text-[10px] shrink-0 font-mono">
              <button
                type="button"
                onClick={() => setDockMode('supervisor')}
                className={`px-2 py-1 rounded font-bold transition-all ${
                  dockMode === 'supervisor'
                    ? 'bg-primary text-[#0A1420]'
                    : 'text-muted hover:text-main'
                }`}
                title="Send instruction to Supervisor orchestrator"
              >
                Supervisor
              </button>
              <button
                type="button"
                onClick={() => setDockMode('advisor')}
                className={`px-2 py-1 rounded font-bold transition-all ${
                  dockMode === 'advisor'
                    ? 'bg-primary text-[#0A1420]'
                    : 'text-muted hover:text-main'
                }`}
                title="Send query to strategic Advisor"
              >
                Advisor
              </button>
            </div>

            <div className="relative flex-1">
              <Terminal className="w-3.5 h-3.5 text-meta absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={promptDockValue}
                onChange={(e) => setPromptDockValue(e.target.value)}
                placeholder={
                  dockMode === 'advisor'
                    ? `Ask ${project.advisor_agent_name || 'Advisor'}: Review architecture, invariant assertions, or safety...`
                    : "Prompt / Redirect: send directive to project agents (e.g. Focus on settlement netting)..."
                }
                className="w-full bg-[color:var(--bg-app)] border border-[color:var(--border-app)] rounded-lg pl-8.5 pr-3 py-2 text-xs font-mono text-main placeholder:text-muted focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={!promptDockValue.trim()}
              className="btn btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{dockMode === 'advisor' ? 'Consult' : 'Send'}</span>
            </button>
          </form>
        </div>
      </SectionCard>

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
