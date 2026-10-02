import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type DensityMode = 'compact' | 'normal' | 'expanded';

interface DensityContextValue {
  density: DensityMode;
  setDensity: (mode: DensityMode) => void;
}

const STORAGE_KEY = 'ehi.density';

const DensityContext = createContext<DensityContextValue>({
  density: 'normal',
  setDensity: () => {}
});

export const DensityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [density, setDensityState] = useState<DensityMode>(() => {
    if (typeof window === 'undefined') return 'normal';
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as DensityMode;
      if (stored === 'compact' || stored === 'normal' || stored === 'expanded') {
        return stored;
      }
    } catch {
      // Ignore
    }
    return 'normal';
  });

  const setDensity = useCallback((mode: DensityMode) => {
    setDensityState(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
      // Dispatch storage event so all Disclosure components re-evaluate immediately
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: STORAGE_KEY,
          newValue: mode
        })
      );
    } catch {
      // Storage error
    }
  }, []);

  return (
    <DensityContext.Provider value={{ density, setDensity }}>
      {children}
    </DensityContext.Provider>
  );
};

export const useDensity = (): DensityContextValue => {
  return useContext(DensityContext);
};
