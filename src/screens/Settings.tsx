import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { useFontScale, type FontScale } from '../lib/fontScale';
import { LogOut, Key, Github, Sparkles, Check, Sun, Moon } from 'lucide-react';
import { useToast } from '../components/Toast';
import { isDemoMode } from '../lib/supabase';
import { seedDemoScenario } from '../lib/demoScenario';

const FONT_SCALES: { id: FontScale; label: string; hint: string }[] = [
  { id: 'small', label: 'Small', hint: '87.5% compact scale' },
  { id: 'medium', label: 'Medium', hint: '100% baseline scale' },
  { id: 'large', label: 'Large', hint: '115% comfortable scale' },
];

export const SettingsScreen: React.FC = () => {
  const toast = useToast();
  const { user, signOut } = useAuth();
  const { isLight, setTheme } = useTheme();
  const { scale, setScale } = useFontScale();

  const [providers, setProviders] = useState([
    { id: 'grok', name: 'Grok Bots', enabled: true, status: isDemoMode ? 'Demo' : 'Connected', description: 'xAI reasoning & fast fuzzing' },
    { id: 'google', name: 'Google AI Pro', enabled: true, status: isDemoMode ? 'Demo' : 'Connected', description: 'Gemini 3.5 & large context analysis' },
    { id: 'claude', name: 'Claude', enabled: true, status: isDemoMode ? 'Demo' : 'Connected', description: 'Anthropic Sonnet 4 adversarial code review & invariants' },
    { id: 'deepseek', name: 'DeepSeek', enabled: true, status: isDemoMode ? 'Demo' : 'Connected', description: 'R1/V3 formal logic, mathematical calculus & FinOps' },
    { id: 'github', name: 'GitHub', enabled: false, status: 'Not connected', description: 'Repository sync, pull requests & CI test gates' },
  ]);

  const toggleProvider = (id: string) => {
    setProviders((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const nextEnabled = !p.enabled;
          toast.success(`${p.name} ${nextEnabled ? 'enabled' : 'disabled'}`);
          return { ...p, enabled: nextEnabled };
        }
        return p;
      })
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6 font-sans text-neutral-200">
      {/* Header */}
      <div className="space-y-1 pb-4 border-b border-[#1f2227]">
        <h1 className="text-lg font-semibold text-white tracking-tight">Settings</h1>
        <p className="text-xs text-neutral-400">
          Interface scale, connected providers, and session preferences.
        </p>
      </div>

      {/* Interface Scale */}
      <div className="p-4 rounded-xl bg-[#121316] border border-[#1f2227] space-y-3">
        <div className="space-y-0.5">
          <span className="text-xs font-semibold text-white font-mono uppercase tracking-wider block">
            Interface Scale
          </span>
          <p className="text-xs text-neutral-400">
            Adjust typography and spacing globally via the root font scale.
          </p>
        </div>

        <div className="flex items-center gap-2" role="radiogroup" aria-label="Interface scale">
          {FONT_SCALES.map((s) => {
            const isSelected = scale === s.id;
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setScale(s.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-[#181a20] text-neutral-400 hover:text-white border border-[#22252c]'
                }`}
                title={s.hint}
              >
                {s.label} ({s.id === 'small' ? '87.5%' : s.id === 'medium' ? '100%' : '115%'})
              </button>
            );
          })}
        </div>
      </div>

      {/* Connected Providers */}
      <div className="p-4 rounded-xl bg-[#121316] border border-[#1f2227] space-y-3">
        <div className="space-y-0.5">
          <span className="text-xs font-semibold text-white font-mono uppercase tracking-wider block">
            Connected Providers
          </span>
          <p className="text-xs text-neutral-400">
            Foundation models and cloud services available to the supervisor and agents.
          </p>
        </div>

        <div className="space-y-2">
          {providers.map((p) => {
            const isConnected = p.status === 'Connected';
            const isDemo = p.status === 'Demo';

            return (
              <div
                key={p.id}
                className="p-3 rounded-lg border border-[#1f2227] bg-[#0d0e11] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white font-mono">{p.name}</span>
                    <span
                      className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded border font-mono ${
                        isConnected
                          ? 'bg-emerald-950/70 text-emerald-400 border-emerald-500/30'
                          : isDemo
                          ? 'bg-amber-950/70 text-amber-300 border-amber-500/30'
                          : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 truncate">{p.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                  {p.id === 'github' && !p.enabled && (
                    <button
                      type="button"
                      onClick={() => toast.info('GitHub ready. Add your PAT in ~/.github_token or project settings.')}
                      className="px-2.5 py-1 rounded text-[11px] font-mono text-neutral-300 hover:text-white bg-[#181a20] border border-[#22252c] flex items-center gap-1.5 transition-colors"
                    >
                      <Github className="w-3.5 h-3.5" />
                      <span>Connect GitHub</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => toggleProvider(p.id)}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono font-medium transition-all ${
                      p.enabled
                        ? 'bg-indigo-600 text-white'
                        : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {p.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-3 rounded-lg bg-[#0d0e11] border border-[#1f2227] text-[11px] text-neutral-400 flex items-start gap-2">
          <Key className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <span>
            API keys and tokens stay in environment variables or Supabase secrets, not in the client.
          </span>
        </div>
      </div>

      {/* Appearance & Mode */}
      <div className="p-4 rounded-xl bg-[#121316] border border-[#1f2227] space-y-3">
        <div className="space-y-0.5">
          <span className="text-xs font-semibold text-white font-mono uppercase tracking-wider block">
            Theme & Appearance
          </span>
          <p className="text-xs text-neutral-400">
            Select surface theme for high contrast or reading.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-colors ${
              !isLight
                ? 'bg-indigo-600 text-white'
                : 'bg-[#181a20] text-neutral-400 hover:text-white border border-[#22252c]'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Dark (Obsidian)</span>
          </button>
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-colors ${
              isLight
                ? 'bg-indigo-600 text-white'
                : 'bg-[#181a20] text-neutral-400 hover:text-white border border-[#22252c]'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Light (Cream)</span>
          </button>
        </div>
      </div>

      {/* Demo Scenario Loader */}
      <div className="p-4 rounded-xl bg-[#121316] border border-[#1f2227] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white font-mono uppercase tracking-wider">
                Demo Scenario
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 font-bold">
                TaskPulse Fleet
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Seeds 3 example projects with logs, supervisor plans, and agent assignments.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              seedDemoScenario();
              toast.success('Loaded demo scenario: TaskPulse, EdgeTelemetry & OmniScraper seeded!');
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium font-mono bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shrink-0 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load demo scenario</span>
          </button>
        </div>
      </div>

      {/* Session & Sign Out */}
      <div className="p-4 rounded-xl bg-[#121316] border border-[#1f2227] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-0.5 font-mono">
          <span className="text-white font-medium block">
            {user?.email || 'operator@geosan.internal'}
          </span>
          <span className="text-[10px] text-neutral-500 block">
            Session: active · GEOSAN-WORKSHOP
          </span>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="px-3 py-1.5 rounded-lg text-xs font-mono text-neutral-400 hover:text-white bg-[#181a20] border border-[#22252c] hover:border-neutral-700 flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
};
