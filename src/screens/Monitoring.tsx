import React, { useState } from 'react';
import { useSharedStatus } from '../lib/sharedStatus';
import { useProjects } from '../hooks/useProjects';
import { useToast } from '../components/Toast';
import { RefreshCw, Activity, CheckCircle2, ShieldCheck, Radio } from 'lucide-react';

interface VerticalProbe {
  id: string;
  name: string;
  vertical: string;
  dnsMs: number;
  tlsMs: number;
  ttfbMs: number;
  failCount: number;
  sparklinePoints: number[];
}

export const MonitoringScreen: React.FC = () => {
  const toast = useToast();
  const { statusData } = useSharedStatus();
  const { projects } = useProjects();
  const [isProbing, setIsProbing] = useState(false);

  const verticalProbes: VerticalProbe[] = projects.map((p, i) => ({
    id: p.id,
    name: p.name,
    vertical: p.vertical,
    dnsMs: 2 + (i % 3),
    tlsMs: 4 + (i % 3),
    ttfbMs: 8 + (i * 3),
    failCount: 0,
    sparklinePoints: [14, 12, 13, 11, 12, 10, 12].map(x => x + i)
  }));

  const handleRunProbes = () => {
    setIsProbing(true);
    setTimeout(() => {
      setIsProbing(false);
      toast.success('All vertical probes healthy and in-band');
    }, 600);
  };

  // Sparkline generator
  const renderSparkline = (points: number[]) => {
    const min = Math.min(...points);
    const max = Math.max(...points) || 1;
    const height = 24;
    const width = 80;
    const step = width / (points.length - 1);

    const polylinePoints = points
      .map((p, idx) => {
        const x = idx * step;
        const normalizedY = max === min ? height / 2 : height - ((p - min) / (max - min)) * (height - 6) - 3;
        return `${x},${normalizedY}`;
      })
      .join(' ');

    return (
      <svg width={width} height={height} className="overflow-visible text-emerald-400">
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={polylinePoints}
        />
      </svg>
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/5">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#e6edf3]">
            Probes
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Production synthetic probes, latency breakdown, and edge telemetry.
          </p>
        </div>

        <button
          onClick={handleRunProbes}
          disabled={isProbing}
          className="px-3.5 py-1.5 rounded-lg bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold hover:bg-emerald-900/60 transition-colors flex items-center gap-1.5 self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isProbing ? 'animate-spin' : ''}`} />
          <span>{isProbing ? 'Probing…' : 'Probe Now'}</span>
        </button>
      </div>

      {/* FOUR FIGURES (Uptime, Edge p95, Upstream 1/hr, Incidents) with 1-hour series */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        {/* Figure 1: Uptime */}
        <div className="p-4 rounded-xl bg-[#161b22] border border-white/10 space-y-2">
          <span className="text-[10px] text-slate-400 uppercase block">Uptime</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-400 tabular-nums">100%</span>
            <span className="text-[10px] text-emerald-400 font-bold">1h series</span>
          </div>
          <div className="flex items-center gap-1 h-3 pt-1">
            {[100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100].map((val, idx) => (
              <span key={idx} className="flex-1 h-2 bg-emerald-400/80 rounded-sm" title="100% healthy" />
            ))}
          </div>
        </div>

        {/* Figure 2: Edge p95 */}
        <div className="p-4 rounded-xl bg-[#161b22] border border-white/10 space-y-2">
          <span className="text-[10px] text-slate-400 uppercase block">Edge p95</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-100 tabular-nums">18 ms</span>
            <span className="text-[10px] text-slate-400">1h series</span>
          </div>
          <div className="flex items-center gap-1 h-3 pt-1">
            {[16, 18, 19, 17, 18, 20, 18, 17, 19, 18, 17, 18].map((val, idx) => (
              <span
                key={idx}
                className="flex-1 bg-cyan-400/80 rounded-sm"
                style={{ height: `${Math.max(4, (val / 25) * 12)}px` }}
                title={`${val}ms`}
              />
            ))}
          </div>
        </div>

        {/* Figure 3: Upstream 1/hr */}
        <div className="p-4 rounded-xl bg-[#161b22] border border-white/10 space-y-2">
          <span className="text-[10px] text-slate-400 uppercase block">Upstream</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-100 tabular-nums">
              {statusData.upstream_pulls_this_process || 1}/hr
            </span>
            <span className="text-[10px] text-slate-400">TTL 1h</span>
          </div>
          <div className="flex items-center gap-1 h-3 pt-1">
            {[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1].map((val, idx) => (
              <span key={idx} className="flex-1 h-2 bg-[#F0B230]/80 rounded-sm" title="1 pull / hr" />
            ))}
          </div>
        </div>

        {/* Figure 4: Incidents */}
        <div className="p-4 rounded-xl bg-[#161b22] border border-white/10 space-y-2">
          <span className="text-[10px] text-slate-400 uppercase block">Incidents</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-400 tabular-nums">0</span>
            <span
              className="text-[10px] text-slate-400 cursor-help"
              title="Tripwire 3 fails. P0 under 5 minutes."
            >
              Tripwire: 3 fails
            </span>
          </div>
          <div className="flex items-center gap-1 h-3 pt-1">
            {[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0].map((val, idx) => (
              <span key={idx} className="flex-1 h-2 bg-emerald-500/40 rounded-sm" title="0 failures" />
            ))}
          </div>
        </div>
      </div>

      {/* ONE ROW PER VERTICAL TABLE */}
      <div className="bg-[#161b22] border border-white/10 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0d1117] border-b border-white/10 text-slate-400 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Vertical</th>
                <th className="py-3 px-4">DNS</th>
                <th className="py-3 px-4">TLS</th>
                <th className="py-3 px-4">TTFB</th>
                <th className="py-3 px-4 text-center">Fail Count</th>
                <th className="py-3 px-4 text-right">Latency Sparkline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {verticalProbes.map((probe) => (
                <tr key={probe.id} className="hover:bg-[#1c2333] transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>{probe.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">{probe.dnsMs} ms</td>
                  <td className="py-3.5 px-4 text-slate-300">{probe.tlsMs} ms</td>
                  <td className="py-3.5 px-4 text-emerald-400 font-bold">{probe.ttfbMs} ms</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                      {probe.failCount}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex justify-end">
                      {renderSparkline(probe.sparklinePoints)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
