import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { useDensity } from '../lib/density';
import { useToast } from '../components/Toast';
import { MCPSettings } from '../components/MCPSettings';
import {
  Settings as SettingsIcon,
  Server,
  CheckCircle2,
  Cpu,
  LogOut,
  Sun,
  Moon
} from 'lucide-react';

interface MCPServerRow {
  name: string;
  scope: string;
  status: 'connected' | 'demo';
  lastCall: string;
}

export const SettingsScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const { isLight, toggleTheme } = useTheme();
  const { density, setDensity } = useDensity();
  const toast = useToast();

  const servers: MCPServerRow[] = [
    {
      name: 'stitch',
      scope: '@_davideast/stitch-mcp (UI component generation)',
      status: 'connected',
      lastCall: '2m ago'
    },
    {
      name: 'efecto',
      scope: '@efectoapp/mcp (Visual layout & canvas orchestration)',
      status: 'connected',
      lastCall: '5m ago'
    },
    {
      name: 'chrome-devtools',
      scope: 'chrome-devtools-mcp (DOM inspection & screenshot capture)',
      status: 'connected',
      lastCall: '12m ago'
    },
    {
      name: 'comber-mcp',
      scope: 'Offline queue reconciliation & payload validation',
      status: 'demo',
      lastCall: '18m ago'
    },
    {
      name: 'agent-qa',
      scope: 'Autonomous DOM exploration & OWASP crawler',
      status: 'connected',
      lastCall: '24m ago'
    },
    {
      name: 'github-mcp',
      scope: '@modelcontextprotocol/server-github (Repo management & PRs)',
      status: 'connected',
      lastCall: '30m ago'
    },
    {
      name: 'vercel-mcp',
      scope: 'Vercel deployments & edge analytics',
      status: 'connected',
      lastCall: '1h ago'
    },
    {
      name: 'supabase-mcp',
      scope: 'Supabase Postgres & Edge Functions',
      status: 'connected',
      lastCall: '45m ago'
    },
    {
      name: 'resend-mcp',
      scope: 'Transactional email & webhook monitoring',
      status: 'connected',
      lastCall: '2h ago'
    }
  ];

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6 font-sans">
      {/* Header: Visible Title: MCP plane */}
      <div className="pb-2 border-b border-white/5">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#e6edf3]">
          MCP plane
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Model Context Protocol servers, connections, and tool scopes.
        </p>
      </div>

      {/* Servers Table: One row per server (name, scope, connected or demo, last call) */}
      <div className="bg-[#161b22] border border-white/10 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0d1117] border-b border-white/10 text-slate-400 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Scope</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Last Call</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {servers.map((s) => (
                <tr key={s.name} className="hover:bg-[#1c2333] transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-100 flex items-center gap-2">
                    <Server className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{s.name}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 font-sans text-xs">
                    {s.scope}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        s.status === 'connected'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-950 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right text-slate-400">
                    {s.lastCall}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Embedded MCP Configuration Panel */}
      <MCPSettings />

      {/* Operator Session Info & Sign Out */}
      <div className="p-4 rounded-xl bg-[#161b22] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs">
        <div className="space-y-0.5">
          <span className="text-slate-200 font-bold block">
            {user?.email || 'operator@geosan.internal'}
          </span>
          <span className="text-[10px] text-emerald-400 block">
            Role: {user?.user_metadata?.org_role || 'owner'} · Organization: GEOSAN-WORKSHOP
          </span>
        </div>

        <button
          onClick={signOut}
          className="px-4 py-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 font-bold text-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>
    </div>
  );
};
