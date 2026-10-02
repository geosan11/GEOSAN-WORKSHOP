import React, { useState } from 'react';
import {
  Layers,
  CheckCircle2,
  Clock,
  Play,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Zap,
  Terminal,
  Filter,
  Check,
  Flame,
  ShieldCheck,
  ChevronRight,
  FolderGit2
} from 'lucide-react';
import { AgentCanvas } from '../agents/AgentCanvas';
import { VisualErrorDiff, SAMPLE_DIAGNOSTICS, DiagnosticError } from '../diagnostics/VisualErrorDiff';
import { SoftwareViewport, SAMPLE_ADRS, ADRRecord } from '../viewport/SoftwareViewport';

export type TierFilter = 'ALL' | 'TIER_1' | 'TIER_2' | 'TIER_3' | 'TIER_4';

export interface SpecTaskItem {
  id: string;
  tier: 'TIER_1' | 'TIER_2' | 'TIER_3' | 'TIER_4';
  tierLabel: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  status: '[DONE]' | '[IN_PROGRESS]' | '[TODO]';
  targetFiles: string;
  notes: string;
}

export const SPEC_TASKS: SpecTaskItem[] = [
  {
    id: '1.1',
    tier: 'TIER_1',
    tierLabel: 'Tier 1: SaaS',
    description: 'Initialize repository, Vite config, and TypeScript strict mode',
    priority: 'High',
    status: '[DONE]',
    targetFiles: 'package.json, tsconfig.json',
    notes: 'Strict mode enabled'
  },
  {
    id: '2.3',
    tier: 'TIER_1',
    tierLabel: 'Tier 1: SaaS',
    description: 'Seed initial enterprise vertical fixtures (EHI, Iyanuoluwa)',
    priority: 'High',
    status: '[DONE]',
    targetFiles: 'src/data/seed.ts',
    notes: 'Health & spend ledger'
  },
  {
    id: '2.4',
    tier: 'TIER_2',
    tierLabel: 'Tier 2: Data',
    description: 'Implement FinOps calculus & token pricing ledger',
    priority: 'High',
    status: '[DONE]',
    targetFiles: 'src/lib/cost.ts',
    notes: 'Multi-model token pricing'
  },
  {
    id: '3.3',
    tier: 'TIER_4',
    tierLabel: 'Tier 4: Ops',
    description: 'Implement 3-mode Density Engine (Compact, Normal, Expanded)',
    priority: 'High',
    status: '[DONE]',
    targetFiles: 'src/lib/density.tsx',
    notes: 'LocalStorage synced'
  },
  {
    id: '4.6',
    tier: 'TIER_2',
    tierLabel: 'Tier 2: Data',
    description: 'Scrape and validate EdgePoint IoT sensor telemetry stream',
    priority: 'High',
    status: '[IN_PROGRESS]',
    targetFiles: 'src/lib/dataProvider.ts',
    notes: 'Zod invariant checks'
  },
  {
    id: '4.7',
    tier: 'TIER_1',
    tierLabel: 'Tier 1: SaaS',
    description: 'Build ProjectOverview with Top Shelf 3-second metrics',
    priority: 'High',
    status: '[DONE]',
    targetFiles: 'src/components/ProjectOverview.tsx',
    notes: 'Fleet & Active Tokens'
  },
  {
    id: '4.8',
    tier: 'TIER_4',
    tierLabel: 'Tier 4: Ops',
    description: 'Hardware-Accelerated Agent Swarm with 0% CPU strain',
    priority: 'High',
    status: '[DONE]',
    targetFiles: 'src/components/AgentSwarmWorkbench.tsx',
    notes: 'Compositor CSS transforms'
  },
  {
    id: '5.1',
    tier: 'TIER_3',
    tierLabel: 'Tier 3: Util',
    description: 'Electronic Flight Log Captain ATPL License Verification',
    priority: 'High',
    status: '[TODO]',
    targetFiles: 'src/lib/aviation.ts',
    notes: 'NCAA API compliance'
  }
];

