import React, { useState } from 'react';
import { useNavigation, Screen } from '../lib/navigation';
import { useProjects } from '../hooks/useProjects';
import { useTasks } from '../hooks/useTasks';
import { useQA } from '../hooks/useQA';
import { Menu, X, ChevronRight } from 'lucide-react';
import { useTheme } from '../lib/theme';
import {
  NAV_SECTIONS,
  NAV_LEAVES,
  isSectionActive,
  isLeafActive,
} from '../lib/navIA';

export const MobileNavBar: React.FC = () => {
  const { screen, navigate } = useNavigation();
  const { projects } = useProjects();
  const { tasks } = useTasks();
  const { qaFindings } = useQA();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { toggleTheme } = useTheme();

  const awaitingTasksCount = tasks.filter((t) => t.status === 'awaiting_approval').length;
  const p0FindingsCount = qaFindings.filter(
    (f) => f.status === 'open' && (f.severity === 'critical' || f.severity === 'high')
  ).length;
  const waitingCount = awaitingTasksCount + p0FindingsCount;

  const go = (targetScreen: Screen) => {
    setDrawerOpen(false);
    navigate(targetScreen);
  };

  return (
    <>
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Close navigation drawer"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Workspace navigation drawer"
            className="relative bg-card border-t border-app rounded-t-2xl shadow-2xl p-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))] space-y-4 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-2 border-b border-app">
              <div>
                <p className="text-meta">Navigation</p>
                <p className="text-sm font-bold text-main font-mono">GEOSAN Ops</p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-2 rounded-lg text-muted hover:text-main hover:bg-white/5 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {NAV_SECTIONS.map((section) => (
              <div key={section.id} className="space-y-1">
                <div className="text-meta px-1">{section.label}</div>
                <div className="grid grid-cols-2 gap-2">
                  {section.items.map((leaf) => {
                    const Icon = leaf.icon;
                    const active = isLeafActive(leaf, screen);
                    return (
                      <button
                        key={leaf.id}
                        type="button"
                        onClick={() => go(leaf.screen)}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border text-left min-h-[44px] transition-colors ${active
                            ? 'bg-primary-container border-[color:var(--color-primary)]/50 text-primary'
                            : 'bg-app border-app text-slate-300 hover:text-white hover:border-white/20'
                          }`}
                      >
                        <Icon className="w-4 h-4 shrink-0 text-primary" />
                        <span className="text-xs font-mono font-bold truncate flex-1">
                          {leaf.label}
                        </span>
                        {leaf.id === 'inbox' && waitingCount > 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[10px] font-mono font-bold border border-amber-500/30">
                            {waitingCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="space-y-1 pt-2 border-t border-app">
              <div className="text-meta px-1">Open projects</div>
              <div className="space-y-1.5">
                {projects.map((p) => {
                  const active = screen.kind === 'project' && screen.projectId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => go({ kind: 'project', projectId: p.id, tab: 'work' })}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left min-h-[44px] transition-colors ${active
                          ? 'bg-card-elevated border-[color:var(--color-primary)]/50 text-primary'
                          : 'bg-app border-app text-slate-300 hover:text-white'
                        }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                        <span className="text-xs font-mono font-semibold truncate">
                          {p.name.split(' (')[0]}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-app">
              <button
                type="button"
                onClick={() => {
                  toggleTheme();
                  setDrawerOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border bg-white/5 border-app text-slate-300 hover:text-white transition-colors"
              >
                <span className="text-xs font-mono font-bold">Toggle Theme</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#12171f]/95 border-t border-app backdrop-blur-lg flex items-center justify-between px-1 h-[62px] pb-[env(safe-area-inset-bottom,0px)]"
        aria-label="Primary sections"
      >
        {NAV_SECTIONS.map((section) => {
          const Icon = section.icon;
          const active = isSectionActive(section, screen);
          const showBadge = section.id === 'home' && waitingCount > 0;

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => go(section.defaultScreen)}
              className={`flex flex-col items-center justify-center flex-1 min-w-[44px] min-h-[44px] py-1 transition-colors relative ${active ? 'text-primary font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              <div className="relative">
                <Icon className="w-4 h-4 mb-0.5" />
                {showBadge && (
                  <span className="absolute -top-1 -right-2 w-3.5 h-3.5 rounded-full bg-amber-500 text-black text-[9px] font-mono font-bold flex items-center justify-center">
                    {waitingCount}
                  </span>
                )}
              </div>
              <span className="text-[9px] font-mono truncate">{section.label}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex flex-col items-center justify-center min-w-[44px] min-h-[44px] py-1 text-slate-400 hover:text-white transition-colors"
          aria-label="Open full navigation menu"
        >
          <Menu className="w-4 h-4 mb-0.5" />
          <span className="text-[9px] font-mono">More</span>
        </button>
      </nav>

      {/* Keep leaf count reachable for a11y scanners / tests */}
      <span className="sr-only">{NAV_LEAVES.length} destinations</span>
    </>
  );
};
