import React, { useState, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useCosts } from '../hooks/useCosts';
import { useProjects } from '../hooks/useProjects';
import { CostChart } from '../components/CostChart';
import { CostPieChart } from '../components/CostPieChart';
import { LoadingState } from '../components/LoadingState';
import { QueryError } from '../components/QueryError';
import { EmptyState } from '../components/EmptyState';
import {
  projectMonthlySpend,
  spendByProvider,
  spendByAttribution,
  dailySpendTrend
} from '../lib/cost';
import { formatCost, formatDateTime, formatRelative, formatTokens } from '../lib/format';
import {
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Cpu,
  Layers,
  PieChart as PieIcon,
  Calendar,
  CheckCircle2
} from 'lucide-react';

type TimePeriod = 'today' | 'week' | 'month' | 'quarter' | 'all';

export const CostCenterScreen: React.FC = () => {
  const { costEvents, loading, error, refetch } = useCosts();
  const { projects } = useProjects();
  const [period, setPeriod] = useState<TimePeriod>('month');

  // Filter events by selected period
  const filteredEvents = useMemo(() => {
    const now = new Date();
    let since = new Date(0);

    if (period === 'today') {
      since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'week') {
      since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
      since = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'quarter') {
      since = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    }

    return costEvents.filter((e) => new Date(e.created_at) >= since);
  }, [costEvents, period]);

  // Aggregate metrics
  const totalSpend = useMemo(
    () => filteredEvents.reduce((sum, e) => sum + Number(e.cost_usd || 0), 0),
    [filteredEvents]
  );

  const totalTokens = useMemo(
    () => filteredEvents.reduce((sum, e) => sum + (e.tokens_input || 0) + (e.tokens_output || 0), 0),
    [filteredEvents]
  );

  const byProvider = useMemo(() => spendByProvider(filteredEvents), [filteredEvents]);
  const byAttribution = useMemo(() => spendByAttribution(filteredEvents), [filteredEvents]);

  // Top 10 attributed features
  const topFeatures = useMemo(() => {
    return Object.entries(byAttribution)
      .map(([tag, cost]) => ({ tag, cost }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);
  }, [byAttribution]);

  const spendTrend = useMemo(() => dailySpendTrend(costEvents, undefined, 30), [costEvents]);

  // Budget alert check: any project exceeding 80%?
  const budgetAlerts = useMemo(() => {
    const alerts: { project: string; spend: number; limit: number; pct: number }[] = [];
    for (const proj of projects) {
      const spend = projectMonthlySpend(costEvents, proj.id);
      const limit = proj.monthly_budget_usd || 1000;
      const pct = Math.round((spend / limit) * 100);
      if (pct >= 80) {
        alerts.push({ project: proj.name, spend, limit, pct });
      }
    }
    return alerts;
  }, [projects, costEvents]);

  // Virtualized Cost Events table (Addendum A9)
  const costTableParentRef = useRef<HTMLDivElement>(null);
  const costVirtualizer = useVirtualizer({
    count: filteredEvents.length,
    getScrollElement: () => costTableParentRef.current,
    estimateSize: () => 48,
    overscan: 10
  });

  if (loading && costEvents.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <LoadingState type="cards" count={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <QueryError message="Failed to load cost ledger. Retry?" onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header & Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#8b98a8] mb-1">
            <DollarSign className="w-3.5 h-3.5 text-[#F0B230]" />
            <span>Multi-Model API FinOps</span>
            <span>·</span>
            <span className="text-[#FFBD59]">Micro-Attribution Engine</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#e6edf3]">
            Cost Center & Token Burn Attribution
          </h1>
        </div>

        {/* Period Selector Chips */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#161b22] border border-white/5 text-xs font-mono">
          {(
            [
              { id: 'today', label: 'TODAY' },
              { id: 'week', label: 'WEEK' },
              { id: 'month', label: 'MONTH' },
              { id: 'quarter', label: 'QUARTER' },
              { id: 'all', label: 'ALL TIME' }
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => setPeriod(item.id)}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                period === item.id
                  ? 'bg-[#F0B230] text-[#0A1420] font-bold'
                  : 'text-[#8b98a8] hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Budget Alert Banner (Screen 4 requirement: >80% limit warning) */}
      {budgetAlerts.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="font-bold block">Budget Threshold Alert</span>
              <span>
                {budgetAlerts.map((a) => `${a.project} is at ${a.pct}% of monthly budget (${formatCost(a.spend)} / ${formatCost(a.limit)})`).join(' · ')}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono uppercase bg-amber-500/20 px-2 py-1 rounded font-bold shrink-0">
            Hard Stop Active
          </span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#161b22] border border-white/5 space-y-1">
          <span className="text-[10px] font-mono text-[#8b98a8] uppercase">TOTAL PERIOD SPEND</span>
          <div className="text-2xl font-bold font-mono text-[#FFBD59] tabular-nums">
            {formatCost(totalSpend)}
          </div>
          <span className="text-[11px] text-[#8b98a8]">{filteredEvents.length} metered calls</span>
        </div>

        <div className="p-4 rounded-xl bg-[#161b22] border border-white/5 space-y-1">
          <span className="text-[10px] font-mono text-[#8b98a8] uppercase">TOKENS CONSUMED</span>
          <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            {formatTokens(totalTokens)}
          </div>
          <span className="text-[11px] text-[#8b98a8]">Input + Output combined</span>
        </div>

        <div className="p-4 rounded-xl bg-[#161b22] border border-white/5 space-y-1">
          <span className="text-[10px] font-mono text-[#8b98a8] uppercase">TOP SPEND FEATURE</span>
          <div className="text-sm font-bold font-mono text-[#e6edf3] truncate mt-1">
            {topFeatures[0]?.tag || '—'}
          </div>
          <span className="text-[11px] text-[#FFBD59] font-mono">
            {topFeatures[0] ? formatCost(topFeatures[0].cost) : '$0.00'}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#161b22] border border-white/5 space-y-1">
          <span className="text-[10px] font-mono text-[#8b98a8] uppercase">PORTFOLIO MONTH SPEND</span>
          <div className="text-2xl font-bold font-mono text-cyan-400 tabular-nums">
            {formatCost(projectMonthlySpend(costEvents))}
          </div>
          <span className="text-[11px] text-[#8b98a8]">Total calendar month burn</span>
        </div>
      </div>

      {/* Visual Charts: Daily Trend + Provider Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Daily Trend Line Chart (8 cols) */}
        <div className="lg:col-span-8 p-5 rounded-xl bg-[#161b22] border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#FFBD59] font-mono flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-[#F0B230]" />
              30-Day Daily Spend Trend
            </h2>
            <span className="text-[10px] font-mono text-[#8b98a8]">Continuous timeline</span>
          </div>
          <CostChart data={spendTrend} />
        </div>

        {/* Provider Breakdown Pie Chart (4 cols) */}
        <div className="lg:col-span-4 p-5 rounded-xl bg-[#161b22] border border-white/5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#FFBD59] font-mono flex items-center gap-2">
            <PieIcon className="w-3.5 h-3.5 text-[#0873B7]" />
            Provider Allocation
          </h2>
          <CostPieChart byProvider={byProvider} />
        </div>
      </div>

      {/* Top 10 Attributed Features Bar List */}
      <div className="p-5 rounded-xl bg-[#161b22] border border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#e6edf3] font-mono flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-[#F0B230]" />
            Top Attributed Features & Task Types by Spend
          </h2>
          <span className="text-[10px] font-mono text-[#8b98a8]">
            Answers: "How much did feature X cost?"
          </span>
        </div>

        {topFeatures.length === 0 ? (
          <EmptyState
            title="No Attributed Spend"
            description="No feature attribution tags found in the selected period."
          />
        ) : (
          <div className="space-y-2.5">
            {topFeatures.map((feat) => {
              const maxSpend = topFeatures[0]?.cost || 1;
              const pct = Math.min(100, Math.round((feat.cost / maxSpend) * 100));
              return (
                <div key={feat.tag} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#e6edf3] font-semibold truncate max-w-md">{feat.tag}</span>
                    <span className="text-[#FFBD59] font-bold tabular-nums">{formatCost(feat.cost)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#0d1117] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#F0B230] to-[#FFBD59] rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Virtualized Cost Events Table (Addendum A9) */}
      <div className="p-5 rounded-xl bg-[#161b22] border border-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#e6edf3] font-mono">
            Granular Inference Transaction Ledger (Virtual Table)
          </h2>
          <span className="text-[10px] font-mono text-[#8b98a8]">
            Showing {filteredEvents.length} events
          </span>
        </div>

        {filteredEvents.length === 0 ? (
          <EmptyState
            title="No Cost Events"
            description="No inference ledger entries for this period."
          />
        ) : (
          <div className="border border-white/5 rounded-lg overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 px-4 py-2.5 bg-[#0d1117] text-[10px] font-mono uppercase tracking-wider text-[#8b98a8] border-b border-white/5">
              <span className="col-span-3">Timestamp (Lagos)</span>
              <span className="col-span-2">Provider & Model</span>
              <span className="col-span-2 text-right">Tokens (In / Out)</span>
              <span className="col-span-2 text-right">Cost (USD)</span>
              <span className="col-span-3 text-right">Attributed Tag</span>
            </div>

            {/* Virtualized Rows */}
            <div
              ref={costTableParentRef}
              className="max-h-[360px] overflow-auto divide-y divide-white/5 font-mono text-xs"
            >
              <div
                style={{
                  height: `${costVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative'
                }}
              >
                {costVirtualizer.getVirtualItems().map((virtualRow) => {
                  const ev = filteredEvents[virtualRow.index];
                  return (
                    <div
                      key={ev.id}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`
                      }}
                      className="grid grid-cols-12 px-4 py-2.5 items-center hover:bg-[#1c2333] transition-colors"
                    >
                      <span className="col-span-3 text-[#8b98a8] text-[11px]">
                        {formatDateTime(ev.created_at)}
                      </span>
                      <div className="col-span-2 truncate">
                        <span className="text-[#FFBD59] font-semibold uppercase text-[11px] block">
                          {ev.provider}
                        </span>
                        <span className="text-[#8b98a8] text-[10px] block truncate">{ev.model}</span>
                      </div>
                      <span className="col-span-2 text-right text-[11px] text-[#e6edf3]">
                        {formatTokens(ev.tokens_input)} / {formatTokens(ev.tokens_output)}
                      </span>
                      <span className="col-span-2 text-right text-emerald-400 font-bold tabular-nums text-[11px]">
                        {formatCost(ev.cost_usd)}
                      </span>
                      <span className="col-span-3 text-right text-[#8b98a8] text-[10px] truncate block">
                        {ev.attributed_to || '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
