import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type FontScale = 'small' | 'medium' | 'large';

interface FontScaleContextValue {
  scale: FontScale;
  scaleFactor: number;
  setScale: (scale: FontScale) => void;
}

const STORAGE_KEY = 'geosan_font_scale';

const SCALE_FACTORS: Record<FontScale, number> = {
  small: 0.875,
  medium: 1.0,
  large: 1.15,
};

const FontScaleContext = createContext<FontScaleContextValue>({
  scale: 'medium',
  scaleFactor: 1.0,
  setScale: () => {},
});

export const FontScaleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [scale, setScaleState] = useState<FontScale>(() => {
    if (typeof window === 'undefined') return 'medium';
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as FontScale;
      if (stored === 'small' || stored === 'medium' || stored === 'large') {
        return stored;
      }
    } catch {}
    return 'medium';
  });

  const applyScaleToDOM = useCallback((s: FontScale) => {
    if (typeof document === 'undefined') return;
    const factor = SCALE_FACTORS[s] || 1.0;
    const root = document.documentElement;
    root.setAttribute('data-scale', s);
    root.style.setProperty('--font-scale', String(factor));
  }, []);

  const setScale = useCallback(
    (s: FontScale) => {
      setScaleState(s);
      try {
        localStorage.setItem(STORAGE_KEY, s);
      } catch {}
      applyScaleToDOM(s);
    },
    [applyScaleToDOM]
  );

  useEffect(() => {
    applyScaleToDOM(scale);
  }, [scale, applyScaleToDOM]);

  return (
    <FontScaleContext.Provider value={{ scale, scaleFactor: SCALE_FACTORS[scale], setScale }}>
      {children}
    </FontScaleContext.Provider>
  );
};

export const useFontScale = (): FontScaleContextValue => {
  return useContext(FontScaleContext);
};
