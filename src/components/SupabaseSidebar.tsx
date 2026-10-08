import React from 'react';
import { useNavigation, Screen } from '../lib/navigation';
import { useProjects } from '../hooks/useProjects';
import { useTasks } from '../hooks/useTasks';
import { useQA } from '../hooks/useQA';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { SupabaseLogo } from './ServiceLogos';
import {
  Inbox,
  FolderGit2,
  Terminal,
  Brain,
  DollarSign,
  Activity,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  LogOut,
  Layers,
  Plus
} from 'lucide-react';
import { ProjectWizardModal } from './ProjectWizardModal';

interface SupabaseSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

interface FleetItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  screen: Screen;
  badge?: number | string;
  badgeColor?: 'amber' | 'muted';
}

export const SupabaseSidebar: React.FC<SupabaseSidebarProps> = ({
  collapsed,
  onToggleCollapse
}) => {
  const { screen, navigate } = useNavigation();
  const { projects } = useProjects();
  const { tasks } = useTasks();
  const { qaFindings } = useQA();
  const { user, signOut } = useAuth();
  const { isLight, toggleTheme } = useTheme();
  const [isWizardOpen, setIsWizardOpen] = React.useState(false);

  // Calculate waiting count for Inbox (awaiting_approval tasks + open P0 findings)
  const awaitingTasksCount = tasks.filter((t) => t.status === 'awaiting_approval').length;
  const p0FindingsCount = qaFindings.filter(
    (f) => f.status === 'open' && (f.severity === 'critical' || f.severity === 'high')
  ).length;
  const waitingCount = awaitingTasksCount + p0FindingsCount;

  const fleetItems: FleetItem[] = [
    {
      id: 'inbox',
      label: 'Inbox',
      icon: Inbox,
      screen: { kind: 'inbox' },
      badge: waitingCount > 0 ? waitingCount : undefined,
      badgeColor: 'amber'
    },
    {
      id: 'projects',
      label: 'Projects',
      icon: FolderGit2,
      screen: { kind: 'projects' }
    },
    {
      id: 'runs',
      label: 'Runs',
      icon: Terminal,
      screen: { kind: 'runs' }
    },
    {
      id: 'knowledge',
      label: 'Knowledge',
      icon: Brain,
      screen: { kind: 'knowledge' }
    },
    {
      id: 'costs',
      label: 'Money',
      icon: DollarSign,
      screen: { kind: 'costs' }
    },
    {
      id: 'monitoring',
      label: 'Probes',
      icon: Activity,
      screen: { kind: 'monitoring' }
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      screen: { kind: 'settings' }
    }
  ];

  const isFleetItemActive = (item: FleetItem) => {
    if (item.id === 'inbox') {
      return screen.kind === 'inbox' || screen.kind === 'portfolio';
    }
    if (item.id === 'runs') {
      return screen.kind === 'runs' || screen.kind === 'console';
    }
    if (item.id === 'projects') {
      return screen.kind === 'projects';
    }
    return screen.kind === item.id;
  };

  const isProjectActive = (projectId: string) => {
    return screen.kind === 'project' && screen.projectId === projectId;
  };

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 z-40 bg-[#12171f] border-r border-white/10 text-[#e6edf3] flex flex-col transition-all duration-300 font-sans shadow-2xl ${
        collapsed ? 'w-16' : 'w-[14rem]'
      }`}
    >
      {/* Brand Header */}
      <div className="p-3 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div
            onClick={() => navigate({ kind: 'inbox' })}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-md group-hover:border-emerald-400 transition-colors">
              <SupabaseLogo className="w-4 h-4" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-xs tracking-tight text-[#e6edf3] font-mono group-hover:text-emerald-400 transition-colors flex items-center gap-1">
                  AetherOrch
                  <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950 text-emerald-400 font-bold border border-emerald-500/30">
                    FLEET
                  </span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">
                  Autonomous Ops
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition-colors focus:outline-none"
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Navigation Groups Container */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-5 scrollbar-none">
        {/* FLEET SECTION */}
        <div className="space-y-1">
          {!collapsed && (
            <div className="px-2 py-1 text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase">
              FLEET
            </div>
          )}

          {fleetItems.map((item) => {
            const Icon = item.icon;
            const active = isFleetItemActive(item);

            return (
              <button
                key={item.id}
                onClick={() => navigate(item.screen)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all group relative ${
                  active
                    ? 'bg-emerald-950/50 text-emerald-400 font-semibold border-l-2 border-emerald-400 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    active ? 'text-emerald-400' : 'text-slate-400 group-hover:text-emerald-300'
                  }`}
                />

                {!collapsed && (
                  <span className="truncate flex-1 text-left font-mono text-[12px]">
                    {item.label}
                  </span>
                )}

                {!collapsed && item.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                      item.badgeColor === 'amber'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-white/5 text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* OPEN VERTICAL SECTION */}
        <div className="space-y-1 pt-2 border-t border-white/5">
          {!collapsed && (
            <div className="px-2 py-1 text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase flex items-center justify-between">
              <span>OPEN VERTICAL</span>
              <button
                type="button"
                onClick={() => setIsWizardOpen(true)}
                title="Add New Vertical / Project"
                className="p-0.5 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          )}

          {projects.map((p) => {
            const active = isProjectActive(p.id);
            return (
              <button
                key={p.id}
                onClick={() => navigate({ kind: 'project', projectId: p.id, tab: 'work' })}
                title={collapsed ? p.name : undefined}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-all text-left group ${
                  active
                    ? 'bg-[#161b22] text-[#FFBD59] font-bold border-l-2 border-[#F0B230]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    active ? 'bg-[#F0B230]' : 'bg-emerald-500/60 group-hover:bg-emerald-400'
                  }`}
                />
                {!collapsed && (
                  <span className="truncate font-mono text-[11px]">
                    {p.name.split(' (')[0]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Operator Identity & Theme Toggle */}
      <div className="p-3 border-t border-white/10 space-y-2 font-mono text-xs">
        {!collapsed && (
          <div className="p-2.5 rounded-lg bg-[#161b22] border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <div className="truncate">
                <span className="text-slate-200 font-bold block truncate text-[11px]">
                  {user?.email || 'operator@ehi.internal'}
                </span>
                <span className="text-[9px] text-emerald-400 block font-semibold">
                  Role: {user?.user_metadata?.org_role || 'owner'}
                </span>
              </div>
            </div>

            <button
              onClick={signOut}
              className="text-slate-400 hover:text-red-400 p-1 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <button
          onClick={toggleTheme}
          className={`w-full py-1.5 rounded-lg border text-[11px] font-mono font-bold flex items-center justify-center gap-2 transition-all ${
            isLight
              ? 'bg-amber-100 text-amber-900 border-amber-300'
              : 'bg-white/5 text-slate-400 border-white/5 hover:text-white hover:bg-white/10'
          }`}
        >
          {isLight ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
              {!collapsed && <span>Clean Light Mode</span>}
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-amber-400" />
              {!collapsed && <span>Obsidian Dark Mode</span>}
            </>
          )}
        </button>
      </div>

      <ProjectWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
      />
    </aside>
  );
};
