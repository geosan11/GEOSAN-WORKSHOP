import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  theme: ThemeMode;
  isLight: boolean;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = 'ehi.theme';

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  isLight: false,
  setTheme: () => {},
  toggleTheme: () => {}
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'dark';
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode;
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
    } catch {
      // Ignore
    }
    return 'dark';
  });

  const applyThemeToDOM = useCallback((mode: ThemeMode) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (mode === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    }
  }, []);

  const setTheme = useCallback(
    (mode: ThemeMode) => {
      setThemeState(mode);
      applyThemeToDOM(mode);
      try {
        localStorage.setItem(STORAGE_KEY, mode);
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: STORAGE_KEY,
            newValue: mode
          })
        );
      } catch {
        // Storage error
      }
    },
    [applyThemeToDOM]
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  // Synchronize on mount
  useEffect(() => {
    applyThemeToDOM(theme);
  }, [theme, applyThemeToDOM]);

  // Cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === 'light' || e.newValue === 'dark')) {
        setThemeState(e.newValue);
        applyThemeToDOM(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [applyThemeToDOM]);

  return (
    <ThemeContext.Provider value={{ theme, isLight: theme === 'light', setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  return useContext(ThemeContext);
};
