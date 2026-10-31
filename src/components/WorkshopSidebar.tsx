import React from 'react';
import { useNavigation } from '../lib/navigation';
import { useAuth } from '../lib/auth';
import { isDemoMode } from '../lib/supabase';
import {
  FolderKanban,
  FolderPlus,
  Bot,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Radio,
  LayoutDashboard,
  Activity,
  DollarSign
} from 'lucide-react';

interface WorkshopSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenNewProject: () => void;
}

export const WorkshopSidebar: React.FC<WorkshopSidebarProps> = ({
  collapsed,
  onToggleCollapse,
  onOpenNewProject,
}) => {
  const { screen, navigate } = useNavigation();
  const { user, signOut } = useAuth();

  const isPortfolioActive = screen.kind === 'portfolio' || screen.kind === 'inbox';
  const isProjectsActive = screen.kind === 'projects' || screen.kind === 'project';
  const isAgentsActive = screen.kind === 'runs' || screen.kind === 'console';
  const isMonitoringActive = screen.kind === 'monitoring';
  const isCostActive = screen.kind === 'costs';
  const isSettingsActive = screen.kind === 'settings';

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 z-40 bg-[#09090b] border-r border-white/[0.06] text-zinc-200 flex flex-col transition-all duration-150 ease-out font-mono text-xs select-none ${
        collapsed ? 'w-14' : 'w-[13.5rem]'
      }`}
    >
      {/* Brand Header */}
      <div className="p-3 border-b border-white/[0.06] flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate({ kind: 'projects' })}
          className="flex items-center gap-2.5 text-left group focus-visible:ring-1 focus-visible:ring-indigo-500/50 rounded-md outline-none"
        >
          <div className="w-6 h-6 rounded-md bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:border-indigo-400 transition-colors shrink-0">
            <Radio className="w-3.5 h-3.5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-xs tracking-wider text-zinc-100 uppercase">
                GEOSAN
              </span>
              <span className="text-[9px] text-zinc-500 tracking-normal font-sans">
                Workshop
              </span>
            </div>
          )}
        </button>

        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] transition-colors duration-150 ease-out focus-visible:ring-1 focus-visible:ring-indigo-500/50 outline-none"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {/* 1. Portfolio */}
        <button
          type="button"
          onClick={() => navigate({ kind: 'portfolio' })}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg font-medium transition-all duration-150 ease-out text-left focus-visible:ring-1 focus-visible:ring-indigo-500/50 outline-none ${
            isPortfolioActive
              ? 'bg-indigo-600/10 text-indigo-300 border border-indigo-500/30 shadow-xs'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] border border-transparent'
          }`}
          title="Portfolio"
        >
          <LayoutDashboard className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Portfolio</span>}
        </button>

        {/* 2. Projects */}
        <button
          type="button"
          onClick={() => navigate({ kind: 'projects' })}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg font-medium transition-all duration-150 ease-out text-left focus-visible:ring-1 focus-visible:ring-indigo-500/50 outline-none ${
            isProjectsActive
              ? 'bg-indigo-600/10 text-indigo-300 border border-indigo-500/30 shadow-xs'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] border border-transparent'
          }`}
          title="Projects"
        >
          <FolderKanban className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Projects</span>}
        </button>

        {/* 3. New Project */}
        <button
          type="button"
          onClick={onOpenNewProject}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg font-medium text-zinc-400 hover:text-indigo-300 hover:bg-indigo-500/10 border border-transparent hover:border-indigo-500/20 transition-all duration-150 ease-out text-left focus-visible:ring-1 focus-visible:ring-indigo-500/50 outline-none"
          title="New Project"
        >
          <FolderPlus className="w-4 h-4 text-indigo-400 shrink-0" />
          {!collapsed && <span>+ New Project</span>}
        </button>

        {/* 4. Agents */}
        <button
          type="button"
          onClick={() => navigate({ kind: 'runs' })}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg font-medium transition-all duration-150 ease-out text-left focus-visible:ring-1 focus-visible:ring-indigo-500/50 outline-none ${
            isAgentsActive
              ? 'bg-indigo-600/10 text-indigo-300 border border-indigo-500/30 shadow-xs'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] border border-transparent'
          }`}
          title="Agents"
        >
          <Bot className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Agents</span>}
        </button>

        {/* 5. Monitoring */}
        <button
          type="button"
          onClick={() => navigate({ kind: 'monitoring' })}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg font-medium transition-all duration-150 ease-out text-left focus-visible:ring-1 focus-visible:ring-indigo-500/50 outline-none ${
            isMonitoringActive
              ? 'bg-indigo-600/10 text-indigo-300 border border-indigo-500/30 shadow-xs'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] border border-transparent'
          }`}
          title="Monitoring"
        >
          <Activity className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Monitoring</span>}
        </button>

        {/* 6. Cost */}
        <button
          type="button"
          onClick={() => navigate({ kind: 'costs' })}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg font-medium transition-all duration-150 ease-out text-left focus-visible:ring-1 focus-visible:ring-indigo-500/50 outline-none ${
            isCostActive
              ? 'bg-indigo-600/10 text-indigo-300 border border-indigo-500/30 shadow-xs'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] border border-transparent'
          }`}
          title="Cost"
        >
          <DollarSign className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Cost</span>}
        </button>

        {/* 7. Settings */}
        <button
          type="button"
          onClick={() => navigate({ kind: 'settings' })}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg font-medium transition-all duration-150 ease-out text-left focus-visible:ring-1 focus-visible:ring-indigo-500/50 outline-none ${
            isSettingsActive
              ? 'bg-indigo-600/10 text-indigo-300 border border-indigo-500/30 shadow-xs'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] border border-transparent'
          }`}
          title="Settings"
        >
          <Settings className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </button>
      </nav>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-white/[0.06] space-y-2">
        {/* Demo Mode Badge */}
        {isDemoMode && !collapsed && (
          <div className="px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300/90 text-[10px] flex items-center justify-between">
            <span className="font-bold">Demo Mode</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          </div>
        )}

        {/* User Session Info / Sign Out */}
        <div className="flex items-center justify-between">
          {!collapsed ? (
            <div className="min-w-0 pr-2">
              <p className="text-[11px] text-zinc-300 truncate font-sans">
                {user?.email || 'operator'}
              </p>
              <p className="text-[9px] text-zinc-500 uppercase tracking-wider">
                Active
              </p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={signOut}
            className="p-1.5 rounded text-zinc-400 hover:text-rose-400 hover:bg-white/[0.04] transition-colors focus-visible:ring-1 focus-visible:ring-indigo-500/50 outline-none"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
