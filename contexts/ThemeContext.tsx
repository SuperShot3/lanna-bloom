'use client';

import { createContext, useContext } from 'react';

/** Theme is always light. Kept for compatibility with any remaining useTheme() calls. */
export type Theme = 'light';

interface ThemeContextValue {
  theme: Theme;
  resolvedFrom: Theme;
  toggleTheme: () => void;
  setTheme: (_: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const value: ThemeContextValue = {
    theme: 'light',
    resolvedFrom: 'light',
    toggleTheme: () => {},
    setTheme: () => {},
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
