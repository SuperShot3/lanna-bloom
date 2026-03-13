import { getBouquetsFromSanityPaginated } from '@/lib/sanity';
import { PopularSectionClient } from '@/components/PopularSectionClient';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';

const INITIAL_LIMIT = 8;

export async function PopularSection({ lang }: { lang: Locale }) {
  const initialBouquets = await getBouquetsFromSanityPaginated(0, INITIAL_LIMIT);
  const t = translations[lang].home;

  if (initialBouquets.length === 0) return null;

  return (
    <section
      className="py-16 sm:py-20 lg:py-24 bg-stone-50"
      aria-labelledby="popular-title"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2
          id="popular-title"
          className="font-[family-name:var(--font-family-display)] text-3xl sm:text-4xl text-[#1A3C34] mb-8 sm:mb-10"
        >
          {t.popularTitle}
        </h2>
        <PopularSectionClient initialBouquets={initialBouquets} lang={lang} />
      </div>
    </section>
  );
}
