import { NextRequest, NextResponse } from 'next/server';
import { getOrderByIdWithPublicToken } from '@/lib/orders';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { checkOrderLookupRateLimit } from '@/lib/rateLimit';
import { isSupabaseMissingColumnError } from '@/lib/supabase/columnErrors';

export const dynamic = 'force-dynamic';

/**
 * Order-level purchase tracking claim (server-side dedupe).
 *
 * The browser must call this endpoint and receive `shouldTrack: true` before pushing
 * `event: "purchase"` to the dataLayer. The claim is a single atomic conditional UPDATE
 * on `orders.ga4_purchase_claimed`, so exactly one caller can ever win per order —
 * across browsers, devices, reloads, admin views, and shared order links.
 * Successful delivery is recorded separately via `confirm-purchase` (`ga4_purchase_sent`).
 *
 * If migration `20260708120000_ga4_purchase_fallback` is not applied yet, falls back to
 * the legacy atomic claim on `ga4_purchase_sent` (pre-confirm flow).
 */

function normalizeOrderToken(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const t = raw.trim();
  if (t.length < 8 || t.length > 128) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(t)) return null;
  return t;
}

type PaymentRow = {
  payment_status: string | null;
  paid_at: string | null;
  ga4_purchase_sent: boolean | null;
  ga4_purchase_claimed?: boolean | null;
};

async function attemptLegacyPurchaseClaim(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  orderId: string,
  now: string,
): Promise<{ won: boolean; error: { message?: string } | null }> {
  const { data: claimed, error: claimError } = await supabase
    .from('orders')
    .update({ ga4_purchase_sent: true, ga4_purchase_sent_at: now, updated_at: now })
    .eq('order_id', orderId)
    .neq('ga4_purchase_sent', true)
    .select('order_id');

  return {
    won: Array.isArray(claimed) && claimed.length > 0,
    error: claimError,
  };
}

async function loadPaymentRow(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  orderId: string,
): Promise<{ row: PaymentRow | null; usesLegacyClaim: boolean }> {
  const withClaimed = await supabase
    .from('orders')
    .select('payment_status, paid_at, ga4_purchase_sent, ga4_purchase_claimed')
    .eq('order_id', orderId)
    .single();

  if (!withClaimed.error && withClaimed.data) {
    return { row: withClaimed.data as PaymentRow, usesLegacyClaim: false };
  }

  if (isSupabaseMissingColumnError(withClaimed.error, 'ga4_purchase_claimed')) {
    const legacy = await supabase
      .from('orders')
      .select('payment_status, paid_at, ga4_purchase_sent')
      .eq('order_id', orderId)
      .single();
    if (legacy.error || !legacy.data) {
      return { row: null, usesLegacyClaim: true };
    }
    return { row: legacy.data as PaymentRow, usesLegacyClaim: true };
  }

  return { row: null, usesLegacyClaim: false };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  const normalized = orderId?.trim();
  if (!normalized) {
    return NextResponse.json({ error: 'orderId required' }, { status: 400 });
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1';
  if (!checkOrderLookupRateLimit(ip, `claim_purchase:${normalized}`)) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as { token?: unknown };
  const orderToken = normalizeOrderToken(body.token ?? request.headers.get('x-order-token'));
  if (!orderToken) {
    return NextResponse.json(
      { error: 'Order not found' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const order = await getOrderByIdWithPublicToken(normalized, orderToken);
  if (!order) {
    return NextResponse.json(
      { error: 'Order not found' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('[orders/claim-purchase] Supabase not configured');
    return NextResponse.json({ error: 'Service unavailable' }, { status: 500 });
  }

  const { row: paymentRow, usesLegacyClaim } = await loadPaymentRow(supabase, normalized);
  if (!paymentRow) {
    return NextResponse.json(
      { error: 'Order not found' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const paid =
    (paymentRow.payment_status ?? '').toUpperCase() === 'PAID' ||
    Boolean(paymentRow.paid_at);

  if (!paid) {
    return NextResponse.json(
      { shouldTrack: false, reason: 'not_paid' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  if (paymentRow.ga4_purchase_sent === true) {
    return NextResponse.json(
      { shouldTrack: false, reason: 'already_claimed' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  if (!usesLegacyClaim && paymentRow.ga4_purchase_claimed === true) {
    return NextResponse.json(
      { shouldTrack: false, reason: 'already_claimed' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const now = new Date().toISOString();

  if (usesLegacyClaim) {
    const { won, error: claimError } = await attemptLegacyPurchaseClaim(supabase, normalized, now);
    if (claimError) {
      console.error('[orders/claim-purchase] legacy claim update failed:', claimError.message, {
        orderId: normalized,
      });
      return NextResponse.json({ error: 'Service unavailable' }, { status: 500 });
    }
    if (won) {
      console.warn(
        '[orders/claim-purchase] using legacy ga4_purchase_sent claim — apply migration 20260708120000_ga4_purchase_fallback',
        { orderId: normalized },
      );
    }
    return NextResponse.json(
      won
        ? { shouldTrack: true, legacy: true }
        : { shouldTrack: false, reason: 'already_claimed' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const { data: claimed, error: claimError } = await supabase
    .from('orders')
    .update({ ga4_purchase_claimed: true, ga4_purchase_claimed_at: now, updated_at: now })
    .eq('order_id', normalized)
    .neq('ga4_purchase_claimed', true)
    .select('order_id');

  if (claimError) {
    const missingClaimedColumn =
      isSupabaseMissingColumnError(claimError, 'ga4_purchase_claimed') ||
      isSupabaseMissingColumnError(claimError, 'ga4_purchase_claimed_at');
    if (missingClaimedColumn) {
      console.warn(
        '[orders/claim-purchase] ga4_purchase_claimed columns missing — falling back to legacy claim',
        { orderId: normalized },
      );
      const legacy = await attemptLegacyPurchaseClaim(supabase, normalized, now);
      if (legacy.error) {
        console.error('[orders/claim-purchase] legacy claim fallback failed:', legacy.error.message, {
          orderId: normalized,
        });
        return NextResponse.json({ error: 'Service unavailable' }, { status: 500 });
      }
      return NextResponse.json(
        legacy.won
          ? { shouldTrack: true, legacy: true }
          : { shouldTrack: false, reason: 'already_claimed' },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }
    console.error('[orders/claim-purchase] claim update failed:', claimError.message, {
      orderId: normalized,
    });
    return NextResponse.json({ error: 'Service unavailable' }, { status: 500 });
  }

  const won = Array.isArray(claimed) && claimed.length > 0;
  if (won) {
    console.info('[orders/claim-purchase] claim won', { orderId: normalized });
  } else {
    console.info('[orders/claim-purchase] claim lost (already claimed)', { orderId: normalized });
  }
  return NextResponse.json(
    won
      ? { shouldTrack: true }
      : { shouldTrack: false, reason: 'already_claimed' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
