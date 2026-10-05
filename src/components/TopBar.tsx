import React from 'react';
import { useNavigation } from '../lib/navigation';
import { useProjects } from '../hooks/useProjects';
import { useSharedStatus } from '../lib/sharedStatus';
import { useDensity } from '../lib/density';
import { Search, ChevronRight, ShieldAlert } from 'lucide-react';

export const TopBar: React.FC = () => {
  const { screen, navigate, back } = useNavigation();
  const { projects } = useProjects();
  const { statusData } = useSharedStatus();
  const { density, setDensity } = useDensity();

  const budget = statusData.budget;
  const callsUsed = budget?.usedRequests ?? 24;
  const callsCap = budget?.totalCapRequests ?? 400;
  const usdUsed = (budget?.usedUsd ?? 0.18).toFixed(2);
  const usdCap = (budget?.totalCapUsd ?? 3.0).toFixed(2);
  
  // Format week key to short format e.g. W41 from 2026-W41 or W41
  const rawWeekKey = budget?.weekKey ?? '2026-W41';
  const weekKey = rawWeekKey.includes('-') ? rawWeekKey.split('-')[1] : rawWeekKey;

  // Project Crumb helper
  const getProjectCrumb = () => {
    if (screen.kind !== 'project') return null;
    const project = projects.find((p) => p.id === screen.projectId);
    const projectName = project ? project.name.split(' (')[0] : screen.projectId;
    
    // Group name mapping
    let groupName = 'Work';
    if (screen.tab === 'verify' || screen.tab === 'qa') groupName = 'Verify';
    else if (screen.tab === 'money' || screen.tab === 'costs') groupName = 'Money';
    else if (screen.tab === 'system' || screen.tab === 'codebase' || screen.tab === 'components') groupName = 'System';
    else if (screen.tab === 'spec' || screen.tab === 'discovery' || screen.tab === 'design') groupName = 'Spec';

    return {
      projectName,
      groupName
    };
  };

  const projectCrumb = getProjectCrumb();

  const getScreenTitle = () => {
    switch (screen.kind) {
      case 'inbox':
      case 'portfolio':
        return 'Inbox';
      case 'projects':
        return 'Projects';
      case 'runs':
      case 'console':
        return 'Runs';
      case 'knowledge':
        return 'Knowledge';
      case 'costs':
        return 'Fleet Money';
      case 'monitoring':
        return 'Probes';
      case 'settings':
        return 'Settings';
      default:
        return 'Command Center';
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-[#161b22]/95 border-b border-white/10 backdrop-blur-md px-4 md:px-6 h-14 flex items-center justify-between font-sans">
      {/* Breadcrumb / Title Area */}
      <div className="flex items-center gap-2 font-mono text-xs truncate">
        {projectCrumb ? (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-slate-300 truncate">
            <button
              type="button"
              onClick={() => navigate({ kind: 'projects' })}
              className="hover:text-emerald-400 font-semibold transition-colors truncate"
            >
              Projects
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <button
              type="button"
              onClick={back}
              className="hover:text-emerald-400 transition-colors truncate max-w-[140px] sm:max-w-xs"
            >
              {projectCrumb.projectName}
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="text-emerald-400 font-bold">{projectCrumb.groupName}</span>
          </nav>
        ) : (
          <span className="text-sm font-bold text-[#e6edf3] tracking-tight">
            {getScreenTitle()}
          </span>
        )}
      </div>

      {/* Right Controls: Unified Single Ledger Chip, Search, Density */}
      <div className="flex items-center gap-3">
        {/* Single Unified Live Ledger Chip */}
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0d1117] border border-white/10 text-xs font-mono text-slate-200 select-none shadow-sm cursor-help"
          title="Tripwire 3 fails. P0 under 5 minutes."
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-slate-100 tabular-nums">
            {callsUsed}/{callsCap}
          </span>
          <span className="text-slate-500">·</span>
          <span className="font-semibold text-emerald-400 tabular-nums">
            ${usdUsed} / ${usdCap}
          </span>
          <span className="text-slate-500">·</span>
          <span className="text-amber-400 font-bold">{weekKey}</span>
        </div>

        {/* Jump Button (Cmd-K / Ctrl-K) */}
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
          }}
          className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#0d1117] hover:bg-[#1c2333] border border-white/10 text-[#8b98a8] hover:text-[#e6edf3] text-[11px] font-mono transition-colors"
          title="Jump to vertical, run, lesson, or probe (Cmd-K / Ctrl-K)"
          aria-label="Open command palette"
        >
          <Search className="w-3.5 h-3.5 text-[#F0B230]" />
          <span>Jump</span>
          <kbd className="text-[9px] px-1 py-0.2 rounded bg-white/5 border border-white/10 text-[#8b98a8]">
            ⌘K
          </kbd>
        </button>

        {/* Density Control */}
        <div
          className="hidden md:flex items-center rounded-lg bg-[#0d1117] border border-white/10 p-0.5 font-mono text-[10px]"
          title="Information Density: Compact | Normal | Expanded"
          role="radiogroup"
          aria-label="Information Density"
        >
          {(['compact', 'normal', 'expanded'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={density === mode}
              onClick={() => setDensity(mode)}
              className={`px-2 py-0.5 rounded capitalize transition-all ${
                density === mode
                  ? 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-500/40 shadow-sm'
                  : 'text-[#8b98a8] hover:text-white'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
