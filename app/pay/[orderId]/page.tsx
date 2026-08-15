import { unstable_noStore as noStore } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getOrderByIdWithPublicToken, getOrderDetailsUrl, getPayLinkUrl } from '@/lib/orders';
import { getSupabasePaymentStatusByOrderId } from '@/lib/supabase/adminQueries';
import { isAdminPayLinkOrder } from '@/lib/payLinks/adminPayLink';
import { createCheckoutSessionForExistingOrder } from '@/lib/stripe/createCheckoutSessionForExistingOrder';
import styles from './pay-link.module.css';

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

function PayLinkFallback({
  title,
  hint,
  href,
  actionLabel,
  error,
}: {
  title: string;
  hint?: string;
  href?: string;
  actionLabel?: string;
  error?: string;
}) {
  return (
    <div className={styles.page}>
      <main className={styles.card}>
        <p className={styles.brand}>Lanna Bloom</p>
        <h1 className={styles.title}>{title}</h1>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        {hint ? <p className={styles.hint}>{hint}</p> : null}
        {href && actionLabel ? (
          <a className={styles.pay} href={href}>
            {actionLabel}
          </a>
        ) : null}
      </main>
    </div>
  );
}

export default async function PayLinkPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams?: Promise<{ token?: string | string[]; cancelled?: string | string[] }>;
}) {
  noStore();
  const { orderId } = await params;
  const normalized = orderId?.trim() ?? '';
  const sp = (await searchParams) ?? {};
  const token = tokenFromSearch(sp.token);
  const cancelled = tokenFromSearch(sp.cancelled) === '1';
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

  const payHref = getPayLinkUrl(order.orderId, { token });

  if (cancelled) {
    return (
      <PayLinkFallback
        title="Payment cancelled"
        hint="You can continue to Stripe whenever you are ready."
        href={payHref}
        actionLabel="Continue to Stripe"
      />
    );
  }

  const result = await createCheckoutSessionForExistingOrder({
    orderId: order.orderId,
    publicToken: token,
    lang: 'en',
  });

  if (result.ok) {
    redirect(result.url);
  }

  if (result.status === 400 && result.error === 'Order is already paid') {
    redirect(getOrderDetailsUrl(order.orderId, { token }));
  }

  if (result.status === 403 || result.status === 404) {
    notFound();
  }

  return (
    <PayLinkFallback
      title="Could not start payment"
      error={result.error}
      hint="Try again in a moment. If this keeps happening, ask Lanna Bloom to send a new link."
      href={payHref}
      actionLabel="Try again"
    />
  );
}
