import { notFound } from 'next/navigation';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { getOrderDetailsUrl } from '@/lib/orders';
import { CheckoutSuccessClient } from './CheckoutSuccessClient';

export default async function CheckoutSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ orderId?: string; publicOrderUrl?: string; shareText?: string }>;
}) {
  const { lang } = await params;
  if (!isValidLocale(lang)) notFound();
  const q = await searchParams;
  const orderId = typeof q.orderId === 'string' ? q.orderId.trim() : '';
  let publicOrderUrl = typeof q.publicOrderUrl === 'string' ? q.publicOrderUrl : undefined;
  let shareText = typeof q.shareText === 'string' ? q.shareText : undefined;
  if (orderId && !publicOrderUrl) {
    publicOrderUrl = getOrderDetailsUrl(orderId);
  }
  if (orderId && !shareText && publicOrderUrl) {
    shareText = `New order: ${orderId}. Details: ${publicOrderUrl}`;
  }

  return (
    <CheckoutSuccessClient
      lang={lang as Locale}
      orderId={orderId}
      publicOrderUrl={publicOrderUrl}
      shareText={shareText}
    />
  );
}
