import React from 'react';
import { Play, Smartphone, Terminal, Database, ShieldCheck, Cpu, Activity, Bell } from 'lucide-react';

export type MainNavTab =
  | 'portfolio'
  | 'console'
  | 'adk'
  | 'qa'
  | 'costs'
  | 'ide'
  | 'schema'
  | 'monitoring';

interface HeaderProps {
  activeTab: MainNavTab;
  onTabChange: (tab: MainNavTab) => void;
  onOpenNewTask: () => void;
  mobileSimulatorOpen: boolean;
  onToggleMobileSimulator: () => void;
  pendingApprovalsCount: number;
  unreadNotificationsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onOpenNewTask,
  mobileSimulatorOpen,
  onToggleMobileSimulator,
  pendingApprovalsCount,
  unreadNotificationsCount = 0
}) => {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-6 py-3.5 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
      {/* Zone 1: Single text element wordmark (Top Bar Contract) */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
          <Cpu className="w-4 h-4" />
        </div>
        <button
          onClick={() => onTabChange('portfolio')}
          className="text-lg font-semibold tracking-tight text-white hover:text-cyan-400 transition-colors text-left"
        >
          AetherOrch
        </button>
        <span className="hidden sm:inline-block text-xs font-mono text-slate-500 border-l border-slate-800 pl-3">
          Command Center
        </span>
      </div>

      {/* Zone 2: Clean text navigation links (Top Bar Contract) */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
        <button
          onClick={() => onTabChange('portfolio')}
          className={`hover:text-white transition-colors relative py-1 ${
            activeTab === 'portfolio' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          Portfolio
          {activeTab === 'portfolio' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 rounded-full" />
          )}
        </button>

        <button
          onClick={() => onTabChange('console')}
          className={`hover:text-white transition-colors relative py-1 flex items-center gap-1.5 ${
            activeTab === 'console' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          Agent Console
          {pendingApprovalsCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          )}
          {activeTab === 'console' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 rounded-full" />
          )}
        </button>

        <button
          onClick={() => onTabChange('adk')}
          className={`hover:text-white transition-colors relative py-1 flex items-center gap-1 ${
            activeTab === 'adk' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          ADK Agents
          {activeTab === 'adk' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 rounded-full" />
          )}
        </button>

        <button
          onClick={() => onTabChange('qa')}
          className={`hover:text-white transition-colors relative py-1 ${
            activeTab === 'qa' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          Autonomous QA
          {activeTab === 'qa' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 rounded-full" />
          )}
        </button>

        <button
          onClick={() => onTabChange('costs')}
          className={`hover:text-white transition-colors relative py-1 ${
            activeTab === 'costs' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          Cost Intelligence
          {activeTab === 'costs' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 rounded-full" />
          )}
        </button>

        <button
          onClick={() => onTabChange('ide')}
          className={`hover:text-white transition-colors relative py-1 flex items-center gap-1 ${
            activeTab === 'ide' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          Embedded IDE
          {activeTab === 'ide' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 rounded-full" />
          )}
        </button>

        <button
          onClick={() => onTabChange('schema')}
          className={`hover:text-white transition-colors relative py-1 flex items-center gap-1 ${
            activeTab === 'schema' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          Supabase SQL
          {activeTab === 'schema' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 rounded-full" />
          )}
        </button>

        <button
          onClick={() => onTabChange('monitoring')}
          className={`hover:text-white transition-colors relative py-1 flex items-center gap-1.5 ${
            activeTab === 'monitoring' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          Monitoring
          {unreadNotificationsCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          )}
          {activeTab === 'monitoring' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 rounded-full" />
          )}
        </button>
      </nav>

      {/* Zone 3: Primary Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileSimulator}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
            mobileSimulatorOpen
              ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
              : 'border-slate-800 text-slate-300 hover:bg-slate-900'
          }`}
          title="Toggle Expo React Native mobile companion app simulator"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Mobile Simulator</span>
        </button>

        <button
          onClick={onOpenNewTask}
          className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 rounded-lg hover:bg-cyan-300 transition-colors flex items-center gap-1.5 shadow-sm shadow-cyan-500/20 whitespace-nowrap"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          Dispatch Task
        </button>
      </div>
    </header>
  );
};
