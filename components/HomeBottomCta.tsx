'use client';

import Link from 'next/link';
import { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { trackCtaClick } from '@/lib/analytics';

export function HomeBottomCta({ lang }: { lang: Locale }) {
  const t = translations[lang].home;
  const catalogHref = `/${lang}/catalog`;

  return (
    <section className="home-bottom-cta" aria-label="Continue browsing">
      <div className="container home-bottom-cta-inner">
        <Link
          href={catalogHref}
          className="home-bottom-cta-primary hero-cta"
          onClick={() => trackCtaClick('cta_home_bottom_view_all')}
        >
          {t.viewAllBouquets}
        </Link>
      </div>
      <style jsx>{`
        .home-bottom-cta {
          padding: 32px 0 48px;
          text-align: center;
        }
        .home-bottom-cta-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .home-bottom-cta-primary {
          width: 100%;
          max-width: 320px;
        }
        @media (min-width: 480px) {
          .home-bottom-cta-primary {
            width: auto;
            max-width: none;
          }
        }
      `}</style>
    </section>
  );
}
