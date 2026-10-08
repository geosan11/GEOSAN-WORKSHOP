import React, { useState } from 'react';
import { useNavigation, Screen } from '../lib/navigation';
import { useProjects } from '../hooks/useProjects';
import { useTasks } from '../hooks/useTasks';
import { useQA } from '../hooks/useQA';
import {
  Inbox,
  FolderGit2,
  Terminal,
  Brain,
  DollarSign,
  Activity,
  Settings as SettingsIcon,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';
import { useTheme } from '../lib/theme';

interface FleetNavItem {
  id: string;
  kind: Screen['kind'];
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  screen: Screen;
}

export const MobileNavBar: React.FC = () => {
  const { screen, navigate } = useNavigation();
  const { projects } = useProjects();
  const { tasks } = useTasks();
  const { qaFindings } = useQA();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { toggleTheme } = useTheme();

  // Waiting count
  const awaitingTasksCount = tasks.filter((t) => t.status === 'awaiting_approval').length;
  const p0FindingsCount = qaFindings.filter(
    (f) => f.status === 'open' && (f.severity === 'critical' || f.severity === 'high')
  ).length;
  const waitingCount = awaitingTasksCount + p0FindingsCount;

  const fleetItems: FleetNavItem[] = [
    { id: 'inbox', kind: 'inbox', label: 'Inbox', icon: Inbox, screen: { kind: 'inbox' } },
    { id: 'projects', kind: 'projects', label: 'Projects', icon: FolderGit2, screen: { kind: 'projects' } },
    { id: 'runs', kind: 'runs', label: 'Runs', icon: Terminal, screen: { kind: 'runs' } },
    { id: 'knowledge', kind: 'knowledge', label: 'Knowledge', icon: Brain, screen: { kind: 'knowledge' } },
    { id: 'costs', kind: 'costs', label: 'Money', icon: DollarSign, screen: { kind: 'costs' } },
    { id: 'monitoring', kind: 'monitoring', label: 'Probes', icon: Activity, screen: { kind: 'monitoring' } },
    { id: 'settings', kind: 'settings', label: 'Settings', icon: SettingsIcon, screen: { kind: 'settings' } }
  ];

  const isItemActive = (item: FleetNavItem) => {
    if (item.id === 'inbox') {
      return screen.kind === 'inbox' || screen.kind === 'portfolio';
    }
    if (item.id === 'runs') {
      return screen.kind === 'runs' || screen.kind === 'console';
    }
    if (item.id === 'projects') {
      return screen.kind === 'projects' || screen.kind === 'project';
    }
    return screen.kind === item.kind;
  };

  const go = (targetScreen: Screen) => {
    setDrawerOpen(false);
    navigate(targetScreen);
  };

  return (
    <>
      {/* Slide-over Drawer for All 7 Fleet Items + 4 Verticals */}
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
            className="relative bg-[#161b22] border-t border-white/10 rounded-t-2xl shadow-2xl p-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))] space-y-4 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Fleet Navigation</p>
                <p className="text-sm font-bold text-[#e6edf3] font-mono">AetherOrch Command</p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 7 Fleet Items Grid */}
            <div className="space-y-1">
              <div className="text-[10px] font-mono font-bold text-slate-500 uppercase px-1">
                Fleet Items
              </div>
              <div className="grid grid-cols-2 gap-2">
                {fleetItems.map((item) => {
                  const Icon = item.icon;
                  const active = isItemActive(item);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => go(item.screen)}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-left min-h-[44px] transition-colors ${
                        active
                          ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                          : 'bg-[#0d1117] border-white/5 text-slate-300 hover:text-white hover:border-white/20'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span className="text-xs font-mono font-bold truncate flex-1">{item.label}</span>
                      {item.id === 'inbox' && waitingCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[10px] font-mono font-bold border border-amber-500/30">
                          {waitingCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4 Open Verticals */}
            <div className="space-y-1 pt-2 border-t border-white/5">
              <div className="text-[10px] font-mono font-bold text-slate-500 uppercase px-1">
                Open Vertical
              </div>
              <div className="space-y-1.5">
                {projects.map((p) => {
                  const active = screen.kind === 'project' && screen.projectId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => go({ kind: 'project', projectId: p.id, tab: 'work' })}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left min-h-[44px] transition-colors ${
                        active
                          ? 'bg-[#1c2333] border-[#F0B230]/50 text-[#FFBD59]'
                          : 'bg-[#0d1117] border-white/5 text-slate-300 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                        <span className="text-xs font-mono font-semibold truncate">
                          {p.name.split(' (')[0]}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Drawer Footer Actions (Theme Toggle) */}
          <div className="mt-auto p-4 border-t border-white/5 space-y-2">
            <button
              type="button"
              onClick={() => {
                toggleTheme();
                setDrawerOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border bg-white/5 border-white/10 text-slate-300 hover:text-white transition-colors"
            >
              <span className="text-xs font-mono font-bold">Toggle Theme</span>
            </button>
          </div>
        </div>
      )}

      {/* Fixed Bottom Bar: 7 Items cleanly formatted with target >= 44px */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#12171f]/95 border-t border-white/10 backdrop-blur-lg flex items-center justify-between px-1 h-[62px] pb-[env(safe-area-inset-bottom,0px)] overflow-x-auto scrollbar-none"
        aria-label="Mobile Fleet Navigation"
      >
        {fleetItems.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(item);

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => go(item.screen)}
              className={`flex flex-col items-center justify-center flex-1 min-w-[44px] min-h-[44px] py-1 transition-colors relative ${
                active ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className="w-4 h-4 mb-0.5" />
                {item.id === 'inbox' && waitingCount > 0 && (
                  <span className="absolute -top-1 -right-2 w-3.5 h-3.5 rounded-full bg-amber-500 text-black text-[9px] font-mono font-bold flex items-center justify-center">
                    {waitingCount}
                  </span>
                )}
              </div>
              <span className="text-[9px] font-mono truncate">{item.label}</span>
            </button>
          );
        })}

        {/* Menu drawer button */}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex flex-col items-center justify-center min-w-[44px] min-h-[44px] py-1 text-slate-400 hover:text-white transition-colors"
          aria-label="Open full fleet menu"
        >
          <Menu className="w-4 h-4 mb-0.5" />
          <span className="text-[9px] font-mono">Menu</span>
        </button>
      </nav>
    </>
  );
};
