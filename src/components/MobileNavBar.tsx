import React from 'react';
import { useNavigation } from '../lib/navigation';
import { FolderGit2, Terminal, DollarSign, Bug, Settings as SettingsIcon } from 'lucide-react';

export const MobileNavBar: React.FC = () => {
  const { screen, navigate } = useNavigation();

  const tabs = [
    { kind: 'portfolio', label: 'Portfolio', icon: FolderGit2 },
    { kind: 'console', label: 'Console', icon: Terminal },
    { kind: 'costs', label: 'Costs', icon: DollarSign },
    { kind: 'qa', label: 'QA', icon: Bug },
    { kind: 'settings', label: 'Settings', icon: SettingsIcon }
  ] as const;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#161b22]/95 border-t border-white/10 backdrop-blur-lg flex items-center justify-around h-[62px] pb-[env(safe-area-inset-bottom,0px)]"
      aria-label="Mobile Navigation"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive =
          screen.kind === tab.kind ||
          (tab.kind === 'portfolio' && screen.kind === 'project');

        return (
          <button
            key={tab.kind}
            onClick={() => {
              if (tab.kind === 'portfolio') {
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
            className="flex flex-col items-center justify-center flex-1 h-full py-1 focus:outline-none transition-colors"
          >
            <Icon
              className={`w-5 h-5 mb-0.5 transition-colors ${
                isActive ? 'text-[#F0B230]' : 'text-[#8b98a8]'
              }`}
            />
            <span
              className={`text-[10px] font-mono font-semibold transition-colors ${
                isActive ? 'text-[#F0B230]' : 'text-[#8b98a8]'
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
