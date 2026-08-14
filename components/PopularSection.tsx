import Link from 'next/link';
import dynamic from 'next/dynamic';
import { StorefrontIcon } from '@/components/icons';
import {
  getCatalogHomeFlowerTypeSections,
  getCatalogHomeFlowerTypeTiles,
  getCatalogPopularBouquets,
  getCatalogProductsFiltered,
} from '@/lib/catalogReads';
import { ShopByFlowerTypeTiles } from '@/components/home/ShopByFlowerTypeTiles';
import type { CatalogProduct } from '@/lib/catalog/types';
import { buildCatalogSearchString } from '@/lib/catalogFilterParams';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import {
  isExpansionDestination,
  type DeliveryDestinationId,
} from '@/lib/delivery/markets';
import {
  categoryAllowed,
  type ShopAccessProvince,
} from '@/lib/provinces/shopAccess';

const BouquetCard = dynamic(
  () => import('@/components/BouquetCard').then((m) => m.BouquetCard),
  { ssr: true }
);
const ProductCard = dynamic(
  () => import('@/components/ProductCard').then((m) => m.ProductCard),
  { ssr: true }
);

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
  titleKey: 'productSectionPlushyToys' | 'productSectionBalloons';
};

const HOME_PRODUCT_SECTIONS: ProductSectionConfig[] = [
  { categoryKey: 'plushy_toys', titleKey: 'productSectionPlushyToys' },
  { categoryKey: 'balloons', titleKey: 'productSectionBalloons' },
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

export async function PopularSection({
  lang,
  destinationId = 'CHIANG_MAI',
  catalogHref,
  province,
}: {
  lang: Locale;
  destinationId?: DeliveryDestinationId;
  /** Catalog listing path, e.g. `/en/catalog` or `/en/catalog/pattaya`. */
  catalogHref?: string;
  province?: ShopAccessProvince | null;
}) {
  const catalogBase = catalogHref ?? `/${lang}/catalog`;
  const expansion = isExpansionDestination(destinationId);
  const allowedProductSections = HOME_PRODUCT_SECTIONS.filter((section) =>
    categoryAllowed(province ?? null, section.categoryKey, {
      isExpansionDestination: expansion,
    })
  );

  const [popularBouquets, flowerTypeTiles, sections, productSectionResults] = await Promise.all([
    getCatalogPopularBouquets(HOME_POPULAR_ROW_LIMIT, destinationId),
    getCatalogHomeFlowerTypeTiles(destinationId),
    getCatalogHomeFlowerTypeSections(destinationId),
    Promise.all(
      allowedProductSections.map(async (section) => ({
        ...section,
        products: (
          await getCatalogProductsFiltered({
            categoryKey: section.categoryKey,
            sort: 'newest',
            catalogDeliveryDestination: destinationId,
          })
        ).slice(0, HOME_PRODUCT_SECTION_LIMIT),
      }))
    ),
  ]);
  const tHome = translations[lang].home;
  const tCatalog = translations[lang].catalog;
  const productSections = productSectionResults.filter((section) => section.products.length > 0);

  if (
    popularBouquets.length === 0 &&
    flowerTypeTiles.length === 0 &&
    sections.length === 0 &&
    productSections.length === 0
  ) {
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
            <ShowMoreLink href={catalogBase} label={tHome.showMore} />
          </div>
        )}
        <ShopByFlowerTypeTiles lang={lang} tiles={flowerTypeTiles} catalogHref={catalogBase} />
        {sections.map((section) => {
          const sectionCatalogHref = `${catalogBase}${buildCatalogSearchString({ types: [section.type] })}`;
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
              <ShowMoreLink href={sectionCatalogHref} label={tHome.showMore} />
            </div>
          );
        })}
        {productSections.map((section) => (
          <ProductFeedRow
            key={section.categoryKey}
            title={tHome[section.titleKey]}
            href={`${catalogBase}${buildCatalogSearchString({ topCategory: section.categoryKey })}`}
            products={section.products}
            lang={lang}
            showMoreLabel={tHome.showMore}
          />
        ))}
      </div>
    </section>
  );
}
