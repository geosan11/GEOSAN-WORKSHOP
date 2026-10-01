import React, { useState } from 'react';
import { AgentTask, ProjectRegistry, QAFinding, NotificationAlert } from '../types';
import { INITIAL_NOTIFICATIONS } from '../data/initialData';
import { DeploymentBadge } from './DeploymentBadge';
import {
  Smartphone,
  X,
  Bell,
  Check,
  RotateCcw,
  Zap,
  ShieldAlert,
  ChevronRight,
  Play,
  ArrowRight,
  Wifi,
  Battery
} from 'lucide-react';

interface MobileDeviceSimulatorProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: AgentTask[];
  projects: ProjectRegistry[];
  findings: QAFinding[];
  notifications?: NotificationAlert[];
  onApproveTask: (taskId: string) => void;
  onRejectTask: (taskId: string, reason: string) => void;
  onQuickAction: (actionName: string) => void;
}

export const MobileDeviceSimulator: React.FC<MobileDeviceSimulatorProps> = ({
  isOpen,
  onClose,
  tasks,
  projects,
  findings,
  notifications = INITIAL_NOTIFICATIONS,
  onApproveTask,
  onRejectTask,
  onQuickAction
}) => {
  const [mobileTab, setMobileTab] = useState<'feed' | 'projects' | 'alerts'>('feed');

  if (!isOpen) return null;

  const pendingApprovals = tasks.filter((t) => t.status === 'awaiting_approval');
  const criticalFindings = findings.filter((f) => f.severity === 'critical');

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-slate-950/95 backdrop-blur-xl border-l border-slate-800 p-4 shadow-2xl flex flex-col justify-between overflow-hidden">
      {/* Simulator Control Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs font-mono">
        <div className="flex items-center gap-2 text-cyan-400 font-semibold">
          <Smartphone className="w-4 h-4" />
          <span>Expo React Native Companion</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Simulated iPhone Frame */}
      <div className="flex-1 my-3 bg-slate-900 border-2 border-slate-700 rounded-[36px] overflow-hidden flex flex-col shadow-inner relative">
        {/* Notch / Dynamic Island */}
        <div className="pt-2 px-6 flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-900">
          <span>17:24</span>
          <div className="w-20 h-4 bg-slate-950 rounded-full" />
          <div className="flex items-center gap-1.5">
            <Wifi className="w-3 h-3" />
            <Battery className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* App Title inside Mobile screen */}
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div>
            <h3 className="text-sm font-bold text-white">AetherOrch Mobile</h3>
            <p className="text-[10px] text-slate-400">Thumb Approval & Quick Actions</p>
          </div>
          {pendingApprovals.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono">
              {pendingApprovals.length} pending
            </span>
          )}
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950 text-xs">
          <button
            onClick={() => setMobileTab('feed')}
            className={`flex-1 py-2 text-center transition-colors ${
              mobileTab === 'feed'
                ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Approvals
          </button>
          <button
            onClick={() => setMobileTab('projects')}
            className={`flex-1 py-2 text-center transition-colors ${
              mobileTab === 'projects'
                ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Portfolio
          </button>
          <button
            onClick={() => setMobileTab('alerts')}
            className={`flex-1 py-2 text-center transition-colors relative ${
              mobileTab === 'alerts'
                ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Alerts
            {criticalFindings.length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 absolute top-2 right-4" />
            )}
          </button>
        </div>

        {/* Mobile Content Area */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Tab 1: Thumb Task Feed & Swipe/Tap Approvals */}
          {mobileTab === 'feed' && (
            <div className="space-y-3">
              {/* Quick Actions Carousel */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-mono text-slate-500 block">
                  One-Tap Quick Actions
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onQuickAction('Run QA on EHI')}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-left hover:border-cyan-500 transition-colors"
                  >
                    <span className="text-xs font-semibold text-white block">Run QA on EHI</span>
                    <span className="text-[10px] text-cyan-400 font-mono">30x Fast Replay</span>
                  </button>
                  <button
                    onClick={() => onQuickAction('Deploy Iyanuoluwa')}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-left hover:border-emerald-500 transition-colors"
                  >
                    <span className="text-xs font-semibold text-white block">Deploy Agro Hub</span>
                    <span className="text-[10px] text-emerald-400 font-mono">Vercel Prod</span>
                  </button>
                </div>
              </div>

              {/* Pending Approvals */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-mono text-slate-500 block">
                  Pending Human Approvals
                </span>
                {pendingApprovals.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                    All agent tasks approved!
                  </div>
                ) : (
                  pendingApprovals.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 rounded-xl bg-slate-950 border border-amber-500/40 space-y-2.5 shadow-sm"
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono text-amber-400">
                        <span className="uppercase">{task.task_type}</span>
                        <span>{task.model_used}</span>
                      </div>
                      <p className="text-xs font-medium text-slate-200 leading-snug">
                        {task.prompt}
                      </p>
                      {task.plan && (
                        <p className="text-[11px] text-slate-400 leading-relaxed font-sans line-clamp-2">
                          {task.plan.overview}
                        </p>
                      )}

                      {/* Mobile Thumb Action Buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => onApproveTask(task.id)}
                          className="flex-1 py-2 px-3 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg flex items-center justify-center gap-1 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          Thumb Approve
                        </button>
                        <button
                          onClick={() => onRejectTask(task.id, 'Declined from mobile')}
                          className="py-2 px-3 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded-lg"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Projects Overview */}
          {mobileTab === 'projects' && (
            <div className="space-y-2.5">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="capitalize text-slate-400 font-mono">{proj.vertical}</span>
                    <DeploymentBadge status={proj.deployment_status} size="sm" />
                  </div>
                  <h4 className="text-xs font-bold text-white">{proj.name}</h4>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>Commit: <code className="text-cyan-300">{proj.last_commit_hash.slice(0, 7)}</code></span>
                    <span className={proj.repo_sync?.state === 'drifted' ? 'text-amber-400' : 'text-emerald-400'}>
                      {proj.repo_sync?.state === 'drifted' ? 'Drifted' : 'Synced'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-900">
                    <span>Spend: ${proj.current_spend_usd.toFixed(2)}</span>
                    <span className="text-cyan-400">Budget: ${proj.monthly_budget_usd}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 3: Alerts */}
          {mobileTab === 'alerts' && (
            <div className="space-y-2">
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                Realtime Push Notifications ({notifications.length})
              </div>
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 rounded-xl border space-y-1 text-xs ${
                    n.severity === 'critical'
                      ? 'bg-rose-950/30 border-rose-800/40 text-rose-200'
                      : n.severity === 'warning'
                      ? 'bg-amber-950/30 border-amber-800/40 text-amber-200'
                      : 'bg-slate-950 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] text-white">{n.title}</span>
                    <span className="text-[9px] uppercase font-mono px-1 rounded bg-slate-900 border border-slate-800">
                      {n.category.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{n.body}</p>
                </div>
              ))}

              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mt-3 mb-1">
                QA Regression Findings ({findings.length})
              </div>
              {findings.map((f) => (
                <div
                  key={f.id}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-mono text-[10px] uppercase font-bold ${
                        f.severity === 'critical' ? 'text-rose-400' : 'text-amber-400'
                      }`}
                    >
                      {f.severity} regression
                    </span>
                    <span className="text-slate-500 text-[10px] font-mono">{f.status}</span>
                  </div>
                  <p className="font-semibold text-white leading-snug">{f.title}</p>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{f.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Home Indicator Bar */}
        <div className="py-2 flex justify-center bg-slate-900">
          <div className="w-28 h-1 bg-slate-600 rounded-full" />
        </div>
      </div>
    </div>
  );
};
