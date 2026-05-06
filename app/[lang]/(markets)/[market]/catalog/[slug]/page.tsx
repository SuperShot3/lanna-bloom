import { redirect } from 'next/navigation';

export const revalidate = 60;
export const dynamicParams = true;

export default function MarketProductPage({
  params,
  searchParams,
}: {
  params: { lang: string; market: string; slug: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const v of value) qs.append(key, v);
    } else if (typeof value === 'string') {
      qs.set(key, value);
    }
  }
  const query = qs.toString();
  const destination = `/${params.lang}/catalog/${params.market}/${params.slug}${query ? `?${query}` : ''}`;
  redirect(destination);
}

