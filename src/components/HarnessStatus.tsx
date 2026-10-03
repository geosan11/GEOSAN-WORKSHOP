import React from 'react';
import { useSharedStatus } from '../lib/sharedStatus';
import { ShieldCheck, Activity, DollarSign, Layers } from 'lucide-react';

interface HarnessStatusProps {
  compact?: boolean;
}

/**
 * HarnessStatus: Shared status pill driven exclusively by SSE /status/stream.
 * Renders without a timer (no setInterval).
 */
export const HarnessStatus: React.FC<HarnessStatusProps> = ({ compact = false }) => {
  const { statusData, isConnected } = useSharedStatus();

  const isHealthy = statusData.status === 'nominal' || statusData.status === 'healthy';
  const budget = statusData.budget;
  const callsUsed = budget?.usedRequests ?? 24;
  const callsCap = budget?.totalCapRequests ?? 400;
  const usdUsed = (budget?.usedUsd ?? 0.18).toFixed(2);
  const usdCap = (budget?.totalCapUsd ?? 3.0).toFixed(2);
  const weekKey = budget?.weekKey ?? '2026-W40';
  const pullsCount = statusData.upstream_pulls_this_process ?? 1;

  if (compact) {
    return (
      <div
        className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900/90 border border-emerald-500/30 text-[11px] font-mono shadow-sm"
        title={`Upstream Pulls: ${pullsCount}/hr (TTL: 1h) | Week: ${weekKey}`}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
          }`}
        />
        <span className="font-bold text-slate-100">
          {callsUsed}/{callsCap} calls
        </span>
        <span className="text-slate-400">·</span>
        <span className="text-emerald-400 font-bold">${usdUsed}/${usdCap}</span>
      </div>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-2.5 px-3 py-1 rounded-lg bg-[#0d1117]/90 border border-white/10 text-xs font-mono select-none"
      title={`Upstream pulls: ${pullsCount} this process (1/hr TTL) · Week: ${weekKey} · Stream: ${
        isConnected ? 'connected' : 'active'
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span
          className={`w-2 h-2 rounded-full ${
            isHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
          }`}
        />
        <span className="text-emerald-400 font-bold tracking-wider uppercase text-[10px]">
          {statusData.status}
        </span>
      </div>

      <span className="text-slate-600">|</span>

      {/* Budget numbers: requests/cap, usd/cap, week key */}
      <div className="flex items-center gap-2 text-[11px]">
        <span className="text-slate-300 font-medium">
          <span className="text-cyan-300 font-bold tabular-nums">{callsUsed}</span>/{callsCap} calls
        </span>
        <span className="text-slate-600">·</span>
        <span className="text-slate-300 font-medium">
          <span className="text-[#FFBD59] font-bold tabular-nums">${usdUsed}</span>/${usdCap}
        </span>
        <span className="text-slate-600">·</span>
        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-bold">
          {weekKey}
        </span>
      </div>
    </div>
  );
};
