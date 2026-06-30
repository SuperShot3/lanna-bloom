'use client';

import { BouquetCardSkeleton } from '@/components/BouquetCardSkeleton';

const SECTION_COUNT = 3;
const CARDS_PER_SECTION = 6;

function TypeSectionSkeleton() {
  return (
    <div className="mb-12 sm:mb-14 last:mb-0">
      <div
        className="w-40 h-10 rounded bg-stone-200 animate-pulse mb-6 sm:mb-8"
        aria-hidden
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
        {Array.from({ length: CARDS_PER_SECTION }).map((_, i) => (
          <BouquetCardSkeleton key={i} />
        ))}
      </div>
      <div className="mt-8 sm:mt-10 flex justify-center">
        <div
          className="w-36 h-11 rounded-full bg-stone-200 animate-pulse"
          aria-hidden
        />
      </div>
    </div>
  );
}

export function PopularSectionSkeleton() {
  return (
    <section className="pt-4 pb-12 sm:pt-5 sm:pb-14 lg:pt-6 lg:pb-16 bg-stone-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {Array.from({ length: SECTION_COUNT }).map((_, i) => (
          <TypeSectionSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}
