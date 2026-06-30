import Link from 'next/link';
import { BouquetCard } from '@/components/BouquetCard';
import { StorefrontIcon } from '@/components/icons';
import { getHomeFlowerTypeSectionsFromSanity } from '@/lib/sanity';
import { buildCatalogSearchString } from '@/lib/catalogFilterParams';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';

function flowerTypeLabel(type: string, catalog: Record<string, string>): string {
  const key = `type${type.charAt(0).toUpperCase() + type.slice(1)}`;
  return catalog[key] ?? type;
}

function flowerTypeSectionTitle(
  type: string,
  template: string,
  catalog: Record<string, string>
): string {
  return template.replace('{type}', flowerTypeLabel(type, catalog));
}

export async function PopularSection({ lang }: { lang: Locale }) {
  const sections = await getHomeFlowerTypeSectionsFromSanity();
  const tHome = translations[lang].home;
  const tCatalog = translations[lang].catalog;

  if (sections.length === 0) return null;

  return (
    <section
      className="pt-4 pb-12 sm:pt-5 sm:pb-14 lg:pt-6 lg:pb-16 bg-stone-50"
      aria-label={tHome.popularTitle}
      data-home-reveal
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 home-reveal-stagger">
        {sections.map((section) => {
          const catalogHref = `/${lang}/catalog${buildCatalogSearchString({ types: [section.type] })}`;
          const titleTemplate = section.pottedOnly
            ? tHome.flowerTypeSectionTitlePotted
            : tHome.flowerTypeSectionTitle;
          const title = flowerTypeSectionTitle(
            section.type,
            titleTemplate,
            tCatalog as Record<string, string>
          );

          return (
            <div key={section.type} className="home-reveal-item mb-12 sm:mb-14 last:mb-0">
              <h2 className="font-[family-name:var(--font-family-display)] text-3xl sm:text-4xl text-[#1A3C34] mb-6 sm:mb-8">
                {title}
              </h2>
              <div className="popular-scroll-wrap">
                <div className="popular-scroll">
                  {section.bouquets.map((bouquet) => (
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
              <div className="mt-8 sm:mt-10 flex justify-center">
                <Link
                  href={catalogHref}
                  className="popular-show-more group"
                >
                  <span>{tHome.showMore}</span>
                  <StorefrontIcon
                    name="arrow-forward"
                    size={18}
                    className="popular-show-more__icon"
                  />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
