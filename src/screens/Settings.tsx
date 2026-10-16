import React from 'react';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { useDensity, type DensityMode } from '../lib/density';
import { MCPSettings } from '../components/MCPSettings';
import { PageHeader, SectionCard } from '../components/ui';
import { LogOut } from 'lucide-react';

const DENSITY_MODES: { id: DensityMode; label: string; hint: string }[] = [
  { id: 'compact', label: 'Compact', hint: 'Sections stay closed' },
  { id: 'normal', label: 'Normal', hint: 'Open what you need' },
  { id: 'expanded', label: 'Expanded', hint: 'Keep recent sections open' },
];

export const SettingsScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const { isLight, setTheme } = useTheme();
  const { density, setDensity } = useDensity();

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6 font-sans">
      <PageHeader
        eyebrow="Library"
        title="Settings"
        lede="Appearance, connections, and this session."
      />

      <SectionCard
        title="Appearance"
        description="Cream is the reading surface. Obsidian is the alternate. Density changes how much stays open."
      >
        <div className="space-y-4">
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
