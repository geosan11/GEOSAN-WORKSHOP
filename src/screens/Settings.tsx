import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { useProjects } from '../hooks/useProjects';
import { useDataProvider } from '../lib/dataProvider';
import { useToast } from '../components/Toast';
import { PromptVersion, ProjectBudget } from '../lib/types';
import { formatDateTime } from '../lib/format';
import {
  Settings as SettingsIcon,
  ShieldCheck,
  DollarSign,
  Bell,
  Code2,
  LogOut,
  Save,
  Lock,
  Unlock,
  CheckCircle2,
  Layers
} from 'lucide-react';

export const SettingsScreen: React.FC = () => {
  const { user, orgId, signOut } = useAuth();
  const { projects } = useProjects();
  const dataProvider = useDataProvider();
  const toast = useToast();

  const [budgets, setBudgets] = useState<ProjectBudget[]>([]);
  const [promptVersions, setPromptVersions] = useState<PromptVersion[]>([]);
  const [savingBudgets, setSavingBudgets] = useState(false);

  useEffect(() => {
    Promise.all([dataProvider.getProjectBudgets(), dataProvider.getPromptVersions()]).then(
      ([b, pv]) => {
        setBudgets(b);
        setPromptVersions(pv);
      }
    );
  }, [dataProvider]);

  const handleUpdateBudgetField = (
    projectId: string,
    field: 'limit' | 'alert' | 'hardStop',
    value: number | boolean
  ) => {
    setBudgets((prev) => {
      const idx = prev.findIndex((b) => b.project_id === projectId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          monthly_limit_usd: field === 'limit' ? (value as number) : next[idx].monthly_limit_usd,
          alert_threshold_pct: field === 'alert' ? (value as number) : next[idx].alert_threshold_pct,
          hard_stop: field === 'hardStop' ? (value as boolean) : next[idx].hard_stop
        };
        return next;
      }
      return prev;
    });
  };

  const handleSaveBudgets = async () => {
    try {
      setSavingBudgets(true);
      for (const b of budgets) {
        await dataProvider.updateBudget(
          b.project_id,
          b.monthly_limit_usd,
          b.alert_threshold_pct,
          b.hard_stop
        );
      }
      toast.success('Budget thresholds updated');
    } catch {
      toast.error('Failed to update budgets');
    } finally {
      setSavingBudgets(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="pb-4 border-b border-white/5 space-y-1">
        <div className="flex items-center gap-2 text-xs font-mono text-[#8b98a8]">
          <SettingsIcon className="w-3.5 h-3.5 text-[#F0B230]" />
          <span>Platform Governance</span>
          <span>·</span>
          <span className="text-[#FFBD59]">Multi-Tenant Settings</span>
        </div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#e6edf3]">
          Command Center Settings
        </h1>
      </div>

      {/* Section 1: Organization & Identity */}
      <div className="p-5 rounded-xl bg-[#161b22] border border-white/5 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#FFBD59] font-mono flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#F0B230]" />
          Organization & Staff Operator Identity
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
          <div className="p-3 rounded-lg bg-[#0d1117] border border-white/5">
            <span className="text-[#8b98a8] text-[10px] block uppercase">ORGANIZATION</span>
            <span className="text-[#e6edf3] font-bold">EHI Global Enterprise</span>
            <span className="text-[10px] text-[#8b98a8] block truncate">{orgId}</span>
          </div>

          <div className="p-3 rounded-lg bg-[#0d1117] border border-white/5">
            <span className="text-[#8b98a8] text-[10px] block uppercase">OPERATOR SESSION</span>
            <span className="text-[#e6edf3] font-bold truncate block">{user?.email || 'operator@ehi.internal'}</span>
            <span className="text-[10px] text-emerald-400 block font-semibold">
              Role: {user?.user_metadata?.org_role || 'owner'}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-[#0d1117] border border-white/5">
            <span className="text-[#8b98a8] text-[10px] block uppercase">ENTERPRISE TIER</span>
            <span className="text-[#FFBD59] font-bold block">EHI Enterprise Staff</span>
            <span className="text-[10px] text-[#8b98a8] block">Unlimited ADK Agents</span>
          </div>
        </div>
      </div>

      {/* Section 2: Project Budgets & Hard-Stop Config */}
      <div className="p-5 rounded-xl bg-[#161b22] border border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#FFBD59] font-mono flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            Project Spend Caps & Budget Guardrails
          </h2>

          <button
            onClick={handleSaveBudgets}
            disabled={savingBudgets}
            className="px-3.5 py-1.5 rounded-lg bg-[#F0B230] text-[#0A1420] text-xs font-bold hover:bg-[#FFBD59] transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {savingBudgets ? 'Saving…' : 'Save Budgets'}
          </button>
        </div>

        <div className="space-y-3 font-mono text-xs">
          {projects.map((proj) => {
            const b = budgets.find((item) => item.project_id === proj.id) || {
              project_id: proj.id,
              monthly_limit_usd: proj.monthly_budget_usd || 1000,
              alert_threshold_pct: 80,
              hard_stop: true
            };

            return (
              <div
                key={proj.id}
                className="p-4 rounded-lg bg-[#0d1117] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <span className="font-bold text-[#e6edf3] block text-sm">{proj.name}</span>
                  <span className="text-[10px] text-[#8b98a8]">{proj.vertical} ({proj.id})</span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <div>
                    <label className="text-[10px] text-[#8b98a8] block uppercase">LIMIT ($/MO)</label>
                    <input
                      type="number"
                      value={b.monthly_limit_usd}
                      onChange={(e) =>
                        handleUpdateBudgetField(proj.id, 'limit', Number(e.target.value))
                      }
                      className="w-24 bg-[#161b22] border border-white/10 rounded px-2 py-1 text-xs text-[#e6edf3]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-[#8b98a8] block uppercase">ALERT %</label>
                    <input
                      type="number"
                      value={b.alert_threshold_pct}
                      onChange={(e) =>
                        handleUpdateBudgetField(proj.id, 'alert', Number(e.target.value))
                      }
                      className="w-16 bg-[#161b22] border border-white/10 rounded px-2 py-1 text-xs text-[#e6edf3]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-[#8b98a8] block uppercase">HARD STOP</label>
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateBudgetField(proj.id, 'hardStop', !b.hard_stop)
                      }
                      className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors flex items-center gap-1 ${
                        b.hard_stop
                          ? 'bg-rose-950/40 text-rose-300 border-rose-500/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {b.hard_stop ? (
                        <>
                          <Lock className="w-3 h-3" /> ON
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3 h-3" /> OFF
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 3: Active Prompt Versions (Governance) */}
      <div className="p-5 rounded-xl bg-[#161b22] border border-white/5 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#FFBD59] font-mono flex items-center gap-2">
          <Code2 className="w-4 h-4 text-[#0873B7]" />
          Active Agent Prompt Versions (System Invariants)
        </h2>

        <div className="space-y-3 font-mono text-xs">
          {promptVersions.map((pv) => (
            <div key={pv.id} className="p-3.5 rounded-lg bg-[#0d1117] border border-white/5 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#e6edf3]">{pv.role}</span>
                  <span className="text-[10px] px-2 py-0.2 rounded bg-cyan-950/40 text-cyan-300 border border-cyan-500/30">
                    v{pv.version}
                  </span>
                </div>
                <span className="text-[10px] text-[#8b98a8]">
                  Active since {formatDateTime(pv.created_at)}
                </span>
              </div>
              <p className="text-[11px] text-[#8b98a8] leading-relaxed font-sans">
                {pv.system_instruction}
              </p>
              <div className="text-[10px] text-emerald-400 pt-1">
                Changelog: {pv.changelog}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 4: Sign Out (Addendum A1 requirement: labeled "Sign Out" at bottom) */}
      <div className="pt-4 border-t border-white/5 flex items-center justify-between">
        <span className="text-xs text-[#8b98a8]">
          Terminates operator session token and clears cache.
        </span>

        <button
          onClick={signOut}
          className="px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-xs transition-colors flex items-center gap-2"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>
    </div>
  );
};
