import { NextRequest, NextResponse } from 'next/server';
import { getOrderByIdWithPublicToken } from '@/lib/orders';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { checkOrderLookupRateLimit } from '@/lib/rateLimit';
import { isSupabaseMissingColumnError } from '@/lib/supabase/columnErrors';

export const dynamic = 'force-dynamic';

/**
 * Mark GA4 purchase as successfully delivered from the browser (after dataLayer push).
 * Server MP fallback checks `ga4_purchase_sent` and skips when this is true.
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
  if (!checkOrderLookupRateLimit(ip, `confirm_purchase:${normalized}`)) {
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
    return NextResponse.json({ error: 'Service unavailable' }, { status: 500 });
  }

  const { data: paymentRow, error: paymentError } = await supabase
    .from('orders')
    .select('payment_status, paid_at, ga4_purchase_sent')
    .eq('order_id', normalized)
    .single();

  if (paymentError || !paymentRow) {
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
      { confirmed: false, reason: 'not_paid' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  if (paymentRow.ga4_purchase_sent === true) {
    return NextResponse.json(
      { confirmed: true, reason: 'already_sent' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const now = new Date().toISOString();
  const fullUpdate = {
    ga4_purchase_sent: true,
    ga4_purchase_sent_at: now,
    ga4_purchase_source: 'browser',
    ga4_purchase_last_error: null,
    updated_at: now,
  };

  let confirmed = await supabase
    .from('orders')
    .update(fullUpdate)
    .eq('order_id', normalized)
    .or('ga4_purchase_sent.is.null,ga4_purchase_sent.eq.false')
    .select('order_id');

  if (
    confirmed.error &&
    (isSupabaseMissingColumnError(confirmed.error, 'ga4_purchase_source') ||
      isSupabaseMissingColumnError(confirmed.error, 'ga4_purchase_last_error'))
  ) {
    confirmed = await supabase
      .from('orders')
      .update({
        ga4_purchase_sent: true,
        ga4_purchase_sent_at: now,
        updated_at: now,
      })
      .eq('order_id', normalized)
      .or('ga4_purchase_sent.is.null,ga4_purchase_sent.eq.false')
      .select('order_id');
  }

  if (confirmed.error) {
    console.error('[orders/confirm-purchase] update failed:', confirmed.error.message, {
      orderId: normalized,
    });
    return NextResponse.json({ error: 'Service unavailable' }, { status: 500 });
  }

  const won = Array.isArray(confirmed.data) && confirmed.data.length > 0;
  return NextResponse.json(
    won
      ? { confirmed: true }
      : { confirmed: true, reason: 'already_sent' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
