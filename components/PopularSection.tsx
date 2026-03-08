import Link from 'next/link';
import { getPopularBouquetsFromSanity } from '@/lib/sanity';
import { BouquetCard } from '@/components/BouquetCard';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';

const POPULAR_LIMIT = 8;

export async function PopularSection({ lang }: { lang: Locale }) {
  const bouquets = await getPopularBouquetsFromSanity(POPULAR_LIMIT);
  const t = translations[lang].home;

  if (bouquets.length === 0) return null;

  return (
    <section
      className="py-24 bg-stone-50 dark:bg-stone-900"
      aria-labelledby="popular-title"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <h2
          id="popular-title"
          className="font-[family-name:var(--font-family-display)] text-4xl text-[#1A3C34] dark:text-stone-50 mb-12"
        >
          {t.popularTitle}
        </h2>
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
        <div className="mt-12 text-center">
          <Link
            href={`/${lang}/catalog`}
            className="inline-flex items-center gap-2 px-8 py-3 bg-[#C5A059] text-[#1A3C34] rounded-full font-semibold hover:opacity-90 transition-opacity"
          >
            {t.viewAllBouquets}
            <span className="material-symbols-outlined text-xl">arrow_forward</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
