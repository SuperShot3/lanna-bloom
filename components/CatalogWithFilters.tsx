'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { BouquetCard } from '@/components/BouquetCard';
import { ProductCard } from '@/components/ProductCard';
import { CatalogFilterBar } from '@/components/CatalogFilterBar';
import { CatalogDeliveryBar } from '@/components/CatalogDeliveryBar';
import { FlowerFilterSidebar, FlowerFilterMobileDrawer } from '@/components/FlowerFilterSidebar';
import {
  buildCatalogSearchString,
  catalogHasAnyNarrowingFilters,
  catalogHasNarrowingFiltersBeyondTopCategory,
  countActiveCatalogFilters,
} from '@/lib/catalogFilterParams';
import { optionDisplayLabel } from '@/lib/bouquetOptions';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import type { Bouquet } from '@/lib/bouquets';
import type { CatalogFilterParams, CatalogProduct } from '@/lib/sanity';
import { trackViewItemList } from '@/lib/analytics';
import type { AnalyticsItem } from '@/lib/analytics';
import { computeFinalPrice } from '@/lib/partnerPricing';
import { GOOGLE_REVIEW_URL, GOOGLE_PLACE_URL } from '@/lib/reviewsConfig';

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
  /** Facet counts for flower types (unfiltered catalog) */
  flowerTypeCounts?: Record<string, number>;
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
      item_variant: b.sizes?.[0] ? optionDisplayLabel(b.sizes[0], lang) : undefined,
      price: minPrice,
      quantity: 1,
      index: i,
    };
  });
}

