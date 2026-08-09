import Link from 'next/link';
import { translations, type Locale } from '@/lib/i18n';
import { StorefrontIcon } from '@/components/icons';

/**
 * Concise Chiang Mai context for the homepage's primary local search intent.
 * Operational details live in DeliverySection, the FAQ, and dedicated guides.
 */
export function LocalLandingSection({ lang }: { lang: Locale }) {
  const t = translations[lang].homeLanding.local;
  const links = [
    {
      href: `/${lang}/delivery-areas-thailand`,
      label: t.deliveryAreasLink,
      icon: 'location-on' as const,
    },
    {
      href: `/${lang}/info/buy-flowers-online-chiang-mai-thailand`,
      label: t.abroadLink,
      icon: 'verified' as const,
    },
    {
      href: `/${lang}/catalog`,
      label: t.browseCatalogLink,
      icon: 'local-florist' as const,
    },
  ];

  return (
    <section
      className="py-14 sm:py-16 lg:py-20"
      aria-labelledby="home-local-landing-title"
      data-home-reveal
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="home-reveal-item mb-8 md:mb-10 max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.22em] uppercase text-[#C5A059] mb-3">
            {t.eyebrow}
          </p>
          <h2
            id="home-local-landing-title"
            className="font-[family-name:var(--font-family-display)] text-3xl sm:text-4xl text-[#1A3C34] mb-4 leading-tight"
          >
            {t.title}
          </h2>
          <p className="text-stone-600 leading-relaxed">{t.intro}</p>
        </div>

        <div className="home-reveal-stagger grid gap-4 md:grid-cols-2 max-w-4xl">
          <article className="home-reveal-item rounded-2xl border border-stone-200 bg-stone-50/70 p-5 sm:p-6">
            <h3 className="font-[family-name:var(--font-family-display)] text-xl text-[#1A3C34] mb-2 leading-snug">
              {t.venuesTitle}
            </h3>
            <p className="text-stone-500 text-sm sm:text-base leading-relaxed">{t.venuesP1}</p>
          </article>
          <article className="home-reveal-item rounded-2xl border border-stone-200 bg-stone-50/70 p-5 sm:p-6">
            <h3 className="font-[family-name:var(--font-family-display)] text-xl text-[#1A3C34] mb-2 leading-snug">
              {t.areasTitle}
            </h3>
            <p className="text-stone-500 text-sm sm:text-base leading-relaxed">{t.areasP1}</p>
          </article>
        </div>

        <nav aria-label={t.relatedLinksLabel} className="home-reveal-item mt-6 max-w-4xl">
          <ul className="grid gap-3 sm:grid-cols-3">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="group flex h-full items-center gap-3 rounded-xl border border-[#1A3C34]/15 bg-white px-4 py-3.5 text-sm font-semibold text-[#1A3C34] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#C5A059] hover:bg-[#C5A059]/5 hover:text-[#8a6a2d] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059] focus-visible:ring-offset-2"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1A3C34]/7 text-[#1A3C34] group-hover:bg-[#C5A059]/15 group-hover:text-[#8a6a2d]">
                    <StorefrontIcon name={link.icon} size={18} />
                  </span>
                  <span className="flex-1">{link.label}</span>
                  <StorefrontIcon
                    name="arrow-forward"
                    size={16}
                    className="shrink-0 transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  );
}
