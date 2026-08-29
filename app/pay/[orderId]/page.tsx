import { unstable_noStore as noStore } from 'next/cache';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getOrderByIdWithPublicToken } from '@/lib/orders';
import { getSupabasePaymentStatusByOrderId } from '@/lib/supabase/adminQueries';
import {
  isAdminPayLinkOrder,
  PAY_LINK_TTL_MINUTES,
  payLinkDescriptionFromItems,
  payLinkUnusableReason,
  type PayLinkReceipt,
} from '@/lib/payLinks/adminPayLink';
import { isPayLinkDraftId } from '@/lib/payLinks/payLinkCheckoutSession';
import { payLinkTokensEqual } from '@/lib/payLinks/payLinkCrypto';
import { expirePayLinkStripeSessionIfAny } from '@/lib/payLinks/expirePayLinkDrafts';
import {
  completePayLinkFromStripeSession,
  paidPayLinkReceiptForToken,
} from '@/lib/payLinks/completePayLinkReturn';
import { getCheckoutDraftRecordById } from '@/lib/checkout/checkoutDrafts';
import { PayLinkReturnClient, PayLinkThankYouCard } from '@/components/pay/PayLinkReturnClient';
import { PayLinkPayNowCard } from '@/components/pay/PayLinkPayNowCard';
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

function disabledPage() {
  return (
    <PayLinkFallback
      title="This payment link is no longer active"
      hint={`Pay links can be used once, and only for ${PAY_LINK_TTL_MINUTES} minutes. Ask Lanna Bloom to send a new link if you still need to pay.`}
    />
  );
}

function thankYou(receipt: PayLinkReceipt) {
  return <PayLinkThankYouCard receipt={receipt} />;
}

export default async function PayLinkPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams?: Promise<{
    token?: string | string[];
    cancelled?: string | string[];
    session_id?: string | string[];
    pay_error?: string | string[];
  }>;
}) {
  noStore();
  const { orderId } = await params;
  const normalized = orderId?.trim() ?? '';
  const sp = (await searchParams) ?? {};
  const token = tokenFromSearch(sp.token);
  const cancelled = tokenFromSearch(sp.cancelled) === '1';
  const sessionId = tokenFromSearch(sp.session_id);
  const payError = tokenFromSearch(sp.pay_error) === '1';
  if (!normalized || !token) notFound();

  if (isPayLinkDraftId(normalized)) {
    return payLinkDraftPage({
      draftId: normalized,
      token,
      cancelled,
      sessionId,
      payError,
    });
  }

  return payLinkLegacyOrderPage({
    orderId: normalized,
    token,
    cancelled,
    sessionId,
    payError,
  });
}

async function payLinkDraftPage({
  draftId,
  token,
  cancelled,
  sessionId,
  payError,
}: {
  draftId: string;
  token: string;
  cancelled: boolean;
  sessionId: string;
  payError: boolean;
}) {
  if (sessionId) {
    const completed = await completePayLinkFromStripeSession({
      linkId: draftId,
      publicToken: token,
      sessionId,
    });
    if (completed.kind === 'paid') return thankYou(completed.receipt);
    if (completed.kind === 'pending') {
      return (
        <PayLinkReturnClient linkId={draftId} token={token} sessionId={sessionId} />
      );
    }
    if (completed.kind === 'error') {
      return (
        <PayLinkFallback
          title="Could not confirm payment"
          error={completed.error}
          hint="If you were charged, this link is already used. Ask Lanna Bloom if you need a receipt."
        />
      );
    }
  }

  const paidReceipt = await paidPayLinkReceiptForToken(token);
  if (paidReceipt) return thankYou(paidReceipt);

  const record = await getCheckoutDraftRecordById(draftId);
  if (!record || !isAdminPayLinkOrder(record.payload)) {
    notFound();
  }

  if (!payLinkTokensEqual(record.payload.payLinkPublicToken, token)) {
    notFound();
  }

  const unusable = payLinkUnusableReason(record.payload, record.createdAt);
  if (unusable) {
    await expirePayLinkStripeSessionIfAny(record.payload.payLinkStripeSessionId);
    return disabledPage();
  }

  const amount = record.payload.pricing?.grandTotal ?? record.payload.items?.[0]?.price ?? 0;
  const description = payLinkDescriptionFromItems(record.payload.items);

  return (
    <PayLinkPayNowCard
      linkId={draftId}
      token={token}
      amount={amount}
      description={description}
      cancelled={cancelled}
      error={
        payError
          ? 'Could not start payment. Try again in a moment. If this keeps happening, ask Lanna Bloom to send a new link.'
          : undefined
      }
    />
  );
}

async function payLinkLegacyOrderPage({
  orderId,
  token,
  cancelled,
  sessionId,
  payError,
}: {
  orderId: string;
  token: string;
  cancelled: boolean;
  sessionId: string;
  payError: boolean;
}) {
  if (sessionId) {
    const completed = await completePayLinkFromStripeSession({
      linkId: orderId,
      publicToken: token,
      sessionId,
    });
    if (completed.kind === 'paid') return thankYou(completed.receipt);
    if (completed.kind === 'pending') {
      return (
        <PayLinkReturnClient linkId={orderId} token={token} sessionId={sessionId} />
      );
    }
  }

  const order = await getOrderByIdWithPublicToken(orderId, token);
  if (!order || !isAdminPayLinkOrder(order)) notFound();

  const supabasePayment = await getSupabasePaymentStatusByOrderId(order.orderId);
  const paid =
    (supabasePayment?.payment_status ?? '').toUpperCase() === 'PAID' ||
    order.status === 'paid' ||
    Boolean(supabasePayment?.paid_at ?? order.paidAt);

  if (paid) {
    return thankYou({
      amount: order.pricing?.grandTotal ?? 0,
      description: payLinkDescriptionFromItems(order.items),
      orderId: order.orderId,
    });
  }

  if (payLinkUnusableReason(order, order.createdAt)) {
    return disabledPage();
  }

  return (
    <PayLinkPayNowCard
      linkId={order.orderId}
      token={token}
      amount={order.pricing?.grandTotal ?? 0}
      description={payLinkDescriptionFromItems(order.items)}
      cancelled={cancelled}
      error={
        payError
          ? 'Could not start payment. Try again in a moment. If this keeps happening, ask Lanna Bloom to send a new link.'
          : undefined
      }
    />
  );
}
