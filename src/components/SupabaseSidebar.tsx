import React, { useState } from 'react';
import { useNavigation, Screen } from '../lib/navigation';
import { useProjects } from '../hooks/useProjects';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { SupabaseLogo, AetherOrchLogo } from './ServiceLogos';
import {
  LayoutGrid,
  Compass,
  Brain,
  Terminal,
  DollarSign,
  Bug,
  Activity,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Zap,
  Layers,
  Database,
  Sun,
  Moon,
  LogOut,
  Sparkles
} from 'lucide-react';

interface SupabaseSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  screen: Screen;
  badge?: string;
  pulse?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export const SupabaseSidebar: React.FC<SupabaseSidebarProps> = ({
  collapsed,
  onToggleCollapse
}) => {
  const { screen, navigate } = useNavigation();
  const { projects } = useProjects();
  const { user, orgId, signOut } = useAuth();
  const { isLight, toggleTheme } = useTheme();

  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);

  // Active project selection helper
  const activeProjectId = screen.kind === 'project' ? screen.projectId : projects[0]?.id;
  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];

  const handleSelectProject = (projectId: string) => {
    navigate({ kind: 'project', projectId, tab: 'overview' });
    setProjectDropdownOpen(false);
  };

  const navGroups: NavGroup[] = [
    {
      label: 'WORKSPACE & PROJECTS',
      items: [
        {
          id: 'portfolio',
          label: 'Project Portfolio',
          icon: LayoutGrid,
          screen: { kind: 'portfolio' } as Screen,
          badge: `${projects.length}`
        },
        {
          id: 'discovery',
          label: 'SDLC Discovery',
          icon: Compass,
          screen: { kind: 'discovery' } as Screen
        },
        {
          id: 'knowledge',
          label: 'Knowledge Vault',
          icon: Brain,
          screen: { kind: 'knowledge' } as Screen
        }
      ]
    },
    {
      label: 'AGENT ORCHESTRATION',
      items: [
        {
          id: 'console',
          label: 'Agent Dispatch Console',
          icon: Terminal,
          screen: { kind: 'console' } as Screen,
          pulse: true
        }
      ]
    },
    {
      label: 'FINOPS & TELEMETRY',
      items: [
        {
          id: 'costs',
          label: 'Cost Center & Inference',
          icon: DollarSign,
          screen: { kind: 'costs' } as Screen
        }
      ]
    },
    {
      label: 'QUALITY & HEALTH',
      items: [
        {
          id: 'qa',
          label: 'QA Workbench',
          icon: Bug,
          screen: { kind: 'qa' } as Screen
        },
        {
          id: 'monitoring',
          label: 'Production Probes',
          icon: Activity,
          screen: { kind: 'monitoring' } as Screen
        }
      ]
    },
    {
      label: 'GOVERNANCE & PLATFORM',
      items: [
        {
          id: 'settings',
          label: 'Settings & MCP Plane',
          icon: Settings,
          screen: { kind: 'settings' } as Screen
        }
      ]
    }
  ];

  const isItemActive = (itemScreen: Screen) => {
    if (screen.kind === itemScreen.kind) {
      if (screen.kind !== 'project') return true;
      return screen.projectId === (itemScreen as { projectId: string }).projectId;
    }
    return false;
  };

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 z-40 bg-[#12171f] border-r border-white/10 text-[#e6edf3] flex flex-col transition-all duration-300 font-sans shadow-2xl ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Supabase Style Header & Project Selector */}
      <div className="p-3 border-b border-white/10 relative">
        <div className="flex items-center justify-between">
          <div
            onClick={() => navigate({ kind: 'portfolio' })}
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
                    PRO
                  </span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono truncate max-w-[130px]">
                  Supabase Infrastructure
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

        {/* Project Switcher Dropdown Bar (Supabase Style) */}
        {!collapsed && activeProject && (
          <div className="mt-3 relative">
            <button
              type="button"
              onClick={() => setProjectDropdownOpen((prev) => !prev)}
              className="w-full p-2 rounded-lg bg-[#161b22] hover:bg-[#1c2333] border border-white/10 text-left flex items-center justify-between text-xs font-mono transition-all group"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="font-semibold text-slate-200 truncate group-hover:text-white">
                  {activeProject.name}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {projectDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#161b22] border border-white/15 rounded-xl shadow-2xl py-1.5 z-50 max-h-56 overflow-y-auto text-xs font-mono">
                <div className="px-3 py-1 text-[10px] font-bold uppercase text-slate-500 border-b border-white/5">
                  Select Active Vertical
                </div>
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectProject(p.id)}
                    className={`w-full px-3 py-2 text-left hover:bg-emerald-950/40 hover:text-emerald-300 flex items-center justify-between transition-colors ${
                      p.id === activeProjectId ? 'bg-emerald-950/60 text-emerald-400 font-bold' : 'text-slate-300'
                    }`}
                  >
                    <span className="truncate">{p.name}</span>
                    <span className="text-[10px] text-slate-500 uppercase">{p.vertical}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sidebar Navigation Items */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4 scrollbar-none">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            {!collapsed && (
              <div className="px-2 py-1 text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase">
                {group.label}
              </div>
            )}

            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item.screen);

              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.screen)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-xs font-medium transition-all group relative ${
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

                  {!collapsed && item.badge && (
                    <span className="px-1.5 py-0.2 rounded bg-white/5 text-[10px] text-slate-400 font-mono font-bold">
                      {item.badge}
                    </span>
                  )}

                  {!collapsed && item.pulse && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Supabase Footer User / System Session */}
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
    </aside>
  );
};
