import React from 'react';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { useDensity } from '../lib/density';
import { MCPSettings } from '../components/MCPSettings';
import { PageHeader, SectionCard } from '../components/ui';
import { Server, LogOut, Sun, Moon } from 'lucide-react';

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

  const servers: MCPServerRow[] = [
    {
      name: 'stitch',
      scope: '@_davideast/stitch-mcp (UI component generation)',
      status: 'connected',
      lastCall: '2m ago',
    },
    {
      name: 'efecto',
      scope: '@efectoapp/mcp (Visual layout & canvas orchestration)',
      status: 'connected',
      lastCall: '5m ago',
    },
    {
      name: 'chrome-devtools',
      scope: 'chrome-devtools-mcp (DOM inspection & screenshot capture)',
      status: 'connected',
      lastCall: '12m ago',
    },
    {
      name: 'comber-mcp',
      scope: 'Offline queue reconciliation & payload validation',
      status: 'demo',
      lastCall: '18m ago',
    },
    {
      name: 'agent-qa',
      scope: 'Autonomous DOM exploration & OWASP crawler',
      status: 'connected',
      lastCall: '24m ago',
    },
    {
      name: 'github-mcp',
      scope: '@modelcontextprotocol/server-github (Repo management & PRs)',
      status: 'connected',
      lastCall: '30m ago',
    },
    {
      name: 'vercel-mcp',
      scope: 'Vercel deployments & edge analytics',
      status: 'connected',
      lastCall: '1h ago',
    },
    {
      name: 'supabase-mcp',
      scope: 'Supabase Postgres & Edge Functions',
      status: 'connected',
      lastCall: '45m ago',
    },
    {
      name: 'resend-mcp',
      scope: 'Transactional email & webhook monitoring',
      status: 'connected',
      lastCall: '2h ago',
    },
  ];

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6 font-sans">
      <PageHeader
        eyebrow="Library"
        title="Settings"
        lede="Appearance, MCP integrations, and operator session controls."
      />

      <SectionCard title="Appearance" description="Theme and information density for the command center.">
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <button
            type="button"
            onClick={toggleTheme}
            className={`px-3 py-2 rounded-lg border font-bold flex items-center gap-2 transition-all ${isLight
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-white/5 text-muted border-app hover:text-main hover:bg-white/10'
              }`}
          >
            {isLight ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-amber-400" />
                <span>Dark</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setDensity(density === 'compact' ? 'normal' : 'compact')}
            className="px-3 py-2 rounded-lg bg-white/5 border border-app text-muted hover:text-main hover:bg-white/10 font-bold flex items-center gap-2 transition-colors"
          >
            <Server className="w-3.5 h-3.5" />
            <span>Density: {density === 'compact' ? 'Compact' : 'Normal'}</span>
          </button>
        </div>
      </SectionCard>

      <SectionCard
        flush
        title="Integrations · MCP plane"
        description="Model Context Protocol servers, connections, and tool scopes."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-app border-b border-app text-muted text-[10px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Scope</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Last Call</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {servers.map((s) => (
                <tr key={s.name} className="hover:bg-white/5 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-main">
                    <span className="inline-flex items-center gap-2">
                      <Server className="w-3.5 h-3.5 text-primary shrink-0" />
                      {s.name}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-muted font-sans text-xs">{s.scope}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${s.status === 'connected'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-950 text-amber-400 border border-amber-500/30'
                        }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right text-muted">{s.lastCall}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="MCP configuration" description="Server enablement and tool scopes.">
        <MCPSettings />
      </SectionCard>

      <SectionCard title="Session" description="Operator identity and sign-out.">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs">
          <div className="space-y-0.5">
            <span className="text-main font-bold block">
              {user?.email || 'operator@geosan.internal'}
            </span>
            <span className="text-[10px] text-primary block">
              Role: {user?.user_metadata?.org_role || 'owner'} · Organization: GEOSAN-WORKSHOP
            </span>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="px-4 py-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 font-bold transition-colors flex items-center gap-1.5 self-start"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </SectionCard>
    </div>
  );
};
