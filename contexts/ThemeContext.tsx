'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

const THEME_STORAGE_KEY = 'lanna-bloom-theme';

export type Theme = 'light' | 'dark';

function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    return null;
  } catch {
    return null;
  }
}

function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(theme: Theme | null) {
  const html = document.documentElement;
  if (theme === 'dark') {
    html.classList.add('dark');
    html.classList.remove('light');
  } else if (theme === 'light') {
    html.classList.add('light');
    html.classList.remove('dark');
  } else {
    html.classList.remove('light', 'dark');
  }
}

interface ThemeContextValue {
  /** Resolved theme: 'light' or 'dark' (either from user choice or system) */
  theme: Theme;
  /** User's explicit choice, or null if following system */
  resolvedFrom: Theme | 'system';
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [resolvedFrom, setResolvedFrom] = useState<Theme | 'system'>(() => {
    const stored = getStoredTheme();
    if (stored) return stored;
    return 'system';
  });

  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = getStoredTheme();
    if (stored) return stored;
    return getSystemPrefersDark() ? 'dark' : 'light';
  });

  useEffect(() => {
    applyTheme(resolvedFrom === 'system' ? null : resolvedFrom);
  }, [resolvedFrom]);

  useEffect(() => {
    if (resolvedFrom === 'system') {
      setThemeState(getSystemPrefersDark() ? 'dark' : 'light');
    } else {
      setThemeState(resolvedFrom);
    }
  }, [resolvedFrom]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (resolvedFrom === 'system') {
        setThemeState(mq.matches ? 'dark' : 'light');
        applyTheme(null);
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [resolvedFrom]);

  const setTheme = useCallback((newTheme: Theme) => {
    setResolvedFrom(newTheme);
    setThemeState(newTheme);
    applyTheme(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {
      // ignore
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }, [theme, setTheme]);

  const value: ThemeContextValue = {
    theme,
    resolvedFrom,
    toggleTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
