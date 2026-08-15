import 'server-only';

import type Stripe from 'stripe';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { createStripeServerClient, getStripeServerConfig } from '@/lib/stripe/server';
import { getBangkokYmd } from '@/lib/deliveryHours';
import { shopAddDays } from '@/lib/shopTime';
import { upsertOrderIncome } from '@/lib/accounting/upsertOrderIncome';
import { upsertStripePaymentIntentIncome } from '@/lib/accounting/upsertStripePaymentIntentIncome';
import { recordStripeRefundEvent } from '@/lib/accounting/incomeRefunds';
import { getPaymentIntentStripeFeeMajor } from '@/lib/stripe/getPaymentIntentStripeFeeMajor';
import {
  amountMajorFromStripePaymentIntent,
  isStripePaymentIntentId,
} from '@/lib/accounting/stripePaymentIntentIncome';
import { resolveProcessingFeeForIncome } from '@/lib/accounting/stripeFee';

const DEFAULT_LOOKBACK_DAYS = 30;
const PREVIEW_LIMIT = 20;
const IN_CHUNK = 50;

export type SyncStripeIncomePreviewRow = {
  paymentIntentId: string;
  amount: number;
  fee: number | null;
  path: 'order' | 'pi_only';
  orderId: string | null;
};

export type SyncStripeIncomeResult = {
  dryRun: boolean;
  dateFrom: string;
  dateTo: string;
  paymentIntents: {
    listed: number;
    succeeded: number;
    alreadyRecorded: number;
    created: number;
    feeUpdated: number;
    failed: number;
    wouldCreate: number;
  };
  refunds: {
    listed: number;
    recorded: number;
    skipped: number;
    failed: number;
    wouldRecord: number;
  };
  missingGross: number;
  preview: SyncStripeIncomePreviewRow[];
  errors?: string[];
};

