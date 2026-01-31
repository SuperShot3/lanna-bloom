'use client';

import { useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { BouquetCard } from '@/components/BouquetCard';
import { CatalogFilterBar, countActiveFilters } from '@/components/CatalogFilterBar';
import { FilterDrawer } from '@/components/FilterDrawer';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import type { Bouquet } from '@/lib/bouquets';
import type { CatalogFilterParams } from '@/lib/sanity';

export interface CatalogWithFiltersProps {
  lang: Locale;
  bouquets: Bouquet[];
  /** Current filter params from URL (parsed by server) */
  filterParams: CatalogFilterParams;
}

function buildSearchString(params: CatalogFilterParams): string {
  const sp = new URLSearchParams();
  if (params.category && params.category !== 'all') sp.set('category', params.category);
  if (params.colors?.length) sp.set('colors', params.colors.join(','));
  if (params.types?.length) sp.set('types', params.types.join(','));
  if (params.occasion) sp.set('occasion', params.occasion);
  if (params.min != null && params.min > 0) sp.set('min', String(params.min));
  if (params.max != null && params.max > 0) sp.set('max', String(params.max));
  if (params.sort && params.sort !== 'newest') sp.set('sort', params.sort);
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export function CatalogWithFilters({ lang, bouquets, filterParams }: CatalogWithFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const t = translations[lang].catalog;
  const activeCount = countActiveFilters(filterParams);

  const handleApply = useCallback(
    (params: CatalogFilterParams) => {
      const qs = buildSearchString(params);
      router.push(`${pathname}${qs}`);
    },
    [router, pathname]
  );

  const handleClear = useCallback(() => {
    router.push(pathname);
  }, [router, pathname]);

  return (
    <div className="catalog-with-filters">
      <CatalogFilterBar
        lang={lang}
        activeCount={activeCount}
        isDrawerOpen={drawerOpen}
        onOpenDrawer={() => setDrawerOpen(true)}
      />
      <FilterDrawer
        lang={lang}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        values={filterParams}
        onApply={handleApply}
        onClear={handleClear}
      />
      {bouquets.length === 0 ? (
        <div className="catalog-empty">
          <p className="catalog-empty-text">{t.noResults}</p>
          <Link href={`/${lang}/catalog`} className="catalog-empty-link">
            {t.viewAll}
          </Link>
        </div>
      ) : (
        <div className="catalog-grid">
          {bouquets.map((bouquet) => (
            <BouquetCard key={bouquet.id} bouquet={bouquet} lang={lang} />
          ))}
        </div>
      )}
      <style jsx>{`
        .catalog-with-filters {
          width: 100%;
        }
        .catalog-empty {
          text-align: center;
          padding: 48px 20px;
        }
        .catalog-empty-text {
          font-size: 1rem;
          color: var(--text-muted);
          margin: 0 0 16px;
        }
        .catalog-empty-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          padding: 0 24px;
          background: var(--accent);
          color: #fff;
          font-weight: 600;
          border-radius: 9999px;
          transition: transform 0.2s;
        }
        .catalog-empty-link:hover,
        .catalog-empty-link:focus-visible {
          transform: translateY(-2px);
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        .catalog-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }
        @media (min-width: 600px) {
          .catalog-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (min-width: 900px) {
          .catalog-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `}</style>
    </div>
  );
}
