import { notFound } from 'next/navigation';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { getOrderDetailsUrl } from '@/lib/orders';
import { ConfirmationPendingClient } from './ConfirmationPendingClient';

/**
 * Post-checkout page: order is in a pending state until payment is confirmed.
 * - Manual/bank orders: show pending confirmation (contact us).
 * - Stripe: poll until paid then redirect to /order/[orderId]; never show "success" UI here.
 * GA4 purchase is never fired on this page; it runs only on the order details page when paid.
 */
export default async function ConfirmationPendingPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ orderId?: string; publicOrderUrl?: string; shareText?: string; session_id?: string }>;
}) {
  const { lang } = await params;
  if (!isValidLocale(lang)) notFound();
  const q = await searchParams;
  const sessionId = typeof q.session_id === 'string' ? q.session_id.trim() : '';
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
    <ConfirmationPendingClient
      lang={lang as Locale}
      orderId={orderId}
      publicOrderUrl={publicOrderUrl}
      shareText={shareText}
      sessionId={sessionId || undefined}
    />
  );
}
