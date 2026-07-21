import { notFound } from 'next/navigation';
import ProductPage from '@/app/[lang]/catalog/[slug]/page';
import { getMarketByPathSlug } from '@/lib/delivery/markets';

export const revalidate = 60;
export const dynamicParams = true;

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
  });
}

