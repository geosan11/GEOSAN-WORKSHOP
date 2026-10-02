import React, { useState, useEffect, useRef } from 'react';
import { useNavigation } from '../lib/navigation';
import { useDataProvider } from '../lib/dataProvider';
import { useAuth } from '../lib/auth';
import { useDensity } from '../lib/density';
import { useTheme } from '../lib/theme';
import { formatRelative } from '../lib/format';
import {
  ShieldCheck,
  FolderGit2,
  Terminal,
  DollarSign,
  Bug,
  Settings as SettingsIcon,
  Bell,
  RefreshCw,
  Sun,
  Moon,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Layers,
  Check,
  Cpu
} from 'lucide-react';

interface NotificationItem {
  id: string;
  category: 'approval_needed' | 'qa_finding' | 'budget_alert' | 'health_down' | 'deploy_done';
  title: string;
  body: string;
  created_at: string;
  read: boolean;
  targetScreen?: { kind: 'console' } | { kind: 'costs' } | { kind: 'qa' };
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    category: 'approval_needed',
    title: 'Plan Awaiting Approval',
    body: 'CodingAgent prepared PR #284 for EHI Multisystems (Debt clearance badge).',
    created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    read: false,
    targetScreen: { kind: 'console' }
  },
  {
    id: 'notif-2',
    category: 'qa_finding',
    title: 'Critical Regression Found',
    body: 'Missing mandatory captain license in Aviation Log Entry API manifest.',
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    read: false,
    targetScreen: { kind: 'qa' }
  },
  {
    id: 'notif-3',
    category: 'budget_alert',
    title: 'Budget Alert Threshold',
    body: 'Aviation Log Entry is at 82% of monthly budget limit.',
    created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    read: true,
    targetScreen: { kind: 'costs' }
  },
  {
    id: 'notif-4',
    category: 'deploy_done',
    title: 'Deployment Ready',
    body: 'EdgePoint sensor daemon v1.8 promoted to production after 100% health check.',
    created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    read: true
  }
];

