import React from 'react';
import { useNavigation } from '../lib/navigation';
import { useProjects } from '../hooks/useProjects';
import { useTasks } from '../hooks/useTasks';
import { useQA } from '../hooks/useQA';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { SupabaseLogo } from './ServiceLogos';
import {
  NAV_SECTIONS,
  isLeafActive,
  type NavLeaf,
} from '../lib/navIA';
import {
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  LogOut,
  Plus,
} from 'lucide-react';
import { ProjectWizardModal } from './ProjectWizardModal';

interface SupabaseSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const SupabaseSidebar: React.FC<SupabaseSidebarProps> = ({
  collapsed,
  onToggleCollapse,
}) => {
  const { screen, navigate } = useNavigation();
  const { projects } = useProjects();
  const { tasks } = useTasks();
  const { qaFindings } = useQA();
  const { user, signOut } = useAuth();
  const { isLight, toggleTheme } = useTheme();
  const [isWizardOpen, setIsWizardOpen] = React.useState(false);

  const awaitingTasksCount = tasks.filter((t) => t.status === 'awaiting_approval').length;
  const p0FindingsCount = qaFindings.filter(
    (f) => f.status === 'open' && (f.severity === 'critical' || f.severity === 'high')
  ).length;
  const waitingCount = awaitingTasksCount + p0FindingsCount;

  const leafBadge = (leaf: NavLeaf): number | undefined => {
    if (leaf.id === 'inbox' && waitingCount > 0) return waitingCount;
    return undefined;
  };

  const isProjectActive = (projectId: string) =>
    screen.kind === 'project' && screen.projectId === projectId;

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 z-40 bg-[#12171f] border-r border-app text-main flex flex-col transition-all duration-300 font-sans shadow-2xl ${collapsed ? 'w-16' : 'w-[14rem]'
        }`}
    >
      <div className="p-3 border-b border-app">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate({ kind: 'inbox' })}
            className="flex items-center gap-2.5 cursor-pointer group text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-primary-container border border-[color:var(--color-primary)]/40 flex items-center justify-center text-primary shadow-md group-hover:border-[color:var(--color-primary)] transition-colors">
              <SupabaseLogo className="w-4 h-4" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-xs tracking-tight text-main font-mono group-hover:text-primary transition-colors flex items-center gap-1">
                  GEOSAN
                  <span className="text-[9px] px-1 py-0.2 rounded bg-primary-container text-primary font-bold border border-[color:var(--color-primary)]/30">
                    OPS
                  </span>
                </span>
                <span className="text-[10px] text-muted font-mono truncate max-w-[120px]">
                  Command Center
                </span>
              </div>
            )}
          </button>

          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1 rounded-md text-muted hover:text-main hover:bg-white/5 transition-colors focus:outline-none"
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4 scrollbar-none">
        {NAV_SECTIONS.map((section) => (
          <div key={section.id} className="space-y-1">
            {!collapsed && (
              <div className="px-2 py-1 text-meta">{section.label}</div>
            )}

            {section.items.map((leaf) => {
              const Icon = leaf.icon;
              const active = isLeafActive(leaf, screen);
              const badge = leafBadge(leaf);

              return (
                <button
                  key={leaf.id}
                  type="button"
                  onClick={() => navigate(leaf.screen)}
                  title={collapsed ? leaf.label : undefined}
                  aria-label={badge !== undefined ? `${leaf.label}, ${badge} waiting` : leaf.label}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all group relative ${active
                    ? 'bg-primary-container text-primary font-semibold border-l-2 border-[color:var(--color-primary)] shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${active ? 'text-primary' : 'text-muted group-hover:text-primary'
                      }`}
                  />

                  {!collapsed && (
                    <span className="truncate flex-1 text-left font-mono text-[12px]">
                      {leaf.label}
                    </span>
                  )}

                  {!collapsed && badge !== undefined && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}

            {section.id === 'build' && (
              <div className="space-y-1 pt-1">
                {!collapsed && (
                  <div className="px-2 py-1 text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase flex items-center justify-between">
                    <span>Open</span>
                    <button
                      type="button"
                      onClick={() => setIsWizardOpen(true)}
                      title="Add New Project"
                      className="p-0.5 rounded text-muted hover:text-main hover:bg-white/10 transition-colors"
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
                      type="button"
                      onClick={() => navigate({ kind: 'project', projectId: p.id, tab: 'work' })}
                      title={collapsed ? p.name : undefined}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-all text-left group ${active
                        ? 'bg-card text-primary font-bold border-l-2 border-[color:var(--color-primary)]'
                        : 'text-muted hover:text-slate-200 hover:bg-white/5'
                        }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? 'bg-[color:var(--color-primary)]' : 'bg-emerald-500/60 group-hover:bg-emerald-400'
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
            )}
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-app space-y-2 font-mono text-xs">
        {!collapsed && (
          <div className="p-2.5 rounded-lg bg-card border border-app flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <div className="truncate">
                <span className="text-slate-200 font-bold block truncate text-[11px]">
                  {user?.email || 'operator@ehi.internal'}
                </span>
                <span className="text-[9px] text-primary block font-semibold">
                  Role: {user?.user_metadata?.org_role || 'owner'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={signOut}
              className="text-muted hover:text-red-400 p-1 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={toggleTheme}
          className={`w-full py-1.5 rounded-lg border text-[11px] font-mono font-bold flex items-center justify-center gap-2 transition-all ${isLight
            ? 'bg-amber-100 text-amber-900 border-amber-300'
            : 'bg-white/5 text-muted border-app hover:text-main hover:bg-white/10'
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

      <ProjectWizardModal isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} />
    </aside>
  );
};
