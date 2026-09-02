import { permanentRedirect } from 'next/navigation';

export const revalidate = 60;
export const dynamicParams = true;

/**
 * Legacy /[lang]/[market]/catalog/[slug] → canonical product URL.
 * Middleware 308s first and sets the delivery-region cookie.
 */
export default function MarketProductPage({
  params,
}: {
  params: { lang: string; market: string; slug: string };
}) {
  permanentRedirect(`/${params.lang}/catalog/${params.slug}`);
}