export const TopBar: React.FC = () => {
  const { screen, navigate } = useNavigation();
  const dataProvider = useDataProvider();
  const { user } = useAuth();
  const { density, setDensity } = useDensity();
  const { theme, isLight, toggleTheme } = useTheme();

  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [bellOpen, setBellOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([dataProvider.getProjects(), dataProvider.getTasks(), dataProvider.getCostEvents()]);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleNotificationClick = (item: NotificationItem) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
    );
    if (item.targetScreen) {
      navigate(item.targetScreen);
    }
    setBellOpen(false);
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // Close dropdown on outside click or Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setBellOpen(false);
    };
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    if (bellOpen) {
      window.addEventListener('keydown', handleKey);
      window.addEventListener('mousedown', handleClick);
    }
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('mousedown', handleClick);
    };
  }, [bellOpen]);

  const navTabs = [
    { kind: 'control_plane', label: 'CONTROL PLANE', icon: Layers },
    { kind: 'foundry', label: 'SILICON FOUNDRY', icon: Cpu },
    { kind: 'portfolio', label: 'PORTFOLIO', icon: FolderGit2 },
    { kind: 'console', label: 'AGENT CONSOLE', icon: Terminal },
    { kind: 'costs', label: 'COST CENTER', icon: DollarSign },
    { kind: 'qa', label: 'QA WORKBENCH', icon: Bug },
    { kind: 'settings', label: 'SETTINGS', icon: SettingsIcon }
  ] as const;

  return (
    <header className="sticky top-0 z-40 w-full bg-[#161b22]/95 border-b border-white/5 backdrop-blur-md px-4 md:px-6 h-14 md:h-16 flex items-center justify-between">
      {/* Brand & Demo Pill */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate({ kind: 'portfolio' })}
          className="flex items-center gap-2.5 focus:outline-none"
        >
          <div className="w-8 h-8 rounded-lg bg-[#F0B230]/15 border border-[#F0B230]/40 flex items-center justify-center text-[#F0B230]">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-left hidden sm:block">
            <span className="font-bold text-sm tracking-tight text-[#e6edf3] font-display block">
              AetherOrch
            </span>
            <span className="text-[10px] font-mono text-[#8b98a8] block -mt-1">
              Command Center
            </span>
          </div>
        </button>

        {/* Demo Mode Indicator (Addendum A2: small pill, gold outline, text "DEMO MODE") */}
        {dataProvider.isDemo && (
          <span
            className="px-2 py-0.5 rounded-full border border-[#F0B230] text-[#F0B230] font-mono text-[9px] font-bold tracking-wider animate-pulse ml-1"
            title="Running in mock memory mode with zero external credentials required"
          >
            DEMO MODE
          </span>
        )}
      </div>

      {/* Desktop Navigation Tabs (>= 768px - Addendum A4) */}
      <nav className="hidden md:flex items-center gap-1 font-mono text-xs" aria-label="Main Navigation">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            screen.kind === tab.kind ||
            (tab.kind === 'portfolio' && screen.kind === 'project');

          return (
            <button
              key={tab.kind}
              onClick={() => {
                if (tab.kind === 'control_plane') {
                  navigate({ kind: 'control_plane' });
                } else if (tab.kind === 'foundry') {
                  navigate({ kind: 'foundry' });
                } else if (tab.kind === 'portfolio') {
                  navigate({ kind: 'portfolio' });
                } else if (tab.kind === 'console') {
                  navigate({ kind: 'console' });
                } else if (tab.kind === 'costs') {
                  navigate({ kind: 'costs' });
                } else if (tab.kind === 'qa') {
                  navigate({ kind: 'qa' });
                } else if (tab.kind === 'settings') {
                  navigate({ kind: 'settings' });
                }
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                isActive
                  ? 'bg-[#F0B230]/15 text-[#FFBD59] border border-[#F0B230]/40 shadow-sm'
                  : 'text-[#8b98a8] hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Right Tools: Density Toggle, Manual Refresh, Notification Bell, Theme Toggle */}
      <div className="flex items-center gap-2">
        {/* Density Mode Switch (Compact | Normal | Expanded) */}
        <div
          className="hidden sm:flex items-center rounded-lg bg-[#0d1117] border border-white/10 p-0.5 font-mono text-[10px]"
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
              className={`px-2 py-0.5 rounded capitalize transition-all ${
                density === mode
                  ? 'bg-[#F0B230] text-[#0A1420] font-bold shadow-sm'
                  : 'text-[#8b98a8] hover:text-white'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Manual Refresh (Addendum A8) */}
        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-lg text-[#8b98a8] hover:text-white hover:bg-white/5 transition-colors focus:outline-none"
          title="Manual refresh data"
          aria-label="Manual refresh"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#F0B230]' : ''}`} />
        </button>

        {/* Light/Dark Mode Toggle with Persistent State */}
        <button
          onClick={toggleTheme}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-mono text-xs font-bold transition-all focus:outline-none ${
            isLight
              ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200 shadow-sm'
              : 'bg-white/5 text-[#8b98a8] border-white/5 hover:text-white hover:bg-white/10'
          }`}
          title={isLight ? 'Switch to Obsidian Dark Mode' : 'Switch to Clean Light Mode'}
          aria-label="Toggle theme mode"
        >
          {isLight ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
              <span className="hidden sm:inline">LIGHT</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-[#F0B230]" />
              <span className="hidden sm:inline">DARK</span>
            </>
          )}
        </button>

        {/* Notification Bell with Badge & Dropdown (Addendum A7) */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setBellOpen((prev) => !prev)}
            className="p-2 rounded-lg text-[#8b98a8] hover:text-white hover:bg-white/5 transition-colors relative focus:outline-none"
            aria-label="Notifications"
            aria-expanded={bellOpen}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#F0B230] text-[#0A1420] text-[10px] font-bold flex items-center justify-center font-mono">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown Menu */}
          {bellOpen && (
            <div
              className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-[#161b22] border border-white/10 shadow-2xl overflow-hidden z-50 text-xs animate-in fade-in slide-in-from-top-2"
              role="region"
              aria-label="Notifications list"
            >
              <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-[#0d1117]">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#e6edf3] uppercase font-mono text-[11px]">
                    NOTIFICATIONS
                  </span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded bg-[#F0B230]/20 text-[#FFBD59] font-mono text-[10px] font-bold">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[10px] font-mono text-[#F0B230] hover:underline flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`p-3.5 hover:bg-[#1c2333] transition-colors cursor-pointer space-y-1 ${
                      !n.read ? 'border-l-2 border-[#F0B230] bg-[#F0B230]/5' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[#e6edf3] text-[11px] truncate">
                        {n.title}
                      </span>
                      <span className="text-[10px] font-mono text-[#8b98a8] shrink-0">
                        {formatRelative(n.created_at)}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8b98a8] font-sans line-clamp-2">
                      {n.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
