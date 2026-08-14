import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getBaseUrl } from '@/lib/orders';
import {
  buildBouquetProductJsonLd,
  buildCatalogProductJsonLd,
  resolveProductOgImage,
} from '@/lib/seo/productJsonLd';
import { buildAlternates } from '@/lib/seo/alternates';
import { ProductPageClient } from './ProductPageClient';
import { ProductDetailClient } from './ProductDetailClient';
import { ProductSimilarBouquetsSection } from '@/components/pdp/ProductSimilarBouquetsSection';
import {
  getCatalogBalloonBySlug,
  getCatalogBouquetBySlug,
  getCatalogBouquets,
  getCatalogPlushyToyBySlug,
  getCatalogPopularBouquets,
  getCatalogProductBySlug,
  getCatalogProductsFiltered,
  getCatalogSimilarBouquets,
} from '@/lib/catalogReads';
import { isValidLocale, locales, type Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { getMarketByPathSlug, type MarketPathSlug } from '@/lib/delivery/markets';
import {
  buildMarketCatalogHref,
  buildMarketHomeHref,
} from '@/lib/delivery/marketRoute';
import { getBouquetDisplayReviewStats } from '@/lib/productDisplayReviews';
import { ProductMobileBackButton } from '@/components/pdp/ProductMobileBackButton';

// Revalidate product pages every 60 seconds so catalog updates appear without rebuild
export const revalidate = 60;

export async function generateStaticParams() {
  const bouquets = await getCatalogBouquets();
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

  const bouquet = await getCatalogBouquetBySlug(params.slug);
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
  const ogImage = resolveProductOgImage(bouquet.images, {
    alt: bouquet.imageAlts?.[0] || name,
  });
  return {
    title,
    description,
    alternates: buildAlternates({
      lang: params.lang,
      pathSuffix: `/catalog/${bouquet.slug}`,
      canonical,
    }),
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
      ...(ogImage
        ? { images: [{ url: ogImage.url, ...(ogImage.alt ? { alt: ogImage.alt } : {}) }] }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(ogImage ? { images: [ogImage.url] } : {}),
    },
  };
}

export default async function ProductPage({
  params,
  marketPathSlug = null,
}: {
  params: { lang: string; slug: string };
  /** When set (market PDP wrapper), home/catalog links stay in that expansion market. */
  marketPathSlug?: MarketPathSlug | null;
}) {
  const lang = params.lang;
  if (!isValidLocale(lang)) notFound();
  // Market catalogs are dynamic (searchParams filters) and live at
  // /[lang]/catalog/[market]/catalog. Prefer next.config rewrite; redirect is fallback.
  if (getMarketByPathSlug(params.slug)) {
    redirect(`/${lang}/catalog/${params.slug}/catalog`);
  }

  const homeHref = buildMarketHomeHref(lang, marketPathSlug);
  const catalogHref = buildMarketCatalogHref(lang, marketPathSlug);
  const pageUrl = marketPathSlug
    ? `${getBaseUrl()}/${lang}/catalog/${marketPathSlug}/${params.slug}`
    : `${getBaseUrl()}/${lang}/catalog/${params.slug}`;

  const bouquet = await getCatalogBouquetBySlug(params.slug);
  if (bouquet) {
    const reviewStats = getBouquetDisplayReviewStats(bouquet.id);
    const gifts = await getCatalogProductsFiltered({ categoryKey: 'gifts' });
    const similarBouquets = await getCatalogSimilarBouquets(bouquet, 3);
    const name = lang === 'th' ? bouquet.nameTh : bouquet.nameEn;
    const description = lang === 'th' ? bouquet.descriptionTh : bouquet.descriptionEn;
    const composition = lang === 'th' ? bouquet.compositionTh : bouquet.compositionEn;
    const t = translations[lang as Locale].product;
    const nav = translations[lang as Locale].nav;
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
            <Link href={homeHref}>{nav.home}</Link>
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

  const plushyToy = await getCatalogPlushyToyBySlug(params.slug);
  if (plushyToy) {
    const name = lang === 'th' && plushyToy.nameTh ? plushyToy.nameTh : plushyToy.nameEn;
    const description = (lang === 'th' ? plushyToy.descriptionTh : plushyToy.descriptionEn) || '';
    const nav = translations[lang as Locale].nav;
    const suggestedBouquets = await getCatalogPopularBouquets(8);
    const productJsonLd = buildCatalogProductJsonLd(
      plushyToy,
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
          <ProductMobileBackButton
            catalogHref={catalogHref}
            label={translations[lang as Locale].product.backToCatalog}
          />
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href={homeHref}>{nav.home}</Link>
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

  const balloon = await getCatalogBalloonBySlug(params.slug);
  if (balloon) {
    const name = lang === 'th' && balloon.nameTh ? balloon.nameTh : balloon.nameEn;
    const description = (lang === 'th' ? balloon.descriptionTh : balloon.descriptionEn) || '';
    const nav = translations[lang as Locale].nav;
    const balloonCatalogHref = buildMarketCatalogHref(
      lang,
      marketPathSlug,
      'topCategory=balloons'
    );
    const suggestedBouquets = await getCatalogPopularBouquets(8);
    const productJsonLd = buildCatalogProductJsonLd(
      balloon,
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
          <ProductMobileBackButton
            catalogHref={balloonCatalogHref}
            label={translations[lang as Locale].product.backToCatalog}
          />
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href={homeHref}>{nav.home}</Link>
            <span className="sep">/</span>
            <Link href={balloonCatalogHref}>{nav.catalog}</Link>
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

  const product = await getCatalogProductBySlug(params.slug);
  if (product) {
    const gifts = await getCatalogProductsFiltered({ categoryKey: 'gifts' });
    const name = lang === 'th' && product.nameTh ? product.nameTh : product.nameEn;
    const description = (lang === 'th' ? product.descriptionTh : product.descriptionEn) || '';
    const nav = translations[lang as Locale].nav;
    const productJsonLd = buildCatalogProductJsonLd(
      product,
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
          <ProductMobileBackButton
            catalogHref={catalogHref}
            label={translations[lang as Locale].product.backToCatalog}
          />
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href={homeHref}>{nav.home}</Link>
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
