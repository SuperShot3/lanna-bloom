import 'server-only';
import type Stripe from 'stripe';
import { stripeAmountMinorToMajor } from '@/lib/stripe/stripeAmountMinorToMajor';

/**
 * Returns Stripe's balance_transaction fee in major currency units (e.g. THB), rounded to 2 decimals.
 * Uses live API data when the charge + balance_transaction are available.
 * Returns `null` if unavailable — callers should fall back to {@link processingFeeForIncome} estimate.
 */
export async function getPaymentIntentStripeFeeMajor(
  stripe: Stripe,
  paymentIntentId: string
): Promise<number | null> {
  if (!paymentIntentId?.trim()) return null;
  try {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId.trim(), {
      expand: ['latest_charge.balance_transaction'],
    });
    const lc = pi.latest_charge;
    if (!lc || typeof lc === 'string') return null;
    const charge = lc as Stripe.Charge;
    const btRaw = charge.balance_transaction;
    if (!btRaw || typeof btRaw === 'string') return null;
    const bt = btRaw as Stripe.BalanceTransaction;
    if (typeof bt.fee !== 'number' || !Number.isFinite(bt.fee)) return null;
    const cur = bt.currency ?? 'thb';
    const major = stripeAmountMinorToMajor(bt.fee, cur);
    if (!Number.isFinite(major) || major < 0) return null;
    return Math.round(major * 100) / 100;
  } catch (e) {
    console.error('[stripe] getPaymentIntentStripeFeeMajor:', e);
    return null;
  }
}
