import 'server-only';
import { upsertOrderIncomeRecord } from './incomeRecords';
import type { IncomePaymentMethod, MoneyLocation } from '@/types/accounting';

/**
 * Maps an order's raw payment_method string to an income payment method.
 * Handles both legacy uppercase (STRIPE, PROMPTPAY, BANK_TRANSFER) and
 * lowercase forms for robustness.
 */
function mapPaymentMethod(raw: string | null | undefined): IncomePaymentMethod {
  const upper = (raw ?? '').toUpperCase().trim();
  if (upper === 'STRIPE')                return 'stripe';
  if (upper === 'PROMPTPAY')             return 'qr_payment';
  if (upper === 'BANK_TRANSFER')         return 'bank_transfer';
  if (upper === 'CASH')                  return 'cash';
  if (upper === 'QR_PAYMENT')            return 'qr_payment';
  if (upper === 'CARD')                  return 'stripe';
  return 'other';
}

/**
 * Derives where the money physically landed based on payment method.
 */
function mapMoneyLocation(method: IncomePaymentMethod): MoneyLocation {
  if (method === 'stripe')        return 'stripe';
  if (method === 'cash')          return 'cash';
  if (method === 'bank_transfer') return 'bank';
  if (method === 'qr_payment')    return 'bank';
  return 'other';
}

export interface OrderIncomeContext {
  orderId: string;
  amount: number;           // In THB (already divided by 100 for Stripe)
  currency?: string;
  paymentMethod?: string | null;
  stripePaymentIntentId?: string | null;
  createdBy?: string;
}

/**
 * Creates (or idempotently skips) an income record for a paid order.
 *
 * Safe to call fire-and-forget. Never throws.
 * Uses UNIQUE(order_id) to prevent duplicates.
 */
export async function upsertOrderIncome(ctx: OrderIncomeContext): Promise<void> {
  try {
    if (!ctx.orderId?.trim()) {
      console.warn('[upsertOrderIncome] Called with empty orderId — skipping');
      return;
    }
    if (!ctx.amount || ctx.amount <= 0) {
      console.warn('[upsertOrderIncome] Called with invalid amount for order', ctx.orderId, '— skipping');
      return;
    }

    const pm = mapPaymentMethod(ctx.paymentMethod);
    const loc = mapMoneyLocation(pm);

    const { created, error } = await upsertOrderIncomeRecord({
      order_id:          ctx.orderId.trim(),
      amount:            ctx.amount,
      currency:          (ctx.currency ?? 'THB').toUpperCase(),
      payment_method:    pm,
      money_location:    loc,
      description:       `Order ${ctx.orderId.trim()}`,
      external_reference: ctx.stripePaymentIntentId ?? null,
      created_by:        ctx.createdBy ?? 'system',
    });

    if (error) {
      console.error('[upsertOrderIncome] Failed for order', ctx.orderId, error);
    } else if (created) {
      console.log('[upsertOrderIncome] Income record created for order', ctx.orderId);
    } else {
      console.log('[upsertOrderIncome] Income record already exists for order', ctx.orderId, '— skipped');
    }
  } catch (e) {
    // Never propagate — this must not break the payment flow
    console.error('[upsertOrderIncome] Unhandled exception for order', ctx.orderId, e);
  }
}
