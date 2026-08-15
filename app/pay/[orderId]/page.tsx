import { unstable_noStore as noStore } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getOrderByIdWithPublicToken, getOrderDetailsUrl } from '@/lib/orders';
import { getSupabasePaymentStatusByOrderId } from '@/lib/supabase/adminQueries';
import { isAdminPayLinkOrder } from '@/lib/payLinks/adminPayLink';
import { PayLinkReviewClient } from './PayLinkReviewClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Pay | Lanna Bloom',
  robots: { index: false, follow: false },
};

function tokenFromSearch(raw: string | string[] | undefined): string {
  if (typeof raw === 'string') return raw.trim();
  if (Array.isArray(raw)) return raw[0]?.trim() ?? '';
  return '';
}

export default async function PayLinkPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams?: Promise<{ token?: string | string[] }>;
}) {
  noStore();
  const { orderId } = await params;
  const normalized = orderId?.trim() ?? '';
  const sp = (await searchParams) ?? {};
  const token = tokenFromSearch(sp.token);
  if (!normalized || !token) notFound();

  const order = await getOrderByIdWithPublicToken(normalized, token);
  if (!order || !isAdminPayLinkOrder(order)) notFound();

  const supabasePayment = await getSupabasePaymentStatusByOrderId(order.orderId);
  const paid =
    (supabasePayment?.payment_status ?? '').toUpperCase() === 'PAID' ||
    order.status === 'paid' ||
    Boolean(supabasePayment?.paid_at ?? order.paidAt);

  if (paid) {
    redirect(getOrderDetailsUrl(order.orderId, { token }));
  }

  const description = order.items?.[0]?.bouquetTitle?.trim() || 'Payment';
  const amount = order.pricing?.grandTotal ?? order.items?.[0]?.price ?? 0;

  return (
    <PayLinkReviewClient
      orderId={order.orderId}
      publicToken={token}
      description={description}
      amount={amount}
      customerName={order.customerName ?? null}
    />
  );
}
