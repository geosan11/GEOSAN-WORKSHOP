import React from 'react';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { useDensity, type DensityMode } from '../lib/density';
import { useFontScale, type FontScale } from '../lib/fontScale';
import { MCPSettings } from '../components/MCPSettings';
import { PageHeader, SectionCard } from '../components/ui';
import { LogOut, Globe, Key, ShieldCheck, Github, ExternalLink, Sparkles } from 'lucide-react';
import { useToast } from '../components/Toast';
import { isDemoMode, supabase } from '../lib/supabase';
import { seedDemoScenario } from '../lib/demoScenario';

const DENSITY_MODES: { id: DensityMode; label: string; hint: string }[] = [
  { id: 'compact', label: 'Compact', hint: 'Sections stay closed' },
  { id: 'normal', label: 'Normal', hint: 'Open what you need' },
  { id: 'expanded', label: 'Expanded', hint: 'Keep recent sections open' },
];

const FONT_SCALES: { id: FontScale; label: string; hint: string }[] = [
  { id: 'small', label: 'Small', hint: '87.5% scale for high-density displays' },
  { id: 'medium', label: 'Medium', hint: '100% baseline scale' },
  { id: 'large', label: 'Large', hint: '115% scale for readability' },
];

export const SettingsScreen: React.FC = () => {
  const toast = useToast();
  const { user, signOut } = useAuth();
  const { isLight, setTheme } = useTheme();
  const { density, setDensity } = useDensity();
  const { scale, setScale } = useFontScale();

  const [providers, setProviders] = React.useState([
    { id: 'grok', name: 'Grok Bots', enabled: true, status: isDemoMode ? 'Demo' : 'Connected', description: 'xAI reasoning & fast fuzzing' },
    { id: 'google', name: 'Google AI Pro', enabled: true, status: isDemoMode ? 'Demo' : 'Connected', description: 'Gemini 3.5 & large 1M context analysis' },
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
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6 font-sans">
      <PageHeader
        eyebrow="Library"
        title="Settings"
        lede="Appearance, connections, and this session."
      />

      <SectionCard
        title="Appearance"
        description="Cream is the reading surface. Obsidian is the alternate. Density changes how much stays open. Interface scale controls global sizing."
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <span className="text-meta block">Interface Scale</span>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Interface scale">
              {FONT_SCALES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={scale === s.id}
                  onClick={() => setScale(s.id)}
                  className={`btn ${scale === s.id ? 'btn-primary' : 'btn-ghost'}`}
                  title={s.hint}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <p className="text-lede text-[0.75rem]">
              {FONT_SCALES.find((s) => s.id === scale)?.hint}. Scales typography and elements across the entire interface.
            </p>
          </div>

          <div className="space-y-2">
            <span className="text-meta block">Theme</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Theme">
              <button
                type="button"
                aria-pressed={isLight}
                onClick={() => setTheme('light')}
                className={`btn ${isLight ? 'btn-primary' : 'btn-ghost'}`}
              >
                Cream
              </button>
              <button
                type="button"
                aria-pressed={!isLight}
                onClick={() => setTheme('dark')}
                className={`btn ${!isLight ? 'btn-ink' : 'btn-ghost'}`}
              >
                Obsidian
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-meta block">Density</span>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Information density">
              {DENSITY_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  role="radio"
                  aria-checked={density === mode.id}
                  onClick={() => setDensity(mode.id)}
                  className={`btn ${density === mode.id ? 'btn-primary' : 'btn-ghost'}`}
                  title={mode.hint}
                >
                  {mode.label}
                </button>
              ))}
            </div>
            <p className="text-lede text-[0.75rem]">
              {DENSITY_MODES.find((mode) => mode.id === density)?.hint}. Same control as the top bar.
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Connected Providers"
        description="Foundation models and cloud integrations managed across verticals. API credentials and secrets reside securely in server environments or Supabase vault, not in the browser bundle."
      >
        <div className="space-y-2.5 font-mono text-xs">
          {providers.map((p) => {
            const isConnected = p.status === 'Connected';
            const isDemo = p.status === 'Demo';

            return (
              <div
                key={p.id}
                className="p-3 rounded-xl border border-[color:var(--border-app)] bg-[color:var(--bg-app)]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-main font-mono text-xs">{p.name}</span>
                    <span
                      className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded border ${
                        isConnected
                          ? 'bg-emerald-950/70 text-emerald-400 border-emerald-500/30'
                          : isDemo
                          ? 'bg-amber-950/70 text-amber-300 border-amber-500/30'
                          : 'bg-white/5 text-muted border-white/10'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted font-sans">{p.description}</p>
                </div>

                <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
                  {p.id === 'github' && !p.enabled && (
                    <button
                      type="button"
                      onClick={() => toast.info('GitHub token connection ready. Enter your PAT in ~/.github_token or project settings.')}
                      className="btn btn-ghost !px-2.5 !py-1 text-[11px] flex items-center gap-1.5"
                    >
                      <Github className="w-3.5 h-3.5" />
                      <span>Connect GitHub</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => toggleProvider(p.id)}
                    className={`btn text-[10px] !px-2.5 !py-1 transition-all ${
                      p.enabled
                        ? 'btn-primary'
                        : 'btn-ghost text-muted hover:text-main'
                    }`}
                  >
                    {p.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              </div>
            );
          })}

          <div className="p-3 rounded-lg bg-[color:var(--bg-card)] border border-[color:var(--border-app)] text-[11px] font-sans text-muted flex items-start gap-2 mt-2">
            <Key className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span>
              <strong>Zero Client Token Exposure:</strong> Production API keys for Google, Anthropic, DeepSeek, and xAI are never exposed to browser clients. Calls route through the deterministic server proxy or serverless edge runners.
            </span>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Demo & Offline Scenarios"
        description="Run GEOSAN Workshop without a live Supabase database using realistic mock data, seed scenarios, and local state persistence."
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-main font-bold">Demo Scenario (TaskPulse Fleet)</span>
              <span className="stamp stamp-primary text-[9px]">3 Projects</span>
            </div>
            <p className="text-[11px] text-muted font-sans">
              Seeds TaskPulse (Full-Stack App with RLS diffs), EdgeTelemetry Pipeline, and OmniScraper with realistic logs and agent assignments.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              seedDemoScenario();
              toast.success('Loaded demo scenario: TaskPulse, EdgeTelemetry & OmniScraper seeded!');
            }}
            className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load demo scenario</span>
          </button>
        </div>
      </SectionCard>

      <SectionCard
        title="Connections"
        description="Open a server to see its tools. Test and config stay inside that row."
      >
        <MCPSettings />
      </SectionCard>

      <SectionCard title="Session" description="Who is signed in on this browser.">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs">
          <div className="space-y-0.5">
            <span className="text-main font-bold block">
              {user?.email || 'operator@geosan.internal'}
            </span>
            <span className="text-[10px] text-primary block">
              Role: {user?.user_metadata?.org_role || 'owner'} · GEOSAN-WORKSHOP
            </span>
          </div>
          <button type="button" onClick={signOut} className="btn btn-ghost self-start">
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </SectionCard>
    </div>
  );
};
