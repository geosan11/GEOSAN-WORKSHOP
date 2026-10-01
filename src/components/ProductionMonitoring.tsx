import React, { useState } from 'react';
import { AppHealthCheck, NotificationAlert, ProjectRegistry } from '../types';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Bell,
  Globe,
  ExternalLink,
  ShieldAlert,
  ArrowUpRight,
  Flame,
  Check
} from 'lucide-react';

interface ProductionMonitoringProps {
  healthChecks: AppHealthCheck[];
  notifications: NotificationAlert[];
  projects: ProjectRegistry[];
  onTriggerHealthPing: (id: string) => void;
  onTriggerAllHealthPings: () => void;
  onMarkNotificationRead: (id: string) => void;
  onClearAllNotifications: () => void;
  onToggleHealthCheck: (id: string) => void;
}

export const ProductionMonitoring: React.FC<ProductionMonitoringProps> = ({
  healthChecks,
  notifications,
  projects,
  onTriggerHealthPing,
  onTriggerAllHealthPings,
  onMarkNotificationRead,
  onClearAllNotifications,
  onToggleHealthCheck
}) => {
  const [activeTab, setActiveTab] = useState<'health' | 'alerts' | 'synthetic'>('health');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [isPingingAll, setIsPingingAll] = useState<boolean>(false);

  const projectMap = new Map(projects.map((p) => [p.id, p]));

  const healthyCount = healthChecks.filter((h) => h.last_status === h.expected_status && h.consecutive_failures === 0).length;
  const failingCount = healthChecks.filter((h) => h.consecutive_failures > 0 || (h.last_status !== null && h.last_status !== h.expected_status)).length;
  const avgLatency = Math.round(
    healthChecks.reduce((acc, h) => acc + (h.last_latency_ms || 0), 0) /
      (healthChecks.filter((h) => h.last_latency_ms).length || 1)
  );

  const unreadAlerts = notifications.filter((n) => !n.read);
  const criticalAlertsCount = notifications.filter((n) => n.severity === 'critical' && !n.read).length;

  const handlePingAll = () => {
    setIsPingingAll(true);
    onTriggerAllHealthPings();
    setTimeout(() => setIsPingingAll(false), 800);
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filterSeverity === 'all') return true;
    if (filterSeverity === 'unread') return !n.read;
    return n.severity === filterSeverity;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Uptime Status</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white flex items-center gap-2">
            <span>{Math.round((healthyCount / (healthChecks.length || 1)) * 100)}%</span>
            <span className="text-xs font-normal text-emerald-400">Live</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {healthyCount} healthy, {failingCount} failing endpoints
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Avg Edge Latency</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white">{avgLatency} ms</div>
          <div className="text-xs text-slate-500 mt-1">
            Synthetic probes via pg_net / Edge workers
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Active Incidents</span>
            <Flame className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {criticalAlertsCount > 0 ? (
              <span className="text-rose-400">{criticalAlertsCount} Critical</span>
            ) : (
              <span className="text-emerald-400">0 Critical</span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Tripwire threshold: 3 consecutive fails
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Realtime Alerts</span>
            <Bell className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {unreadAlerts.length}
            <span className="text-xs font-normal text-slate-400 ml-1.5">unread</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Auto-dispatched from Supabase Realtime channel
          </div>
        </div>
      </div>

      {/* Control Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('health')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'health'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Synthetic Endpoints ({healthChecks.length})
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'alerts'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Alert Center ({notifications.length})
            {unreadAlerts.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('synthetic')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'synthetic'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Tripwires & pg_cron Architecture
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePingAll}
            disabled={isPingingAll}
            className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPingingAll ? 'animate-spin text-cyan-400' : ''}`} />
            Run All Synthetic Pings
          </button>
        </div>
      </div>

      {/* Tab: Health Checks */}
      {activeTab === 'health' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {healthChecks.map((hc) => {
              const proj = projectMap.get(hc.project_id);
              const isHealthy = hc.last_status === hc.expected_status && hc.consecutive_failures === 0;

              return (
                <div
                  key={hc.id}
                  className={`p-5 rounded-xl border transition-all ${
                    isHealthy
                      ? 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                      : 'bg-rose-950/20 border-rose-800/40 hover:border-rose-700'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-white">
                          {proj?.name || hc.project_id}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {proj?.vertical || 'client'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-400 font-mono mt-1 break-all">
                        <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate max-w-[280px]">{hc.url}</span>
                        <a
                          href={hc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-500 hover:text-cyan-400 ml-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isHealthy ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {hc.last_status} OK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-950/60 text-rose-300 border border-rose-500/30">
                          <XCircle className="w-3.5 h-3.5" />
                          {hc.last_status || 'ERR'} Failing
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-2.5 px-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs mb-3">
                    <div>
                      <div className="text-slate-500 text-[10px]">Latency</div>
                      <div className="font-mono font-medium text-slate-200">
                        {hc.last_latency_ms ? `${hc.last_latency_ms} ms` : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 text-[10px]">Interval</div>
                      <div className="font-mono text-slate-200">{hc.check_interval_seconds}s</div>
                    </div>
                    <div>
                      <div className="text-slate-500 text-[10px]">Failures</div>
                      <div className={`font-mono font-medium ${hc.consecutive_failures > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                        {hc.consecutive_failures} fails
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/50">
                    <span className="text-[11px] text-slate-500">
                      Last check: {hc.last_check_at ? new Date(hc.last_check_at).toLocaleTimeString() : 'Never'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onToggleHealthCheck(hc.id)}
                        className={`text-[11px] transition-colors ${
                          hc.enabled ? 'text-emerald-400 hover:text-emerald-300' : 'text-slate-500 hover:text-slate-400'
                        }`}
                      >
                        {hc.enabled ? 'Enabled' : 'Paused'}
                      </button>
                      <button
                        onClick={() => onTriggerHealthPing(hc.id)}
                        className="px-2.5 py-1 text-[11px] font-medium rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3 text-cyan-400" />
                        Ping Now
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Alert Center */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900/40 p-3 rounded-lg border border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Filter:</span>
              {['all', 'unread', 'critical', 'warning', 'info'].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setFilterSeverity(sev)}
                  className={`px-2.5 py-1 rounded text-xs capitalize transition-colors ${
                    filterSeverity === sev
                      ? 'bg-slate-800 text-white font-medium border border-slate-700'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>

            {unreadAlerts.length > 0 && (
              <button
                onClick={onClearAllNotifications}
                className="text-slate-400 hover:text-cyan-400 text-xs transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            {filteredNotifications.map((notif) => {
              const proj = notif.project_id ? projectMap.get(notif.project_id) : null;

              return (
                <div
                  key={notif.id}
                  className={`p-4 rounded-xl border transition-all flex items-start gap-3.5 ${
                    notif.read
                      ? 'bg-slate-900/40 border-slate-800 text-slate-400'
                      : notif.severity === 'critical'
                      ? 'bg-rose-950/20 border-rose-800/50 text-slate-200'
                      : notif.severity === 'warning'
                      ? 'bg-amber-950/20 border-amber-800/40 text-slate-200'
                      : 'bg-slate-900 border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="mt-0.5">
                    {notif.severity === 'critical' ? (
                      <div className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                    ) : notif.severity === 'warning' ? (
                      <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-white">
                          {notif.title}
                        </span>
                        {proj && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {proj.name}
                          </span>
                        )}
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800/60 text-slate-400 border border-slate-800">
                          {notif.category.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 shrink-0">
                        {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {notif.body}
                    </p>

                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-800/40 text-xs">
                      <span className="text-[11px] text-slate-500 font-mono">
                        {notif.task_id ? `Ref: ${notif.task_id}` : 'System Probe'}
                      </span>
                      {!notif.read && (
                        <button
                          onClick={() => onMarkNotificationRead(notif.id)}
                          className="px-2 py-0.5 text-[11px] font-medium rounded text-cyan-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          Acknowledge
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Synthetic Tripwires & pg_cron */}
      {activeTab === 'synthetic' && (
        <div className="space-y-4">
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Automated Supabase Edge Synthetic Engine (pg_net + pg_cron)
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              AetherOrch leverages Supabase’s built-in <code className="text-cyan-300">pg_net</code> extension paired with <code className="text-cyan-300">pg_cron</code> to conduct asynchronous, non-blocking HTTP probes across every registered project deployment. When an endpoint returns a non-200 status or latency exceeds threshold for 3 consecutive checks, a high-severity notification is automatically inserted into <code className="text-cyan-300">notifications</code> and broadcast over the Supabase Realtime channel.
            </p>

            <div className="p-4 rounded-lg bg-slate-950 font-mono text-xs text-slate-300 border border-slate-800 overflow-x-auto space-y-1">
              <div className="text-slate-500">-- Automated Cron Schedule in Supabase Migration 008</div>
              <div><span className="text-cyan-400">SELECT</span> cron.schedule(</div>
              <div className="pl-4"><span className="text-emerald-400">'synthetic-health-ping'</span>,</div>
              <div className="pl-4"><span className="text-emerald-400">'* * * * *'</span>, -- Runs every 60 seconds</div>
              <div className="pl-4"><span className="text-cyan-400">$$</span></div>
              <div className="pl-8"><span className="text-cyan-400">SELECT</span> net.http_get(</div>
              <div className="pl-12">url := hc.url,</div>
              <div className="pl-12">headers := jsonb_build_object(<span className="text-emerald-400">'User-Agent'</span>, <span className="text-emerald-400">'AetherOrch-SyntheticProbe/2.0'</span>)</div>
              <div className="pl-8">) <span className="text-cyan-400">FROM</span> app_health_checks hc <span className="text-cyan-400">WHERE</span> hc.enabled = true;</div>
              <div className="pl-4"><span className="text-cyan-400">$$</span></div>
              <div>);</div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="text-slate-400 text-xs font-semibold">1. Zero Token Overhead</div>
                <div className="text-slate-500 text-[11px] mt-1">Health monitoring runs purely on Edge HTTP without model tokens.</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="text-slate-400 text-xs font-semibold">2. Auto-Spawning QA Fix</div>
                <div className="text-slate-500 text-[11px] mt-1">3 consecutive failures trigger autonomous subagent task creation.</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="text-slate-400 text-xs font-semibold">3. Realtime Push Broadcast</div>
                <div className="text-slate-500 text-[11px] mt-1">Pushes instantaneous alerts to mobile app & desktop control panel.</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
