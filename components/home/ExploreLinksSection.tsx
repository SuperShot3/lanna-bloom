import Link from 'next/link';
import { translations, type Locale } from '@/lib/i18n';
import { MARKETS } from '@/lib/delivery/markets';
import { ROSES_HUB_PATH, ORCHIDS_HUB_PATH } from '@/lib/landingPages/collectionLandingPages';
import { StorefrontIcon, type StorefrontIconName } from '@/components/icons';

type LinkGroup = {
  icon: StorefrontIconName;
  title: string;
  links: { href: string; label: string }[];
};

export function ExploreLinksSection({ lang }: { lang: Locale }) {
  const t = translations[lang].homeLanding.explore;

  const groups: LinkGroup[] = [
    {
      icon: 'local-florist',
      title: t.collectionsTitle,
      links: [
        { href: `/${lang}${ROSES_HUB_PATH}`, label: t.rosesLink },
        { href: `/${lang}${ORCHIDS_HUB_PATH}`, label: t.orchidsLink },
        { href: `/${lang}/catalog`, label: t.catalogLink },
      ],
    },
    {
      icon: 'edit-note',
      title: t.guidesTitle,
      links: [
        {
          href: `/${lang}/info/same-day-flower-delivery-chiang-mai`,
          label: t.sameDayGuideLink,
        },
        { href: `/${lang}/info/flowers-chiang-mai`, label: t.chiangMaiGuideLink },
        { href: `/${lang}/info`, label: t.allGuidesLink },
      ],
    },
    {
      icon: 'local-shipping',
      title: t.destinationsTitle,
      links: [
        ...MARKETS.map((market) => ({
          href: `/${lang}/${market.pathSlug}/flower-delivery`,
          label: t.marketLinkTemplate.replace(
            '{city}',
            lang === 'th' ? market.customerFacingNameTh : market.customerFacingNameEn
          ),
        })),
        { href: `/${lang}/flower-delivery-thailand`, label: t.thailandOverviewLink },
      ],
    },
  ];

  return (
    <section
      className="py-16 sm:py-20 lg:py-24 bg-stone-50"
      aria-labelledby="home-explore-title"
      data-home-reveal
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="home-reveal-item mb-10 md:mb-14 max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.22em] uppercase text-[#C5A059] mb-3">
            {t.eyebrow}
          </p>
          <h2
            id="home-explore-title"
            className="font-[family-name:var(--font-family-display)] text-3xl sm:text-4xl text-[#1A3C34] mb-4 leading-tight"
          >
            {t.title}
          </h2>
          <p className="text-stone-500 leading-relaxed">{t.subtitle}</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-10 lg:gap-x-14 home-reveal-stagger">
          {groups.map((group) => (
            <div key={group.title} className="home-reveal-item">
              <div className="flex items-center gap-3 pb-4 mb-2 border-b border-stone-200">
                <div className="w-9 h-9 rounded-lg bg-[#1A3C34]/5 flex items-center justify-center text-[#1A3C34]">
                  <StorefrontIcon name={group.icon} size={18} />
                </div>
                <h3 className="font-[family-name:var(--font-family-display)] text-lg text-[#1A3C34]">
                  {group.title}
                </h3>
              </div>
              <ul className="divide-y divide-stone-200/70">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="group flex items-center justify-between gap-3 py-3 text-sm sm:text-[15px] text-stone-600 hover:text-[#1A3C34] transition-colors"
                    >
                      <span>{link.label}</span>
                      <StorefrontIcon
                        name="arrow-forward"
                        size={14}
                        className="flex-shrink-0 text-stone-300 -translate-x-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-[#C5A059] transition-all duration-200"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
