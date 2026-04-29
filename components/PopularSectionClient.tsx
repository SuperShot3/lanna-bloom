'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { BouquetCard } from '@/components/BouquetCard';
import { ProductCard } from '@/components/ProductCard';
import type { PopularCatalogItem } from '@/lib/sanity';
import type { Locale } from '@/lib/i18n';

const PAGE_SIZE = 8;
const NEW_CARD_ANIMATION_MS = 320;

function SunflowerSpinner({ className }: { className?: string }) {
  return (
    <span className={className} aria-hidden>
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="sunflower-spinner-svg"
      >
        {/* Center disc */}
        <circle cx="12" cy="12" r="4" fill="#1A3C34" />
        {/* Petals / leaves — yellow, thick */}
        {[...Array(12)].map((_, i) => {
          const angle = (i / 12) * 360;
          const rad = (angle * Math.PI) / 180;
          const x1 = 12 + 5 * Math.cos(rad);
          const y1 = 12 + 5 * Math.sin(rad);
          const x2 = 12 + 10 * Math.cos(rad);
          const y2 = 12 + 10 * Math.sin(rad);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#D4A017"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          );
        })}
      </svg>
    </span>
  );
}

export function PopularSectionClient({
  initialItems,
  lang,
}: {
  initialItems: PopularCatalogItem[];
  lang: Locale;
}) {
  const [items, setItems] = useState<PopularCatalogItem[]>(initialItems);
  const [hasMore, setHasMore] = useState(initialItems.length >= PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [newIds, setNewIds] = useState<string[]>([]);
  const fetchingRef = useRef(false);

  const newIdSet = useMemo(() => new Set(newIds), [newIds]);

  useEffect(() => {
    if (newIds.length === 0) return;
    const t = window.setTimeout(() => setNewIds([]), NEW_CARD_ANIMATION_MS);
    return () => window.clearTimeout(t);
  }, [newIds]);

  const loadMore = useCallback(async () => {
    if (fetchingRef.current || !hasMore) return;
    fetchingRef.current = true;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/bouquets?offset=${items.length}&limit=${PAGE_SIZE}`
      );
      if (!res.ok) return;
      const data = await res.json();
      const next: PopularCatalogItem[] = data.items ?? [];
      setNewIds(next.map((entry) => entry.item.id).filter(Boolean));
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

  return (
    <>
      <div className="popular-scroll-wrap">
        <div className="popular-scroll">
          {items.map((entry) => (
            <div
              key={`${entry.itemType}-${entry.item.id}`}
              className={`popular-card-slot ${
                newIdSet.has(entry.item.id) ? 'popular-card-slot--new' : ''
              }`}
            >
              {entry.itemType === 'bouquet' ? (
                <BouquetCard
                  bouquet={entry.item}
                  lang={lang}
                  variant="popular-compact"
                />
              ) : (
                <ProductCard product={entry.item} lang={lang} />
              )}
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
            <span role="status" aria-live="polite" className="inline-flex">
              <SunflowerSpinner />
            </span>
          ) : null}
        </div>
      )}
    </>
  );
}
