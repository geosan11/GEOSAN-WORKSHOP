import React, { useState, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useCosts } from '../hooks/useCosts';
import { useProjects } from '../hooks/useProjects';
import { useSharedStatus } from '../lib/sharedStatus';
import { LoadingState } from '../components/LoadingState';
import { QueryError } from '../components/QueryError';
import { EmptyState } from '../components/EmptyState';
import { formatCost, formatDateTime, formatTokens } from '../lib/format';
import { ShieldCheck, DollarSign } from 'lucide-react';

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
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Header: Single H1 & Lede */}
      <div className="pb-2 border-b border-white/5">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#e6edf3]">
          Fleet Money
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Shared weekly inference ledger, admission rate control, and micro-attribution.
        </p>
      </div>

      {/* The Weekly Cap & Rule Section */}
      <div className="p-5 rounded-2xl bg-[#161b22] border border-white/10 space-y-4 font-mono text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-slate-100 uppercase">
              Weekly Inference Admission Cap
            </span>
          </div>

          <span className="text-[11px] text-slate-400">
            git, lint, format, and replay are not admitted.
          </span>
        </div>

        {/* 3 Metrics: Calls, Spend, Tiers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Metric 1: Calls */}
          <div className="p-4 rounded-xl bg-[#0d1117] border border-white/5 space-y-1.5">
            <span className="text-[10px] text-slate-400 uppercase block">Weekly Calls</span>
            <div className="text-2xl font-bold text-slate-100 tabular-nums">
              {callsUsed} <span className="text-sm font-normal text-slate-500">/ {callsCap}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full"
                style={{ width: `${Math.min(100, Math.round((callsUsed / callsCap) * 100))}%` }}
              />
            </div>
          </div>

          {/* Metric 2: Spend Against $3.00 */}
          <div className="p-4 rounded-xl bg-[#0d1117] border border-white/5 space-y-1.5">
            <span className="text-[10px] text-slate-400 uppercase block">Weekly Spend</span>
            <div className="text-2xl font-bold text-emerald-400 tabular-nums">
              {formatCost(usdUsed)}{' '}
              <span className="text-sm font-normal text-slate-500">/ {formatCost(usdCap)}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full"
                style={{ width: `${Math.min(100, Math.round((usdUsed / usdCap) * 100))}%` }}
              />
            </div>
          </div>

          {/* Metric 3: 60/30/10 Tier Breakdown */}
          <div className="p-4 rounded-xl bg-[#0d1117] border border-white/5 space-y-2 text-[11px]">
            <span className="text-[10px] text-slate-400 uppercase block font-bold">
              Tiers 60 / 30 / 10
            </span>
            <div className="flex items-center justify-between text-slate-300">
              <span>Tier 1 (Coding & Critic):</span>
              <span className="text-emerald-400 font-bold">60% ($1.80)</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Tier 2 (Telemetry & Data):</span>
              <span className="text-cyan-400 font-bold">30% ($0.90)</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Tier 3 (Utility / Ops):</span>
              <span className="text-amber-400 font-bold">10% ($0.30)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Virtualized Inference Ledger */}
      <div className="p-5 rounded-2xl bg-[#161b22] border border-white/10 space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between pb-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Inference Transaction Ledger
          </h2>
          <span className="text-[10px] text-slate-400">
            {costEvents.length} transactions recorded
          </span>
        </div>

        {costEvents.length === 0 ? (
          <EmptyState
            title="No Cost Events Recorded"
            description="No inference transactions recorded in this ledger."
          />
        ) : (
          <div className="border border-white/5 rounded-xl overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 px-4 py-2.5 bg-[#0d1117] text-[10px] uppercase tracking-wider text-slate-400 border-b border-white/5 font-bold">
              <span className="col-span-3">Timestamp (Lagos)</span>
              <span className="col-span-3">Provider & Model</span>
              <span className="col-span-2 text-right">Tokens (In/Out)</span>
              <span className="col-span-2 text-right">Cost (USD)</span>
              <span className="col-span-2 text-right">Attribution</span>
            </div>

            {/* Virtualized Rows */}
            <div
              ref={costTableParentRef}
              className="max-h-[380px] overflow-auto divide-y divide-white/5 text-xs"
            >
              <div
                style={{
                  height: `${costVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative'
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
                        transform: `translateY(${virtualRow.start}px)`
                      }}
                      className="grid grid-cols-12 px-4 py-2.5 items-center hover:bg-[#1c2333] transition-colors"
                    >
                      <span className="col-span-3 text-slate-400 text-[11px]">
                        {formatDateTime(ev.created_at)}
                      </span>
                      <div className="col-span-3 truncate">
                        <span className="text-slate-200 font-semibold text-[11px] block truncate">
                          {ev.model}
                        </span>
                        <span className="text-slate-500 text-[10px] uppercase">{ev.provider}</span>
                      </div>
                      <span className="col-span-2 text-right text-slate-300 text-[11px]">
                        {formatTokens(ev.tokens_input)} / {formatTokens(ev.tokens_output)}
                      </span>
                      <span className="col-span-2 text-right text-emerald-400 font-bold tabular-nums text-[11px]">
                        {formatCost(ev.cost_usd)}
                      </span>
                      <span className="col-span-2 text-right text-slate-400 text-[10px] truncate block">
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
