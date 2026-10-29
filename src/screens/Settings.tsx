import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { useFontScale, type FontScale } from '../lib/fontScale';
import { LogOut, Key, Github, Sparkles, Moon, Sun } from 'lucide-react';
import { useToast } from '../components/Toast';
import { isDemoMode } from '../lib/supabase';
import { seedDemoScenario } from '../lib/demoScenario';

const FONT_SCALE_STEPS: { id: FontScale; label: string; factor: string; index: number }[] = [
  { id: 'small', label: 'Small', factor: '0.9×', index: 0 },
  { id: 'medium', label: 'Medium', factor: '1.0×', index: 1 },
  { id: 'large', label: 'Large', factor: '1.15×', index: 2 },
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

  const currentScaleIndex = FONT_SCALE_STEPS.find((s) => s.id === scale)?.index ?? 1;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = parseInt(e.target.value, 10);
    const selected = FONT_SCALE_STEPS.find((s) => s.index === idx);
    if (selected) {
      setScale(selected.id);
    }
  };

  return (
    <div className="min-h-full p-4 sm:p-6 max-w-3xl mx-auto space-y-4 font-sans text-zinc-200">
      {/* Header */}
      <div className="space-y-1 pb-3 border-b border-white/[0.06]">
        <h1 className="text-[18px] sm:text-[20px] font-semibold text-zinc-100 tracking-tight">
          Settings
        </h1>
        <p className="text-[13px] text-zinc-400">
          Interface scale, connected providers, and session preferences.
        </p>
      </div>

      {/* ── Interface Scale Slider ── */}
      <div className="p-3.5 rounded-xl bg-[#111113] border border-white/[0.06] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-zinc-200 font-mono uppercase tracking-wider block">
              Interface Scale
            </span>
            <p className="text-[12px] text-zinc-400 font-sans mt-0.5">
              Scales typography, padding, and icons across the entire interface.
            </p>
          </div>
          <span className="text-xs font-mono font-medium text-indigo-400 px-2 py-0.5 rounded bg-indigo-950/40 border border-indigo-500/25 tabular-nums">
            {FONT_SCALE_STEPS[currentScaleIndex].label} ({FONT_SCALE_STEPS[currentScaleIndex].factor})
          </span>
        </div>

        {/* Clean Range Slider Track */}
        <div className="pt-2 pb-1 space-y-2">
          <input
            type="range"
            min={0}
            max={2}
            step={1}
            value={currentScaleIndex}
            onChange={handleSliderChange}
            aria-label="Interface scale slider"
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500/50"
          />

          <div className="flex justify-between text-[11px] font-mono text-zinc-500 px-1">
            {FONT_SCALE_STEPS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setScale(s.id)}
                className={`transition-colors duration-150 ease-out hover:text-zinc-300 ${
                  scale === s.id ? 'text-indigo-400 font-bold' : ''
                }`}
              >
                {s.label} ({s.factor})
              </button>
            ))}
          </div>
        </div>

        {/* Live sample preview */}
        <div className="p-2.5 rounded-lg bg-[#09090b] border border-white/[0.04] flex items-center justify-between text-xs">
          <span className="text-zinc-400 font-sans">
            Live sample text scaling:
          </span>
          <span className="font-mono text-zinc-200">
            Commit 7793bfa · 14 invariants checked
          </span>
        </div>
      </div>

      {/* ── Connected Providers ── */}
      <div className="p-3.5 rounded-xl bg-[#111113] border border-white/[0.06] space-y-3">
        <div>
          <span className="text-xs font-semibold text-zinc-200 font-mono uppercase tracking-wider block">
            Connected Providers
          </span>
          <p className="text-[12px] text-zinc-400 font-sans mt-0.5">
            Foundation models and cloud services available to the supervisor and agents.
          </p>
        </div>

        <div className="space-y-1.5 font-mono text-xs">
          {providers.map((p) => {
            const isConnected = p.status === 'Connected';
            const isDemo = p.status === 'Demo';

            return (
              <div
                key={p.id}
                className="p-2.5 rounded-lg border border-white/[0.04] bg-[#0d0d0f] flex items-center justify-between gap-3 transition-colors duration-150 ease-out hover:bg-[#121215]"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-200">{p.name}</span>
                    <span
                      className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded border tabular-nums ${
                        isConnected
                          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/25'
                          : isDemo
                          ? 'bg-amber-950/60 text-amber-300 border-amber-500/25'
                          : 'bg-zinc-900 text-zinc-500 border-white/[0.06]'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 font-sans truncate">{p.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {p.id === 'github' && !p.enabled && (
                    <button
                      type="button"
                      onClick={() => toast.info('GitHub ready. Add your PAT in ~/.github_token or project settings.')}
                      className="h-6 px-2 rounded text-[10px] text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-white/[0.06] flex items-center gap-1 transition-colors"
                    >
                      <Github className="w-3 h-3" />
                      <span>Connect</span>
                    </button>
                  )}

                  {/* Clean Toggle Switch */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={p.enabled}
                    onClick={() => toggleProvider(p.id)}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-150 ease-out focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500/50 ${
                      p.enabled ? 'bg-indigo-600' : 'bg-zinc-800'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform duration-150 ease-out ${
                        p.enabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-2.5 rounded-lg bg-[#09090b] border border-white/[0.04] text-[11px] font-sans text-zinc-500 flex items-start gap-2">
          <Key className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
          <span>
            API keys stay in environment variables or Supabase secrets, not in the client.
          </span>
        </div>
      </div>

      {/* ── Appearance & Mode ── */}
      <div className="p-3.5 rounded-xl bg-[#111113] border border-white/[0.06] space-y-3">
        <div>
          <span className="text-xs font-semibold text-zinc-200 font-mono uppercase tracking-wider block">
            Theme & Appearance
          </span>
          <p className="text-[12px] text-zinc-400 font-sans mt-0.5">
            Surface color scheme and contrast preference.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all duration-150 ease-out ${
              !isLight
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-white/[0.04]'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Dark (Obsidian)</span>
          </button>
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all duration-150 ease-out ${
              isLight
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-white/[0.04]'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Light (Cream)</span>
          </button>
        </div>
      </div>

      {/* ── Demo Scenario Loader ── */}
      <div className="p-3.5 rounded-xl bg-[#111113] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-200 font-mono uppercase tracking-wider">
              Demo Scenario
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-500/25 font-bold">
              TaskPulse Fleet
            </span>
          </div>
          <p className="text-[12px] text-zinc-400 font-sans">
            Seeds 3 example projects with logs, supervisor plans, and agent assignments.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            seedDemoScenario();
            toast.success('Loaded demo scenario: TaskPulse, EdgeTelemetry & OmniScraper seeded!');
          }}
          className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shrink-0 transition-all duration-150 ease-out shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Load demo scenario</span>
        </button>
      </div>

      {/* ── Session & Sign Out ── */}
      <div className="p-3.5 rounded-xl bg-[#111113] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-0.5 font-mono">
          <span className="text-zinc-200 font-medium block">
            {user?.email || 'operator@geosan.internal'}
          </span>
          <span className="text-[10px] text-zinc-500 block">
            Session: active · GEOSAN-WORKSHOP
          </span>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="px-3 py-1.5 rounded-lg text-xs font-mono text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-white/[0.06] hover:border-white/[0.12] flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
};
