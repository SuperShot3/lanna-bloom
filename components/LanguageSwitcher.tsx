'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Locale } from '@/lib/i18n';
import { trackLanguageChange } from '@/lib/analytics';

const FLAG_CLASS: Record<Locale, string> = {
  en: 'fi fi-gb',
  th: 'fi fi-th',
  ru: 'fi fi-ru',
  'zh-sg': 'fi fi-sg',
  'zh-hk': 'fi fi-hk',
};

const LABELS: Record<Locale, string> = {
  en: 'English',
  th: 'Thai',
  ru: 'Russian',
  'zh-sg': 'Chinese (Singapore)',
  'zh-hk': 'Chinese (Hong Kong)',
};

const LANGUAGE_OPTIONS: { locale: Locale; label: string; region?: string }[] = [
  { locale: 'en', label: 'English' },
  { locale: 'th', label: 'ภาษาไทย' },
  { locale: 'ru', label: 'Русский' },
  { locale: 'zh-hk', label: '繁體中文', region: 'HK' },
  { locale: 'zh-sg', label: '繁體中文', region: 'SG' },
];

const SWITCHER_QUEUE: Locale[] = ['th', 'en', 'ru', 'zh-sg', 'zh-hk'];
const NEXT_LANG: Record<Locale, Locale> = {
  en: 'th',
  th: 'ru',
  ru: 'zh-sg',
  'zh-sg': 'zh-hk',
  'zh-hk': 'en',
};

function activeDisplayLabel(locale: Locale): string {
  const opt = LANGUAGE_OPTIONS.find((o) => o.locale === locale);
  if (!opt) return LABELS[locale];
  return opt.region ? `${opt.label} (${opt.region})` : opt.label;
}

export function LanguageSwitcher({
  currentLang,
  pathBase,
  variant = 'cycle',
  onNavigate,
}: {
  currentLang: Locale;
  pathBase: string;
  variant?: 'cycle' | 'flags' | 'dropdown';
  onNavigate?: () => void;
}) {
  const path = pathBase === '/' ? '' : pathBase;
  const nextLang = NEXT_LANG[currentLang];
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, close]);

  if (variant === 'dropdown') {
    return (
      <div className="relative shrink-0 overflow-visible">
        <button
          type="button"
          className="flex items-center gap-1 px-0 py-0 text-[#1A3C34] hover:text-[#C5A059] transition-colors min-h-11 min-w-11"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={`Language: ${activeDisplayLabel(currentLang)}`}
        >
          <span className="flex max-md:h-11 max-md:w-11 max-md:shrink-0 max-md:items-center max-md:justify-center md:hidden">
            <span
              className={`inline-block h-6 w-6 shrink-0 rounded-none bg-cover bg-center ${FLAG_CLASS[currentLang]}`}
              aria-hidden
            />
          </span>
          <span className="hidden md:flex items-center gap-1">
            <span className="material-symbols-outlined text-[18px] leading-none" aria-hidden>
              language
            </span>
            <span className="text-[11px] text-stone-500 max-w-[88px] truncate">
              {activeDisplayLabel(currentLang)}
            </span>
          </span>
        </button>

        {open && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-[55] cursor-default"
              aria-label="Close language menu"
              onClick={close}
            />
            <ul
              role="listbox"
              aria-label="Language"
              className="fixed right-[max(1rem,env(safe-area-inset-right))] top-[calc(5rem+env(safe-area-inset-top,0px))] z-[60] min-w-[170px] overflow-hidden rounded-[10px] border border-[#ede8e2] bg-white shadow-[0_8px_32px_rgba(0,0,0,0.1)] max-md:max-h-[min(70vh,420px)] max-md:overflow-y-auto md:absolute md:right-0 md:top-full md:mt-1 md:max-h-none"
            >
              {LANGUAGE_OPTIONS.map((opt) => {
                const isActive = opt.locale === currentLang;
                return (
                  <li key={opt.locale} role="option" aria-selected={isActive}>
                    <Link
                      href={`/${opt.locale}${path}`}
                      scroll={false}
                      className={`flex w-full items-center justify-between gap-2.5 px-4 py-[11px] text-left text-[13px] transition-colors ${
                        isActive
                          ? 'border-l-2 border-[#1A3C34] bg-[#f0f5f2] text-[#1A3C34]'
                          : 'border-l-2 border-transparent text-stone-500 hover:bg-[#f5f1ec]'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => {
                        if (!isActive) trackLanguageChange(opt.locale);
                        close();
                        onNavigate?.();
                      }}
                    >
                      <span>{opt.label}</span>
                      {opt.region && (
                        <span className="rounded-[3px] bg-[#ede8e2] px-[5px] py-px text-[10px] text-stone-400">
                          {opt.region}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    );
  }

  if (variant === 'flags') {
    return (
      <div className="lang-switcher lang-switcher--flags" role="navigation" aria-label="Language">
        {SWITCHER_QUEUE.map((locale) => {
          const isActive = locale === currentLang;
          return (
            <Link
              key={locale}
              href={`/${locale}${path}`}
              scroll={false}
              className={`lang-flag lang-flag--row ${isActive ? 'lang-flag--active' : ''}`}
              aria-label={LABELS[locale]}
              aria-current={isActive ? 'page' : undefined}
              title={LABELS[locale]}
              onClick={() => {
                if (!isActive) trackLanguageChange(locale);
                onNavigate?.();
              }}
            >
              <span className={`lang-flag-icon ${FLAG_CLASS[locale]}`} aria-hidden />
            </Link>
          );
        })}
        <style jsx>{`
          .lang-switcher {
            display: flex;
            align-items: center;
            flex-shrink: 0;
          }
          .lang-switcher--flags {
            gap: 10px;
          }
          .lang-flag {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: transparent;
            border: 1px solid var(--border);
            transition: border-color 0.2s, background 0.2s, color 0.2s;
          }
          .lang-flag:hover,
          .lang-flag--active {
            background: var(--pastel-cream);
            border-color: var(--accent-soft);
          }
          .lang-flag--row {
            background: #fff;
            box-shadow: 0 1px 4px rgba(26, 60, 52, 0.08);
          }
          .lang-flag-icon {
            font-size: 1.22rem;
            line-height: 1;
            border-radius: 2px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="lang-switcher" role="navigation" aria-label="Language">
      <Link
        href={`/${nextLang}${path}`}
        scroll={false}
        className="lang-flag"
        aria-label={LABELS[nextLang]}
        title={LABELS[nextLang]}
        onClick={() => {
          trackLanguageChange(nextLang);
          onNavigate?.();
        }}
      >
        <span className={`lang-flag-icon ${FLAG_CLASS[nextLang]}`} aria-hidden />
      </Link>
      <style jsx>{`
        .lang-switcher {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }
        .lang-flag {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: transparent;
          border: 1px solid var(--border);
          transition: border-color 0.2s, background 0.2s, color 0.2s;
        }
        .lang-flag:hover {
          background: var(--pastel-cream);
          border-color: var(--accent-soft);
        }
        .lang-flag-icon {
          font-size: 1.22rem;
          line-height: 1;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}
