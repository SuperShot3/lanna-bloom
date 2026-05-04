import type { IncomePaymentMethod } from '@/types/accounting';

/**
 * Fallback Stripe/card fee rate when the real fee cannot be read from Stripe
 * (`balance_transaction` on the PaymentIntent). Prefer storing actual fees from the API.
 * Admin accounting only; not tax/VAT.
 */
export const STRIPE_FEE_RATE = 0.053;

export const STRIPE_FEE_PERCENT_LABEL = '5.3% (estimate)';

/**
 * Stripe (card/online) income rows incur this fee on the gross amount **when no actual fee was stored**.
 * Other payment methods have no automatic processing fee in this system.
 */
export function processingFeeForIncome(
  grossAmount: number,
  paymentMethod: IncomePaymentMethod
): number {
  if (paymentMethod !== 'stripe') return 0;
  if (!Number.isFinite(grossAmount) || grossAmount <= 0) return 0;
  return Math.round(grossAmount * STRIPE_FEE_RATE * 100) / 100;
}

export function netAfterProcessingFee(grossAmount: number, processingFee: number): number {
  return Math.round((grossAmount - processingFee) * 100) / 100;
}
