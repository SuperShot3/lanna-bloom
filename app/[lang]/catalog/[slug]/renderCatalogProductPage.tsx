import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getBaseUrl } from '@/lib/orders';
import {
  buildBouquetProductJsonLd,
  buildCatalogProductJsonLd,
  serializeJsonLd,
} from '@/lib/seo/productJsonLd';
import { isSeoLocale } from '@/lib/seo/alternates';
import { ProductPageClient } from './ProductPageClient';
import { ProductDetailClient } from './ProductDetailClient';
import { ProductSimilarBouquetsSection } from '@/components/pdp/ProductSimilarBouquetsSection';
import {
  getCatalogBalloonBySlug,
  getCatalogBouquetBySlug,
  getCatalogPlushyToyBySlug,
  getCatalogPopularBouquets,
  getCatalogProductBySlug,
  getCatalogProductsFiltered,
  getCatalogSimilarBouquets,
} from '@/lib/catalogReads';
import { isValidLocale, type Locale, translations } from '@/lib/i18n';
import {
  buildMarketCatalogHref,
  buildMarketHomeHref,
} from '@/lib/delivery/marketRoute';
import { ProductMobileBackButton } from '@/components/pdp/ProductMobileBackButton';
import {
  computeProductReviewStats,
  getApprovedProductReviews,
} from '@/lib/productReviews';

function JsonLdScript({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}

function shouldEmitProductJsonLd(lang: string): boolean {
  return isSeoLocale(lang);
}

export type CatalogProductPageArgs = {
  params: { lang: string; slug: string };
};

export async function renderCatalogProductPage({ params }: CatalogProductPageArgs) {
  const lang = params.lang;
  if (!isValidLocale(lang)) notFound();

  const homeHref = buildMarketHomeHref(lang, null);
  const catalogHref = buildMarketCatalogHref(lang, null);
  const pageUrl = `${getBaseUrl()}/${lang}/catalog/${params.slug}`;
  const emitJsonLd = shouldEmitProductJsonLd(lang);
  const schemaLang = lang === 'th' ? 'th' : 'en';

  const bouquet = await getCatalogBouquetBySlug(params.slug, lang);
  if (bouquet) {
    const gifts = await getCatalogProductsFiltered({ categoryKey: 'gifts' });
    const similarBouquets = await getCatalogSimilarBouquets(bouquet, 3);
    const name = lang === 'th' ? bouquet.nameTh : bouquet.nameEn;
    const description = lang === 'th' ? bouquet.descriptionTh : bouquet.descriptionEn;
    const titleIntro = lang === 'th' ? bouquet.titleIntroTh : bouquet.titleIntroEn;
    const composition = lang === 'th' ? bouquet.compositionTh : bouquet.compositionEn;
    const floristNote = lang === 'th' ? bouquet.floristNoteTh : bouquet.floristNoteEn;
    const approvedReviews = await getApprovedProductReviews(bouquet.id);
    const reviewStats = computeProductReviewStats(approvedReviews.map((r) => r.rating));
    const t = translations[lang as Locale].product;
    const nav = translations[lang as Locale].nav;
    const productJsonLd = emitJsonLd
      ? buildBouquetProductJsonLd(bouquet, schemaLang, pageUrl, {
          aggregateRating:
            reviewStats.count >= 1
              ? { ratingValue: reviewStats.average, reviewCount: reviewStats.count }
              : undefined,
        })
      : null;

    return (
      <div className="product-page">
        <JsonLdScript data={productJsonLd} />
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
              titleIntro={titleIntro}
              description={description}
              compositionText={composition}
              floristNote={floristNote}
              reviews={approvedReviews}
              reviewStats={reviewStats}
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

  const plushyToy = await getCatalogPlushyToyBySlug(params.slug, lang);
  if (plushyToy) {
    const name = lang === 'th' && plushyToy.nameTh ? plushyToy.nameTh : plushyToy.nameEn;
    const description = (lang === 'th' ? plushyToy.descriptionTh : plushyToy.descriptionEn) || '';
    const nav = translations[lang as Locale].nav;
    const suggestedBouquets = await getCatalogPopularBouquets(8);
    const productJsonLd = emitJsonLd
      ? buildCatalogProductJsonLd(plushyToy, schemaLang, pageUrl)
      : null;

    return (
      <div className="product-page">
        <JsonLdScript data={productJsonLd} />
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

  const balloon = await getCatalogBalloonBySlug(params.slug, lang);
  if (balloon) {
    const name = lang === 'th' && balloon.nameTh ? balloon.nameTh : balloon.nameEn;
    const description = (lang === 'th' ? balloon.descriptionTh : balloon.descriptionEn) || '';
    const nav = translations[lang as Locale].nav;
    const balloonCatalogHref = buildMarketCatalogHref(
      lang,
      null,
      'topCategory=balloons'
    );
    const suggestedBouquets = await getCatalogPopularBouquets(8);
    const productJsonLd = emitJsonLd
      ? buildCatalogProductJsonLd(balloon, schemaLang, pageUrl)
      : null;

    return (
      <div className="product-page">
        <JsonLdScript data={productJsonLd} />
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

  const product = await getCatalogProductBySlug(params.slug, lang);
  if (product) {
    const gifts = await getCatalogProductsFiltered({ categoryKey: 'gifts' });
    const name = lang === 'th' && product.nameTh ? product.nameTh : product.nameEn;
    const description = (lang === 'th' ? product.descriptionTh : product.descriptionEn) || '';
    const nav = translations[lang as Locale].nav;
    const productJsonLd = emitJsonLd
      ? buildCatalogProductJsonLd(product, schemaLang, pageUrl)
      : null;

    return (
      <div className="product-page">
        <JsonLdScript data={productJsonLd} />
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
