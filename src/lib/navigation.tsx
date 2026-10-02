import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type ProjectTab = 'overview' | 'tasks' | 'qa' | 'costs' | 'chat' | 'settings';

export type Screen =
  | { kind: 'control_plane' }
  | { kind: 'foundry' }
  | { kind: 'portfolio' }
  | { kind: 'project'; projectId: string; tab: ProjectTab }
  | { kind: 'console' }
  | { kind: 'costs' }
  | { kind: 'qa' }
  | { kind: 'settings' };

interface NavigationContextType {
  screen: Screen;
  navigate: (screen: Screen) => void;
  back: () => void;
  canGoBack: boolean;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [history, setHistory] = useState<Screen[]>([{ kind: 'portfolio' }]);

  const currentScreen = history[history.length - 1] || { kind: 'portfolio' };

  const navigate = useCallback((targetScreen: Screen) => {
    setHistory((prev) => {
      // Don't duplicate top of stack
      const top = prev[prev.length - 1];
      if (
        top &&
        top.kind === targetScreen.kind &&
        (top.kind !== 'project' ||
          (top.projectId === (targetScreen as { projectId: string }).projectId &&
            top.tab === (targetScreen as { tab: ProjectTab }).tab))
      ) {
        return prev;
      }
      const next = [...prev, targetScreen];
      return next.slice(-20); // Maintain max 20 entries
    });

    try {
      window.history.pushState({ screen: targetScreen.kind }, '');
    } catch {
      // Ignore if iframe environment blocks history
    }
  }, []);

  const back = useCallback(() => {
    setHistory((prev) => {
      if (prev.length <= 1) return prev;
      return prev.slice(0, prev.length - 1);
    });
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      back();
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [back]);

  return (
    <NavigationContext.Provider
      value={{
        screen: currentScreen,
        navigate,
        back,
        canGoBack: history.length > 1
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export function useNavigation(): NavigationContextType {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}
