import { unstable_noStore as noStore } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getOrderByIdWithPublicToken, getPayLinkUrl } from '@/lib/orders';
import { getSupabasePaymentStatusByOrderId } from '@/lib/supabase/adminQueries';
import {
  isAdminPayLinkOrder,
  PAY_LINK_TTL_MINUTES,
  payLinkDescriptionFromItems,
  payLinkUnusableReason,
} from '@/lib/payLinks/adminPayLink';
import { payLinkTokensEqual } from '@/lib/payLinks/payLinkCrypto';
import { expirePayLinkStripeSessionIfAny } from '@/lib/payLinks/expirePayLinkDrafts';
import {
  completePayLinkFromStripeSession,
  paidPayLinkReceiptForToken,
} from '@/lib/payLinks/completePayLinkReturn';
import type { PayLinkReceipt } from '@/lib/payLinks/adminPayLink';
import { createCheckoutSessionForExistingOrder } from '@/lib/stripe/createCheckoutSessionForExistingOrder';
import { createCheckoutSessionForPayLinkDraft } from '@/lib/stripe/createCheckoutSessionForPayLinkDraft';
import { getCheckoutDraftRecordById } from '@/lib/checkout/checkoutDrafts';
import { PayLinkReturnClient, PayLinkThankYouCard } from '@/components/pay/PayLinkReturnClient';
import styles from './pay-link.module.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Pay | Lanna Bloom',
  robots: { index: false, follow: false },
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  }>;
}) {
  noStore();
  const { orderId } = await params;
  const normalized = orderId?.trim() ?? '';
  const sp = (await searchParams) ?? {};
  const token = tokenFromSearch(sp.token);
  const cancelled = tokenFromSearch(sp.cancelled) === '1';
  const sessionId = tokenFromSearch(sp.session_id);
  if (!normalized || !token) notFound();

  if (UUID_RE.test(normalized)) {
    return payLinkDraftPage({ draftId: normalized, token, cancelled, sessionId });
  }

  return payLinkLegacyOrderPage({ orderId: normalized, token, cancelled, sessionId });
}

async function payLinkDraftPage({
  draftId,
  token,
  cancelled,
  sessionId,
}: {
  draftId: string;
  token: string;
  cancelled: boolean;
  sessionId: string;
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

  const payHref = getPayLinkUrl(draftId, { token });

  if (cancelled) {
    return (
      <PayLinkFallback
        title="Payment cancelled"
        hint={`You can continue to Stripe. This link expires ${PAY_LINK_TTL_MINUTES} minutes after it was created.`}
        href={payHref}
        actionLabel="Continue to Stripe"
      />
    );
  }

  const result = await createCheckoutSessionForPayLinkDraft({
    draftId,
    publicToken: token,
    lang: 'en',
  });

  if (result.ok) {
    redirect(result.url);
  }

  if (result.alreadyPaid) {
    const again = await paidPayLinkReceiptForToken(token);
    if (again) return thankYou(again);
  }

  if (result.status === 410) {
    return disabledPage();
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

async function payLinkLegacyOrderPage({
  orderId,
  token,
  cancelled,
  sessionId,
}: {
  orderId: string;
  token: string;
  cancelled: boolean;
  sessionId: string;
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

  const payHref = getPayLinkUrl(order.orderId, { token });

  if (cancelled) {
    return (
      <PayLinkFallback
        title="Payment cancelled"
        hint={`You can continue to Stripe. This link expires ${PAY_LINK_TTL_MINUTES} minutes after it was created.`}
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
    return thankYou({
      amount: order.pricing?.grandTotal ?? 0,
      description: payLinkDescriptionFromItems(order.items),
      orderId: order.orderId,
    });
  }

  if (result.status === 410) {
    return disabledPage();
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
