import React, { useState } from 'react';
import { CostEvent, ProjectRegistry, ModelPricing, ProjectBudget } from '../types';
import { INITIAL_MODEL_PRICING, INITIAL_PROJECT_BUDGETS } from '../data/initialData';
import {
  DollarSign,
  TrendingUp,
  Cpu,
  Layers,
  Filter,
  PieChart,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Clock,
  AlertTriangle,
  Lock,
  Unlock,
  CheckCircle2
} from 'lucide-react';

interface CostIntelligenceProps {
  events: CostEvent[];
  projects: ProjectRegistry[];
  budgets?: ProjectBudget[];
  onToggleHardStop?: (budgetId: string) => void;
}

export const CostIntelligence: React.FC<CostIntelligenceProps> = ({
  events,
  projects,
  budgets = INITIAL_PROJECT_BUDGETS,
  onToggleHardStop
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedAttribution, setSelectedAttribution] = useState<string>('all');
  const [localBudgets, setLocalBudgets] = useState<ProjectBudget[]>(budgets);

  const handleToggleHardStop = (id: string) => {
    setLocalBudgets((prev) =>
      prev.map((b) => (b.id === id ? { ...b, hard_stop: !b.hard_stop } : b))
    );
    if (onToggleHardStop) {
      onToggleHardStop(id);
    }
  };

  const projectMap = new Map(projects.map((p) => [p.id, p]));

  const filteredEvents = events.filter((e) => {
    if (selectedProjectId !== 'all' && e.project_id !== selectedProjectId) return false;
    if (selectedAttribution !== 'all' && e.attributed_to !== selectedAttribution) return false;
    return true;
  });

  const totalCost = filteredEvents.reduce((acc, e) => acc + e.cost_usd, 0);
  const totalTokens = filteredEvents.reduce(
    (acc, e) => acc + e.tokens_input + e.tokens_output,
    0
  );

  // Group by Feature / Task
  const featureBreakdown = filteredEvents.reduce<
    Record<
      string,
      {
        feature_name: string;
        project_id: string;
        attributed_to: string;
        total_cost: number;
        total_tokens: number;
        models: Set<string>;
        calls_count: number;
      }
    >
  >((acc, ev) => {
    const key = ev.feature_name || 'General Agent Inference';
    if (!acc[key]) {
      acc[key] = {
        feature_name: key,
        project_id: ev.project_id,
        attributed_to: ev.attributed_to,
        total_cost: 0,
        total_tokens: 0,
        models: new Set(),
        calls_count: 0
      };
    }
    acc[key].total_cost += ev.cost_usd;
    acc[key].total_tokens += ev.tokens_input + ev.tokens_output;
    acc[key].models.add(ev.model);
    acc[key].calls_count += 1;
    return acc;
  }, {});

  // Group by Model
  const modelBreakdown = filteredEvents.reduce<Record<string, number>>((acc, ev) => {
    acc[ev.model] = (acc[ev.model] || 0) + ev.cost_usd;
    return acc;
  }, {});

  // Group by Provider (Artifact 6: spendByProvider)
  const providerBreakdown = filteredEvents.reduce<Record<string, { cost: number; tokens: number; calls: number }>>(
    (acc, ev) => {
      if (!acc[ev.provider]) {
        acc[ev.provider] = { cost: 0, tokens: 0, calls: 0 };
      }
      acc[ev.provider].cost += ev.cost_usd;
      acc[ev.provider].tokens += ev.tokens_input + ev.tokens_output;
      acc[ev.provider].calls += 1;
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-8">
      {/* Header & Justification Callout */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mb-1">
            <span>Phase 5 Architecture</span>
            <span aria-hidden="true">·</span>
            <span className="text-cyan-400">Single Source of Truth: cost_events</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Cost Intelligence & Spend Attribution
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl mt-1">
            Every LLM inference is metered before and after execution. Drill down into exact feature cost attribution, token burns, and provider unit pricing.
          </p>
        </div>

        {/* Global KPI Anchors */}
        <div className="flex items-center gap-6 font-mono text-sm">
          <div>
            <span className="block text-xs uppercase text-slate-500 font-sans">Filtered Spend</span>
            <span className="text-xl font-bold text-cyan-400 tabular-nums">
              ${totalCost.toFixed(4)}
            </span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="block text-xs uppercase text-slate-500 font-sans">Tokens Ingested</span>
            <span className="text-xl font-bold text-white tabular-nums">
              {totalTokens.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={selectedAttribution}
            onChange={(e) => setSelectedAttribution(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Attribution Types</option>
            <option value="feature">Features (BUILD_FEATURE)</option>
            <option value="bug">Bug Fixes (FIX_BUG)</option>
            <option value="qa">Autonomous QA</option>
            <option value="report">Reports & Audits</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          Showing {filteredEvents.length} metered inference event{filteredEvents.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Feature Attribution Highlight ("How much did the debt clearance feature cost?") */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            Granular Feature & Task Spend Attribution
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            Directly answers: "How much did feature X cost?"
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.values(featureBreakdown).map((feat, idx) => {
            const proj = projectMap.get(feat.project_id);
            return (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-mono">
                    <span className="text-cyan-400 uppercase font-semibold">
                      {feat.attributed_to}
                    </span>
                    <span>{proj ? proj.name.split(' ')[0] : 'Project'}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-white leading-snug">
                    {feat.feature_name}
                  </h3>
                  <div className="mt-2 text-xs text-slate-400 font-mono">
                    Models: {Array.from(feat.models).join(', ')}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500">
                    {feat.total_tokens.toLocaleString()} tok ({feat.calls_count} calls)
                  </span>
                  <span className="text-base font-bold text-emerald-400 tabular-nums">
                    ${feat.total_cost.toFixed(4)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Project Budgets & Hard-Stop Guardrails (Migration 006: project_budgets + project_month_spend RPC) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Project Budgets & Hard-Stop Guardrails (Migration 006)
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            project_month_spend() RPC Enforcement
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {localBudgets.map((budget) => {
            const proj = projectMap.get(budget.project_id);
            const spend = budget.current_spend_usd ?? 0;
            const limit = budget.monthly_limit_usd;
            const pct = Math.min(100, Math.round((spend / limit) * 100));
            const isNearLimit = pct >= budget.alert_threshold_pct;
            const isExceeded = spend >= limit;

            return (
              <div
                key={budget.id}
                className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-white truncate max-w-[140px]">
                      {proj?.name || budget.project_id}
                    </span>
                    <button
                      onClick={() => handleToggleHardStop(budget.id)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 border transition-colors ${
                        budget.hard_stop
                          ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                      title="When hard-stop is enabled, tasks are suspended if spend exceeds monthly limit"
                    >
                      {budget.hard_stop ? (
                        <>
                          <Lock className="w-2.5 h-2.5" /> Hard Stop ON
                        </>
                      ) : (
                        <>
                          <Unlock className="w-2.5 h-2.5" /> Soft Limit
                        </>
                      )}
                    </button>
                  </div>

                  <div className="mt-3 flex items-baseline justify-between text-xs font-mono">
                    <span className="text-slate-400">Current Spend:</span>
                    <span className={`font-bold tabular-nums ${isExceeded ? 'text-rose-400' : isNearLimit ? 'text-amber-400' : 'text-emerald-400'}`}>
                      ${spend.toFixed(2)} / ${limit.toFixed(2)}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-2 w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isExceeded ? 'bg-rose-500' : isNearLimit ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>{pct}% of limit</span>
                  <span>Alert: {budget.alert_threshold_pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Spend Distribution by Foundation Provider (Artifact 6: spendByProvider) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <PieChart className="w-4 h-4 text-cyan-400" />
            Spend Distribution by Foundation Provider (spendByProvider Query)
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            Multi-Provider Routing: Google · Anthropic · OpenAI · xAI
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
          {Object.entries(providerBreakdown).map(([provider, stat]) => {
            const pctOfTotal = totalCost > 0 ? Math.round((stat.cost / totalCost) * 100) : 0;
            return (
              <div key={provider} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold uppercase text-white tracking-wide">{provider}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      {stat.calls} calls
                    </span>
                  </div>
                  <div className="text-xl font-bold text-emerald-400 tabular-nums">
                    ${stat.cost.toFixed(4)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {stat.tokens.toLocaleString()} tokens
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Share of spend</span>
                  <span className="font-bold text-cyan-300">{pctOfTotal}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Model Pricing Matrix (Reasoning 2: Provider Pricing Tables) */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Cpu className="w-4 h-4 text-purple-400" />
          Multi-Provider Pricing Matrix & Model Routing Limits
        </h2>
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400">
              <tr>
                <th className="py-3 px-4">Provider & Model</th>
                <th className="py-3 px-4">Input / 1M Tokens</th>
                <th className="py-3 px-4">Output / 1M Tokens</th>
                <th className="py-3 px-4">Context Window</th>
                <th className="py-3 px-4">Best Architectural Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {INITIAL_MODEL_PRICING.map((pricing) => (
                <tr key={pricing.model} className="hover:bg-slate-800/30">
                  <td className="py-3 px-4">
                    <span className="font-semibold text-white">{pricing.model}</span>
                    <span className="block text-slate-500 uppercase">{pricing.provider}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-300 tabular-nums">
                    ${pricing.input_per_million.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-slate-300 tabular-nums">
                    ${pricing.output_per_million.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-slate-400">{pricing.context_window}</td>
                  <td className="py-3 px-4 text-slate-300 font-sans">{pricing.best_for}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Granular cost_events Transaction Log */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            Supabase Table: cost_events (Audit Ledger)
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            RLS: super_admin only read access
          </span>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400">
              <tr>
                <th className="py-3 px-4">Event ID</th>
                <th className="py-3 px-4">Project</th>
                <th className="py-3 px-4">Model & Provider</th>
                <th className="py-3 px-4">Attributed Feature</th>
                <th className="py-3 px-4">Input / Output</th>
                <th className="py-3 px-4 text-right">Inference Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredEvents.map((ev) => {
                const proj = projectMap.get(ev.project_id);
                return (
                  <tr key={ev.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 text-slate-400 font-mono">{ev.id}</td>
                    <td className="py-3 px-4 text-white">
                      {proj ? proj.name.split(' ')[0] : 'Project'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-cyan-300 font-semibold">{ev.model}</span>
                      <span className="block text-slate-500 uppercase">{ev.provider}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-300">{ev.feature_name || 'N/A'}</span>
                      <span className="block text-slate-500 uppercase">{ev.attributed_to}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 tabular-nums">
                      {ev.tokens_input.toLocaleString()} in / {ev.tokens_output.toLocaleString()} out
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-400 font-bold tabular-nums">
                      ${ev.cost_usd.toFixed(6)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
