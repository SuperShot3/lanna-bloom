import { getPopularCatalogItemsFromSanityPaginated } from '@/lib/sanity';
import { PopularSectionClient } from '@/components/PopularSectionClient';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';

const INITIAL_LIMIT = 8;

export async function PopularSection({ lang }: { lang: Locale }) {
  const initialItems = await getPopularCatalogItemsFromSanityPaginated(0, INITIAL_LIMIT);
  const t = translations[lang].home;

  if (initialItems.length === 0) return null;

  return (
    <section
      className="pt-4 pb-12 sm:pt-5 sm:pb-14 lg:pt-6 lg:pb-16 bg-stone-50"
      aria-labelledby="popular-title"
      data-home-reveal
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2
          id="popular-title"
          className="home-reveal-item font-[family-name:var(--font-family-display)] text-3xl sm:text-4xl text-[#1A3C34] mb-6 sm:mb-8"
        >
          {t.popularTitle}
        </h2>
        <PopularSectionClient initialItems={initialItems} lang={lang} />
      </div>
    </section>
  );
}
