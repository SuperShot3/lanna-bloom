import dynamic from 'next/dynamic';
import type { Bouquet } from '@/lib/bouquets';
import type { Locale } from '@/lib/i18n';
import { ShowMoreLink } from '@/components/home/ShowMoreLink';

const BouquetCard = dynamic(
  () => import('@/components/BouquetCard').then((m) => m.BouquetCard),
  { ssr: true }
);

export const HOME_POPULAR_ROW_LIMIT = 8;

export function PopularPicksRow({
  title,
  href,
  bouquets,
  lang,
  showMoreLabel,
  ctaEvent,
  showMorePremium,
}: {
  title: string;
  href: string;
  bouquets: Bouquet[];
  lang: Locale;
  showMoreLabel: string;
  ctaEvent?: string;
  showMorePremium?: boolean;
}) {
  if (bouquets.length === 0) return null;

  return (
    <div className="home-reveal-item mb-12 sm:mb-14 last:mb-0">
      <h2 className="font-[family-name:var(--font-family-display)] text-3xl sm:text-4xl text-[#1A3C34] mb-6 sm:mb-8">
        {title}
      </h2>
      <div className="popular-scroll-wrap">
        <div className="popular-scroll">
          {bouquets.map((bouquet) => (
            <div key={bouquet.id} className="popular-card-slot">
              <BouquetCard bouquet={bouquet} lang={lang} variant="popular-compact" />
            </div>
          ))}
        </div>
      </div>
      <ShowMoreLink
        href={href}
        label={showMoreLabel}
        ctaEvent={ctaEvent}
        premium={showMorePremium}
      />
    </div>
  );
}
