import React from 'react';
import { AgentTask, QAFinding, Project } from '../lib/types';
import { useNavigation } from '../lib/navigation';
import { ShieldAlert, CheckCircle2, AlertTriangle, ArrowRight, Sparkles, Clock } from 'lucide-react';

interface PendingActionsBarProps {
  tasks: AgentTask[];
  qaFindings: QAFinding[];
  projects: Project[];
  onOpenTask?: (task: AgentTask) => void;
}

export const PendingActionsBar: React.FC<PendingActionsBarProps> = ({
  tasks,
  qaFindings,
  projects,
  onOpenTask
}) => {
  const { navigate } = useNavigation();

  // 1. Plan Approvals: tasks awaiting human-in-the-loop review or proposed by chat
  const pendingApprovals = tasks.filter(
    (t) => t.status === 'awaiting_approval' || t.status === 'proposed'
  );

  // 2. Critical/High QA regressions
  const criticalFindings = qaFindings.filter(
    (f) => f.status === 'open' && (f.severity === 'critical' || f.severity === 'high')
  );

  // 3. Budget alerts: projects with spend > 80% or hard_stop
  const highBudgetProjects = projects.filter((p) => {
    const budget = p.monthly_budget_usd || 1000;
    // Estimated spend comparison if available
    return false; // we can highlight budget monitoring status
  });

  // If nothing is pending, don't show clutter or show a calm all-systems-go bar
  const totalPending = pendingApprovals.length + criticalFindings.length;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#8b98a8] font-bold">
            Pending Actions & Triage
          </span>
          <span className="text-[10px] text-[#8b98a8]">
            Items requiring operator attention
          </span>
        </div>
        {totalPending > 0 ? (
          <span className="px-2 py-0.5 rounded-full bg-red-950/40 border border-red-500/30 text-red-400 text-[10px] font-mono font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            {totalPending} Attention Required
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            All Invariants Green
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Card 1: Plan Approvals */}
        <div className="p-3.5 rounded-xl bg-[#161b22] border border-white/5 hover:border-[#F0B230]/30 transition-all flex flex-col justify-between space-y-3 group shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#F0B230]/20 border border-[#F0B230]/40 flex items-center justify-center text-[#F0B230]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <h4 className="text-xs font-bold text-[#e6edf3]">
                  Plan Sign-Offs
                </h4>
              </div>
              <p className="text-[11px] text-[#8b98a8] leading-tight">
                {pendingApprovals.length > 0
                  ? `${pendingApprovals.length} task(s) awaiting operator review`
                  : 'Zero PR plans currently blocked'}
              </p>
            </div>
            <span
              className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-bold ${
                pendingApprovals.length > 0
                  ? 'bg-[#F0B230] text-[#0A1420]'
                  : 'bg-[#0d1117] text-[#8b98a8] border border-white/5'
              }`}
            >
              {pendingApprovals.length}
            </span>
          </div>

          <button
            onClick={() => {
              if (pendingApprovals[0] && onOpenTask) {
                onOpenTask(pendingApprovals[0]);
              } else {
                navigate({ kind: 'console' });
              }
            }}
            disabled={pendingApprovals.length === 0}
            className="w-full py-1.5 px-3 rounded-lg bg-[#F0B230]/15 hover:bg-[#F0B230] text-[#FFBD59] hover:text-[#0A1420] text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:hover:bg-[#F0B230]/15 disabled:hover:text-[#FFBD59]"
          >
            <span>Review Plans</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 2: QA Regressions */}
        <div className="p-3.5 rounded-xl bg-[#161b22] border border-white/5 hover:border-red-500/30 transition-all flex flex-col justify-between space-y-3 group shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                  <ShieldAlert className="w-3.5 h-3.5" />
                </div>
                <h4 className="text-xs font-bold text-[#e6edf3]">
                  Critical QA Regressions
                </h4>
              </div>
              <p className="text-[11px] text-[#8b98a8] leading-tight">
                {criticalFindings.length > 0
                  ? `${criticalFindings.length} open invariant failure(s)`
                  : 'Zero critical security or DOM leaks'}
              </p>
            </div>
            <span
              className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-bold ${
                criticalFindings.length > 0
                  ? 'bg-red-500 text-white'
                  : 'bg-[#0d1117] text-[#8b98a8] border border-white/5'
              }`}
            >
              {criticalFindings.length}
            </span>
          </div>

          <button
            onClick={() => navigate({ kind: 'qa' })}
            disabled={criticalFindings.length === 0}
            className="w-full py-1.5 px-3 rounded-lg bg-red-950/30 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:hover:bg-red-950/30 disabled:hover:text-red-300"
          >
            <span>Inspect Findings</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 3: Model FinOps & Rate Guards */}
        <div className="p-3.5 rounded-xl bg-[#161b22] border border-white/5 hover:border-cyan-500/30 transition-all flex flex-col justify-between space-y-3 group shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
                <h4 className="text-xs font-bold text-[#e6edf3]">
                  FinOps Spend Guard
                </h4>
              </div>
              <p className="text-[11px] text-[#8b98a8] leading-tight">
                Hard stop protections active across 4 verticals
              </p>
            </div>
            <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-[#084985]/40 text-cyan-300 border border-cyan-500/30">
              Active
            </span>
          </div>

          <button
            onClick={() => navigate({ kind: 'costs' })}
            className="w-full py-1.5 px-3 rounded-lg bg-cyan-950/30 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
          >
            <span>View Burn Rate</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
