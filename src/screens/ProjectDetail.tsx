import React, { useState, useMemo } from 'react';
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
      toast.success('Log payload copied to clipboard');
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
    toast.success('Prompt submitted to Supervisor & project log');
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
        recommendations: [
          'Verify tenant RLS isolation on new schema endpoints',
          'Keep prompt tokens optimized within weekly budget ledger'
        ],
        issued_at: new Date().toISOString()
      }
    };

    appendLog(newAdviceLog);
    toast.success('Advisor recommendation logged to project');
    setAdvisorPrompt('');
    setIsAdvisorPanelOpen(false);
  };

  if (pLoading && !project) {
    return (
      <div className="p-6 max-w-5xl mx-auto font-sans">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[#16181d] rounded w-1/3" />
          <div className="h-24 bg-[#121316] rounded-xl" />
          <div className="h-64 bg-[#121316] rounded-xl" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 max-w-md mx-auto text-center font-sans space-y-4">
        <p className="text-sm text-neutral-400">Project not found.</p>
        <button
          onClick={() => navigate({ kind: 'projects' })}
          className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-[#6366f1] text-white hover:bg-[#4f46e5] transition-colors"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  const statusBadge = project.status || 'planning';
  const statusColor =
    statusBadge === 'production'
      ? 'bg-emerald-950/70 text-emerald-400 border-emerald-500/30'
      : statusBadge === 'testing'
      ? 'bg-amber-950/70 text-amber-300 border-amber-500/30'
      : statusBadge === 'building'
      ? 'bg-indigo-950/70 text-indigo-300 border-indigo-500/30'
      : 'bg-neutral-800 text-neutral-400 border-neutral-700';

  const progress = typeof project.progress === 'number' ? project.progress : 0;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5 font-sans text-neutral-200">
      {/* Top Header Bar */}
      <div className="space-y-3 pb-4 border-b border-[#1f2227]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate({ kind: 'projects' })}
            className="p-1 rounded hover:bg-[#1a1c22] text-neutral-400 hover:text-white transition-colors"
            title="Back to Projects"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-neutral-500 font-mono">Projects /</span>
          <h1 className="text-base font-semibold text-white tracking-tight truncate">
            {project.name.split(' (')[0]}
          </h1>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status + Progress */}
          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${statusColor}`}>
              {statusBadge}
            </span>
            <div className="flex items-center gap-2">
              <div className="w-24 sm:w-36 h-1.5 rounded-full bg-[#1a1c22] overflow-hidden">
                <div
                  className="h-full bg-[#6366f1] rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
              </div>
              <span className="text-xs font-mono text-neutral-400 font-medium">
                {progress}%
              </span>
            </div>
          </div>

          {/* Action Group */}
          <div className="flex items-center gap-2">
            {githubUrl && (
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs py-1 px-2.5 rounded-lg font-mono transition-all flex items-center gap-1.5 text-neutral-400 hover:text-white bg-[#16181d] border border-[#22252c] hover:border-neutral-600"
                title="View repository on GitHub"
              >
                <Github className="w-3.5 h-3.5" />
                <span>View on GitHub</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
              </a>
            )}

            <button
              type="button"
              onClick={() => {
                const nextState = !agentsPaused;
                setAgentStatus(nextState);
                toast[nextState ? 'info' : 'success'](
                  nextState ? 'Agents paused (agent_assignments -> paused)' : 'Agents resumed (agent_assignments -> working)'
                );
              }}
              className={`text-xs py-1 px-2.5 rounded-lg font-mono font-medium transition-all flex items-center gap-1.5 ${
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
        </div>
      </div>

      {/* 3 Compact Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Card 1: Status & Next Step */}
        <div className="p-3 rounded-xl bg-[#121316] border border-[#1f2227] space-y-1">
          <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-mono">
            Status & Next Step
          </span>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full shrink-0 ${agentsPaused ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            <span className="text-xs font-bold font-mono text-white truncate">
              {agentsPaused ? 'PAUSED' : statusBadge.toUpperCase()}
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 line-clamp-1 font-sans">
            {project.next_step || 'Awaiting next supervisor instruction'}
          </p>
        </div>

        {/* Card 2: Active Agents */}
        <div className="p-3 rounded-xl bg-[#121316] border border-[#1f2227] space-y-1">
          <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-mono">
            Active Agents
          </span>
          {activeAgentsList.length === 0 ? (
            <span className="text-xs text-neutral-500 font-mono italic block py-0.5">
              Waiting for Supervisor
            </span>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              {activeAgentsList.map((ag) => (
                <span
                  key={ag}
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-950/40 border border-indigo-500/30 text-indigo-300"
                >
                  {ag}
                </span>
              ))}
            </div>
          )}
          <span className="text-[10px] text-neutral-500 font-mono block">
            {agentsPaused ? 'Execution halted' : activeAgentsList.length === 0 ? 'No assigned executors' : 'Autonomous loop listening'}
          </span>
        </div>

        {/* Card 3: Last Update */}
        <div className="p-3 rounded-xl bg-[#121316] border border-[#1f2227] space-y-1">
          <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-mono">
            Last Update
          </span>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#818cf8]" />
            <span className="text-xs font-bold font-mono text-white">
              {project.updated_at ? formatRelative(project.updated_at) : 'Just now'}
            </span>
          </div>
          <span className="text-[10px] text-neutral-500 font-mono truncate block">
            Commit: {project.last_commit_hash || 'main-001'}
          </span>
        </div>
      </div>

      {/* Strategic Advisor Card */}
      <div className="p-3.5 rounded-xl border border-indigo-500/30 bg-[#121316] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white font-mono">
                  Advisor: {project.advisor_agent_name || 'CoordinatorAgent'}
                </span>
                <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                  {project.advisor_provider || 'Anthropic'}
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                  Read-Only Advisory
                </span>
              </div>
              <span className="text-[11px] text-neutral-400 font-sans block">
                Assigned strategic reviewer for architecture verification, invariant checks, and budget safety.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAdvisorPanelOpen((v) => !v)}
            className="text-xs py-1.5 px-3 rounded-lg font-mono font-medium transition-colors bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>{isAdvisorPanelOpen ? 'Close Advisor Dock' : 'Ask Advisor'}</span>
          </button>
        </div>

        {/* Advisor Preview: Last 2-3 Advisor Messages */}
        <div className="pt-2 border-t border-[#1f2227] font-mono text-xs">
          <span className="text-[10px] text-neutral-500 uppercase tracking-wider block mb-1.5">
            Recent Advisor Recommendations ({advisorRecentLogs.length})
          </span>
          {advisorRecentLogs.length === 0 ? (
            <p className="text-[11px] text-neutral-500 italic font-sans">
              No recommendations yet. Use "Ask Advisor" or the dock below to request architecture, invariant, or budget review.
            </p>
          ) : (
            <div className="space-y-1.5">
              {advisorRecentLogs.map((item) => (
                <div
                  key={item.id}
                  className="p-2 rounded-lg bg-[#0d0e11] border border-neutral-800 flex items-start justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="text-indigo-400 font-bold">{item.agent}</span>
                      <span className="text-neutral-500">{item.timestamp}</span>
                      <span className="px-1 py-0.2 rounded bg-neutral-800 text-[9px] uppercase text-neutral-400">
                        {item.actionType}
                      </span>
                    </div>
                    <p className="text-neutral-300 font-sans text-xs truncate">
                      {item.message}
                    </p>
                  </div>
                  {item.payload && (
                    <button
                      type="button"
                      onClick={() => handleCopyPayload(item.id, item.payload)}
                      className="text-[10px] text-neutral-400 hover:text-white shrink-0 p-1 rounded hover:bg-neutral-800"
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

        {/* Focused Advisor Dock / Form */}
        {isAdvisorPanelOpen && (
          <div className="pt-3 border-t border-[#1f2227] space-y-2">
            <div className="flex items-center justify-between text-[11px] text-neutral-400">
              <span className="font-mono text-indigo-300">
                Ask {project.advisor_agent_name || 'CoordinatorAgent'} for Strategic Guidance
              </span>
              <span className="text-[10px] text-neutral-500">Read-Only (No status mutation)</span>
            </div>
            <form onSubmit={handleAdvisorSubmit} className="space-y-2">
              <textarea
                rows={2}
                value={advisorPrompt}
                onChange={(e) => setAdvisorPrompt(e.target.value)}
                placeholder="Ask advisor for architecture recommendations, invariant review, or budget sanity checks..."
                className="w-full bg-[#0d0e11] border border-[#22252c] rounded-lg p-2.5 text-xs font-mono text-white placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500"
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-neutral-500 font-mono">
                  Logs to project_logs as action_type = 'advice'
                </span>
                <button
                  type="submit"
                  disabled={!advisorPrompt.trim()}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                >
                  <Send className="w-3 h-3" />
                  <span>Submit Recommendation</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Chronological Logs Section */}
      <div className="p-4 rounded-xl bg-[#121316] border border-[#1f2227] space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between pb-1">
          <span className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
            Execution Logs
          </span>
          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
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
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-[#181a20] text-neutral-400 hover:text-white border border-[#22252c]'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Chronological Log Rows */}
        <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
          {allLogs.length === 0 ? (
            <div className="p-4 rounded-lg bg-[#0d0e11] border border-[#1f2227] text-center text-neutral-500 text-xs font-mono">
              No activity yet. Dispatched instructions and supervisor events will stream here in real time.
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-4 rounded-lg bg-[#0d0e11] border border-[#1f2227] text-center text-neutral-500 text-xs font-mono">
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
                  className="rounded-lg border border-[#1f2227] bg-[#0d0e11] hover:border-neutral-700 transition-all overflow-hidden"
                >
                  <div
                    onClick={() => hasPayload && setExpandedLogId(isExpanded ? null : log.id)}
                    className={`p-2.5 flex items-center justify-between gap-3 text-xs ${hasPayload ? 'cursor-pointer' : ''}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[10px] text-neutral-500 shrink-0 tabular-nums font-mono">{log.timestamp}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#181a20] border border-neutral-700 text-indigo-300 font-bold shrink-0">
                        {log.agent}
                      </span>
                      <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-neutral-800 text-neutral-400 shrink-0">
                        {log.actionType}
                      </span>
                      <p className="text-neutral-300 font-sans text-xs truncate">{log.message}</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {hasPayload && (
                        <span className="text-[10px] text-indigo-400 flex items-center gap-1 font-mono">
                          <Code2 className="w-3 h-3" />
                          <span>{isExpanded ? 'Hide' : 'Expand'}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expandable Monospace Area (Markdown, Diff, or Formatted JSONB) */}
                  {isExpanded && log.payload && (
                    <div className="p-3 border-t border-[#1f2227] bg-black/50 space-y-2">
                      <div className="flex items-center justify-between text-[10px] text-neutral-400">
                        <span className="uppercase tracking-wider font-bold">
                          {rawDiff ? 'Diff View' : rawMarkdown ? 'Markdown Note' : 'Structured Payload (JSONB)'}:
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyPayload(log.id, log.payload);
                          }}
                          className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[10px] text-neutral-300 hover:text-white flex items-center gap-1 transition-colors"
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
                        <pre className="p-2.5 rounded bg-[#090a0d] border border-neutral-800 text-[11px] text-cyan-300 font-mono overflow-x-auto max-h-48 leading-relaxed whitespace-pre">
                          {rawDiff}
                        </pre>
                      ) : rawMarkdown ? (
                        <div className="p-2.5 rounded bg-[#090a0d] border border-neutral-800 text-[11px] text-neutral-200 font-sans overflow-x-auto max-h-48 leading-relaxed whitespace-pre-wrap">
                          {rawMarkdown}
                        </div>
                      ) : (
                        <pre className="p-2.5 rounded bg-[#090a0d] border border-neutral-800 text-[11px] text-emerald-300 font-mono overflow-x-auto max-h-48 leading-relaxed">
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

        {/* Compact Single-Line Prompt / Redirect Dock */}
        <form
          onSubmit={handleDockSubmit}
          className="pt-2 border-t border-[#1f2227] flex items-center gap-2"
        >
          {/* Target mode pill */}
          <div className="p-0.5 rounded-lg bg-[#0d0e11] border border-neutral-800 flex items-center text-[10px] shrink-0 font-mono">
            <button
              type="button"
              onClick={() => setDockMode('supervisor')}
              className={`px-2 py-1 rounded font-bold transition-all ${
                dockMode === 'supervisor'
                  ? 'bg-indigo-600 text-white'
                  : 'text-neutral-400 hover:text-white'
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
                  ? 'bg-indigo-600 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Send query to strategic Advisor"
            >
              Advisor
            </button>
          </div>

          <div className="relative flex-1">
            <Terminal className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={promptDockValue}
              onChange={(e) => setPromptDockValue(e.target.value)}
              placeholder={
                dockMode === 'advisor'
                  ? `Ask ${project.advisor_agent_name || 'Advisor'}: Review architecture, invariant assertions, or safety...`
                  : "Prompt / Redirect: send directive to project agents (e.g. Focus on settlement netting)..."
              }
              className="w-full bg-[#0d0e11] border border-[#22252c] rounded-lg pl-8.5 pr-3 py-2 text-xs font-mono text-white placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={!promptDockValue.trim()}
            className="px-3.5 py-2 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shrink-0 disabled:opacity-50 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{dockMode === 'advisor' ? 'Consult' : 'Send'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
