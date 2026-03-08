'use client';

import { BouquetCardSkeleton } from '@/components/BouquetCardSkeleton';

export function PopularSectionSkeleton() {
  return (
    <section className="py-16 sm:py-20 bg-stone-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div
          className="w-48 h-10 rounded bg-stone-200 animate-pulse mb-8 sm:mb-10"
          aria-hidden
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <BouquetCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
