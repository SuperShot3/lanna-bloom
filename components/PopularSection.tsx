import Link from 'next/link';
import { BouquetCard } from '@/components/BouquetCard';
import { ProductCard } from '@/components/ProductCard';
import { StorefrontIcon } from '@/components/icons';
import {
  getHomeFlowerTypeSectionsFromSanity,
  getPopularBouquetsFromSanity,
  getProductsFilteredFromSanity,
  type CatalogProduct,
} from '@/lib/sanity';
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

const HOME_PRODUCT_SECTION_LIMIT = 6;
const HOME_POPULAR_ROW_LIMIT = 8;

type ProductSectionConfig = {
  categoryKey: string;
  titleKey: 'productSectionPlushyToys' | 'productSectionBalloons' | 'productSectionSweets';
};

const HOME_PRODUCT_SECTIONS: ProductSectionConfig[] = [
  { categoryKey: 'plushy_toys', titleKey: 'productSectionPlushyToys' },
  { categoryKey: 'balloons', titleKey: 'productSectionBalloons' },
  { categoryKey: 'food_sweets', titleKey: 'productSectionSweets' },
];

function ShowMoreLink({ href, label }: { href: string; label: string }) {
  return (
    <div className="mt-8 sm:mt-10 flex justify-center">
      <Link
        href={href}
        className="popular-show-more group"
      >
        <span>{label}</span>
        <StorefrontIcon
          name="arrow-forward"
          size={18}
          className="popular-show-more__icon"
        />
      </Link>
    </div>
  );
}

function ProductFeedRow({
  title,
  href,
  products,
  lang,
  showMoreLabel,
}: {
  title: string;
  href: string;
  products: CatalogProduct[];
  lang: Locale;
  showMoreLabel: string;
}) {
  return (
    <div className="home-reveal-item mb-12 sm:mb-14 last:mb-0">
      <h2 className="font-[family-name:var(--font-family-display)] text-3xl sm:text-4xl text-[#1A3C34] mb-6 sm:mb-8">
        {title}
      </h2>
      <div className="popular-scroll-wrap">
        <div className="popular-scroll">
          {products.map((product) => (
            <div key={product.id} className="popular-card-slot">
              <ProductCard product={product} lang={lang} />
            </div>
          ))}
        </div>
      </div>
      <ShowMoreLink href={href} label={showMoreLabel} />
    </div>
  );
}

export async function PopularSection({ lang }: { lang: Locale }) {
  const [popularBouquets, sections, productSectionResults] = await Promise.all([
    getPopularBouquetsFromSanity(HOME_POPULAR_ROW_LIMIT),
    getHomeFlowerTypeSectionsFromSanity(),
    Promise.all(
      HOME_PRODUCT_SECTIONS.map(async (section) => ({
        ...section,
        products: (
          await getProductsFilteredFromSanity({
            categoryKey: section.categoryKey,
            sort: 'newest',
            catalogDeliveryDestination: 'CHIANG_MAI',
          })
        ).slice(0, HOME_PRODUCT_SECTION_LIMIT),
      }))
    ),
  ]);
  const tHome = translations[lang].home;
  const tCatalog = translations[lang].catalog;
  const productSections = productSectionResults.filter((section) => section.products.length > 0);

  if (popularBouquets.length === 0 && sections.length === 0 && productSections.length === 0) {
    return null;
  }

  return (
    <section
      className="pt-4 pb-12 sm:pt-5 sm:pb-14 lg:pt-6 lg:pb-16 bg-stone-50"
      aria-label={tHome.popularTitle}
      data-home-reveal
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 home-reveal-stagger">
        {popularBouquets.length > 0 && (
          <div className="home-reveal-item mb-12 sm:mb-14 last:mb-0">
            <h2 className="font-[family-name:var(--font-family-display)] text-3xl sm:text-4xl text-[#1A3C34] mb-6 sm:mb-8">
              {tHome.popularTitle}
            </h2>
            <div className="popular-scroll-wrap">
              <div className="popular-scroll">
                {popularBouquets.map((bouquet) => (
                  <div key={bouquet.id} className="popular-card-slot">
                    <BouquetCard bouquet={bouquet} lang={lang} variant="popular-compact" />
                  </div>
                ))}
              </div>
            </div>
            <ShowMoreLink href={`/${lang}/catalog`} label={tHome.viewAllBouquets} />
          </div>
        )}
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
              <ShowMoreLink href={catalogHref} label={tHome.showMore} />
            </div>
          );
        })}
        {productSections.map((section) => (
          <ProductFeedRow
            key={section.categoryKey}
            title={tHome[section.titleKey]}
            href={`/${lang}/catalog${buildCatalogSearchString({ topCategory: section.categoryKey })}`}
            products={section.products}
            lang={lang}
            showMoreLabel={tHome.showMore}
          />
        ))}
      </div>
    </section>
  );
}
