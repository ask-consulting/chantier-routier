'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'chantia.theme';

interface ThemeContextValue {
  /** What the user asked for — including "follow the system". */
  preference: ThemePreference;
  /** What is actually on screen once "system" is resolved. */
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Runs before React hydrates, so the page never paints in the wrong theme.
 *
 * Inlined in the document head as a blocking script: anything asynchronous —
 * including a `useEffect` — happens after the first paint, and the flash of a
 * white page on a dark theme is exactly what we are avoiding. Kept to a few
 * lines for that reason.
 */
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored === 'light' || stored === 'dark' ? stored : (prefersDark ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
  } catch (e) {
    document.documentElement.dataset.theme = 'light';
  }
})();
`;

function readPreference(): ThemePreference {
  if (typeof window === 'undefined') {
    return 'system';
  }
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

function systemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Starts at "system" on both server and client so the markup matches; the
  // effect below reconciles with what the init script already applied.
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [resolved, setResolved] = useState<ResolvedTheme>('light');

  useEffect(() => {
    const initial = readPreference();
    setPreferenceState(initial);
    setResolved(initial === 'system' ? systemTheme() : initial);
  }, []);

  // Only while following the system: a user who picked a theme explicitly does
  // not want it changing under them when the OS switches at sunset.
  useEffect(() => {
    if (preference !== 'system') {
      return;
    }
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (): void => setResolved(media.matches ? 'dark' : 'light');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [preference]);

  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
  }, [resolved]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    setResolved(next === 'system' ? systemTheme() : next);
    if (next === 'system') {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ preference, resolved, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside a ThemeProvider');
  }
  return context;
}
