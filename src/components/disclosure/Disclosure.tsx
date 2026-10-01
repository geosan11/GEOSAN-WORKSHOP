import React, { useState, useEffect, useId, useRef, useCallback } from 'react';
import { ChevronRight } from 'lucide-react';

export interface DisclosureProps {
  persistKey: string;            // for localStorage state: ehi.disclosure.${persistKey}
  summary: React.ReactNode;      // What's shown when collapsed
  detail: React.ReactNode;       // What's revealed when expanded
  defaultOpen?: boolean;         // Default expansion state if not in localStorage
  variant?: 'row' | 'card' | 'section';
  ariaLabel: string;             // Required for screen reader accessibility
  className?: string;
}

interface StoredDisclosureState {
  open: boolean;
  at: number; // timestamp in ms
}

const STORAGE_PREFIX = 'ehi.disclosure.';

/**
 * Base Disclosure component as specified in Addendum C.
 * Implements:
 * - Three visual variants: 'row', 'card', 'section'
 * - Smooth CSS grid height transition (200ms ease-out)
 * - State persistence under `ehi.disclosure.${persistKey}`
 * - Keyboard navigation (Enter / Space to toggle, Escape to collapse)
 * - Full ARIA attributes (aria-expanded, aria-controls, aria-labelledby)
 */
export const Disclosure: React.FC<DisclosureProps> = ({
  persistKey,
  summary,
  detail,
  defaultOpen = false,
  variant = 'card',
  ariaLabel,
  className = ''
}) => {
  const generatedId = useId();
  const triggerId = `disclosure-trigger-${persistKey || generatedId}`;
  const regionId = `disclosure-region-${persistKey || generatedId}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Initialize state with localStorage lookup
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return defaultOpen;

    try {
      // Check current density setting if present
      const density = localStorage.getItem('ehi.density') || 'normal';

      if (density === 'compact') {
        return false; // Aggressively collapsed in compact mode
      }

      const raw = localStorage.getItem(`${STORAGE_PREFIX}${persistKey}`);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredDisclosureState;
        if (typeof parsed?.open === 'boolean') {
          // If in expanded mode or normal mode, check 7-day staleness
          const isRecent = Date.now() - (parsed.at || 0) < 7 * 24 * 60 * 60 * 1000;
          if (density === 'expanded') {
            return isRecent && parsed.open;
          }
          return parsed.open;
        }
      }
    } catch {
      // Ignore storage errors, fallback to defaultOpen
    }

    return defaultOpen;
  });

  // Persist state changes to localStorage
  const handleToggle = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      try {
        const payload: StoredDisclosureState = {
          open: next,
          at: Date.now()
        };
        localStorage.setItem(`${STORAGE_PREFIX}${persistKey}`, JSON.stringify(payload));
      } catch {
        // Storage failed (private browsing or quota exceeded)
      }
      return next;
    });
  }, [persistKey]);

  // Listen for density changes from storage events or custom dispatches
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ehi.density') {
        const newDensity = e.newValue || 'normal';
        if (newDensity === 'compact') {
          setIsOpen(false);
        } else if (newDensity === 'expanded') {
          try {
            const raw = localStorage.getItem(`${STORAGE_PREFIX}${persistKey}`);
            if (raw) {
              const parsed = JSON.parse(raw) as StoredDisclosureState;
              const isRecent = Date.now() - (parsed.at || 0) < 7 * 24 * 60 * 60 * 1000;
              if (isRecent && parsed.open) {
                setIsOpen(true);
              }
            }
          } catch {
            // Ignore
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [persistKey]);

  // Keyboard navigation: Escape collapses when focus is inside
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) {
      e.stopPropagation();
      setIsOpen(false);
      try {
        const payload: StoredDisclosureState = { open: false, at: Date.now() };
        localStorage.setItem(`${STORAGE_PREFIX}${persistKey}`, JSON.stringify(payload));
      } catch {
        // Ignore
      }
      triggerRef.current?.focus();
    }
  };

  // Variant-specific container and summary styles
  const getContainerStyle = () => {
    switch (variant) {
      case 'row':
        return 'border-b border-white/5 transition-colors';
      case 'section':
        return 'rounded-xl border border-white/5 bg-[#161b22]/70 backdrop-blur-sm overflow-hidden shadow-sm';
      case 'card':
      default:
        return 'rounded-xl border border-white/10 bg-[#161b22] overflow-hidden shadow-sm transition-all hover:border-white/20';
    }
  };

  const getSummaryStyle = () => {
    switch (variant) {
      case 'row':
        return 'w-full py-2.5 px-3 flex items-center justify-between gap-3 text-left transition-colors hover:bg-white/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0B230] focus-visible:ring-inset';
      case 'section':
        return 'w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left transition-colors hover:bg-white/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0B230] focus-visible:ring-inset';
      case 'card':
      default:
        return 'w-full p-3.5 sm:p-4 flex items-center justify-between gap-3 text-left transition-colors hover:bg-white/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0B230] focus-visible:ring-inset';
    }
  };

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      className={`${getContainerStyle()} ${className}`}
    >
      {/* Summary Trigger Button */}
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-controls={regionId}
        aria-label={ariaLabel}
        className={getSummaryStyle()}
      >
        <div className="flex-1 min-w-0">
          {summary}
        </div>

        {/* Chevron Indicator: 16px, rotates 90° clockwise when expanded */}
        <div className="shrink-0 ml-2 flex items-center justify-center">
          <ChevronRight
            className={`w-4 h-4 transition-transform duration-200 ease-out ${
              isOpen ? 'rotate-90 text-[#FFBD59]' : 'text-[#8b98a8]'
            }`}
            aria-hidden="true"
          />
        </div>
      </button>

      {/* Detail Region with 200ms Grid Height Transition */}
      <div
        id={regionId}
        role="region"
        aria-labelledby={triggerId}
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          {/* Detail Container: surface-2 bg, left 2px solid gold border, -mt-1 visually merges with summary */}
          <div className="bg-[#1c2333] border-l-2 border-[#F0B230] -mt-[1px] p-3.5 sm:px-4 text-xs text-[#e6edf3] space-y-2">
            {detail}
          </div>
        </div>
      </div>
    </div>
  );
};
