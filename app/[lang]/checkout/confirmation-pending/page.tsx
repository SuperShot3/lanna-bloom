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
  searchParams: Promise<{ orderId?: string; session_id?: string }>;
}) {
  const { lang } = await params;
  if (!isValidLocale(lang)) notFound();
  const q = await searchParams;
  const orderId = typeof q.orderId === 'string' ? q.orderId.trim() : '';

  if (!orderId) {
    // No order id: send user back to cart in the same locale.
    redirect(`/${lang}/cart`);
  }

  redirect(`/order/${encodeURIComponent(orderId)}`);
}
