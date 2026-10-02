import React, { useState } from 'react';
import {
  Monitor,
  Tablet,
  Smartphone,
  RotateCw,
  ExternalLink,
  BookOpen,
  Cpu,
  GitBranch,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';

export type DeviceMode = 'desktop' | 'tablet' | 'mobile';

export interface ADRRecord {
  id: string;
  title: string;
  date: string;
  status: 'APPROVED' | 'PROPOSED' | 'DEPRECATED';
  summary: string;
}

export const SAMPLE_ADRS: ADRRecord[] = [
  {
    id: 'ADR-001',
    title: 'Progressive Disclosure (Addendum C)',
    date: '2026-09-29',
    status: 'APPROVED',
    summary: 'Pure CSS Grid 200ms height transitions persisted in localStorage.'
  },
  {
    id: 'ADR-002',
    title: 'Density Engine Multi-Mode',
    date: '2026-09-29',
    status: 'APPROVED',
    summary: '3-mode density engine (Compact | Normal | Expanded) with cross-tab sync.'
  },
  {
    id: 'ADR-003',
    title: 'Multi-Model Federation & Sonnet Critic',
    date: '2026-09-30',
    status: 'APPROVED',
    summary: 'Claude Sonnet critic for mandatory invariant sign-offs before PR merge.'
  },
  {
    id: 'ADR-004',
    title: 'Hardware-Accelerated Compositor Swarm',
    date: '2026-10-01',
    status: 'APPROVED',
    summary: 'SVG path transforms on GPU compositor thread with 0% CPU thread contention.'
  }
];

interface SoftwareViewportProps {
  adrs?: ADRRecord[];
  activeTokens?: number;
  maxTokens?: number;
  currentBranch?: string;
}

export const SoftwareViewport: React.FC<SoftwareViewportProps> = ({
  adrs = SAMPLE_ADRS,
  activeTokens = 2410,
  maxTokens = 4000,
  currentBranch = 'agent/task-swarm-sim'
}) => {
  const [device, setDevice] = useState<DeviceMode>('desktop');
  const [isReloading, setIsReloading] = useState(false);

  const handleReload = () => {
    setIsReloading(true);
    setTimeout(() => setIsReloading(false), 600);
  };

  const getContainerWidth = () => {
    switch (device) {
      case 'mobile':
        return 'max-w-[340px]';
      case 'tablet':
        return 'max-w-[500px]';
      case 'desktop':
      default:
        return 'w-full';
    }
  };

  const tokenPct = Math.round((activeTokens / maxTokens) * 100);

  return (
    <div className="h-full flex flex-col justify-between p-4 bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl space-y-4">
      {/* ── TOP SECTION: SOFTWARE VIEWPORT (LIVE PREVIEW) ── */}
      <div className="space-y-2 flex-1 flex flex-col">
        {/* Device Mode Switcher & Controls */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setDevice('desktop')}
              className={`p-1.5 rounded transition-colors ${
                device === 'desktop' ? 'bg-[#F0B230] text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Desktop 1080p (Responsive)"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setDevice('tablet')}
              className={`p-1.5 rounded transition-colors ${
                device === 'tablet' ? 'bg-[#F0B230] text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Tablet Viewport"
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setDevice('mobile')}
              className={`p-1.5 rounded transition-colors ${
                device === 'mobile' ? 'bg-[#F0B230] text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Mobile 375px Viewport"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
              {device === 'desktop' ? '1080p View' : device === 'tablet' ? '768px' : '375px'}
            </span>
            <button
              type="button"
              onClick={handleReload}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              title="Reload viewport"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isReloading ? 'animate-spin text-[#F0B230]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Embedded Viewport Frame */}
        <div className="flex-1 bg-slate-900/80 rounded-xl border border-slate-800 p-2 flex items-center justify-center min-h-[220px] overflow-hidden relative">
          <div
            className={`transition-all duration-300 mx-auto bg-slate-950 rounded-lg border border-slate-800 p-3.5 shadow-inner ${getContainerWidth()} h-full flex flex-col justify-between`}
          >
            {/* Mock Header inside preview */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[10px] font-mono">
              <span className="text-[#F0B230] font-bold">EHI Multisystems</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                PROD PREVIEW
              </span>
            </div>

            {/* Generated Metric Card Preview */}
            <div className="my-2 p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[9px] font-mono uppercase text-slate-400">Debt Clearance Ratio</span>
              <div className="text-lg font-mono font-bold text-emerald-400 tabular-nums">98.4%</div>
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="w-[98%] h-full bg-emerald-400 rounded-full" />
              </div>
            </div>

            {/* Micro Activity Item */}
            <div className="p-2 rounded bg-slate-900/60 border border-slate-800/80 text-[10px] font-mono flex items-center justify-between text-slate-300">
              <span className="truncate">Automated Statement Batch</span>
              <span className="text-emerald-400 font-bold shrink-0">PAID</span>
            </div>

            {/* Preview Footer */}
            <div className="pt-2 border-t border-slate-800 text-[9px] font-mono text-slate-500 flex items-center justify-between">
              <span>Branch: {currentBranch}</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live HMR
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM SECTION: PERSISTENT MEMORY HUD (docs/MEMORY.md) ── */}
      <div className="pt-2 border-t border-slate-800 space-y-3">
        {/* Token Counter & Branch Context */}
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              Context Tokens:
            </span>
            <span className="font-bold text-cyan-300 tabular-nums">
              {activeTokens.toLocaleString()} / {maxTokens.toLocaleString()}
            </span>
          </div>

          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                tokenPct > 80 ? 'bg-red-400' : tokenPct > 60 ? 'bg-amber-400' : 'bg-cyan-400'
              }`}
              style={{ width: `${tokenPct}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1">
            <span className="flex items-center gap-1">
              <GitBranch className="w-3 h-3 text-[#F0B230]" />
              {currentBranch}
            </span>
            <span className="text-slate-500">Auto-Checkpoint</span>
          </div>
        </div>

        {/* ADR Register (Architectural Decision Records) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <h4 className="font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#F0B230]" />
              ADR Log (docs/MEMORY.md)
            </h4>
            <span className="text-[10px] text-slate-500">{adrs.length} records</span>
          </div>

          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {adrs.map((adr) => (
              <div
                key={adr.id}
                className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition-colors text-xs font-mono space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#F0B230] text-[11px]">{adr.id}: {adr.title}</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                    {adr.status}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 line-clamp-1 leading-snug">
                  {adr.summary}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
