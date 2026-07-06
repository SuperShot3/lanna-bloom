import { NextRequest, NextResponse } from 'next/server';
import { getOrderByIdWithPublicToken } from '@/lib/orders';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { checkOrderLookupRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

/**
 * Order-level purchase tracking claim (server-side dedupe).
 *
 * The browser must call this endpoint and receive `shouldTrack: true` before pushing
 * `event: "purchase"` to the dataLayer. The claim is a single atomic conditional UPDATE
 * on `orders.ga4_purchase_sent`, so exactly one caller can ever win per order —
 * across browsers, devices, reloads, admin views, and shared order links.
 *
 * Responses:
 * - `{ shouldTrack: true }` — order is paid and this caller won the claim; push `purchase` now.
 * - `{ shouldTrack: false, reason: 'already_claimed' }` — tracked before; never push again.
 * - `{ shouldTrack: false, reason: 'not_paid' }` — order not paid; do not push (do not persist a local flag).
 * - 404 — unknown order or invalid public token (no detail leaked).
 */

function normalizeOrderToken(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const t = raw.trim();
  if (t.length < 8 || t.length > 128) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(t)) return null;
  return t;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
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
      { status: 429 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as { token?: unknown };
  const orderToken = normalizeOrderToken(body.token ?? request.headers.get('x-order-token'));
  if (!orderToken) {
    return NextResponse.json(
      { error: 'Order not found' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const order = await getOrderByIdWithPublicToken(normalized, orderToken);
  if (!order) {
    return NextResponse.json(
      { error: 'Order not found' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('[orders/claim-purchase] Supabase not configured');
    return NextResponse.json({ error: 'Service unavailable' }, { status: 500 });
  }

  // Server-side paid check — never trust the client's payment state.
  const { data: paymentRow, error: paymentError } = await supabase
    .from('orders')
    .select('payment_status, paid_at')
    .eq('order_id', normalized)
    .single();

  if (paymentError || !paymentRow) {
    return NextResponse.json(
      { error: 'Order not found' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const paid =
    (paymentRow.payment_status ?? '').toUpperCase() === 'PAID' ||
    Boolean(paymentRow.paid_at);

  if (!paid) {
    return NextResponse.json(
      { shouldTrack: false, reason: 'not_paid' },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  // Atomic claim: the WHERE condition ensures only the first caller updates the row.
  const now = new Date().toISOString();
  const { data: claimed, error: claimError } = await supabase
    .from('orders')
    .update({ ga4_purchase_sent: true, ga4_purchase_sent_at: now, updated_at: now })
    .eq('order_id', normalized)
    .or('ga4_purchase_sent.is.null,ga4_purchase_sent.eq.false')
    .select('order_id');

  if (claimError) {
    console.error('[orders/claim-purchase] claim update failed:', claimError.message, {
      orderId: normalized,
    });
    // Fail closed: without a confirmed claim the browser must not push `purchase`.
    return NextResponse.json({ error: 'Service unavailable' }, { status: 500 });
  }

  const won = Array.isArray(claimed) && claimed.length > 0;
  return NextResponse.json(
    won
      ? { shouldTrack: true }
      : { shouldTrack: false, reason: 'already_claimed' },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
