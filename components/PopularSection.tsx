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
    <section className="popular-section" aria-labelledby="popular-title">
      <div className="container">
        <h2 id="popular-title" className="popular-title">
          {t.popularTitle}
        </h2>
        <div className="popular-grid">
          {bouquets.map((bouquet) => (
            <BouquetCard key={bouquet.id} bouquet={bouquet} lang={lang} />
          ))}
        </div>
      </div>
    </section>
  );
}
