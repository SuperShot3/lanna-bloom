import type { IncomePaymentMethod } from '@/types/accounting';

/** Fixed Stripe/card processing fee rate (5.3%) — admin accounting only; not tax/VAT. */
export const STRIPE_FEE_RATE = 0.053;

export const STRIPE_FEE_PERCENT_LABEL = '5.3%';

/**
 * Stripe (card/online) income rows incur this fee on the gross amount.
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
