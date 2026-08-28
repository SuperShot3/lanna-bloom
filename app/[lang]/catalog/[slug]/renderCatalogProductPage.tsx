import { notFound, redirect } from 'next/navigation';
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
  getMarketByPathSlug,
  marketIsIndexable,
  type DeliveryDestinationId,
  type MarketPathSlug,
} from '@/lib/delivery/markets';
import {
  buildMarketCatalogHref,
  buildMarketHomeHref,
} from '@/lib/delivery/marketRoute';
import { ProductMobileBackButton } from '@/components/pdp/ProductMobileBackButton';

function JsonLdScript({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}

function shouldEmitProductJsonLd(
  lang: string,
  marketPathSlug?: MarketPathSlug | null
): boolean {
  if (!isSeoLocale(lang)) return false;
  if (!marketPathSlug) return true;
  const market = getMarketByPathSlug(marketPathSlug);
  return Boolean(market && marketIsIndexable(market));
}

function destinationForMarket(
  marketPathSlug?: MarketPathSlug | null
): DeliveryDestinationId {
  if (!marketPathSlug) return 'CHIANG_MAI';
  return getMarketByPathSlug(marketPathSlug)?.destinationId ?? 'CHIANG_MAI';
}

export type CatalogProductPageArgs = {
  params: { lang: string; slug: string };
  /** When set (market PDP wrapper), home/catalog links stay in that expansion market. */
  marketPathSlug?: MarketPathSlug | null;
};

export async function renderCatalogProductPage({
  params,
  marketPathSlug = null,
}: CatalogProductPageArgs) {
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
  const destinationId = destinationForMarket(marketPathSlug);
  const emitJsonLd = shouldEmitProductJsonLd(lang, marketPathSlug);
  const schemaLang = lang === 'th' ? 'th' : 'en';

  const bouquet = await getCatalogBouquetBySlug(params.slug);
  if (bouquet) {
    const gifts = await getCatalogProductsFiltered({ categoryKey: 'gifts' });
    const similarBouquets = await getCatalogSimilarBouquets(bouquet, 3);
    const name = lang === 'th' ? bouquet.nameTh : bouquet.nameEn;
    const description = lang === 'th' ? bouquet.descriptionTh : bouquet.descriptionEn;
    const composition = lang === 'th' ? bouquet.compositionTh : bouquet.compositionEn;
    const t = translations[lang as Locale].product;
    const nav = translations[lang as Locale].nav;
    const productJsonLd = emitJsonLd
      ? buildBouquetProductJsonLd(bouquet, schemaLang, pageUrl, { destinationId })
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
              description={description}
              compositionHeading={t.composition}
              compositionText={composition}
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
    const productJsonLd = emitJsonLd
      ? buildCatalogProductJsonLd(plushyToy, schemaLang, pageUrl, { destinationId })
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
    const productJsonLd = emitJsonLd
      ? buildCatalogProductJsonLd(balloon, schemaLang, pageUrl, { destinationId })
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

  const product = await getCatalogProductBySlug(params.slug);
  if (product) {
    const gifts = await getCatalogProductsFiltered({ categoryKey: 'gifts' });
    const name = lang === 'th' && product.nameTh ? product.nameTh : product.nameEn;
    const description = (lang === 'th' ? product.descriptionTh : product.descriptionEn) || '';
    const nav = translations[lang as Locale].nav;
    const productJsonLd = emitJsonLd
      ? buildCatalogProductJsonLd(product, schemaLang, pageUrl, { destinationId })
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
