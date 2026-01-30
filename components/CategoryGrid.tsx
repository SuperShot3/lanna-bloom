'use client';

import Link from 'next/link';
import { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';

const CATEGORY_KEYS = [
  'all',
  'roses',
  'mixed',
  'mono',
  'inBox',
  'romantic',
  'birthday',
] as const;

const CATEGORY_ICONS: Record<string, string> = {
  all: '🌸',
  roses: '🌹',
  mixed: '💐',
  mono: '🪻',
  inBox: '📦',
  romantic: '💕',
  birthday: '🎂',
};

export function CategoryGrid({ lang }: { lang: Locale }) {
  const t = translations[lang].categories;

  return (
    <section className="category-section">
      <div className="container">
        <div className="category-grid">
          {CATEGORY_KEYS.map((key) => {
            const href = `/${lang}/catalog${key === 'all' ? '' : `?category=${key}`}`;
            const label = t[key];
            const icon = CATEGORY_ICONS[key] || '🌸';
            return (
              <Link key={key} href={href} className="category-card">
                <span className="category-icon" aria-hidden>{icon}</span>
                <span className="category-label">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
      <style jsx>{`
        .category-section {
          padding: 32px 0 48px;
        }
        .category-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        .category-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 20px 12px;
          background: var(--surface);
          border-radius: var(--radius);
          border: 1px solid var(--border);
          box-shadow: var(--shadow);
          transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
        }
        .category-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-hover);
          border-color: var(--accent-soft);
        }
        .category-icon {
          font-size: 2rem;
          line-height: 1;
        }
        .category-label {
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--text);
          text-align: center;
          line-height: 1.3;
        }
        @media (min-width: 600px) {
          .category-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
          }
          .category-card { padding: 24px 16px; }
          .category-icon { font-size: 2.25rem; }
          .category-label { font-size: 1rem; }
        }
        @media (min-width: 900px) {
          .category-grid { grid-template-columns: repeat(4, 1fr); }
        }
      `}</style>
    </section>
  );
}
