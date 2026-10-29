import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useProjects } from '../hooks/useProjects';
import { useProjectRealtime, ProjectLogItem } from '../hooks/useProjectRealtime';
import { useNavigation } from '../lib/navigation';
import { formatRelative } from '../lib/format';
import { useToast } from '../components/Toast';
import {
  ArrowLeft,
  Pause,
  Play,
  Copy,
  Check,
  Send,
  Sparkles,
  Bot,
  Terminal,
  Clock,
  Code2,
  Github,
  ChevronDown,
  ChevronUp,
  Activity,
  ExternalLink
} from 'lucide-react';

interface ProjectDetailProps {
  projectId: string;
  initialTab?: any;
  initialTaskId?: string;
}

export const ProjectDetailScreen: React.FC<ProjectDetailProps> = ({
  projectId
}) => {
  const toast = useToast();
  const { navigate } = useNavigation();
  const { projects, loading: pLoading } = useProjects();

  const [promptDockValue, setPromptDockValue] = useState('');
  const [dockFocused, setDockFocused] = useState(false);
  const [dockMode, setDockMode] = useState<'supervisor' | 'advisor'>('supervisor');
  const [logFilter, setLogFilter] = useState<'all' | 'errors' | 'status' | 'agent' | 'advice'>('all');
  const [isAdvisorExpanded, setIsAdvisorExpanded] = useState(false);
  const [advisorPrompt, setAdvisorPrompt] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);

  // Expanded card tracking for progressive disclosure
  const [expandedCard, setExpandedCard] = useState<'status' | 'agents' | 'update' | null>(null);

  const logsContainerRef = useRef<HTMLDivElement>(null);

  const defaultLogs: ProjectLogItem[] = useMemo(() => [
    {
      id: 'log-1',
      project_id: projectId,
      timestamp: '14:22:04',
      agent: 'CoordinatorAgent',
      provider: 'anthropic',
      actionType: 'plan',
      level: 'info',
      message: 'Verified Git worktree branch and initialized supervisor plan',
      payload: {
        task_id: 'task-dispatch-921',
        branch: 'agent/task-settlement-ledger',
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
      actionType: 'code',
      level: 'info',
      message: 'Generated bilateral netting engine patch (diff: +42 / -12 lines)',
      payload: {
        model: 'deepseek-r1',
        tokens_input: 1420,
        tokens_output: 680,
        diff: '--- a/src/settlement/bilateralNetting.ts\n+++ b/src/settlement/bilateralNetting.ts\n@@ -12,4 +12,6 @@\n+ export function calculateNetExposure(trades: Trade[]): BigInt {\n+   return trades.reduce((acc, t) => acc + t.amount, 0n);\n+ }'
      }
    },
    {
      id: 'log-3',
      project_id: projectId,
      timestamp: '14:22:45',
      agent: 'ReviewAgent',
      provider: 'anthropic',
      actionType: 'review',
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

  const project = projects.find((p) => p.id === projectId) || projects[0];

  const activeAgentsList = useMemo(() => {
    return Array.from(new Set(realtimeAgents.filter(Boolean)));
  }, [realtimeAgents]);

  const githubUrl = useMemo(() => {
    if (!project) return null;
    if (project.source_type === 'github' && project.source_ref) {
      if (project.source_ref.startsWith('http')) return project.source_ref;
      return `https://github.com/${project.source_ref}`;
    }
    if (project.github_repo_url) return project.github_repo_url;
    if (project.repo_url && project.repo_url.includes('github.com')) return project.repo_url;
    return null;
  }, [project]);

  const advisorRecentLogs = useMemo(() => {
    if (!project) return [];
    const advisorName = (project.advisor_agent_name || 'CoordinatorAgent').toLowerCase();
    return allLogs
      .filter((log) => {
        const isAdvice = log.actionType.toLowerCase().includes('advice') || log.actionType.toLowerCase().includes('review');
        const isAdvisor = log.agent.toLowerCase() === advisorName || log.agent.toLowerCase().includes('advisor');
        return isAdvice || isAdvisor;
      })
      .slice(0, 3);
  }, [allLogs, project]);

  const lastAdvisorMessage = advisorRecentLogs[0]?.message || 'No recommendations yet recorded for this milestone.';

  const filteredLogs = useMemo(() => {
    return allLogs.filter((log) => {
      const level = 'level' in log ? log.level : 'info';
      if (logFilter === 'errors') return level === 'error' || log.actionType.includes('FAIL') || log.actionType.includes('ERROR');
      if (logFilter === 'status') return log.actionType.includes('STATUS') || log.actionType.includes('ORCHESTRATE') || log.actionType.includes('plan');
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
      toast.success('Payload copied to clipboard');
    } catch {
      toast.error('Failed to copy payload');
    }
  };

  const handleDockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptDockValue.trim()) return;

    if (dockMode === 'advisor') {
      const advisorName = project?.advisor_agent_name || 'CoordinatorAgent';
      const advisorProvider = project?.advisor_provider || 'Anthropic';
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
      toast.success('Advisor recommendation logged to project');
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
    toast.success('Prompt submitted to Supervisor');
    setPromptDockValue('');
  };

  const handleAdvisorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!advisorPrompt.trim()) return;

    const advisorName = project?.advisor_agent_name || 'CoordinatorAgent';
    const advisorProvider = project?.advisor_provider || 'Anthropic';

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
        issued_at: new Date().toISOString()
      }
    };

    appendLog(newAdviceLog);
    toast.success('Advisor recommendation logged to project');
    setAdvisorPrompt('');
    setIsAdvisorExpanded(false);
  };

  // Skeleton loader matching final card & monitoring dimensions
  if (pLoading && !project) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4 font-sans animate-pulse">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="h-5 w-40 bg-zinc-800/60 rounded" />
          <div className="h-7 w-28 bg-zinc-800/60 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-24 rounded-xl bg-[#111113] border border-white/[0.06] p-3" />
          ))}
        </div>
        <div className="h-14 rounded-xl bg-[#111113] border border-white/[0.06]" />
        <div className="h-72 rounded-xl bg-[#111113] border border-white/[0.06]" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 max-w-md mx-auto text-center font-sans space-y-4 pt-16">
        <p className="text-[13px] text-zinc-400">Project not found.</p>
        <button
          onClick={() => navigate({ kind: 'projects' })}
          className="px-3 py-1.5 text-xs font-mono font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  const statusBadge = project.status || 'planning';
  const statusColors: Record<string, string> = {
    production: 'bg-emerald-950/60 text-emerald-400 border-emerald-500/25',
    testing: 'bg-amber-950/60 text-amber-300 border-amber-500/25',
    building: 'bg-indigo-950/60 text-indigo-300 border-indigo-500/25',
    planning: 'bg-zinc-900 text-zinc-400 border-zinc-700/50',
  };
  const statusClass = statusColors[statusBadge] || statusColors.planning;

  const progress = typeof project.progress === 'number' ? project.progress : 0;
  const archetypeLabel = project.archetype || project.vertical || 'Full-Stack App';

  return (
    <div className="min-h-full p-4 sm:p-6 max-w-4xl mx-auto space-y-3 font-sans text-zinc-200">
      {/* ── Compact Header ── */}
      <div className="space-y-2 pb-3 border-b border-white/[0.06]">
        {/* Breadcrumb line with back button */}
        <div className="flex items-center gap-2 text-zinc-400">
          <button
            onClick={() => navigate({ kind: 'projects' })}
            className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] transition-colors focus-visible:ring-1 focus-visible:ring-indigo-500/50 outline-none"
            title="Back to Projects"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono text-zinc-500">Projects /</span>
          <h1 className="text-[18px] sm:text-[20px] font-semibold text-zinc-100 tracking-tight truncate">
            {project.name.split(' (')[0]}
          </h1>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-white/[0.06] uppercase tracking-wider hidden sm:inline-block">
            {archetypeLabel}
          </span>
          {githubUrl && (
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] transition-colors ml-auto sm:ml-0"
              title="View repository on GitHub"
            >
              <Github className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* Progress & Controls row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
          {/* Status Badge (12px height) + Progress */}
          <div className="flex items-center gap-3">
            <span
              className={`h-4 px-1.5 py-0.5 rounded text-[10px] leading-[12px] font-mono uppercase font-bold tracking-wider border ${statusClass} tabular-nums`}
            >
              {statusBadge}
            </span>

            <div className="flex items-center gap-2">
              <div className="w-24 sm:w-36 h-1 rounded-full bg-[#1a1a1e] overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
              </div>
              <span className="text-[11px] font-mono text-zinc-400 font-medium tabular-nums">
                {progress}%
              </span>
            </div>
          </div>

          {/* Pause / Resume Button (amber outline -> solid amber) */}
          <button
            type="button"
            onClick={() => {
              const nextState = !agentsPaused;
              setAgentStatus(nextState);
              toast[nextState ? 'info' : 'success'](
                nextState ? 'Agents paused (agent_assignments -> paused)' : 'Agents resumed (agent_assignments -> working)'
              );
            }}
            className={`h-7 px-2.5 rounded-lg text-xs font-mono font-medium transition-all duration-150 ease-out flex items-center gap-1.5 focus-visible:ring-1 focus-visible:ring-amber-500/50 outline-none active:scale-[0.98] ${
              agentsPaused
                ? 'bg-amber-500 text-black font-semibold border border-amber-400 shadow-xs'
                : 'text-amber-400/95 border border-amber-500/40 hover:bg-amber-500/10'
            }`}
            title="Toggle pause on agent execution"
          >
            {agentsPaused ? <Play className="w-3 h-3 fill-current" /> : <Pause className="w-3 h-3" />}
            <span>{agentsPaused ? 'Resume' : 'Pause Agents'}</span>
          </button>
        </div>
      </div>

      {/* ── Three Tight Cards (Progressive Disclosure) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {/* Card 1: Status & Next Step */}
        <div
          onClick={() => setExpandedCard(expandedCard === 'status' ? null : 'status')}
          className="group p-3 rounded-xl bg-[#111113] hover:bg-[#141417] border border-white/[0.06] hover:border-white/[0.12] transition-colors duration-150 ease-out cursor-pointer select-none space-y-1"
        >
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-zinc-500">
            <span>Status & Next Step</span>
            <span className="text-[9px] text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity">
              {expandedCard === 'status' ? 'Collapse' : 'Details'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                agentsPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'
              }`}
            />
            <span className="text-xs font-bold font-mono text-zinc-100 truncate">
              {agentsPaused ? 'PAUSED' : statusBadge.toUpperCase()}
            </span>
          </div>
          <p
            className={`text-[12px] text-zinc-400 font-sans transition-all duration-150 ease-out ${
              expandedCard === 'status' ? '' : 'line-clamp-1'
            }`}
          >
            {project.next_step || 'Awaiting next supervisor instruction'}
          </p>
        </div>

        {/* Card 2: Active Agents with 6px status dots */}
        <div
          onClick={() => setExpandedCard(expandedCard === 'agents' ? null : 'agents')}
          className="group p-3 rounded-xl bg-[#111113] hover:bg-[#141417] border border-white/[0.06] hover:border-white/[0.12] transition-colors duration-150 ease-out cursor-pointer select-none space-y-1"
        >
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-zinc-500">
            <span>Active Agents</span>
            <span className="text-[9px] text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity">
              {expandedCard === 'agents' ? 'Collapse' : 'Details'}
            </span>
          </div>
          {activeAgentsList.length === 0 ? (
            <span className="text-xs text-zinc-500 font-mono italic block py-0.5">
              Waiting for Supervisor
            </span>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              {activeAgentsList.map((ag) => (
                <div
                  key={ag}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-950/40 border border-indigo-500/25 text-[10px] font-mono text-indigo-300"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      agentsPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'
                    }`}
                  />
                  <span>{ag}</span>
                </div>
              ))}
            </div>
          )}
          <span
            className={`text-[10px] text-zinc-500 font-mono block transition-all duration-150 ease-out ${
              expandedCard === 'agents' ? 'text-zinc-400' : ''
            }`}
          >
            {agentsPaused
              ? 'Execution halted'
              : activeAgentsList.length === 0
              ? 'No assigned executors'
              : 'Autonomous loop listening'}
          </span>
        </div>

        {/* Card 3: Last Update */}
        <div
          onClick={() => setExpandedCard(expandedCard === 'update' ? null : 'update')}
          className="group p-3 rounded-xl bg-[#111113] hover:bg-[#141417] border border-white/[0.06] hover:border-white/[0.12] transition-colors duration-150 ease-out cursor-pointer select-none space-y-1"
        >
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-zinc-500">
            <span>Last Update</span>
            <span className="text-[9px] text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity">
              {expandedCard === 'update' ? 'Collapse' : 'Details'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="text-xs font-bold font-mono text-zinc-100">
              {project.updated_at ? formatRelative(project.updated_at) : 'Just now'}
            </span>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono truncate block">
            {expandedCard === 'update'
              ? `Commit: ${project.last_commit_hash || 'main-001'} · Branch: main`
              : `Commit: ${project.last_commit_hash || 'main-001'}`}
          </span>
        </div>
      </div>

      {/* ── Quiet Strategic Advisor Indicator (Expands on demand) ── */}
      <div className="rounded-xl border border-white/[0.06] bg-[#111113] overflow-hidden transition-all duration-150 ease-out">
        <div
          onClick={() => setIsAdvisorExpanded((v) => !v)}
          className="p-2.5 sm:px-3 sm:py-2.5 flex items-center justify-between gap-2.5 cursor-pointer hover:bg-[#141417] transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="text-xs font-medium font-mono text-zinc-200 shrink-0">
              Advisor: {project.advisor_agent_name || 'CoordinatorAgent'}
            </span>
            <span className="text-[10px] text-zinc-500 truncate hidden sm:inline-block font-sans">
              — {lastAdvisorMessage}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/50 text-emerald-400 border border-emerald-500/25 hidden xs:inline-block">
              Read-Only
            </span>
            <span className="text-xs text-zinc-400 flex items-center gap-1 font-mono">
              <span className="text-[10px]">{isAdvisorExpanded ? 'Close' : 'Ask Advisor'}</span>
              {isAdvisorExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </span>
          </div>
        </div>

        {/* Smooth Expandable Advisor Content */}
        {isAdvisorExpanded && (
          <div className="p-3 border-t border-white/[0.06] bg-[#0d0d0f] space-y-3 animate-in fade-in duration-150 ease-out">
            <div className="space-y-1 font-mono text-xs">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                Last Recommendation:
              </span>
              <p className="text-[12px] text-zinc-300 font-sans p-2 rounded-lg bg-[#111113] border border-white/[0.06]">
                {lastAdvisorMessage}
              </p>
            </div>

            <form onSubmit={handleAdvisorSubmit} className="space-y-2">
              <textarea
                rows={2}
                value={advisorPrompt}
                onChange={(e) => setAdvisorPrompt(e.target.value)}
                placeholder="Ask advisor for architecture review, invariant assertions, or safety checks..."
                className="w-full bg-[#111113] border border-white/[0.06] focus:border-indigo-500/50 rounded-lg p-2.5 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500/50 transition-colors"
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-500 font-mono">
                  Logs to project_logs as action_type = 'advice'
                </span>
                <button
                  type="submit"
                  disabled={!advisorPrompt.trim()}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 disabled:opacity-40 transition-colors shadow-xs"
                >
                  <Send className="w-3 h-3" />
                  <span>Submit Advice Query</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* ── Logs Section with 36px Rows and Sticky Filter Chips ── */}
      <div className="rounded-xl bg-[#111113] border border-white/[0.06] overflow-hidden flex flex-col font-mono text-xs">
        {/* Sticky Filter Chips Header */}
        <div className="sticky top-0 z-10 bg-[#111113]/95 backdrop-blur-xs px-3 py-2 border-b border-white/[0.06] flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[11px] font-semibold text-zinc-200 uppercase tracking-wider font-mono">
            Logs
          </span>

          <div className="flex items-center gap-1 flex-wrap">
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
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all duration-150 ease-out focus-visible:ring-1 focus-visible:ring-indigo-500/50 outline-none ${
                    active
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-white/[0.04]'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Chronological Log Rows (36px high per collapsed row) */}
        <div
          ref={logsContainerRef}
          className="divide-y divide-white/[0.04] max-h-[360px] overflow-y-auto"
        >
          {allLogs.length === 0 ? (
            <div className="h-24 flex items-center justify-center text-center text-zinc-500 text-xs font-mono">
              No activity yet. Dispatched instructions and supervisor events will stream here.
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="h-24 flex items-center justify-center text-center text-zinc-500 text-xs font-mono">
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
                  className="transition-colors duration-150 ease-out hover:bg-white/[0.02]"
                >
                  {/* Exactly 36px Height Row (h-9) */}
                  <div
                    onClick={() => hasPayload && setExpandedLogId(isExpanded ? null : log.id)}
                    className={`h-9 px-3 flex items-center justify-between gap-2.5 text-xs ${
                      hasPayload ? 'cursor-pointer' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] text-zinc-500 shrink-0 tabular-nums font-mono">
                        {log.timestamp}
                      </span>
                      <span className="text-[10px] px-1 py-0.2 rounded bg-zinc-900 border border-white/[0.06] text-indigo-300 font-medium shrink-0">
                        {log.agent}
                      </span>
                      <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-zinc-800 text-zinc-400 shrink-0 hidden xs:inline-block">
                        {log.actionType}
                      </span>
                      <p className="text-zinc-300 font-sans text-xs truncate">
                        {log.message}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {hasPayload && (
                        <span className="text-[10px] text-indigo-400/90 flex items-center gap-1 font-mono">
                          <Code2 className="w-3 h-3" />
                          <span>{isExpanded ? 'Hide' : 'Expand'}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Recessed Monospace Payload Block (12px Monospace, Zero Shift Copy Button) */}
                  {isExpanded && log.payload && (
                    <div className="p-3 border-t border-white/[0.06] bg-[#09090b] space-y-2 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between text-[10px] text-zinc-400">
                        <span className="uppercase tracking-wider font-semibold">
                          {rawDiff ? 'Diff View' : rawMarkdown ? 'Markdown Note' : 'Structured Payload (JSONB)'}:
                        </span>

                        {/* Fixed Width w-20 to Prevent Layout Shift when toggling Copied */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyPayload(log.id, log.payload);
                          }}
                          className="w-20 h-6 px-1.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-white/[0.06] text-[10px] font-mono text-zinc-300 hover:text-white flex items-center justify-center gap-1 transition-colors"
                        >
                          {copiedLogId === log.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 shrink-0" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>

                      {rawDiff ? (
                        <pre className="p-2.5 rounded-lg bg-[#0d0d0f] border border-white/[0.06] text-[12px] text-cyan-300 font-mono overflow-x-auto max-h-48 leading-relaxed whitespace-pre">
                          {rawDiff}
                        </pre>
                      ) : rawMarkdown ? (
                        <div className="p-2.5 rounded-lg bg-[#0d0d0f] border border-white/[0.06] text-[12px] text-zinc-200 font-sans overflow-x-auto max-h-48 leading-relaxed whitespace-pre-wrap">
                          {rawMarkdown}
                        </div>
                      ) : (
                        <pre className="p-2.5 rounded-lg bg-[#0d0d0f] border border-white/[0.06] text-[12px] text-emerald-300 font-mono overflow-x-auto max-h-48 leading-relaxed">
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

        {/* ── Compact 36px Prompt Dock (Expands Smoothly on Focus) ── */}
        <form
          onSubmit={handleDockSubmit}
          className={`p-2 border-t border-white/[0.06] bg-[#0d0d0f] transition-all duration-150 ease-out ${
            dockFocused || promptDockValue ? 'space-y-2' : ''
          }`}
        >
          <div className="flex items-center gap-2">
            {/* Target mode pill (visible on focus or desktop) */}
            <div className="p-0.5 rounded-md bg-zinc-900 border border-white/[0.06] flex items-center text-[10px] shrink-0 font-mono">
              <button
                type="button"
                onClick={() => setDockMode('supervisor')}
                className={`px-2 py-0.5 rounded font-medium transition-all ${
                  dockMode === 'supervisor'
                    ? 'bg-indigo-600 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Send instruction to Supervisor orchestrator"
              >
                Supervisor
              </button>
              <button
                type="button"
                onClick={() => setDockMode('advisor')}
                className={`px-2 py-0.5 rounded font-medium transition-all ${
                  dockMode === 'advisor'
                    ? 'bg-indigo-600 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Send query to strategic Advisor"
              >
                Advisor
              </button>
            </div>

            <div className="relative flex-1">
              <Terminal className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={promptDockValue}
                onFocus={() => setDockFocused(true)}
                onBlur={() => !promptDockValue && setDockFocused(false)}
                onChange={(e) => setPromptDockValue(e.target.value)}
                placeholder={
                  dockMode === 'advisor'
                    ? `Ask ${project.advisor_agent_name || 'Advisor'}: Review architecture or safety...`
                    : "Prompt / Redirect: send directive to project agents..."
                }
                className="w-full h-8 bg-[#111113] border border-white/[0.06] focus:border-indigo-500/50 rounded-lg pl-8 pr-3 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500/50 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={!promptDockValue.trim()}
              className="h-8 px-3 rounded-lg text-xs font-mono font-medium bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shrink-0 disabled:opacity-40 transition-colors shadow-xs"
            >
              <Send className="w-3 h-3" />
              <span>{dockMode === 'advisor' ? 'Consult' : 'Send'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
