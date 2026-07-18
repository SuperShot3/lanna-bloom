import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getBaseUrl } from '@/lib/orders';
import { buildBouquetProductJsonLd } from '@/lib/seo/productJsonLd';
import { ProductPageClient } from './ProductPageClient';
import { ProductDetailClient } from './ProductDetailClient';
import { ProductSimilarBouquetsSection } from '@/components/pdp/ProductSimilarBouquetsSection';
import {
  getBalloonBySlugFromSanity,
  getBouquetBySlugFromSanity,
  getBouquetsFromSanity,
  getPlushyToyBySlugFromSanity,
  getPopularBouquetsFromSanity,
  getProductBySlugFromSanity,
  getProductsFilteredFromSanity,
  getSimilarBouquetsForBouquet,
} from '@/lib/sanity';
import { isValidLocale, locales, type Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { getMarketByPathSlug } from '@/lib/delivery/markets';
import MarketCatalogPageViaSlug from './catalog/page';
import { getBouquetDisplayReviewStats } from '@/lib/productDisplayReviews';
import { ProductMobileBackButton } from '@/components/pdp/ProductMobileBackButton';

// Revalidate product pages every 60 seconds so Sanity updates appear without rebuild
export const revalidate = 60;

export async function generateStaticParams() {
  const bouquets = await getBouquetsFromSanity();
  return locales.flatMap((lang) =>
    bouquets.map((b) => ({ lang, slug: b.slug }))
  );
}

export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: { lang: string; slug: string };
}): Promise<Metadata> {
  if (!isValidLocale(params.lang)) return {};
  if (getMarketByPathSlug(params.slug)) return {};

  const bouquet = await getBouquetBySlugFromSanity(params.slug);
  if (!bouquet) return {};

  const isTh = params.lang === 'th';
  const name = isTh ? bouquet.nameTh : bouquet.nameEn;
  const title =
    (isTh ? bouquet.seoTitleTh : bouquet.seoTitleEn)?.trim() ||
    `${name} | Flower delivery Chiang Mai | Lanna Bloom`;
  const description =
    (isTh ? bouquet.seoDescriptionTh : bouquet.seoDescriptionEn)?.trim() ||
    (isTh ? bouquet.descriptionTh : bouquet.descriptionEn).trim().slice(0, 160) ||
    (isTh
      ? `สั่ง${name} พร้อมจัดส่งในเชียงใหม่`
      : `Order ${name} with flower delivery in Chiang Mai.`);

  const canonical = `${getBaseUrl()}/${params.lang}/catalog/${bouquet.slug}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical },
  };
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: { lang: string; slug: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const lang = params.lang;
  if (!isValidLocale(lang)) notFound();
  const market = getMarketByPathSlug(params.slug);
  if (market) {
    return MarketCatalogPageViaSlug({ params, searchParams });
  }

  const bouquet = await getBouquetBySlugFromSanity(params.slug);
  if (bouquet) {
    const reviewStats = getBouquetDisplayReviewStats(bouquet.id);
    const gifts = await getProductsFilteredFromSanity({ categoryKey: 'gifts' });
    const similarBouquets = await getSimilarBouquetsForBouquet(bouquet, 3);
    const name = lang === 'th' ? bouquet.nameTh : bouquet.nameEn;
    const description = lang === 'th' ? bouquet.descriptionTh : bouquet.descriptionEn;
    const composition = lang === 'th' ? bouquet.compositionTh : bouquet.compositionEn;
    const t = translations[lang as Locale].product;
    const nav = translations[lang as Locale].nav;
    const catalogHref = `/${lang}/catalog`;
    const pageUrl = `${getBaseUrl()}/${lang}/catalog/${bouquet.slug}`;
    const productJsonLd = buildBouquetProductJsonLd(
      bouquet,
      lang === 'th' ? 'th' : 'en',
      pageUrl
    );

    return (
      <div className="product-page">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
        />
        <div className="container product-layout">
          <ProductMobileBackButton catalogHref={catalogHref} label={t.backToCatalog} />
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href={`/${lang}`}>{nav.home}</Link>
            <span className="sep">/</span>
            <Link href={catalogHref}>{nav.catalog}</Link>
            <span className="sep">/</span>
            <span aria-current="page">{name}</span>
          </nav>
          <div className="product-grid">
            <ProductPageClient
              bouquet={bouquet}
              lang={lang as Locale}
              name={name}
              description={description}
              compositionHeading={t.composition}
              compositionText={composition}
              reviewAverage={reviewStats.average}
              reviewCount={reviewStats.count}
              gifts={gifts}
            />
          </div>
          {similarBouquets.length > 0 ? (
            <ProductSimilarBouquetsSection bouquets={similarBouquets} lang={lang as Locale} />
          ) : null}
        </div>
      </div>
    );
  }

  const plushyToy = await getPlushyToyBySlugFromSanity(params.slug);
  if (plushyToy) {
    const name = lang === 'th' && plushyToy.nameTh ? plushyToy.nameTh : plushyToy.nameEn;
    const description = (lang === 'th' ? plushyToy.descriptionTh : plushyToy.descriptionEn) || '';
    const nav = translations[lang as Locale].nav;
    const catalogHref = `/${lang}/catalog`;
    const suggestedBouquets = await getPopularBouquetsFromSanity(8);

    return (
      <div className="product-page">
        <div className="container product-layout">
          <ProductMobileBackButton
            catalogHref={catalogHref}
            label={translations[lang as Locale].product.backToCatalog}
          />
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href={`/${lang}`}>{nav.home}</Link>
            <span className="sep">/</span>
            <Link href={catalogHref}>{nav.catalog}</Link>
            <span className="sep">/</span>
            <span aria-current="page">{name}</span>
          </nav>
          <div className="product-grid">
            <ProductDetailClient
              product={plushyToy}
              lang={lang as Locale}
              name={name}
              description={description}
              gifts={[]}
              suggestedBouquets={suggestedBouquets}
            />
          </div>
        </div>
      </div>
    );
  }

  const balloon = await getBalloonBySlugFromSanity(params.slug);
  if (balloon) {
    const name = lang === 'th' && balloon.nameTh ? balloon.nameTh : balloon.nameEn;
    const description = (lang === 'th' ? balloon.descriptionTh : balloon.descriptionEn) || '';
    const nav = translations[lang as Locale].nav;
    const catalogHref = `/${lang}/catalog?topCategory=balloons`;
    const suggestedBouquets = await getPopularBouquetsFromSanity(8);

    return (
      <div className="product-page">
        <div className="container product-layout">
          <ProductMobileBackButton
            catalogHref={catalogHref}
            label={translations[lang as Locale].product.backToCatalog}
          />
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href={`/${lang}`}>{nav.home}</Link>
            <span className="sep">/</span>
            <Link href={catalogHref}>{nav.catalog}</Link>
            <span className="sep">/</span>
            <span aria-current="page">{name}</span>
          </nav>
          <div className="product-grid">
            <ProductDetailClient
              product={balloon}
              lang={lang as Locale}
              name={name}
              description={description}
              gifts={[]}
              suggestedBouquets={suggestedBouquets}
            />
          </div>
        </div>
      </div>
    );
  }

  const product = await getProductBySlugFromSanity(params.slug);
  if (product) {
    const gifts = await getProductsFilteredFromSanity({ categoryKey: 'gifts' });
    const name = lang === 'th' && product.nameTh ? product.nameTh : product.nameEn;
    const description = (lang === 'th' ? product.descriptionTh : product.descriptionEn) || '';
    const nav = translations[lang as Locale].nav;
    const catalogHref = `/${lang}/catalog`;

    return (
      <div className="product-page">
        <div className="container product-layout">
          <ProductMobileBackButton
            catalogHref={catalogHref}
            label={translations[lang as Locale].product.backToCatalog}
          />
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href={`/${lang}`}>{nav.home}</Link>
            <span className="sep">/</span>
            <Link href={catalogHref}>{nav.catalog}</Link>
            <span className="sep">/</span>
            <span aria-current="page">{name}</span>
          </nav>
          <div className="product-grid">
            <ProductDetailClient
              product={product}
              lang={lang as Locale}
              name={name}
              description={description}
              gifts={gifts}
            />
          </div>
        </div>
      </div>
    );
  }

  notFound();
}