export function CatalogWithFilters({
  lang,
  bouquets = [],
  products = [],
  filterParams,
  title,
  description,
  flowerTypeCounts,
}: CatalogWithFiltersProps) {
  const router = useRouter();
  const pathname = usePathname() ?? '/';
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const t = translations[lang].catalog;
  const activeCount = countActiveCatalogFilters(filterParams);
  const hasAnyNarrowingFilters = catalogHasAnyNarrowingFilters(filterParams);
  const hasNarrowingBeyondTopCategory = catalogHasNarrowingFiltersBeyondTopCategory(filterParams);
  const items = bouquets.length > 0 ? bouquets : products;
  const isProductsMode = !!(filterParams.topCategory && filterParams.topCategory !== 'flowers');
  const showFlowerFilters = !isProductsMode;

  useEffect(() => {
    if (bouquets.length > 0) {
      trackViewItemList(LIST_NAME_CATALOG, bouquetsToAnalyticsItems(bouquets, lang));
    } else if (products.length > 0) {
      trackViewItemList(LIST_NAME_CATALOG, products.map((p, i) => ({
        item_id: p.id,
        item_name: (lang === 'th' && p.nameTh ? p.nameTh : p.nameEn) || '',
        item_category: p.category,
        price: computeFinalPrice(p.cost ?? p.price, p.commissionPercent),
        quantity: 1,
        index: i,
      })));
    }
  }, [lang, bouquets, products]);

  /** Balloons/gifts mode hides the flower sheet — clear stale open state so returning to flowers does not reopen it. */
  useEffect(() => {
    if (isProductsMode) setMobileFilterOpen(false);
  }, [isProductsMode]);

  const handleApply = useCallback(
    (params: CatalogFilterParams) => {
      const qs = buildCatalogSearchString(params);
      router.push(`${pathname}${qs}`);
    },
    [router, pathname]
  );

  const handleClear = useCallback(() => {
    router.push(pathname);
  }, [router, pathname]);

  const handleQuickFilter = useCallback(
    (partial: Partial<CatalogFilterParams>) => {
      // Bar actions should not leave the mobile sheet open (e.g. switching category
      // unmounts the drawer but state could stay true and reopen when returning to flowers).
      setMobileFilterOpen(false);
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

      // Handle top category (flowers, balloons, gifts, etc.)
      if ('topCategory' in partial) {
        merged.topCategory = partial.topCategory;
        // When switching to non-flowers, clear flower-specific filters for cleaner URL
        if (partial.topCategory && partial.topCategory !== 'flowers') {
          merged.category = undefined;
          merged.colors = undefined;
          merged.types = undefined;
          merged.occasion = undefined;
          merged.delivery = undefined;
          merged.formats = undefined;
          merged.stemBucket = undefined;
        }
      }

      // Handle occasion quick filter
      if ('occasion' in partial) {
        merged.occasion = partial.occasion || undefined;
      }

      const qs = buildCatalogSearchString(merged);
      router.push(`${pathname}${qs}`);
    },
    [filterParams, router, pathname]
  );

  return (
    <div className="catalog-with-filters">
      <div className="mb-6">
        <CatalogDeliveryBar lang={lang} />
      </div>
      <CatalogFilterBar
        lang={lang}
        activeCount={activeCount}
        isDrawerOpen={mobileFilterOpen}
        onOpenDrawer={() => setMobileFilterOpen(true)}
        filterParams={filterParams}
        onQuickFilter={handleQuickFilter}
        onClearAll={handleClear}
        hideFilterButtonOnDesktop={showFlowerFilters}
      />
      {showFlowerFilters && (
        <FlowerFilterMobileDrawer
          lang={lang}
          isOpen={mobileFilterOpen}
          onClose={() => setMobileFilterOpen(false)}
          values={filterParams}
          onApply={(p) => {
            handleApply(p);
            setMobileFilterOpen(false);
          }}
          onClear={handleClear}
          flowerTypeCounts={flowerTypeCounts}
        />
      )}
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 mt-5 lg:mt-6">
        {showFlowerFilters ? (
          <FlowerFilterSidebar
            lang={lang}
            values={filterParams}
            onApply={handleApply}
            onClear={handleClear}
            flowerTypeCounts={flowerTypeCounts}
          />
        ) : null}
        <div className="flex-1 min-w-0">
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
              {isProductsMode && !hasNarrowingBeyondTopCategory ? (
                <>
                  <div className="catalog-empty-visual" aria-hidden>
                    <Image
                      src="/images_other/sad_cat_flower_andBaloon.png"
                      alt=""
                      width={200}
                      height={200}
                      className="catalog-empty-visual-img"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  </div>
                  <p className="catalog-empty-text catalog-empty-heading">{t.catalogComingSoonTitle}</p>
                  <p className="catalog-empty-hint">{t.catalogComingSoonHint}</p>
                  <Link
                    href={`/${lang}/catalog`}
                    className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-[#C5A059] text-[#1A3C34] font-bold text-sm tracking-wide no-underline shadow-md hover:bg-[#b8913e] hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150"
                  >
                    {t.catalogEmptyCtaBrand}
                  </Link>
                </>
              ) : (
                <>
                  <p className="catalog-empty-text">
                    {hasAnyNarrowingFilters
                      ? (isProductsMode ? t.noProductsMatch : t.noResults)
                      : (isProductsMode ? t.catalogProductsEmpty : t.catalogEmpty)}
                  </p>
                  {(hasAnyNarrowingFilters || isProductsMode) && (
                    <Link
                      href={`/${lang}/catalog`}
                      className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-[#C5A059] text-[#1A3C34] font-bold text-sm tracking-wide no-underline shadow-md hover:bg-[#b8913e] hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150"
                    >
                      {t.catalogEmptyCtaBrand}
                    </Link>
                  )}
                </>
              )}
            </div>
          ) : (
            <>
              <div className="catalog-items-grid">
                {bouquets.length > 0
                  ? bouquets.map((bouquet) => (
                      <BouquetCard key={bouquet.id} bouquet={bouquet} lang={lang} />
                    ))
                  : products.map((product) => (
                      <ProductCard key={product.id} product={product} lang={lang} />
                    ))}
              </div>
              {filterParams.topCategory !== 'flowers' ? null : (
                <div className="mt-16 py-12 px-6 rounded-2xl bg-stone-100 border border-stone-200 text-center">
                  <p className="font-[family-name:var(--font-family-display)] text-xl text-[#1A3C34] mb-4">
                    {t.catalogReviewsCta ?? 'Love our bouquets?'}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-4">
                    <a
                      href={GOOGLE_REVIEW_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#C5A059] text-[#1A3C34] rounded-full font-semibold hover:opacity-90 transition-opacity"
                    >
                      {translations[lang].reviews.leaveReview}
                    </a>
                    <a
                      href={GOOGLE_PLACE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-[#C5A059] hover:underline underline-offset-4"
                    >
                      {translations[lang].reviews.allReviewsOnGoogle}
                    </a>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <style jsx>{`
        .catalog-with-filters {
          width: 100%;
        }
        .catalog-empty {
          text-align: center;
          padding: 48px 20px;
        }
        .catalog-empty-visual {
          margin: 0 auto 24px;
          width: min(200px, 60vw);
          aspect-ratio: 20 / 25;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 8px 28px rgba(26, 60, 52, 0.12);
        }
        .catalog-empty-visual-img {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover;
          display: block;
        }
        .catalog-empty-text {
          font-size: 1rem;
          color: var(--text-muted);
          margin: 0 0 16px;
        }
        .catalog-empty-heading {
          font-family: var(--font-serif);
          font-size: clamp(1.35rem, 3vw, 1.75rem);
          font-weight: 300;
          font-style: italic;
          color: var(--text);
          margin-bottom: 10px;
        }
        .catalog-empty-hint {
          font-size: 0.95rem;
          line-height: 1.55;
          color: var(--text-muted);
          margin: 0 auto 22px;
          max-width: 40ch;
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
        .catalog-items-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          align-items: stretch;
          width: 100%;
        }
        /* Critical: allow grid children to shrink below content min-width */
        .catalog-items-grid > * {
          min-width: 0;
        }
        @media (min-width: 640px) {
          .catalog-items-grid {
            gap: 20px;
          }
        }
        @media (min-width: 1024px) {
          .catalog-items-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 24px;
          }
        }
        @media (min-width: 1280px) {
          .catalog-items-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
        }
      `}</style>
    </div>
  );
}
