'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BouquetCard } from '@/components/BouquetCard';
import type { Bouquet } from '@/lib/bouquets';
import type { Locale } from '@/lib/i18n';

const PAGE_SIZE = 8;

export function MarketBouquetsShowcase({
  lang,
  initialBouquets,
}: {
  lang: Locale;
  initialBouquets: Bouquet[];
}) {
  const [items, setItems] = useState<Bouquet[]>(initialBouquets);
  const [hasMore, setHasMore] = useState(initialBouquets.length >= PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const fetchingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (fetchingRef.current || !hasMore) return;
    fetchingRef.current = true;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/bouquets?kind=bouquets&offset=${items.length}&limit=${PAGE_SIZE}`
      );
      if (!res.ok) return;
      const data = (await res.json()) as { bouquets?: Bouquet[]; hasMore?: boolean };
      const next = data.bouquets ?? [];
      setItems((prev) => [...prev, ...next]);
      setHasMore(Boolean(data.hasMore));
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, [items.length, hasMore]);

  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMoreRef.current();
        }
      },
      { root: null, rootMargin: '280px 0px', threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, items.length]);

  const heading =
    lang === 'th' ? 'ช่อดอกไม้แนะนำ' : 'Featured bouquets';

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-stone-50" aria-labelledby="market-bouquets-title">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2
          id="market-bouquets-title"
          className="font-[family-name:var(--font-family-display)] text-3xl sm:text-4xl text-[#1A3C34] mb-8 sm:mb-10"
        >
          {heading}
        </h2>
        <div className="popular-scroll-wrap">
          <div className="popular-scroll">
            {items.map((bouquet) => (
              <div key={bouquet.id} className="popular-card-slot">
                <BouquetCard bouquet={bouquet} lang={lang} variant="popular-compact" />
              </div>
            ))}
          </div>
        </div>
        {hasMore && (
          <div
            ref={sentinelRef}
            className="mt-8 sm:mt-10 flex min-h-[52px] items-center justify-center"
          >
            {loading ? (
              <span role="status" aria-live="polite" className="text-[#1A3C34] text-sm">
                …
              </span>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
