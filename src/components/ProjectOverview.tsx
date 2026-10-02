import React, { useState } from 'react';
import { Project, AgentTask, CostEvent, QARun } from '../lib/types';
import { formatCost, formatTokens } from '../lib/format';
import { ProjectTab } from '../lib/navigation';
import {
  Users,
  Cpu,
  CheckCircle2,
  Activity,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  ShieldCheck,
  Copy,
  Check,
  Terminal,
  Zap,
  Clock,
  Sparkles
} from 'lucide-react';

interface ProjectOverviewProps {
  project: Project;
  tasks: AgentTask[];
  costEvents: CostEvent[];
  qaRuns: QARun[];
  onNavigateToTab?: (tab: ProjectTab) => void;
  onDispatchTask?: () => void;
}

export const ProjectOverview: React.FC<ProjectOverviewProps> = ({
  project,
  tasks,
  costEvents,
  qaRuns,
  onNavigateToTab,
  onDispatchTask
}) => {
  const [copiedInstructions, setCopiedInstructions] = useState(false);

  // 1. Total Agents metric
  const projectAgentSet = new Set<string>();
  tasks.forEach((t) => {
    if (t.assigned_agent) projectAgentSet.add(t.assigned_agent);
  });
  // Default agents if none assigned yet
  if (projectAgentSet.size === 0) {
    projectAgentSet.add('CoordinatorAgent');
    projectAgentSet.add('CodingAgent');
    projectAgentSet.add('ReviewAgent');
    projectAgentSet.add('QAAgent');
  }
  const totalAgentsCount = projectAgentSet.size;
  const activeRunningTasksCount = tasks.filter((t) => t.status === 'running').length;

  // 2. Active Tokens metric
  const projectCostEvents = costEvents.filter((c) => c.project_id === project.id);
  const totalActiveTokens = projectCostEvents.reduce(
    (sum, c) => sum + (c.tokens_input || 0) + (c.tokens_output || 0),
    0
  );
  const totalInputTokens = projectCostEvents.reduce((sum, c) => sum + (c.tokens_input || 0), 0);
  const totalOutputTokens = projectCostEvents.reduce((sum, c) => sum + (c.tokens_output || 0), 0);

  // 3. Task Completion Rate metric
  const completedTasksCount = tasks.filter((t) => t.status === 'done').length;
  const totalTasksCount = tasks.length;
  const completionRatePct =
    totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 100;

  // 4. Monthly spend vs Budget
  const monthlySpendUsd = projectCostEvents.reduce((sum, c) => sum + c.cost_usd, 0);
  const budgetUsd = project.monthly_budget_usd || 1000;
  const budgetUsedPct = Math.min(100, Math.round((monthlySpendUsd / budgetUsd) * 100));

  // Health dot configuration
  const getHealthMeta = () => {
    switch (project.health_status) {
      case 'healthy':
        return { label: 'Operational', color: 'text-emerald-400', bg: 'bg-emerald-400', ping: 'bg-emerald-400' };
      case 'degraded':
        return { label: 'Degraded', color: 'text-amber-400', bg: 'bg-amber-400', ping: 'bg-amber-400' };
      case 'down':
        return { label: 'Outage', color: 'text-red-400', bg: 'bg-red-400', ping: 'bg-red-400' };
      default:
        return { label: 'Healthy', color: 'text-emerald-400', bg: 'bg-emerald-400', ping: 'bg-emerald-400' };
    }
  };

  const healthMeta = getHealthMeta();

  const handleCopyInstructions = async () => {
    if (!project.agent_instructions) return;
    try {
      await navigator.clipboard.writeText(project.agent_instructions);
      setCopiedInstructions(true);
      setTimeout(() => setCopiedInstructions(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="space-y-6">
      {/* ── TOP SHELF 4-COLUMN METRIC CARDS (The 3-Second Rule) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Agents */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#161b22] border border-white/5 shadow-lg relative overflow-hidden group hover:border-[#F0B230]/30 transition-all">
          <div className="flex items-center justify-between text-[#8b98a8] mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider">TOTAL AGENTS</span>
            <Users className="w-4 h-4 text-[#F0B230]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-[#e6edf3] tabular-nums">
              {totalAgentsCount}
            </span>
            <span className="text-xs font-mono text-[#8b98a8]">specialists</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono text-[#8b98a8] pt-2 border-t border-white/5">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F0B230] animate-pulse" />
              <span className="text-[#FFBD59] font-medium">{activeRunningTasksCount} active</span>
            </span>
            {onNavigateToTab && (
              <button
                type="button"
                onClick={() => onNavigateToTab('tasks')}
                className="hover:text-white flex items-center gap-0.5 text-[#8b98a8] hover:underline"
              >
                View tasks
                <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Card 2: Active Tokens */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#161b22] border border-white/5 shadow-lg relative overflow-hidden group hover:border-cyan-500/30 transition-all">
          <div className="flex items-center justify-between text-[#8b98a8] mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider">ACTIVE TOKENS</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-cyan-300 tabular-nums">
              {formatTokens(totalActiveTokens)}
            </span>
            <span className="text-xs font-mono text-[#8b98a8]">burn</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono text-[#8b98a8] pt-2 border-t border-white/5">
            <span title={`Input: ${formatTokens(totalInputTokens)} / Output: ${formatTokens(totalOutputTokens)}`}>
              {formatTokens(totalInputTokens)} in · {formatTokens(totalOutputTokens)} out
            </span>
            {onNavigateToTab && (
              <button
                type="button"
                onClick={() => onNavigateToTab('costs')}
                className="hover:text-white flex items-center gap-0.5 text-cyan-400 hover:underline"
              >
                Cost Center
                <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Card 3: Task Completion Rate */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#161b22] border border-white/5 shadow-lg relative overflow-hidden group hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between text-[#8b98a8] mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider">TASK COMPLETION RATE</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400 tabular-nums">
              {completionRatePct}%
            </span>
            <span className="text-xs font-mono text-[#8b98a8]">
              ({completedTasksCount}/{totalTasksCount})
            </span>
          </div>
          {/* Progress Bar */}
          <div className="mt-2.5 pt-2 border-t border-white/5 space-y-1">
            <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${completionRatePct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 4: Health & Spend Gauge */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#161b22] border border-white/5 shadow-lg relative overflow-hidden group hover:border-[#FFBD59]/30 transition-all">
          <div className="flex items-center justify-between text-[#8b98a8] mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider">UPTIME & SPEND</span>
            <Activity className="w-4 h-4 text-[#FFBD59]" />
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-[#FFBD59] tabular-nums">
                {formatCost(monthlySpendUsd)}
              </span>
              <span className="text-[10px] font-mono text-[#8b98a8]">
                / {formatCost(budgetUsd)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${healthMeta.ping}`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${healthMeta.bg}`} />
              </span>
              <span className={`text-[11px] font-mono font-bold ${healthMeta.color}`}>
                {project.uptime_pct || 99.9}%
              </span>
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-white/5 space-y-1">
            <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  budgetUsedPct > 90 ? 'bg-red-500' : budgetUsedPct > 75 ? 'bg-amber-400' : 'bg-[#F0B230]'
                }`}
                style={{ width: `${budgetUsedPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── AGENT ROSTER & WORKTREE TELEMETRY ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Active Specialist Fleet */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-[#161b22] border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#F0B230]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#e6edf3] font-mono">
                Assigned Specialist Fleet
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[#8b98a8]">
              {Array.from(projectAgentSet).length} agents online
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-mono text-xs">
            {Array.from(projectAgentSet).map((agentName) => {
              const agentTasks = tasks.filter((t) => t.assigned_agent === agentName);
              const isRunning = agentTasks.some((t) => t.status === 'running');
              return (
                <div
                  key={agentName}
                  className="p-3 rounded-lg bg-[#0d1117] border border-white/5 flex items-center justify-between hover:border-white/10 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-[#8b98a8]'
                      }`}
                    />
                    <div className="min-w-0">
                      <span className="text-[#e6edf3] font-bold block truncate">{agentName}</span>
                      <span className="text-[10px] text-[#8b98a8] block truncate">
                        {agentTasks.length} task{agentTasks.length === 1 ? '' : 's'} assigned
                      </span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${
                      isRunning
                        ? 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-400'
                        : 'bg-white/5 text-[#8b98a8]'
                    }`}
                  >
                    {isRunning ? 'EXEC' : 'IDLE'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* QA Health & Vulnerability Scan Card */}
        <div className="p-5 rounded-xl bg-[#161b22] border border-white/5 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#e6edf3] font-mono">
                  Autonomous QA Guard
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                {qaRuns.length} runs executed
              </span>
            </div>
            <p className="text-xs text-[#8b98a8] leading-relaxed">
              Continuous regression fuzzing, OWASP automated audit, and API contract invariants for{' '}
              <span className="text-[#e6edf3] font-semibold">{project.name}</span>.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-[#0d1117] border border-white/5 flex items-center justify-between font-mono text-xs">
            <span className="text-[#8b98a8]">Open Issues</span>
            <span
              className={`font-bold ${
                qaRuns.reduce((sum, r) => sum + r.findings_count, 0) > 0
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {qaRuns.reduce((sum, r) => sum + r.findings_count, 0)} detected
            </span>
          </div>

          {onNavigateToTab && (
            <button
              type="button"
              onClick={() => onNavigateToTab('qa')}
              className="w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono font-bold text-[#e6edf3] border border-white/5 hover:border-white/10 transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Inspect QA Workbench</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#F0B230]" />
            </button>
          )}
        </div>
      </div>

      {/* ── AGENT INSTRUCTIONS (CODING STANDARDS & POLICY) ── */}
      <div className="p-5 rounded-xl bg-[#161b22] border border-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#F0B230]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#FFBD59] font-mono">
              Agent System Instructions & Invariants
            </h3>
          </div>
          {project.agent_instructions && (
            <button
              type="button"
              onClick={handleCopyInstructions}
              className="px-2.5 py-1 rounded bg-[#0d1117] hover:bg-white/10 border border-white/10 text-[11px] font-mono text-[#8b98a8] hover:text-[#e6edf3] flex items-center gap-1 transition-colors"
              title="Copy policy to clipboard"
            >
              {copiedInstructions ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Policy</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="text-xs font-mono text-[#e6edf3] bg-[#0d1117] p-3.5 rounded-lg border border-white/5 whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto">
          {project.agent_instructions ||
            'No specialized policy registered. Inheriting global Geosan Zero-Drift Engineering standards.'}
        </div>
      </div>
    </div>
  );
};
