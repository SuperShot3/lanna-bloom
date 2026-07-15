import Link from 'next/link';
import { translations, type Locale } from '@/lib/i18n';
import { fillDeliveryTimePlaceholders } from '@/components/home/homeLandingContent';
import { ROSES_HUB_PATH, ORCHIDS_HUB_PATH } from '@/lib/landingPages/collectionLandingPages';
import { StorefrontIcon } from '@/components/icons';

type LocalBlock = {
  title: string;
  paragraphs: string[];
  links?: { href: string; label: string }[];
};

/**
 * Scannable Chiang Mai narrative SEO block.
 * Placed after DeliverySection — deepen local intent without rehashing cutoff chips / Why Us.
 */
export function LocalLandingSection({ lang }: { lang: Locale }) {
  const t = translations[lang].homeLanding.local;

  const blocks: LocalBlock[] = [
    {
      title: t.sameDayTitle,
      paragraphs: [fillDeliveryTimePlaceholders(t.sameDayP1), t.sameDayP2],
      links: [
        {
          href: `/${lang}/info/same-day-flower-delivery-chiang-mai`,
          label: t.sameDayLink,
        },
        { href: `/${lang}/catalog`, label: t.browseCatalogLink },
      ],
    },
    {
      title: t.venuesTitle,
      paragraphs: [t.venuesP1, t.venuesP2],
      links: [
        {
          href: `/${lang}/info/flower-delivery-to-hotels-chiang-mai`,
          label: t.hotelsLink,
        },
        { href: `/${lang}/custom-order`, label: t.customOrderLink },
      ],
    },
    {
      title: t.areasTitle,
      paragraphs: [t.areasP1, t.areasP2],
      links: [
        {
          href: `/${lang}/info/delivery-policy`,
          label: t.deliveryPolicyLink,
        },
      ],
    },
    {
      title: t.abroadTitle,
      paragraphs: [t.abroadP1, t.abroadP2],
      links: [
        {
          href: `/${lang}/info/birthday-flowers-chiang-mai-from-abroad`,
          label: t.abroadLink,
        },
        { href: `/${lang}/catalog`, label: t.browseCatalogLink },
      ],
    },
    {
      title: t.occasionsTitle,
      paragraphs: [t.occasionsP1],
      links: [
        { href: `/${lang}${ROSES_HUB_PATH}`, label: t.rosesLink },
        { href: `/${lang}${ORCHIDS_HUB_PATH}`, label: t.orchidsLink },
        {
          href: `/${lang}/info/birthday-flower-gift`,
          label: t.birthdayLink,
        },
      ],
    },
  ];

  return (
    <section
      className="py-16 sm:py-20 lg:py-24"
      aria-labelledby="home-local-landing-title"
      data-home-reveal
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="home-reveal-item mb-10 md:mb-14 max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.22em] uppercase text-[#C5A059] mb-3">
            {t.eyebrow}
          </p>
          <h2
            id="home-local-landing-title"
            className="font-[family-name:var(--font-family-display)] text-3xl sm:text-4xl text-[#1A3C34] mb-4 leading-tight"
          >
            {t.title}
          </h2>
          <p className="text-stone-500 leading-relaxed mb-3">{t.intro}</p>
          <p className="text-stone-500 leading-relaxed">{t.intro2}</p>
        </div>

        <div className="home-reveal-stagger space-y-10 md:space-y-12 max-w-3xl">
          {blocks.map((block) => (
            <article key={block.title} className="home-reveal-item">
              <h3 className="font-[family-name:var(--font-family-display)] text-xl sm:text-2xl text-[#1A3C34] mb-3 leading-snug">
                {block.title}
              </h3>
              {block.paragraphs.map((p) => (
                <p key={p.slice(0, 48)} className="text-stone-500 text-sm sm:text-base leading-relaxed mb-3 last:mb-0">
                  {p}
                </p>
              ))}
              {block.links && block.links.length > 0 ? (
                <ul className="flex flex-wrap gap-x-5 gap-y-2 mt-4">
                  {block.links.map((link) => (
                    <li key={link.href + link.label}>
                      <Link
                        href={link.href}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-[#1A3C34] hover:text-[#C5A059] transition-colors"
                      >
                        {link.label}
                        <StorefrontIcon name="arrow-forward" size={14} />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>

        <div className="home-reveal-item mt-12 md:mt-14 flex flex-wrap items-center gap-4 max-w-3xl">
          <Link
            href={`/${lang}/catalog`}
            className="inline-flex items-center justify-center rounded-full bg-[#1A3C34] text-stone-50 px-6 py-3 text-sm font-semibold hover:bg-[#244a40] transition-colors"
          >
            {t.closingCatalogCta}
          </Link>
          <Link
            href={`/${lang}/info/same-day-flower-delivery-chiang-mai`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1A3C34] hover:text-[#C5A059] transition-colors"
          >
            {t.closingSameDayCta}
            <StorefrontIcon name="arrow-forward" size={16} />
          </Link>
          <Link
            href={`/${lang}/refund-replacement`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-500 hover:text-[#C5A059] transition-colors"
          >
            {t.refundLink}
            <StorefrontIcon name="arrow-forward" size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
