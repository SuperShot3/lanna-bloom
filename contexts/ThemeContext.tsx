'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'lanna-theme';
export const THEME_COLOR_LIGHT = '#FDFCF8';
export const THEME_COLOR_DARK = '#0D1F1A';

interface ThemeContextValue {
  theme: Theme;
  resolvedFrom: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark';
}

function isAdminPath(pathname: string | null): boolean {
  return Boolean(pathname?.startsWith('/admin'));
}

function readStoredTheme(): Theme {
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isTheme(saved)) return saved;
  } catch {
    // Storage is optional; light remains the brand default.
  }
  return 'light';
}

function applyThemeToDocument(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
  root.style.colorScheme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute(
      'content',
      theme === 'dark' ? THEME_COLOR_DARK : THEME_COLOR_LIGHT
    );
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    if (isAdminPath(pathname)) {
      applyThemeToDocument('light');
      setThemeState('light');
      return;
    }
    const stored = readStoredTheme();
    applyThemeToDocument(stored);
    setThemeState(stored);
  }, [pathname]);

  const setTheme = useCallback(
    (next: Theme) => {
      if (isAdminPath(pathname)) {
        applyThemeToDocument('light');
        setThemeState('light');
        return;
      }
      setThemeState(next);
      applyThemeToDocument(next);
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // Preference persistence should not block shopping.
      }
    },
    [pathname]
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [setTheme, theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedFrom: theme,
      toggleTheme,
      setTheme,
    }),
    [setTheme, theme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
