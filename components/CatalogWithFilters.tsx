'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { BouquetCard } from '@/components/BouquetCard';
import { ProductCard } from '@/components/ProductCard';
import { CatalogFilterBar, countActiveFilters } from '@/components/CatalogFilterBar';
import { FilterDrawer } from '@/components/FilterDrawer';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import type { Bouquet } from '@/lib/bouquets';
import type { CatalogFilterParams, CatalogProduct } from '@/lib/sanity';
import { trackViewItemList } from '@/lib/analytics';
import type { AnalyticsItem } from '@/lib/analytics';

export interface CatalogWithFiltersProps {
  lang: Locale;
  /** Bouquets (when topCategory=flowers) */
  bouquets?: Bouquet[];
  /** Products (when topCategory is balloons, gifts, etc.) */
  products?: CatalogProduct[];
  /** Current filter params from URL (parsed by server) */
  filterParams: CatalogFilterParams;
  /** Page title (e.g. "Our bouquets") */
  title?: string;
  /** Optional description shown below title when occasion is selected */
  description?: string;
}

function buildSearchString(params: CatalogFilterParams): string {
  const sp = new URLSearchParams();
  if (params.topCategory && params.topCategory !== 'flowers') sp.set('topCategory', params.topCategory);
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

const LIST_NAME_CATALOG = 'catalog';

function bouquetsToAnalyticsItems(bouquets: Bouquet[], lang: Locale): AnalyticsItem[] {
  return bouquets.map((b, i) => {
    const name = lang === 'th' ? b.nameTh : b.nameEn;
    const minPrice = b.sizes?.length ? Math.min(...b.sizes.map((s) => s.price)) : 0;
    return {
      item_id: b.id,
      item_name: name,
      item_category: b.category,
      item_variant: b.sizes?.[0]?.label,
      price: minPrice,
      quantity: 1,
      index: i,
    };
  });
}

export function CatalogWithFilters({ lang, bouquets = [], products = [], filterParams, title, description }: CatalogWithFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const t = translations[lang].catalog;
  const activeCount = countActiveFilters(filterParams);
  const items = bouquets.length > 0 ? bouquets : products;
  const isProductsMode = !!(filterParams.topCategory && filterParams.topCategory !== 'flowers');

  useEffect(() => {
    if (bouquets.length > 0) {
      trackViewItemList(LIST_NAME_CATALOG, bouquetsToAnalyticsItems(bouquets, lang));
    } else if (products.length > 0) {
      trackViewItemList(LIST_NAME_CATALOG, products.map((p, i) => ({
        item_id: p.id,
        item_name: (lang === 'th' && p.nameTh ? p.nameTh : p.nameEn) || '',
        item_category: p.category,
        price: p.price,
        quantity: 1,
        index: i,
      })));
    }
  }, [lang, bouquets, products]);

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

  const handleQuickFilter = useCallback(
    (partial: Partial<CatalogFilterParams>) => {
      const merged = { ...filterParams };

      // Handle max toggle
      if ('max' in partial) {
        if (partial.max === undefined) {
          // Toggle off - remove max param
          delete merged.max;
        } else {
          // Set new value (or toggle off if same value)
          if (merged.max === partial.max) {
            delete merged.max;
          } else {
            merged.max = partial.max;
          }
        }
      }

      // Handle sort toggle
      if ('sort' in partial && partial.sort !== undefined) {
        merged.sort = partial.sort;
      }

      // Handle occasion quick filter
      if ('occasion' in partial) {
        merged.occasion = partial.occasion || undefined;
      }

      const qs = buildSearchString(merged);
      router.push(`${pathname}${qs}`);
    },
    [filterParams, router, pathname]
  );

  return (
    <div className="catalog-with-filters">
      <CatalogFilterBar
        lang={lang}
        activeCount={activeCount}
        isDrawerOpen={drawerOpen}
        onOpenDrawer={() => setDrawerOpen(true)}
        filterParams={filterParams}
        onQuickFilter={handleQuickFilter}
        onClearAll={handleClear}
      />
      <FilterDrawer
        lang={lang}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        values={filterParams}
        onApply={handleApply}
        onClear={handleClear}
      />
      {(title || description) && (
        <div className="catalog-page-header">
          <div className="catalog-page-title">
            <h1 className="catalog-title">{title || t.title}</h1>
            {items.length > 0 && (
              <span className="catalog-result-count">
                {t.resultCountAvailable.replace('{count}', String(items.length))}
              </span>
            )}
          </div>
          {description && (
            <p className="catalog-page-description">{description}</p>
          )}
        </div>
      )}
      {items.length === 0 ? (
        <div className="catalog-empty">
          <p className="catalog-empty-text">
            {activeCount > 0
              ? (isProductsMode ? t.noProductsMatch : t.noResults)
              : (isProductsMode ? t.catalogProductsEmpty : t.catalogEmpty)}
          </p>
          {activeCount > 0 && (
            <Link href={`/${lang}/catalog`} className="catalog-empty-link">
              {t.viewAll}
            </Link>
          )}
        </div>
      ) : (
        <div className="catalog-grid">
          {bouquets.length > 0
            ? bouquets.map((bouquet) => (
                <BouquetCard key={bouquet.id} bouquet={bouquet} lang={lang} />
              ))
            : products.map((product) => (
                <ProductCard key={product.id} product={product} lang={lang} />
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
        .catalog-page-header {
          padding: 6px 0 14px;
        }
        .catalog-page-title {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
        }
        .catalog-page-description {
          margin: 12px 0 0;
          font-size: 1rem;
          line-height: 1.6;
          color: var(--text-muted);
          max-width: 56ch;
        }
        .catalog-title {
          font-family: var(--font-serif);
          font-size: clamp(1.5rem, 4vw, 2rem);
          font-weight: 300;
          font-style: italic;
          margin: 0;
          color: var(--text);
        }
        .catalog-result-count {
          font-size: 12px;
          color: var(--text-muted);
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}
