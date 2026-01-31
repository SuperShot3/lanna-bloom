'use client';

import Link from 'next/link';
import { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';

const PILL_CATEGORY_KEYS = [
  'all',
  'roses',
  'mixed',
  'mono',
  'inBox',
  'romantic',
  'birthday',
  'sympathy',
] as const;

export interface FilterPillsProps {
  lang: Locale;
  /** Current category from URL (e.g. "all" or "roses"); used to highlight active pill */
  currentCategory?: string;
}

export function FilterPills({ lang, currentCategory = 'all' }: FilterPillsProps) {
  const t = translations[lang].categories;

  return (
    <section className="filter-pills-section" aria-label="Categories">
      <div className="container filter-pills-container">
        <div className="filter-pills-scroll" role="navigation">
          {PILL_CATEGORY_KEYS.map((key) => {
            const href = `/${lang}/catalog${key === 'all' ? '' : `?category=${key}`}`;
            const label = t[key];
            const isActive = currentCategory === key;
            return (
              <Link
                key={key}
                href={href}
                className={`filter-pill ${isActive ? 'filter-pill--active' : ''}`}
                aria-current={isActive ? 'true' : undefined}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
      <style jsx>{`
        .filter-pills-section {
          padding: 0 0 24px;
        }
        .filter-pills-container {
          padding-left: 20px;
          padding-right: 20px;
        }
        .filter-pills-scroll {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          overflow-y: hidden;
          padding: 4px 0 12px;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .filter-pills-scroll::-webkit-scrollbar {
          display: none;
        }
        .filter-pill {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 48px;
          padding: 14px 24px;
          box-sizing: border-box;
          background: var(--surface);
          border-radius: 9999px;
          border: 2px solid #b8a99a;
          box-shadow: 0 2px 0 #b8a99a, 0 4px 12px rgba(45, 42, 38, 0.1);
          font-size: 0.95rem;
          font-weight: 700;
          line-height: 1.2;
          color: var(--text);
          text-decoration: none;
          white-space: nowrap;
          appearance: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s, transform 0.15s;
        }
        .filter-pill:hover {
          border-color: var(--accent);
          background: var(--accent-soft);
          box-shadow: 0 3px 0 #a88b5c, 0 6px 16px rgba(45, 42, 38, 0.12);
          transform: translateY(-2px);
        }
        .filter-pill:focus-visible {
          outline: 3px solid var(--accent);
          outline-offset: 2px;
        }
        .filter-pill--active {
          background: var(--accent);
          border-color: #a88b5c;
          color: #fff;
          font-weight: 700;
          box-shadow: 0 3px 0 #a88b5c, 0 6px 16px rgba(45, 42, 38, 0.15);
        }
        .filter-pill--active:hover {
          background: #b39868;
          border-color: #967a4d;
          box-shadow: 0 3px 0 #967a4d, 0 6px 16px rgba(45, 42, 38, 0.18);
        }
        @media (min-width: 600px) {
          .filter-pills-section {
            padding: 0 0 32px;
          }
          .filter-pills-scroll {
            flex-wrap: wrap;
            justify-content: center;
            overflow-x: visible;
            gap: 12px;
          }
        }
      `}</style>
    </section>
  );
}
