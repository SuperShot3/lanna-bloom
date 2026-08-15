import { stripeAmountMinorToMajor } from '@/lib/stripe/stripeAmountMinorToMajor';
import { getBangkokYmd } from '@/lib/deliveryHours';

export const STRIPE_PAYMENT_INTENT_ID_RE = /^pi_[a-zA-Z0-9_]+$/;

export function isStripePaymentIntentId(value: string | null | undefined): boolean {
  return typeof value === 'string' && STRIPE_PAYMENT_INTENT_ID_RE.test(value.trim());
}

export function unixSecondsToBangkokYmd(seconds: number): string {
  return getBangkokYmd(new Date(seconds * 1000));
}

/** Prefer charge.created, then PaymentIntent.created, as an Asia/Bangkok calendar day. */
export function paidDateFromStripePaymentIntent(pi: {
  created?: number | null;
  latest_charge?: { created?: number | null } | string | null;
}): string {
  const chargeCreated =
    pi.latest_charge &&
    typeof pi.latest_charge === 'object' &&
    typeof pi.latest_charge.created === 'number'
      ? pi.latest_charge.created
      : null;
  const seconds = chargeCreated ?? (typeof pi.created === 'number' ? pi.created : null);
  if (seconds != null && Number.isFinite(seconds)) {
    return unixSecondsToBangkokYmd(seconds);
  }
  return getBangkokYmd(new Date());
}

/** Gross in major units from amount_received, else amount. */
export function amountMajorFromStripePaymentIntent(pi: {
  amount_received?: number | null;
  amount?: number | null;
  currency?: string | null;
}): number | null {
  const minor =
    typeof pi.amount_received === 'number' && pi.amount_received > 0
      ? pi.amount_received
      : typeof pi.amount === 'number'
        ? pi.amount
        : null;
  if (minor == null || !Number.isFinite(minor) || minor <= 0) return null;
  const major = stripeAmountMinorToMajor(minor, pi.currency ?? 'thb');
  if (!Number.isFinite(major) || major <= 0) return null;
  return Math.round(major * 100) / 100;
}

export function shouldSkipStripePiIncome(
  existingExternalReference: string | null | undefined,
  piId: string
): boolean {
  const existing = (existingExternalReference ?? '').trim();
  const id = piId.trim();
  return existing !== '' && id !== '' && existing === id;
}

export type StripePiIncomeDraft = {
  amount: number;
  currency: string;
  payment_method: 'stripe';
  money_location: 'stripe';
  order_id: null;
  external_reference: string;
  source_mode: 'auto_order';
  source_type: 'offline_sale';
  income_status: 'confirmed';
  paid_date: string;
  description: string;
};

/** Pure payload for a PaymentIntent with no storefront Checkout Session / order. */
export function buildStripePaymentIntentIncomeDraft(pi: {
  id: string;
  amount_received?: number | null;
  amount?: number | null;
  currency?: string | null;
  created?: number | null;
  latest_charge?: { created?: number | null } | string | null;
}): StripePiIncomeDraft | null {
  const piId = typeof pi.id === 'string' ? pi.id.trim() : '';
  if (!isStripePaymentIntentId(piId)) return null;
  const amount = amountMajorFromStripePaymentIntent(pi);
  if (amount == null) return null;
  return {
    amount,
    currency: (pi.currency ?? 'thb').toUpperCase(),
    payment_method: 'stripe',
    money_location: 'stripe',
    order_id: null,
    external_reference: piId,
    source_mode: 'auto_order',
    source_type: 'offline_sale',
    income_status: 'confirmed',
    paid_date: paidDateFromStripePaymentIntent(pi),
    description: `Stripe payment ${piId}`,
  };
}
