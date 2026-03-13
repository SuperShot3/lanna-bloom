'use client';

import { useState, useCallback } from 'react';
import { BouquetCard } from '@/components/BouquetCard';
import type { Bouquet } from '@/lib/bouquets';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';

const PAGE_SIZE = 8;

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
  initialBouquets,
  lang,
}: {
  initialBouquets: Bouquet[];
  lang: Locale;
}) {
  const [bouquets, setBouquets] = useState<Bouquet[]>(initialBouquets);
  const [hasMore, setHasMore] = useState(initialBouquets.length >= PAGE_SIZE);
  const [loading, setLoading] = useState(false);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/bouquets?offset=${bouquets.length}&limit=${PAGE_SIZE}`
      );
      if (!res.ok) return;
      const data = await res.json();
      const next = data.bouquets ?? [];
      setBouquets((prev) => [...prev, ...next]);
      setHasMore(Boolean(data.hasMore));
    } finally {
      setLoading(false);
    }
  }, [bouquets.length, hasMore, loading]);

  const t = translations[lang].home;

  return (
    <>
      <div className="popular-scroll-wrap">
        <div className="popular-scroll">
          {bouquets.map((bouquet) => (
            <div key={bouquet.id} className="popular-card-slot">
              <BouquetCard
                bouquet={bouquet}
                lang={lang}
                variant="popular-compact"
              />
            </div>
          ))}
        </div>
      </div>
      {hasMore && (
        <div className="mt-8 sm:mt-10 text-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="show-more-btn relative inline-flex items-center justify-center px-8 py-3 bg-[#C5A059] text-[#1A3C34] rounded-full font-semibold hover:opacity-90 transition-opacity disabled:opacity-70 disabled:pointer-events-none min-h-[52px] min-w-[180px]"
          >
            {/* Idle: label + arrow — fades out when loading */}
            <span
              className={`absolute inset-0 inline-flex items-center justify-center gap-2 transition-opacity duration-300 ease-in-out ${
                loading ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}
              aria-hidden={loading}
            >
              {t.showMore}
              <span className="material-symbols-outlined text-xl">
                expand_more
              </span>
            </span>
            {/* Loading: flower only — fades in when loading */}
            <span
              className={`absolute inset-0 inline-flex items-center justify-center transition-opacity duration-300 ease-in-out ${
                loading ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
              aria-hidden={!loading}
            >
              <SunflowerSpinner />
            </span>
          </button>
        </div>
      )}
    </>
  );
}
