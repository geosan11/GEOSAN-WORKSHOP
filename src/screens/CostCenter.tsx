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
import { PageHeader, SectionCard } from '../components/ui';

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
      <PageHeader
        eyebrow="Observe"
        title="Spend"
        lede="Shared weekly inference ledger, admission rate control, and micro-attribution."
      />

      <SectionCard
        title="Weekly admission cap"
        description="git, lint, format, and replay are not admitted."
        actions={<ShieldCheck className="w-4 h-4 text-[color:var(--color-success-text)]" />}
      >
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs"
          aria-label="Spend KPI strip"
        >
          <div className="p-4 rounded-xl bg-app border border-app space-y-1.5">
            <span className="text-meta">Weekly calls</span>
            <div className="text-2xl font-bold text-main tabular-nums">
              {callsUsed} <span className="text-sm font-normal text-muted">/ {callsCap}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full"
                style={{ width: `${Math.min(100, Math.round((callsUsed / callsCap) * 100))}%` }}
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-app border border-app space-y-1.5">
            <span className="text-meta">Weekly spend</span>
            <div className="text-2xl font-bold text-primary tabular-nums">
              {formatCost(usdUsed)}{' '}
              <span className="text-sm font-normal text-muted">/ {formatCost(usdCap)}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-[color:var(--color-primary)] rounded-full"
                style={{ width: `${Math.min(100, Math.round((usdUsed / usdCap) * 100))}%` }}
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-app border border-app space-y-2 text-[11px]">
            <span className="text-meta">Tiers 60 / 30 / 10</span>
            <div className="flex items-center justify-between text-muted">
              <span>Tier 1 (Coding & Critic):</span>
              <span className="text-[color:var(--color-success-text)] font-bold">60% ($1.80)</span>
            </div>
            <div className="flex items-center justify-between text-muted">
              <span>Tier 2 (Telemetry & Data):</span>
              <span className="text-[color:var(--color-info-text)] font-bold">30% ($0.90)</span>
            </div>
            <div className="flex items-center justify-between text-muted">
              <span>Tier 3 (Utility / Ops):</span>
              <span className="text-[color:var(--color-warning-text)] font-bold">10% ($0.30)</span>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Inference ledger"
        description={`${costEvents.length} transactions recorded`}
      >
        {costEvents.length === 0 ? (
          <EmptyState
            title="No Cost Events Recorded"
            description="No inference transactions recorded in this ledger."
          />
        ) : (
          <div className="border border-app rounded-xl overflow-hidden font-mono text-xs">
            <div className="grid grid-cols-12 px-4 py-2.5 bg-app text-[10px] uppercase tracking-wider text-muted border-b border-app font-bold">
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
                      className="grid grid-cols-12 px-4 py-2.5 items-center hover:bg-white/5 transition-colors"
                    >
                      <span className="col-span-3 text-muted text-[11px]">
                        {formatDateTime(ev.created_at)}
                      </span>
                      <div className="col-span-3 truncate">
                        <span className="text-main font-semibold text-[11px] block truncate">
                          {ev.model}
                        </span>
                        <span className="text-muted text-[10px] uppercase">{ev.provider}</span>
                      </div>
                      <span className="col-span-2 text-right text-muted text-[11px]">
                        {formatTokens(ev.tokens_input)} / {formatTokens(ev.tokens_output)}
                      </span>
                      <span className="col-span-2 text-right text-primary font-bold tabular-nums text-[11px]">
                        {formatCost(ev.cost_usd)}
                      </span>
                      <span className="col-span-2 text-right text-muted text-[10px] truncate block">
                        {ev.attributed_to || 'task'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
};
