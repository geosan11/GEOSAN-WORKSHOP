import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigation, Screen } from '../lib/navigation';
import { useProjects } from '../hooks/useProjects';
import { useTasks } from '../hooks/useTasks';
import {
  Search,
  Inbox,
  FolderGit2,
  Terminal,
  Brain,
  DollarSign,
  Activity,
  Settings,
  FileCode,
  ArrowRight,
  X
} from 'lucide-react';

interface PaletteOption {
  id: string;
  category: 'Screen' | 'Project' | 'Task' | 'Recent';
  title: string;
  subtitle?: string;
  hint?: string;
  icon: React.ElementType;
  screen: Screen;
  disabled?: boolean;
  disabledReason?: string;
}

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('aether_recent_destinations');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.length > 0) return parsed;
      }
      return ['screen-inbox', 'project-proj-ehi-001'];
    } catch {
      return ['screen-inbox', 'project-proj-ehi-001'];
    }
  });

  const { screen: currentScreen, navigate } = useNavigation();
  const { projects } = useProjects();
  const { tasks } = useTasks();

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const recordRecent = (id: string) => {
    const updated = [id, ...recentIds.filter((r) => r !== id)].slice(0, 4);
    setRecentIds(updated);
    try {
      localStorage.setItem('aether_recent_destinations', JSON.stringify(updated));
    } catch {}
  };

  // Global Keyboard Listener for Cmd-K / Ctrl-K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build searchable items in empty query order:
  // 1. Recent destinations
  // 2. Screens
  // 3. Projects (Click opens Work)
  // 4. Open tasks (An open project's tasks sort first, click opens that run)
  const items: PaletteOption[] = useMemo(() => {
    const screens: PaletteOption[] = [
      { id: 'screen-inbox', category: 'Screen', title: 'Inbox', subtitle: 'Operator triage & awaiting approvals', icon: Inbox, screen: { kind: 'inbox' } },
      { id: 'screen-projects', category: 'Screen', title: 'Projects', subtitle: 'Managed client verticals list', icon: FolderGit2, screen: { kind: 'projects' } },
      { id: 'screen-runs', category: 'Screen', title: 'Runs', subtitle: 'Execution traces and approval gates', icon: Terminal, screen: { kind: 'runs' } },
      { id: 'screen-knowledge', category: 'Screen', title: 'Knowledge', subtitle: 'Engineering post-mortems and invariant rules', icon: Brain, screen: { kind: 'knowledge' } },
      { id: 'screen-costs', category: 'Screen', title: 'Fleet Money', subtitle: 'Weekly inference ledger and rate admission', icon: DollarSign, screen: { kind: 'costs' } },
      { id: 'screen-probes', category: 'Screen', title: 'Probes', subtitle: 'Production synthetic probes and edge telemetry', icon: Activity, screen: { kind: 'monitoring' } },
      { id: 'screen-settings', category: 'Screen', title: 'Settings', subtitle: 'MCP plane and platform servers', icon: Settings, screen: { kind: 'settings' } }
    ];

    const projectItems: PaletteOption[] = projects.map((p) => ({
      id: `project-${p.id}`,
      category: 'Project',
      title: p.name.split(' (')[0],
      subtitle: `${p.vertical} · Click opens Work`,
      icon: FolderGit2,
      screen: { kind: 'project', projectId: p.id, tab: 'work' }
    }));

    const activeProjectId = currentScreen.kind === 'project' ? currentScreen.projectId : undefined;

    // Open tasks sorted so active project's tasks sort first
    const sortedTasks = [...tasks]
      .filter((t) => t.status !== 'done' && t.status !== 'cancelled')
      .sort((a, b) => {
        if (activeProjectId) {
          if (a.project_id === activeProjectId && b.project_id !== activeProjectId) return -1;
          if (b.project_id === activeProjectId && a.project_id !== activeProjectId) return 1;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

    const getStatusHint = (status: string) => {
      switch (status) {
        case 'awaiting_approval':
          return 'Waiting on you';
        case 'running':
        case 'building':
          return 'Working';
        case 'done':
        case 'production':
          return 'Healthy';
        case 'failed':
          return 'Failed';
        default:
          return 'Queued';
      }
    };

    const taskItems: PaletteOption[] = sortedTasks.slice(0, 15).map((t) => {
      const proj = projects.find((p) => p.id === t.project_id);
      return {
        id: `task-${t.id}`,
        category: 'Task',
        title: t.prompt.split('\n')[0] || t.id,
        subtitle: `${proj?.name.split(' (')[0] || t.project_id} · ${t.task_type}`,
        hint: getStatusHint(t.status),
        icon: FileCode,
        screen: { kind: 'runs', runId: t.id }
      };
    });

    const allBaseItems = [...screens, ...projectItems, ...taskItems];

    // Build recent items from recentIds
    const recentItems: PaletteOption[] = [];
    for (const rid of recentIds) {
      const found = allBaseItems.find((b) => b.id === rid);
      if (found) {
        recentItems.push({
          ...found,
          id: `recent-${found.id}`,
          category: 'Recent',
          subtitle: `Recent · ${found.subtitle || found.category}`
        });
      }
    }

    return [...recentItems, ...screens, ...projectItems, ...taskItems];
  }, [projects, tasks, currentScreen, recentIds]);

  // Local filter
  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase().trim();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle?.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q)
    );
  }, [items, query]);

  // Reset selected index on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle keyboard list navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filtered[selectedIndex];
      if (selected && !selected.disabled) {
        recordRecent(selected.id.replace('recent-', ''));
        navigate(selected.screen);
        setIsOpen(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label="Jump to a vertical, run, lesson, or probe"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-2xl bg-[#161b22] sm:border sm:border-white/10 sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col font-mono text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b border-white/5 bg-[#0d1117] flex items-center gap-3">
          <Search className="w-4 h-4 text-[#F0B230] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Jump to a vertical, run, lesson, or probe"
            aria-label="Jump to a vertical, run, lesson, or probe"
            className="flex-1 bg-transparent text-[#e6edf3] placeholder:text-slate-500 focus:outline-none text-xs font-mono"
          />
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1 rounded text-slate-400 hover:text-white"
            aria-label="Close jump dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filtered Options List */}
        <div
          ref={listRef}
          role="listbox"
          className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[500px]"
        >
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400 font-sans">
              No matches found for "{query}"
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = selectedIndex === idx;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  role="option"
                  aria-selected={isSelected}
                  type="button"
                  disabled={item.disabled}
                  onClick={() => {
                    if (!item.disabled) {
                      recordRecent(item.id.replace('recent-', ''));
                      navigate(item.screen);
                      setIsOpen(false);
                    }
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full text-left p-3 rounded-xl flex items-center justify-between gap-3 transition-colors ${
                    isSelected
                      ? 'bg-[#1c2333] border border-emerald-500/40 text-slate-100'
                      : 'bg-transparent text-slate-400 hover:text-slate-100'
                  } ${item.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        isSelected ? 'bg-emerald-950 text-emerald-300' : 'bg-white/5 text-slate-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold truncate ${isSelected ? 'text-emerald-400' : 'text-slate-200'}`}>
                          {item.title}
                        </span>
                        {item.hint && (
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                              item.hint === 'Waiting on you'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : item.hint === 'Working'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                                : item.hint === 'Failed'
                                ? 'bg-rose-950 text-rose-400 border border-rose-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {item.hint}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <span className="text-[11px] text-slate-400 truncate block font-sans">
                          {item.subtitle}
                        </span>
                      )}
                      {item.disabledReason && (
                        <span className="text-[10px] text-rose-400 italic block">
                          {item.disabledReason}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 text-[10px] text-slate-400">
                    <span className="uppercase text-[9px] px-1.5 py-0.5 rounded bg-white/5">
                      {item.category}
                    </span>
                    {isSelected && <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-white/5 bg-[#0d1117] flex items-center justify-between text-[10px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <span>Cmd-K / Ctrl-K Quick Jump</span>
        </div>
      </div>
    </div>
  );
};
