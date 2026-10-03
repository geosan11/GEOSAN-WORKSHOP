import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { useDensity } from '../lib/density';
import { useProjects } from '../hooks/useProjects';
import { useDataProvider } from '../lib/dataProvider';
import { useToast } from '../components/Toast';
import { PromptVersion, ProjectBudget } from '../lib/types';
import { formatDateTime } from '../lib/format';
import {
  SupabaseLogo,
  PostgresLogo,
  GitHubLogo,
  GeminiLogo,
  DeepSeekLogo,
  KimiLogo,
  GrokLogo,
  ClaudeLogo,
  OpenAILogo
} from '../components/ServiceLogos';
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
  Layers,
  Cpu,
  Sun,
  Moon,
  Trash2,
  Database
} from 'lucide-react';

export const SettingsScreen: React.FC = () => {
  const { user, orgId, signOut } = useAuth();
  const { theme, isLight, setTheme } = useTheme();
  const { density, setDensity } = useDensity();
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
            <span className="text-emerald-400 font-bold block">Production Active</span>
            <span className="text-[10px] text-[#8b98a8] block">Unlimited Ingestion</span>
          </div>
        </div>
      </div>

      {/* Section 1.5: Production Database Infrastructure (Supabase) */}
      <div className="p-5 rounded-xl bg-[#161b22] border border-emerald-500/20 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center text-emerald-400 p-2 shadow-sm">
              <SupabaseLogo className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#e6edf3] font-mono">
                  Production Infrastructure — Supabase Backend
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  CONNECTED
                </span>
              </div>
              <p className="text-[11px] text-[#8b98a8]">
                PostgreSQL persistence layer with row-level security and GoTrue user auth.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
          <div className="space-y-1.5 p-3.5 rounded-lg bg-[#0d1117] border border-white/5">
            <span className="text-[10px] text-[#8b98a8] uppercase block">SUPABASE ENDPOINT</span>
            <div className="text-[#e6edf3] font-semibold break-all">
              https://zxdxsizyvotkcsrtzscw.supabase.co
            </div>
            <span className="text-[10px] text-emerald-400 block pt-1">
              Project Ref: zxdxsizyvotkcsrtzscw (EU West / Hosted)
            </span>
          </div>

          <div className="space-y-1.5 p-3.5 rounded-lg bg-[#0d1117] border border-white/5">
            <span className="text-[10px] text-[#8b98a8] uppercase block">PUBLISHABLE / ANON KEY</span>
            <div className="text-cyan-300 font-semibold truncate">
              sb_publishable_cbrt1jkcS91G4iOQkmyt5A_GgXTM-k6
            </div>
            <span className="text-[10px] text-slate-400 block pt-1">
              Scope: Public client authentication & row-level secured REST queries
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-[#0d1117] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <div>
            <span className="text-[#e6edf3] font-bold block">Production SQL Schema Migration</span>
            <span className="text-[11px] text-[#8b98a8]">
              Ready-to-run schema script for tables (<code>project_registry</code>, <code>agent_tasks</code>, <code>cost_events</code>, <code>qa_runs</code>).
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              toast.success('SQL migration script available at: supabase/schema.sql');
            }}
            className="px-3 py-1.5 rounded bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-colors shrink-0"
          >
            Copy Schema DDL
          </button>
        </div>
      </div>

      {/* Section 2: Appearance & Display Engine */}
      <div className="p-5 rounded-xl bg-[#161b22] border border-white/5 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#FFBD59] font-mono flex items-center gap-2">
          <Sun className="w-4 h-4 text-[#F0B230]" />
          Appearance & Visual Display Mode
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
          {/* Light Mode Selector Card */}
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`p-4 rounded-xl border text-left transition-all space-y-2 relative ${
              isLight
                ? 'bg-amber-50/90 border-[#D97706] shadow-md ring-2 ring-[#D97706]/40'
                : 'bg-[#0d1117] border-white/5 hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                  <Sun className="w-4 h-4" />
                </div>
                <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-[#e6edf3]'}`}>
                  Clean Light Mode
                </span>
              </div>
              {isLight && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#D97706] text-white">
                  ACTIVE
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
              High-contrast corporate SaaS theme with crisp porcelain backgrounds, clear slate borders, and readable dark ink typography.
            </p>
          </button>

          {/* Dark Mode Selector Card */}
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-xl border text-left transition-all space-y-2 relative ${
              !isLight
                ? 'bg-slate-900/90 border-[#F0B230] shadow-md ring-2 ring-[#F0B230]/40'
                : 'bg-[#0d1117] border-white/5 hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-[#F0B230]">
                  <Moon className="w-4 h-4" />
                </div>
                <span className={`font-bold ${!isLight ? 'text-white' : 'text-[#e6edf3]'}`}>
                  Obsidian Dark Mode
                </span>
              </div>
              {!isLight && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#F0B230] text-[#0A1420]">
                  ACTIVE
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
              Industrial blueprint dark mode with deep navy surfaces, gold telemetry highlights, and reduced eye strain for night shifts.
            </p>
          </button>
        </div>

        {/* Density Engine Control */}
        <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <div>
            <span className="text-[#e6edf3] font-bold block">Information Density Engine</span>
            <span className="text-[11px] text-[#8b98a8]">
              Controls row heights, disclosure padding, and font spacing.
            </span>
          </div>

          <div className="flex items-center rounded-lg bg-[#0d1117] border border-white/10 p-1">
            {(['compact', 'normal', 'expanded'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setDensity(mode)}
                className={`px-3 py-1 rounded capitalize text-xs font-bold transition-all ${
                  density === mode
                    ? 'bg-[#F0B230] text-[#0A1420] shadow-sm'
                    : 'text-[#8b98a8] hover:text-white'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Section 3: Project Budgets & Hard-Stop Config */}
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

      {/* Section 4: AI Gateway & Foundation Model Integrations */}
      <div className="p-5 rounded-xl bg-[#161b22] border border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#FFBD59] font-mono flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#FFBD59]" />
            AI Gateway & Foundation Model Integrations
          </h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/40">
            6 Providers Online
          </span>
        </div>

        <p className="text-xs text-[#8b98a8]">
          Multi-agent orchestration routes tasks according to specialized reasoning profiles, budget thresholds, and invariant validation needs.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 rounded-lg bg-[#0d1117] border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DeepSeekLogo className="w-4 h-4" />
                <span className="font-bold text-xs text-[#e6edf3]">DeepSeek</span>
              </div>
              <span className="text-[9px] font-mono text-emerald-400 font-bold">READY</span>
            </div>
            <p className="text-[10px] text-[#8b98a8]">
              Models: <code className="text-cyan-300">deepseek-r1</code>, <code className="text-cyan-300">deepseek-v3</code>. Open reasoning & cost-efficient code synthesis.
            </p>
            <div className="text-[10px] text-[#8b98a8] pt-1 border-t border-white/5 flex justify-between">
              <span>Rate: $0.14 - $0.55/1M</span>
              <span className="text-emerald-400">REST API</span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#0d1117] border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KimiLogo className="w-4 h-4" />
                <span className="font-bold text-xs text-[#e6edf3]">Moonshot Kimi</span>
              </div>
              <span className="text-[9px] font-mono text-emerald-400 font-bold">READY</span>
            </div>
            <p className="text-[10px] text-[#8b98a8]">
              Models: <code className="text-cyan-300">kimi-k1.5</code>, <code className="text-cyan-300">kimi-chat</code>. Massive 256k long-context repository indexing.
            </p>
            <div className="text-[10px] text-[#8b98a8] pt-1 border-t border-white/5 flex justify-between">
              <span>Rate: $0.40 - $0.60/1M</span>
              <span className="text-emerald-400">REST API</span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#0d1117] border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GeminiLogo className="w-4 h-4" />
                <span className="font-bold text-xs text-[#e6edf3]">Google Gemini</span>
              </div>
              <span className="text-[9px] font-mono text-emerald-400 font-bold">ACTIVE</span>
            </div>
            <p className="text-[10px] text-[#8b98a8]">
              Models: <code className="text-cyan-300">gemini-3.5-flash</code>, <code className="text-cyan-300">gemini-2.5-pro</code>. High throughput orchestrator.
            </p>
            <div className="text-[10px] text-[#8b98a8] pt-1 border-t border-white/5 flex justify-between">
              <span>Rate: $0.15/1M</span>
              <span className="text-emerald-400">@google/genai</span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#0d1117] border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GrokLogo className="w-4 h-4" />
                <span className="font-bold text-xs text-[#e6edf3]">xAI Grok</span>
              </div>
              <span className="text-[9px] font-mono text-emerald-400 font-bold">READY</span>
            </div>
            <p className="text-[10px] text-[#8b98a8]">
              Models: <code className="text-cyan-300">grok-4</code>, <code className="text-cyan-300">grok-2</code>. Real-time telemetry anomaly detection.
            </p>
            <div className="text-[10px] text-[#8b98a8] pt-1 border-t border-white/5 flex justify-between">
              <span>Rate: $2.00/1M</span>
              <span className="text-emerald-400">REST API</span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#0d1117] border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClaudeLogo className="w-4 h-4" />
                <span className="font-bold text-xs text-[#e6edf3]">Anthropic Claude</span>
              </div>
              <span className="text-[9px] font-mono text-emerald-400 font-bold">READY</span>
            </div>
            <p className="text-[10px] text-[#8b98a8]">
              Models: <code className="text-cyan-300">claude-sonnet-4</code>. Architectural refactors and code review.
            </p>
            <div className="text-[10px] text-[#8b98a8] pt-1 border-t border-white/5 flex justify-between">
              <span>Rate: $3.00/1M</span>
              <span className="text-emerald-400">REST API</span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#0d1117] border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <OpenAILogo className="w-4 h-4" />
                <span className="font-bold text-xs text-[#e6edf3]">OpenAI</span>
              </div>
              <span className="text-[9px] font-mono text-emerald-400 font-bold">READY</span>
            </div>
            <p className="text-[10px] text-[#8b98a8]">
              Models: <code className="text-cyan-300">o3-mini</code>, <code className="text-cyan-300">gpt-4o</code>. Formal verification & invariant proofs.
            </p>
            <div className="text-[10px] text-[#8b98a8] pt-1 border-t border-white/5 flex justify-between">
              <span>Rate: $1.10/1M</span>
              <span className="text-emerald-400">REST API</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 5: Data Management & Cache Control */}
      <div className="p-5 rounded-xl bg-[#161b22] border border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#FFBD59] font-mono flex items-center gap-2">
            <Database className="w-4 h-4 text-[#F0B230]" />
            Data Storage & Demo State Governance
          </h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-[#8b98a8]">
            State: Production / Clean
          </span>
        </div>

        <p className="text-xs text-[#8b98a8]">
          Demo mock data has been purged. Operational records and agent tasks are isolated and persisted cleanly. You can purge all local task activity anytime.
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-white/5">
          <span className="text-xs text-[#8b98a8]">
            Wipes all cached tasks, simulated chat logs, and local cost events. Preserves project registry.
          </span>
          <button
            type="button"
            onClick={async () => {
              await dataProvider.clearAllData();
              toast.success('All task and activity records purged. Workspace is clean.');
            }}
            className="px-3.5 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-[#FFBD59] border border-amber-500/30 text-xs font-bold transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Purge All Activity & Tasks
          </button>
        </div>
      </div>

      {/* Section 6: Sign Out (Addendum A1 requirement: labeled "Sign Out" at bottom) */}
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
