'use client';

import { PremiumCtaLink } from '@/components/home/PremiumCtaLink';
import { translations, type Locale } from '@/lib/i18n';
import { trackCtaClick } from '@/lib/analytics';

export function HomeBottomCta({ lang }: { lang: Locale }) {
  const t = translations[lang].home;
  const catalogHref = `/${lang}/catalog`;

  return (
    <section className="pb-16 sm:pb-20 lg:pb-24" aria-label="Continue browsing">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-center">
        <PremiumCtaLink
          href={catalogHref}
          onClick={() => trackCtaClick('cta_home_bottom_view_all')}
          className="w-full max-w-xs sm:w-auto sm:max-w-none"
        >
          {t.viewAllBouquets}
        </PremiumCtaLink>
      </div>
    </section>
  );
}
