import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useCosts } from '../hooks/useCosts';
import { useProjects } from '../hooks/useProjects';
import { useSharedStatus } from '../lib/sharedStatus';
import { LoadingState } from '../components/LoadingState';
import { QueryError } from '../components/QueryError';
import { EmptyState } from '../components/EmptyState';
import { formatCost, formatDateTime, formatTokens } from '../lib/format';
import { ShieldCheck, Coins } from 'lucide-react';

export const CostCenterScreen: React.FC = () => {
  const { costEvents, loading, error, refetch } = useCosts();
  const { projects } = useProjects();
  const { statusData } = useSharedStatus();

  const budget = statusData.budget;
  const callsUsed = budget?.usedRequests ?? 24;
  const callsCap = budget?.totalCapRequests ?? 400;
  const usdUsed = budget?.usedUsd ?? 0.18;
  const usdCap = budget?.totalCapUsd ?? 3.0;

  // Virtualized Cost Events table
  const costTableParentRef = useRef<HTMLDivElement>(null);
  const costVirtualizer = useVirtualizer({
    count: costEvents.length,
    getScrollElement: () => costTableParentRef.current,
    estimateSize: () => 44,
    overscan: 10,
  });

  if (loading && costEvents.length === 0) {
    return (
      <div className="min-h-full p-4 sm:p-6 max-w-4xl mx-auto space-y-4 font-sans text-zinc-200">
        <LoadingState type="cards" count={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-full p-6 max-w-md mx-auto text-center font-sans space-y-4 pt-12">
        <QueryError message="Failed to load cost ledger." onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="min-h-full p-4 sm:p-6 max-w-4xl mx-auto space-y-4 font-sans text-zinc-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[18px] sm:text-[20px] font-semibold text-zinc-100 tracking-tight">
              Cost & Spend
            </h1>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/25">
              FinOps
            </span>
          </div>
          <p className="text-[13px] text-zinc-400 font-normal">
            Shared weekly inference ledger, admission rate control, and micro-attribution.
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono self-start sm:self-auto">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Admission Active</span>
        </div>
      </div>

      {/* Weekly Admission Cap Panel */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-[#111113] border border-white/[0.06] space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
          <div>
            <span className="text-xs font-semibold text-zinc-200 font-mono uppercase tracking-wider block">
              Weekly Admission Cap
            </span>
            <p className="text-[12px] text-zinc-400 font-sans mt-0.5">
              git, lint, format, and replay are not admitted to quota.
            </p>
          </div>
          <Coins className="w-4 h-4 text-zinc-400" />
        </div>

        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs"
          aria-label="Spend KPI strip"
        >
          {/* 1. Calls */}
          <div className="p-3 rounded-lg bg-[#161619] border border-white/[0.06] space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
              Weekly Calls
            </span>
            <div className="text-xl font-bold text-zinc-100 tabular-nums">
              {callsUsed} <span className="text-xs font-normal text-zinc-500">/ {callsCap}</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.round((callsUsed / callsCap) * 100))}%` }}
              />
            </div>
          </div>

          {/* 2. Spend */}
          <div className="p-3 rounded-lg bg-[#161619] border border-white/[0.06] space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
              Weekly Spend
            </span>
            <div className="text-xl font-bold text-indigo-300 tabular-nums">
              {formatCost(usdUsed)}{' '}
              <span className="text-xs font-normal text-zinc-500">/ {formatCost(usdCap)}</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.round((usdUsed / usdCap) * 100))}%` }}
              />
            </div>
          </div>

          {/* 3. Tiers */}
          <div className="p-3 rounded-lg bg-[#161619] border border-white/[0.06] space-y-1.5 text-[11px]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
              Tiers 60 / 30 / 10
            </span>
            <div className="flex items-center justify-between text-zinc-400">
              <span>Tier 1 (Coding & Critic):</span>
              <span className="text-emerald-400 font-semibold">60% ($1.80)</span>
            </div>
            <div className="flex items-center justify-between text-zinc-400">
              <span>Tier 2 (Telemetry & Data):</span>
              <span className="text-indigo-400 font-semibold">30% ($0.90)</span>
            </div>
            <div className="flex items-center justify-between text-zinc-400">
              <span>Tier 3 (Utility / Ops):</span>
              <span className="text-amber-400 font-semibold">10% ($0.30)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Inference Ledger Panel */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-[#111113] border border-white/[0.06] space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
          <div>
            <span className="text-xs font-semibold text-zinc-200 font-mono uppercase tracking-wider block">
              Inference Ledger
            </span>
            <p className="text-[12px] text-zinc-400 font-sans mt-0.5">
              {costEvents.length} transactions recorded
            </p>
          </div>
        </div>

        {costEvents.length === 0 ? (
          <EmptyState
            title="No Cost Events Recorded"
            description="No inference transactions recorded in this ledger."
          />
        ) : (
          <div className="border border-white/[0.06] rounded-lg overflow-hidden font-mono text-xs">
            {/* Header */}
            <div className="grid grid-cols-12 px-3 py-2 bg-[#161619] text-[10px] uppercase tracking-wider text-zinc-400 border-b border-white/[0.06] font-bold">
              <span className="col-span-3">Timestamp (Lagos)</span>
              <span className="col-span-3">Provider & Model</span>
              <span className="col-span-2 text-right">Tokens (In/Out)</span>
              <span className="col-span-2 text-right">Cost (USD)</span>
              <span className="col-span-2 text-right">Attribution</span>
            </div>

            {/* Virtualized Rows */}
            <div
              ref={costTableParentRef}
              className="max-h-[380px] overflow-auto divide-y divide-white/[0.04] text-xs"
            >
              <div
                style={{
                  height: `${costVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {costVirtualizer.getVirtualItems().map((virtualRow) => {
                  const ev = costEvents[virtualRow.index];
                  return (
                    <div
                      key={ev.id}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                      className="grid grid-cols-12 px-3 py-2 items-center hover:bg-white/[0.03] transition-colors"
                    >
                      <span className="col-span-3 text-zinc-500 text-[11px]">
                        {formatDateTime(ev.created_at)}
                      </span>
                      <div className="col-span-3 truncate">
                        <span className="text-zinc-200 font-medium text-[11px] block truncate">
                          {ev.model}
                        </span>
                        <span className="text-zinc-500 text-[9px] uppercase">{ev.provider}</span>
                      </div>
                      <span className="col-span-2 text-right text-zinc-400 text-[11px]">
                        {formatTokens(ev.tokens_input)} / {formatTokens(ev.tokens_output)}
                      </span>
                      <span className="col-span-2 text-right text-indigo-300 font-bold tabular-nums text-[11px]">
                        {formatCost(ev.cost_usd)}
                      </span>
                      <span className="col-span-2 text-right text-zinc-400 text-[10px] truncate block">
                        {ev.attributed_to || 'task'}
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
