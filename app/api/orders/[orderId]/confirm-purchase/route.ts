import { NextRequest, NextResponse } from 'next/server';
import { getOrderByIdWithPublicToken } from '@/lib/orders';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { isSupabaseMissingColumnError } from '@/lib/supabase/columnErrors';
import { checkOrderLookupRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

/**
 * Mark GA4 + Google Ads purchase as successfully delivered from the browser (after dataLayer push).
 * Server fallbacks check `ga4_purchase_sent` / `google_ads_conversion_sent` and skip when set.
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

  let paymentRow: {
    payment_status: string | null;
    paid_at: string | null;
    ga4_purchase_sent: boolean | null;
    google_ads_conversion_sent?: boolean | null;
  } | null = null;

  const fullSelect = await supabase
    .from('orders')
    .select('payment_status, paid_at, ga4_purchase_sent, google_ads_conversion_sent')
    .eq('order_id', normalized)
    .single();

  if (!fullSelect.error && fullSelect.data) {
    paymentRow = fullSelect.data;
  } else if (isSupabaseMissingColumnError(fullSelect.error, 'google_ads_conversion_sent')) {
    const legacy = await supabase
      .from('orders')
      .select('payment_status, paid_at, ga4_purchase_sent')
      .eq('order_id', normalized)
      .single();
    if (legacy.error || !legacy.data) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    paymentRow = legacy.data;
  } else {
    return NextResponse.json(
      { error: 'Order not found' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    );
  }

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
      { confirmed: false, reason: 'not_paid' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const ga4AlreadySent = paymentRow.ga4_purchase_sent === true;
  const adsColumnPresent = paymentRow.google_ads_conversion_sent !== undefined;
  const adsAlreadySent = adsColumnPresent && paymentRow.google_ads_conversion_sent === true;
  if (ga4AlreadySent && (!adsColumnPresent || adsAlreadySent)) {
    return NextResponse.json(
      { confirmed: true, reason: 'already_sent' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const now = new Date().toISOString();
  const browserConfirmUpdate: Record<string, unknown> = {
    updated_at: now,
  };
  if (adsColumnPresent) {
    browserConfirmUpdate.google_ads_conversion_sent = true;
    browserConfirmUpdate.google_ads_conversion_sent_at = now;
    browserConfirmUpdate.google_ads_conversion_source = 'browser';
    browserConfirmUpdate.google_ads_conversion_last_error = null;
  }
  if (!ga4AlreadySent) {
    browserConfirmUpdate.ga4_purchase_sent = true;
    browserConfirmUpdate.ga4_purchase_sent_at = now;
    browserConfirmUpdate.ga4_purchase_source = 'browser';
    browserConfirmUpdate.ga4_purchase_last_error = null;
  }

  const updateFilter = adsColumnPresent
    ? 'ga4_purchase_sent.is.null,ga4_purchase_sent.eq.false,google_ads_conversion_sent.is.null,google_ads_conversion_sent.eq.false'
    : 'ga4_purchase_sent.is.null,ga4_purchase_sent.eq.false';

  const { data: confirmed, error: confirmError } = await supabase
    .from('orders')
    .update(browserConfirmUpdate)
    .eq('order_id', normalized)
    .or(updateFilter)
    .select('order_id');

  if (confirmError) {
    console.error('[orders/confirm-purchase] update failed:', confirmError.message, {
      orderId: normalized,
    });
    return NextResponse.json({ error: 'Service unavailable' }, { status: 500 });
  }

  const won = Array.isArray(confirmed) && confirmed.length > 0;
  return NextResponse.json(
    won
      ? { confirmed: true }
      : { confirmed: true, reason: 'already_sent' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}