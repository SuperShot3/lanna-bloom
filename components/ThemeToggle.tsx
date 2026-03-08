'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';

export function ThemeToggle({ lang }: { lang: Locale }) {
  const { theme, toggleTheme } = useTheme();
  const t = translations[lang];
  const isDark = theme === 'dark';
  const label = isDark ? t.nav.themeSwitchToLight : t.nav.themeSwitchToDark;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="p-2 rounded-lg text-[#1A3C34] dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
      aria-label={label}
      title={label}
    >
      {isDark ? (
        <span className="material-symbols-outlined text-2xl">light_mode</span>
      ) : (
        <span className="material-symbols-outlined text-2xl">dark_mode</span>
      )}
    </button>
  );
}