function parseYmd(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const v = raw.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

function bangkokRangeToUnix(dateFrom: string, dateTo: string): { gte: number; lte: number } {
  const gte = Math.floor(new Date(`${dateFrom}T00:00:00+07:00`).getTime() / 1000);
  const lte = Math.floor(new Date(`${dateTo}T23:59:59.999+07:00`).getTime() / 1000);
  return { gte, lte };
}

async function listSucceededPaymentIntents(
  stripe: Stripe,
  created: { gte: number; lte: number }
): Promise<Stripe.PaymentIntent[]> {
  const out: Stripe.PaymentIntent[] = [];
  for await (const pi of stripe.paymentIntents.list({ created, limit: 100 })) {
    if (pi.status === 'succeeded') out.push(pi);
  }
  return out;
}

async function listRefunds(
  stripe: Stripe,
  created: { gte: number; lte: number }
): Promise<Stripe.Refund[]> {
  const out: Stripe.Refund[] = [];
  for await (const refund of stripe.refunds.list({ created, limit: 100 })) {
    const status = refund.status ?? 'succeeded';
    if (status === 'failed' || status === 'canceled') continue;
    out.push(refund);
  }
  return out;
}

async function mapOrdersByPaymentIntent(
  piIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const supabase = getSupabaseAdmin();
  if (!supabase || piIds.length === 0) return map;

  for (let i = 0; i < piIds.length; i += IN_CHUNK) {
    const chunk = piIds.slice(i, i + IN_CHUNK);
    const { data, error } = await supabase
      .from('orders')
      .select('order_id, stripe_payment_intent_id')
      .in('stripe_payment_intent_id', chunk);
    if (error) {
      console.error('[syncStripeIncome] orders lookup:', error.message);
      continue;
    }
    for (const row of data ?? []) {
      const pi = String(row.stripe_payment_intent_id ?? '').trim();
      const oid = String(row.order_id ?? '').trim();
      if (pi && oid) map.set(pi, oid);
    }
  }
  return map;
}

async function existingIncomePiRefs(piIds: string[]): Promise<Set<string>> {
  const found = new Set<string>();
  const supabase = getSupabaseAdmin();
  if (!supabase || piIds.length === 0) return found;

  for (let i = 0; i < piIds.length; i += IN_CHUNK) {
    const chunk = piIds.slice(i, i + IN_CHUNK);
    const { data, error } = await supabase
      .from('income_records')
      .select('external_reference, order_id')
      .in('external_reference', chunk);
    if (error) {
      console.error('[syncStripeIncome] income lookup:', error.message);
      continue;
    }
    for (const row of data ?? []) {
      const ref = String(row.external_reference ?? '').trim();
      if (ref) found.add(ref);
    }
  }
  return found;
}

async function existingIncomeOrderIds(orderIds: string[]): Promise<Set<string>> {
  const found = new Set<string>();
  const supabase = getSupabaseAdmin();
  if (!supabase || orderIds.length === 0) return found;

  for (let i = 0; i < orderIds.length; i += IN_CHUNK) {
    const chunk = orderIds.slice(i, i + IN_CHUNK);
    const { data, error } = await supabase
      .from('income_records')
      .select('order_id')
      .in('order_id', chunk);
    if (error) {
      console.error('[syncStripeIncome] income-by-order lookup:', error.message);
      continue;
    }
    for (const row of data ?? []) {
      const oid = String(row.order_id ?? '').trim();
      if (oid) found.add(oid);
    }
  }
  return found;
}

export async function syncStripeIncome(params: {
  dryRun: boolean;
  dateFrom?: unknown;
  dateTo?: unknown;
  createdBy: string;
}): Promise<{ ok: true; result: SyncStripeIncomeResult } | { ok: false; error: string; status: number }> {
  const stripeConfig = getStripeServerConfig();
  if (!stripeConfig) {
    return { ok: false, error: 'Stripe is not configured', status: 503 };
  }
  if (!getSupabaseAdmin()) {
    return { ok: false, error: 'Supabase not configured', status: 503 };
  }

  const today = getBangkokYmd(new Date());
  const dateTo = parseYmd(params.dateTo) ?? today;
  const dateFrom = parseYmd(params.dateFrom) ?? shopAddDays(dateTo, -DEFAULT_LOOKBACK_DAYS);
  if (dateFrom > dateTo) {
    return { ok: false, error: 'dateFrom must be on or before dateTo', status: 400 };
  }

  const stripe = createStripeServerClient(stripeConfig.secretKey);
  const created = bangkokRangeToUnix(dateFrom, dateTo);

  let intents: Stripe.PaymentIntent[];
  let refunds: Stripe.Refund[];
  try {
    [intents, refunds] = await Promise.all([
      listSucceededPaymentIntents(stripe, created),
      listRefunds(stripe, created),
    ]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[syncStripeIncome] Stripe list error:', msg);
    return { ok: false, error: 'Failed to list Stripe payments', status: 502 };
  }

  const piIds = intents.map((pi) => pi.id).filter(isStripePaymentIntentId);
  const orderByPi = await mapOrdersByPaymentIntent(piIds);
  const incomeByPi = await existingIncomePiRefs(piIds);
  const orderIds = Array.from(new Set(Array.from(orderByPi.values())));
  const incomeByOrder = await existingIncomeOrderIds(orderIds);

  const missing: SyncStripeIncomePreviewRow[] = [];
  let alreadyRecorded = 0;

  for (const pi of intents) {
    const amount = amountMajorFromStripePaymentIntent(pi);
    if (amount == null) continue;
    const orderId = orderByPi.get(pi.id) ?? null;
    const recorded =
      incomeByPi.has(pi.id) || (orderId != null && incomeByOrder.has(orderId));
    if (recorded) {
      alreadyRecorded += 1;
      continue;
    }
    missing.push({
      paymentIntentId: pi.id,
      amount,
      fee: null,
      path: orderId ? 'order' : 'pi_only',
      orderId,
    });
  }

  const missingGross = Math.round(missing.reduce((s, r) => s + r.amount, 0) * 100) / 100;

  if (params.dryRun) {
    return {
      ok: true,
      result: {
        dryRun: true,
        dateFrom,
        dateTo,
        paymentIntents: {
          listed: intents.length,
          succeeded: intents.length,
          alreadyRecorded,
          created: 0,
          feeUpdated: 0,
          failed: 0,
          wouldCreate: missing.length,
        },
        refunds: {
          listed: refunds.length,
          recorded: 0,
          skipped: 0,
          failed: 0,
          wouldRecord: refunds.length,
        },
        missingGross,
        preview: missing.slice(0, PREVIEW_LIMIT),
      },
    };
  }

  let createdCount = 0;
  let feeUpdated = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const pi of intents) {
    const amount = amountMajorFromStripePaymentIntent(pi);
    if (amount == null) continue;
    const orderId = orderByPi.get(pi.id) ?? null;
    try {
      if (orderId) {
        const fee = await getPaymentIntentStripeFeeMajor(stripe, pi.id);
        const before = incomeByOrder.has(orderId) || incomeByPi.has(pi.id);
        await upsertOrderIncome({
          orderId,
          amount,
          currency: (pi.currency ?? 'thb').toUpperCase(),
          paymentMethod: 'STRIPE',
          stripePaymentIntentId: pi.id,
          paidAt:
            typeof pi.created === 'number'
              ? new Date(pi.created * 1000).toISOString()
              : null,
          createdBy: params.createdBy,
          stripeProcessingFeeMajor: fee,
        });
        if (!before) createdCount += 1;
        else if (fee != null) feeUpdated += 1;
      } else {
        const res = await upsertStripePaymentIntentIncome({
          stripe,
          paymentIntent: pi,
          createdBy: params.createdBy,
        });
        if (res.error) {
          failed += 1;
          errors.push(`${pi.id}: ${res.error}`);
        } else if (res.created) {
          createdCount += 1;
        } else if (res.feeUpdated) {
          feeUpdated += 1;
        }
      }
    } catch (e) {
      failed += 1;
      errors.push(`${pi.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  let refundsRecorded = 0;
  let refundsSkipped = 0;
  let refundsFailed = 0;
  for (const refund of refunds) {
    try {
      const res = await recordStripeRefundEvent(refund);
      if (res.recorded) refundsRecorded += 1;
      else if (res.reason === 'duplicate' || res.reason === 'linked_manual') refundsSkipped += 1;
      else {
        refundsFailed += 1;
        if (res.reason) errors.push(`${refund.id}: ${res.reason}`);
      }
    } catch (e) {
      refundsFailed += 1;
      errors.push(`${refund.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return {
    ok: true,
    result: {
      dryRun: false,
      dateFrom,
      dateTo,
      paymentIntents: {
        listed: intents.length,
        succeeded: intents.length,
        alreadyRecorded,
        created: createdCount,
        feeUpdated,
        failed,
        wouldCreate: 0,
      },
      refunds: {
        listed: refunds.length,
        recorded: refundsRecorded,
        skipped: refundsSkipped,
        failed: refundsFailed,
        wouldRecord: 0,
      },
      missingGross,
      preview: missing.slice(0, PREVIEW_LIMIT),
      errors: errors.length > 0 ? errors.slice(0, 20) : undefined,
    },
  };
}

/** Used by stripe-fee-lookup: gross / fee / net for a PaymentIntent. */
export async function lookupStripePaymentIntentFee(paymentIntentId: string): Promise<
  | { ok: true; gross: number; fee: number; net: number; feeEstimated: boolean }
  | { ok: false; error: string; status: number }
> {
  const id = paymentIntentId.trim();
  if (!isStripePaymentIntentId(id)) {
    return { ok: false, error: 'paymentIntentId must be a Stripe PaymentIntent id (pi_…)', status: 400 };
  }
  const stripeConfig = getStripeServerConfig();
  if (!stripeConfig) {
    return { ok: false, error: 'Stripe is not configured', status: 503 };
  }
  const stripe = createStripeServerClient(stripeConfig.secretKey);
  try {
    const pi = await stripe.paymentIntents.retrieve(id);
    const gross = amountMajorFromStripePaymentIntent(pi);
    if (gross == null) {
      return { ok: false, error: 'PaymentIntent has no chargeable amount', status: 400 };
    }
    const feeFromStripe = await getPaymentIntentStripeFeeMajor(stripe, id);
    const fee = resolveProcessingFeeForIncome(gross, 'stripe', feeFromStripe);
    const net = Math.round((gross - fee) * 100) / 100;
    return {
      ok: true,
      gross,
      fee,
      net,
      feeEstimated: feeFromStripe == null,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/no such paymentintent/i.test(msg) || /resource_missing/i.test(msg)) {
      return { ok: false, error: 'PaymentIntent not found', status: 404 };
    }
    console.error('[lookupStripePaymentIntentFee]', msg);
    return { ok: false, error: 'Failed to look up Stripe fee', status: 502 };
  }
}
