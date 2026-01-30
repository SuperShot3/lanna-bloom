'use client';

import Link from 'next/link';
import { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';

const HERO_CATEGORY_KEYS = [
  'all',
  'roses',
  'mixed',
  'romantic',
  'inBox',
  'birthday',
] as const;

const CATEGORY_ICONS: Record<string, string> = {
  all: '🌸',
  roses: '🌹',
  mixed: '💐',
  romantic: '💜',
  inBox: '🎁',
  birthday: '🎂',
};

export function CategoryGrid({ lang }: { lang: Locale }) {
  const t = translations[lang].categories;

  return (
    <section className="category-section">
      <div className="container category-container">
        <div className="category-scroll" role="navigation" aria-label="Categories">
          {HERO_CATEGORY_KEYS.map((key) => {
            const href = `/${lang}/catalog${key === 'all' ? '' : `?category=${key}`}`;
            const label = t[key];
            const icon = CATEGORY_ICONS[key] || '🌸';
            return (
              <Link key={key} href={href} className="category-chip">
                <span className="category-chip-icon" aria-hidden>{icon}</span>
                <span className="category-chip-label">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
      <style jsx>{`
        .category-section {
          padding: 0 0 32px;
        }
        .category-container {
          padding-left: 20px;
          padding-right: 20px;
        }
        .category-scroll {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          overflow-y: hidden;
          padding: 4px 0 12px;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .category-scroll::-webkit-scrollbar {
          display: none;
        }
        .category-chip {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 12px 16px;
          background: var(--surface);
          border-radius: 9999px;
          border: 1px solid var(--border);
          box-shadow: 0 2px 8px rgba(45, 42, 38, 0.06);
          transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
          min-height: 44px;
        }
        .category-chip:hover {
          border-color: var(--accent-soft);
          box-shadow: 0 4px 12px rgba(45, 42, 38, 0.08);
          transform: translateY(-1px);
        }
        .category-chip-icon {
          font-size: 1.25rem;
          line-height: 1;
        }
        .category-chip-label {
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--text);
          white-space: nowrap;
        }
        @media (min-width: 600px) {
          .category-section {
            padding: 0 0 40px;
          }
          .category-scroll {
            flex-wrap: wrap;
            justify-content: center;
            overflow-x: visible;
            gap: 12px;
          }
          .category-chip {
            flex-shrink: 0;
          }
        }
      `}</style>
    </section>
  );
}
