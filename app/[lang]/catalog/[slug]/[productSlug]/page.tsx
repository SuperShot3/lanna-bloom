import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ProductPage from '@/app/[lang]/catalog/[slug]/page';
import { getMarketByPathSlug } from '@/lib/delivery/markets';
import { getBouquetBySlugFromSanity } from '@/lib/sanity';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { buildMarketPageMetadata } from '@/lib/seo/marketPageMetadata';

export const revalidate = 60;
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: { lang: string; slug: string; productSlug: string };
}): Promise<Metadata> {
  if (!isValidLocale(params.lang)) return {};
  const market = getMarketByPathSlug(params.slug);
  if (!market) return {};

  const bouquet = await getBouquetBySlugFromSanity(params.productSlug);
  const isTh = params.lang === 'th';
  const productName = bouquet
    ? isTh
      ? bouquet.nameTh
      : bouquet.nameEn
    : undefined;

  return buildMarketPageMetadata({
    lang: params.lang as Locale,
    market,
    kind: 'product',
    productName,
    productSlug: params.productSlug,
  });
}

export default function MarketCatalogProductPage({
  params,
}: {
  params: { lang: string; slug: string; productSlug: string };
}) {
  const market = getMarketByPathSlug(params.slug);
  if (!market) notFound();

  return ProductPage({
    params: {
      lang: params.lang,
      slug: params.productSlug,
    },
    marketPathSlug: market.pathSlug,
  });
}
