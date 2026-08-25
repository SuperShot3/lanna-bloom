import nextDynamic from 'next/dynamic';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isValidLocale, type Locale } from '@/lib/i18n';
import {
  getSharedCartByToken,
  normalizeSharedCartToken,
} from '@/lib/cart/sharedCart';
import { buildCartPageMetadata } from '@/lib/cart/sharedCartShareMetadata';

export const dynamic = 'force-dynamic';

function firstQueryValue(
  value: string | string[] | undefined
): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { lang: string };
  searchParams?: Record<string, string | string[] | undefined>;
}): Promise<Metadata> {
  if (!isValidLocale(params.lang)) return { title: 'Lanna Bloom' };
  const locale = params.lang as Locale;
  const shareToken = normalizeSharedCartToken(firstQueryValue(searchParams?.share));

  if (!shareToken) {
    return buildCartPageMetadata({
      lang: locale,
      shareToken: null,
      items: null,
    });
  }

  const payload = await getSharedCartByToken(shareToken);
  return buildCartPageMetadata({
    lang: locale,
    shareToken,
    items: payload?.items ?? null,
  });
}

const CartPageClient = nextDynamic(
  () => import('./CartPageClient').then((m) => m.CartPageClient),
  { ssr: false, loading: () => <div style={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading cart...</div> }
);

export default function CartPage({
  params,
}: {
  params: { lang: string };
}) {
  const lang = params.lang;
  if (!isValidLocale(lang)) notFound();
  return <CartPageClient lang={lang as Locale} />;
}
