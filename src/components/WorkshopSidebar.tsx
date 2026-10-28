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
  Radio
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

  const isProjectsActive = screen.kind === 'projects' || screen.kind === 'project' || screen.kind === 'inbox' || screen.kind === 'portfolio';
  const isAgentsActive = screen.kind === 'runs' || screen.kind === 'console';
  const isSettingsActive = screen.kind === 'settings';

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 z-40 bg-[#0c0d11] border-r border-white/[0.08] text-[#f3f4f6] flex flex-col transition-all duration-200 font-mono text-xs select-none ${
        collapsed ? 'w-14' : 'w-[13.5rem]'
      }`}
    >
      {/* Brand Header */}
      <div className="p-3 border-b border-white/[0.08] flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate({ kind: 'projects' })}
          className="flex items-center gap-2.5 text-left group focus:outline-none"
        >
          <div className="w-6 h-6 rounded-md bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 group-hover:border-indigo-400 transition-colors shrink-0">
            <Radio className="w-3.5 h-3.5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-extrabold text-xs tracking-wider text-[#f3f4f6] uppercase">
                GEOSAN
              </span>
              <span className="text-[9px] text-[#8e95a3] tracking-normal font-sans">
                Workshop
              </span>
            </div>
          )}
        </button>

        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1 rounded text-[#8e95a3] hover:text-[#f3f4f6] hover:bg-white/5 transition-colors focus:outline-none"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Navigation Links — Exactly 4 links */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {/* 1. Projects */}
        <button
          type="button"
          onClick={() => navigate({ kind: 'projects' })}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg font-medium transition-all text-left ${
            isProjectsActive
              ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30'
              : 'text-[#8e95a3] hover:text-[#f3f4f6] hover:bg-white/[0.04] border border-transparent'
          }`}
          title="Projects"
        >
          <FolderKanban className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Projects</span>}
        </button>

        {/* 2. New Project */}
        <button
          type="button"
          onClick={onOpenNewProject}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg font-medium text-[#8e95a3] hover:text-indigo-300 hover:bg-indigo-500/10 border border-transparent hover:border-indigo-500/20 transition-all text-left"
          title="New Project"
        >
          <FolderPlus className="w-4 h-4 text-indigo-400 shrink-0" />
          {!collapsed && <span>+ New Project</span>}
        </button>

        {/* 3. Agents */}
        <button
          type="button"
          onClick={() => navigate({ kind: 'runs' })}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg font-medium transition-all text-left ${
            isAgentsActive
              ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30'
              : 'text-[#8e95a3] hover:text-[#f3f4f6] hover:bg-white/[0.04] border border-transparent'
          }`}
          title="Agents"
        >
          <Bot className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Agents</span>}
        </button>

        {/* 4. Settings */}
        <button
          type="button"
          onClick={() => navigate({ kind: 'settings' })}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg font-medium transition-all text-left ${
            isSettingsActive
              ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30'
              : 'text-[#8e95a3] hover:text-[#f3f4f6] hover:bg-white/[0.04] border border-transparent'
          }`}
          title="Settings"
        >
          <Settings className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </button>
      </nav>

      {/* Footer Info: Demo Mode Badge & User Logout */}
      <div className="p-2.5 border-t border-white/[0.08] space-y-2">
        {isDemoMode && (
          <div
            className={`px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] flex items-center gap-1.5 ${
              collapsed ? 'justify-center' : ''
            }`}
            title="Running in local demo mode without live Supabase database"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
            {!collapsed && <span>Demo mode</span>}
          </div>
        )}

        <div className="flex items-center justify-between gap-1 pt-0.5 text-[10px] text-[#8e95a3]">
          {!collapsed && (
            <span className="truncate" title={user?.email || 'operator@geosan.internal'}>
              {user?.email ? user.email.split('@')[0] : 'operator'}
            </span>
          )}
          <button
            type="button"
            onClick={signOut}
            className="p-1 rounded text-[#8e95a3] hover:text-rose-400 hover:bg-white/5 transition-colors ml-auto"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
