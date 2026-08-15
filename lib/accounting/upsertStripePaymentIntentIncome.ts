import 'server-only';

import type Stripe from 'stripe';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getPaymentIntentStripeFeeMajor } from '@/lib/stripe/getPaymentIntentStripeFeeMajor';
import { resolveProcessingFeeForIncome } from '@/lib/accounting/stripeFee';
import { buildStripePaymentIntentIncomeDraft } from '@/lib/accounting/stripePaymentIntentIncome';

const TABLE = 'income_records';

export async function findIncomeByStripePaymentIntentRef(piId: string): Promise<{
  id: string;
  order_id: string | null;
  processing_fee_amount: number | null;
} | null> {
  const supabase = getSupabaseAdmin();
  const id = piId.trim();
  if (!supabase || !id) return null;

  const { data, error } = await supabase
    .from(TABLE)
    .select('id, order_id, processing_fee_amount')
    .eq('external_reference', id)
    .limit(1);

  if (error) {
    console.error('[upsertStripePaymentIntentIncome] lookup error:', error.message);
    return null;
  }
  const row = data?.[0];
  if (!row?.id) return null;
  return {
    id: String(row.id),
    order_id: row.order_id != null ? String(row.order_id) : null,
    processing_fee_amount:
      row.processing_fee_amount != null ? Number(row.processing_fee_amount) : null,
  };
}

/**
 * Record income for a succeeded Stripe PaymentIntent that has no Checkout Session
 * (Payment Links, invoices, Dashboard charges). Does not create a storefront order.
 * Idempotent on `external_reference` = `pi_xxx`.
 */
export async function upsertStripePaymentIntentIncome(params: {
  stripe: Stripe;
  paymentIntent: Stripe.PaymentIntent;
  createdBy?: string;
}): Promise<{ created: boolean; skipped: boolean; feeUpdated?: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { created: false, skipped: false, error: 'Supabase not configured' };

  const draft = buildStripePaymentIntentIncomeDraft(params.paymentIntent);
  if (!draft) {
    return { created: false, skipped: true, error: undefined };
  }

  const existing = await findIncomeByStripePaymentIntentRef(draft.external_reference);
  const feeFromStripe = await getPaymentIntentStripeFeeMajor(
    params.stripe,
    draft.external_reference
  );
  const fee = resolveProcessingFeeForIncome(draft.amount, 'stripe', feeFromStripe);
  const now = new Date().toISOString();

  if (existing) {
    if (feeFromStripe != null && Number.isFinite(feeFromStripe)) {
      const { error } = await supabase
        .from(TABLE)
        .update({ processing_fee_amount: fee, updated_at: now })
        .eq('id', existing.id);
      if (error) {
        console.error('[upsertStripePaymentIntentIncome] fee update error:', error.message);
        return { created: false, skipped: true, error: error.message };
      }
      return { created: false, skipped: true, feeUpdated: true };
    }
    return { created: false, skipped: true };
  }

  const { error } = await supabase.from(TABLE).insert({
    order_id: draft.order_id,
    source_mode: draft.source_mode,
    source_type: draft.source_type,
    amount: draft.amount,
    processing_fee_amount: fee,
    currency: draft.currency,
    payment_method: draft.payment_method,
    money_location: draft.money_location,
    income_status: draft.income_status,
    description: draft.description,
    external_reference: draft.external_reference,
    proof_file_path: null,
    receipt_attached: false,
    notes: null,
    paid_date: draft.paid_date,
    created_by: params.createdBy ?? 'system:stripe_webhook',
    confirmed_at: now,
  });

  if (error) {
    if (error.code === '23505') {
      return { created: false, skipped: true };
    }
    console.error('[upsertStripePaymentIntentIncome] insert error:', error.message);
    return { created: false, skipped: false, error: error.message };
  }

  return { created: true, skipped: false };
}
