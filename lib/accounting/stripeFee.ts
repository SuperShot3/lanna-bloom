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

/**
 * Fee stored on an income row.
 * Non-Stripe methods are always 0. Stripe uses a posted override when it is
 * a finite number ≥ 0; otherwise the 5.3% estimate.
 */
export function resolveProcessingFeeForIncome(
  grossAmount: number,
  paymentMethod: IncomePaymentMethod,
  override?: number | null
): number {
  if (paymentMethod !== 'stripe') return 0;
  if (override != null && Number.isFinite(override) && override >= 0) {
    return Math.round(override * 100) / 100;
  }
  return processingFeeForIncome(grossAmount, 'stripe');
}

export function netAfterProcessingFee(grossAmount: number, processingFee: number): number {
  return Math.round((grossAmount - processingFee) * 100) / 100;
}
