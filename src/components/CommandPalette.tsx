import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigation, Screen } from '../lib/navigation';
import { useProjects } from '../hooks/useProjects';
import { useTasks } from '../hooks/useTasks';
import {
  Search,
  Layers,
  FolderGit2,
  Terminal,
  Activity,
  Compass,
  BookOpen,
  DollarSign,
  ShieldCheck,
  Cpu,
  Settings,
  ArrowRight,
  X,
  FileCode,
  Workflow
} from 'lucide-react';

interface PaletteItem {
  id: string;
  category: 'Screen' | 'Project' | 'Task' | 'Action';
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  screen: Screen;
  badge?: string;
}

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { navigate } = useNavigation();
  const { projects } = useProjects();
  const { tasks } = useTasks();

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

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

  // Build searchable items
  const items: PaletteItem[] = useMemo(() => {
    const screens: PaletteItem[] = [
      { id: 'action-wizard', category: 'Action', title: 'Launch Project Wizard', subtitle: 'Guided repository setup & template configuration', icon: Workflow, screen: { kind: 'portfolio' }, badge: 'Wizard' },
      { id: 'screen-portfolio', category: 'Screen', title: 'Managed Project Portfolio', subtitle: 'Global enterprise dashboard', icon: Layers, screen: { kind: 'portfolio' } },
      { id: 'screen-console', category: 'Screen', title: 'Agent Console & Fleet Board', subtitle: 'Kanban dispatches & operator steers', icon: Terminal, screen: { kind: 'console' } },
      { id: 'screen-discovery', category: 'Screen', title: 'SDLC Architecture Discovery', subtitle: '6-phase scoping questionnaire', icon: Compass, screen: { kind: 'discovery' } },
      { id: 'screen-knowledge', category: 'Screen', title: 'Knowledge Vault & Retrospectives', subtitle: 'Verified post-mortems and LLM prompt exports', icon: BookOpen, screen: { kind: 'knowledge' } },
      { id: 'screen-costs', category: 'Screen', title: 'Cost Center & Attribution', subtitle: 'Weekly ledger burn rate', icon: DollarSign, screen: { kind: 'costs' } },
      { id: 'screen-qa', category: 'Screen', title: 'QA Test Runs & Invariants', subtitle: 'Automated crawler proof surface', icon: ShieldCheck, screen: { kind: 'qa' } },
      { id: 'screen-monitoring', category: 'Screen', title: 'Production Health Monitoring', subtitle: 'Live telemetry & uptime status', icon: Activity, screen: { kind: 'monitoring' } },
      { id: 'screen-settings', category: 'Screen', title: 'Platform Settings & Budgets', subtitle: 'Limits, API routing, and cache', icon: Settings, screen: { kind: 'settings' } }
    ];

    const projectItems: PaletteItem[] = projects.map((p) => ({
      id: `project-${p.id}`,
      category: 'Project',
      title: p.name,
      subtitle: `${p.vertical} · Status: ${p.status}`,
      icon: FolderGit2,
      badge: p.id,
      screen: { kind: 'project', projectId: p.id, tab: 'overview' }
    }));

    const taskItems: PaletteItem[] = tasks.slice(0, 15).map((t) => {
      const proj = projects.find((p) => p.id === t.project_id);
      return {
        id: `task-${t.id}`,
        category: 'Task',
        title: t.prompt.split('\n')[0] || t.id,
        subtitle: `${proj?.name || t.project_id} · ${t.status.toUpperCase()}`,
        icon: FileCode,
        badge: t.task_type,
        screen: { kind: 'project', projectId: t.project_id, tab: 'session', taskId: t.id }
      };
    });

    return [...screens, ...projectItems, ...taskItems];
  }, [projects, tasks]);

  // Filter items
  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase().trim();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle?.toLowerCase().includes(q) ||
        item.badge?.toLowerCase().includes(q) ||
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
      if (selected) {
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
      aria-label="Command Palette"
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
            placeholder="Jump to a screen, project, or task by ID/prompt... (Esc to close)"
            aria-label="Jump to"
            className="flex-1 bg-transparent text-[#e6edf3] placeholder:text-[#8b98a8]/60 focus:outline-none text-xs font-mono"
          />
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded text-[#8b98a8] hover:text-[#e6edf3]"
            aria-label="Close command palette"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filtered Results Listbox */}
        <div
          ref={listRef}
          role="listbox"
          className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[500px]"
        >
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-[#8b98a8] font-sans">
              No results matching "{query}"
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
                  onClick={() => {
                    navigate(item.screen);
                    setIsOpen(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full text-left p-3 rounded-xl flex items-center justify-between gap-3 transition-colors ${
                    isSelected
                      ? 'bg-[#1c2333] border border-[#F0B230]/40 text-[#e6edf3]'
                      : 'bg-transparent text-[#8b98a8] hover:text-[#e6edf3]'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        isSelected ? 'bg-[#F0B230]/20 text-[#FFBD59]' : 'bg-white/5 text-[#8b98a8]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold truncate ${isSelected ? 'text-[#FFBD59]' : 'text-[#e6edf3]'}`}>
                          {item.title}
                        </span>
                        {item.badge && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/5 text-[#8b98a8] border border-white/5">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <span className="text-[11px] text-[#8b98a8] truncate block font-sans">
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 text-[10px] text-[#8b98a8]">
                    <span className="uppercase text-[9px] px-1.5 py-0.5 rounded bg-white/5">
                      {item.category}
                    </span>
                    {isSelected && <ArrowRight className="w-3.5 h-3.5 text-[#F0B230]" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Legend */}
        <div className="px-4 py-2.5 border-t border-white/5 bg-[#0d1117] flex items-center justify-between text-[10px] text-[#8b98a8]">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <span>Cmd-K / Ctrl-K Quick Access</span>
        </div>
      </div>
    </div>
  );
};
