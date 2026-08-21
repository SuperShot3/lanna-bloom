'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { translations, type Locale } from '@/lib/i18n';

export function ThemeToggle({ lang }: { lang: Locale }) {
  const { theme, toggleTheme } = useTheme();
  const t = translations[lang].nav;
  const label = theme === 'dark' ? t.themeSwitchToLight : t.themeSwitchToDark;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="relative z-[1] flex h-11 w-11 shrink-0 items-center justify-center text-[var(--text)] hover:text-[#C5A059] transition-colors motion-reduce:transition-none touch-manipulation [-webkit-tap-highlight-color:transparent]"
      aria-label={label}
      title={label}
    >
      <Sun className="hidden h-[18px] w-[18px] dark:block" strokeWidth={1.75} aria-hidden />
      <Moon className="block h-[18px] w-[18px] dark:hidden" strokeWidth={1.75} aria-hidden />
    </button>
  );
}
