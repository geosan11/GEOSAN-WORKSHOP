import React from 'react';
import { useNavigation } from '../lib/navigation';
import { useProjects } from '../hooks/useProjects';
import { useSharedStatus } from '../lib/sharedStatus';
import { useDensity } from '../lib/density';
import { screenTitle } from '../lib/navIA';
import { Search, ChevronRight } from 'lucide-react';

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
    else if (screen.tab === 'money' || screen.tab === 'costs') groupName = 'Spend';
    else if (screen.tab === 'system' || screen.tab === 'codebase' || screen.tab === 'components') groupName = 'System';
    else if (screen.tab === 'spec' || screen.tab === 'discovery' || screen.tab === 'design') groupName = 'Spec';

    return {
      projectName,
      groupName
    };
  };

  const projectCrumb = getProjectCrumb();

  const getScreenTitle = () => screenTitle(screen);

  return (
    <header className="sticky top-0 z-30 w-full bg-card/95 border-b border-app backdrop-blur-md px-4 md:px-6 h-14 flex items-center justify-between font-sans">
      {/* Breadcrumb / Title Area */}
      <div className="flex items-center gap-2 font-mono text-xs truncate">
        {projectCrumb ? (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-muted truncate">
            <button
              type="button"
              onClick={() => navigate({ kind: 'projects' })}
              className="hover:text-primary font-semibold transition-colors truncate"
            >
              Projects
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-muted shrink-0" />
            <button
              type="button"
              onClick={back}
              className="hover:text-primary transition-colors truncate max-w-[140px] sm:max-w-xs"
            >
              {projectCrumb.projectName}
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-muted shrink-0" />
            <span className="text-primary font-bold">{projectCrumb.groupName}</span>
          </nav>
        ) : (
          <span className="font-display text-sm font-extrabold text-main tracking-[-0.03em] uppercase">
            {getScreenTitle()}
          </span>
        )}
      </div>

      {/* Right Controls: Unified Single Ledger Chip, Search, Density */}
      <div className="flex items-center gap-3">
        {/* Single Unified Live Ledger Chip */}
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-control)] bg-app border border-app text-[0.6875rem] font-mono text-main select-none cursor-help"
          title="Tripwire 3 fails. P0 under 5 minutes."
        >
          <span className="w-1.5 h-1.5 rounded-[1px] bg-[color:var(--color-success)] animate-pulse" />
          <span className="font-bold tabular-nums">
            {callsUsed}/{callsCap}
          </span>
          <span className="text-muted">·</span>
          <span className="font-bold text-primary tabular-nums">
            ${usdUsed} / ${usdCap}
          </span>
          <span className="text-muted">·</span>
          <span className="stamp stamp-primary !py-0">{weekKey}</span>
        </div>

        {/* Jump Button (Cmd-K / Ctrl-K) */}
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
          }}
          className="btn btn-ghost hidden sm:inline-flex"
          title="Jump to vertical, run, lesson, or probe (Cmd-K / Ctrl-K or /)"
          aria-label="Open command palette"
        >
          <Search className="w-3.5 h-3.5 text-primary" />
          <span>Jump</span>
          <kbd className="text-[9px] px-1 py-0.2 rounded-[var(--radius-stamp)] bg-app border border-app text-muted normal-case tracking-normal">
            ⌘K
          </kbd>
          <kbd className="text-[9px] px-1 py-0.2 rounded-[var(--radius-stamp)] bg-app border border-app text-muted normal-case tracking-normal">
            /
          </kbd>
        </button>

        {/* Density Control */}
        <div
          className="hidden md:flex items-center rounded-[var(--radius-control)] bg-app border border-app p-0.5 font-mono text-[10px]"
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
              className={`px-2 py-0.5 rounded-[var(--radius-stamp)] capitalize transition-all ${density === mode
                ? 'bg-primary-container text-primary font-bold border border-[color:var(--color-primary)]/40'
                : 'text-muted hover:text-main border border-transparent'
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
