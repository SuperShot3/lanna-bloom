import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { renderCatalogProductPage } from '../renderCatalogProductPage';
import {
  getMarketByPathSlug,
  marketIsRouteAvailable,
} from '@/lib/delivery/markets';
import { getCatalogBouquetBySlug } from '@/lib/catalogReads';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { buildMarketPageMetadata } from '@/lib/seo/marketPageMetadata';
import { resolveProductOgImage } from '@/lib/seo/productJsonLd';

export const revalidate = 60;
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: { lang: string; slug: string; productSlug: string };
}): Promise<Metadata> {
  if (!isValidLocale(params.lang)) return {};
  const market = getMarketByPathSlug(params.slug);
  if (!market || !marketIsRouteAvailable(market)) return {};

  const bouquet = await getCatalogBouquetBySlug(params.productSlug);
  const isTh = params.lang === 'th';
  const productName = bouquet
    ? isTh
      ? bouquet.nameTh
      : bouquet.nameEn
    : undefined;
  const ogImage = bouquet
    ? resolveProductOgImage(bouquet.images, {
        alt: bouquet.imageAlts?.[0] || productName,
      })
    : undefined;

  return buildMarketPageMetadata({
    lang: params.lang as Locale,
    market,
    kind: 'product',
    productName,
    productSlug: params.productSlug,
    ...(ogImage ? { ogImage } : {}),
  });
}

export default function MarketCatalogProductPage({
  params,
}: {
  params: { lang: string; slug: string; productSlug: string };
}) {
  const market = getMarketByPathSlug(params.slug);
  if (!market || !marketIsRouteAvailable(market)) notFound();

  return renderCatalogProductPage({
    params: {
      lang: params.lang,
      slug: params.productSlug,
    },
    marketPathSlug: market.pathSlug,
  });
}
