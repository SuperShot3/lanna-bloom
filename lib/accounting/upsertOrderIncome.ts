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
  /**
   * Net Stripe processing fee in major units (from Balance Transaction), if known.
   * When omitted, Stripe rows use the estimated rate in {@link processingFeeForIncome}.
   */
  stripeProcessingFeeMajor?: number | null;
  /**
   * ISO timestamp of when the order was actually paid (e.g. orders.paid_at).
   * If provided, the income record's `paid_date` will be set to that calendar
   * day so monthly accounting totals reflect when the money came in, not when
   * the income row was inserted.
   */
  paidAt?: string | null;
}

/** Convert an ISO timestamp to a YYYY-MM-DD string. Returns null on invalid input. */
function isoToYmd(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
      paid_date:         isoToYmd(ctx.paidAt),
      created_by:        ctx.createdBy ?? 'system',
      processing_fee_amount:
        pm === 'stripe' && ctx.stripeProcessingFeeMajor != null
          ? Math.max(0, ctx.stripeProcessingFeeMajor)
          : null,
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