export const ControlPlaneLayout: React.FC = () => {
  const [selectedTier, setSelectedTier] = useState<TierFilter>('ALL');
  const [tasksList, setTasksList] = useState<SpecTaskItem[]>(SPEC_TASKS);
  const [activeDiagnostic, setActiveDiagnostic] = useState<DiagnosticError>(SAMPLE_DIAGNOSTICS[0]);
  const [isCrashed, setIsCrashed] = useState<boolean>(false);
  const [showDiagnosticModal, setShowDiagnosticModal] = useState<boolean>(false);
  const [adrs, setAdrs] = useState<ADRRecord[]>(SAMPLE_ADRS);
  const [activeTokens, setActiveTokens] = useState<number>(2410);
  const [compilingFile, setCompilingFile] = useState<string>('@/components/MetricCard.tsx');

  // Filter tasks by Tier
  const filteredTasks = tasksList.filter((task) => {
    if (selectedTier === 'ALL') return true;
    return task.tier === selectedTier;
  });

  // Simulation Controls
  const handleDispatchTask = () => {
    // Increment active tokens
    setActiveTokens((prev) => Math.min(4000, prev + 185));
    setCompilingFile(`@/components/ReconciliationBadge_${Math.floor(Math.random() * 90 + 10)}.tsx`);

    // Trigger packet transmission in canvas
    const btn = document.querySelector('button[title*="Transmit"], button:has(svg.lucide-zap)') as HTMLButtonElement | null;
    if (btn) btn.click();
  };

  const handleSimulateCrash = () => {
    setIsCrashed(true);
    setShowDiagnosticModal(true);
    // Cycle to a random diagnostic
    const nextDiag = SAMPLE_DIAGNOSTICS[Math.floor(Math.random() * SAMPLE_DIAGNOSTICS.length)];
    setActiveDiagnostic(nextDiag);
  };

  const handleResolveError = () => {
    setIsCrashed(false);
    setShowDiagnosticModal(false);

    // Append new ADR resolution record
    const newAdrId = `ADR-00${adrs.length + 1}`;
    const newRecord: ADRRecord = {
      id: newAdrId,
      title: `Resolved ${activeDiagnostic.breakingKey} Invariant`,
      date: new Date().toISOString().split('T')[0],
      status: 'APPROVED',
      summary: `Automated patch applied: ${activeDiagnostic.suggestedFix}`
    };

    setAdrs((prev) => [newRecord, ...prev]);

    // Mark active task as done if matching
    setTasksList((prev) =>
      prev.map((t) => (t.status === '[IN_PROGRESS]' ? { ...t, status: '[DONE]' } : t))
    );
  };

  const toggleTaskStatus = (taskId: string) => {
    setTasksList((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const nextStatus = t.status === '[DONE]' ? '[TODO]' : t.status === '[TODO]' ? '[IN_PROGRESS]' : '[DONE]';
          return { ...t, status: nextStatus };
        }
        return t;
      })
    );
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-6 py-4 space-y-4 text-slate-100">
      {/* ── TOP CONTROL PLANE BANNER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F0B230]/20 border border-[#F0B230]/50 flex items-center justify-center text-[#F0B230] shadow-md shadow-[#F0B230]/10">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-mono font-bold tracking-tight text-slate-100">
                GEOSAN-WORKSHOP Visual Control Plane
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-[#F0B230]/15 text-[#FFBD59] border border-[#F0B230]/40">
                4-TIER SPEC HARNESS
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Real-time multi-agent observability, visual contract diagnostics, and software viewport
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-2">
            <span className="text-slate-400">Spec Health:</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              100% Invariants Intact
            </span>
          </div>
        </div>
      </div>

      {/* ── MAIN THREE-PANE SPLIT-WORKBENCH LAYOUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* ── LEFT PANE: PROJECT MATRIX & VISUAL ERROR EXPLAINER (30% -> lg:col-span-4) ── */}
        <div className="lg:col-span-4 space-y-4">
          {/* Tier Navigator & Task HUD */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-[#F0B230]" />
                Project Matrix & Spec Roadmap
              </h2>
              <span className="text-[10px] font-mono text-slate-500">
                docs/TASKS.md
              </span>
            </div>

            {/* Tier Filter Tabs */}
            <div className="grid grid-cols-5 gap-1 text-[10px] font-mono">
              {(['ALL', 'TIER_1', 'TIER_2', 'TIER_3', 'TIER_4'] as TierFilter[]).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setSelectedTier(tier)}
                  className={`py-1.5 px-1 rounded-lg border text-center font-bold transition-all truncate ${
                    selectedTier === tier
                      ? 'bg-[#F0B230] text-slate-950 border-[#F0B230] shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {tier === 'ALL'
                    ? 'ALL'
                    : tier === 'TIER_1'
                    ? 'T1 SaaS'
                    : tier === 'TIER_2'
                    ? 'T2 Data'
                    : tier === 'TIER_3'
                    ? 'T3 Util'
                    : 'T4 Ops'}
                </button>
              ))}
            </div>

            {/* Active Tasks HUD */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {filteredTasks.map((task) => {
                const isDone = task.status === '[DONE]';
                const isInProgress = task.status === '[IN_PROGRESS]';

                return (
                  <div
                    key={task.id}
                    onClick={() => toggleTaskStatus(task.id)}
                    className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/90 hover:border-slate-700 transition-colors cursor-pointer text-xs font-mono space-y-1 group"
                    title="Click to toggle task status"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 font-bold">{task.id}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                          {task.tierLabel}
                        </span>
                      </div>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          isDone
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                            : isInProgress
                            ? 'bg-amber-950 text-amber-300 border border-amber-500/30 animate-pulse'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {task.status}
                      </span>
                    </div>

                    <p className={`line-clamp-2 text-[11px] ${isDone ? 'text-slate-400 line-through' : 'text-slate-200'}`}>
                      {task.description}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                      <span className="truncate">{task.targetFiles}</span>
                      <span className="text-[#F0B230] group-hover:underline">Toggle</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Visual Diagnostic / Contract Mismatch Explainer */}
          <VisualErrorDiff
            activeDiagnostic={activeDiagnostic}
            onResolve={isCrashed ? handleResolveError : undefined}
            onSelectDiagnostic={setActiveDiagnostic}
          />
        </div>

        {/* ── CENTER PANE: ANIMATED AGENT SWARM & CONSTRUCTION ZONE (45% -> lg:col-span-5) ── */}
        <div className="lg:col-span-5 h-[580px] sm:h-[640px]">
          <AgentCanvas
            isCrashedExternal={isCrashed}
            onCrashTriggered={(nodeId) => {
              setIsCrashed(true);
              setShowDiagnosticModal(true);
            }}
            compilingFile={compilingFile}
          />
        </div>

        {/* ── RIGHT PANE: LIVE SOFTWARE VIEWPORT & PERSISTENT MEMORY (25% -> lg:col-span-3) ── */}
        <div className="lg:col-span-3 h-[580px] sm:h-[640px]">
          <SoftwareViewport
            adrs={adrs}
            activeTokens={activeTokens}
            maxTokens={4000}
            currentBranch="agent/task-swarm-sim"
          />
        </div>
      </div>

      {/* ── BOTTOM FLOATING ACTION DOCK (INTERACTIVE SIMULATION) ── */}
      <div className="sticky bottom-4 z-30 max-w-2xl mx-auto p-2 sm:p-2.5 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-slate-700/80 shadow-2xl flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 pl-2 text-xs font-mono text-slate-400 hidden sm:flex">
          <Sparkles className="w-3.5 h-3.5 text-[#F0B230]" />
          <span>Interactive Simulation:</span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* 1. Dispatch Task */}
          <button
            type="button"
            onClick={handleDispatchTask}
            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-[#F0B230] text-slate-950 font-mono font-bold text-xs hover:bg-[#FFBD59] transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Dispatch Task</span>
          </button>

          {/* 2. Simulate Syntax Crash */}
          <button
            type="button"
            onClick={handleSimulateCrash}
            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-300 font-mono font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95"
          >
            <Flame className="w-3.5 h-3.5 text-red-400" />
            <span>Simulate Crash</span>
          </button>

          {/* 3. Resolve Error */}
          <button
            type="button"
            onClick={handleResolveError}
            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-mono font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Resolve Error</span>
          </button>
        </div>
      </div>
    </div>
  );
};
