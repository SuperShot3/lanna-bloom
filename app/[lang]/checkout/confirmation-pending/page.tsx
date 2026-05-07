import { notFound, redirect } from 'next/navigation';
import { isValidLocale } from '@/lib/i18n';

/**
 * Legacy route kept for backward compatibility.
 * New flow: orders go directly to /order/[orderId] where pending vs paid is handled.
 */
export default async function ConfirmationPendingPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ orderId?: string; session_id?: string; checkout_token?: string; token?: string }>;
}) {
  const { lang } = await params;
  if (!isValidLocale(lang)) notFound();
  const q = await searchParams;
  const orderId = typeof q.orderId === 'string' ? q.orderId.trim() : '';
  const checkoutToken = typeof q.checkout_token === 'string' ? q.checkout_token.trim() : '';
  const publicToken = typeof q.token === 'string' ? q.token.trim() : '';

  if (!orderId) {
    // No order id: send user back to cart in the same locale.
    redirect(`/${lang}/cart`);
  }

  const orderPath = `/order/${encodeURIComponent(orderId)}`;
  const qs = new URLSearchParams();
  if (publicToken) qs.set('token', publicToken);
  if (checkoutToken.length >= 8) qs.set('checkout_token', checkoutToken);
  redirect(`${orderPath}${qs.toString() ? `?${qs.toString()}` : ''}`);
}
