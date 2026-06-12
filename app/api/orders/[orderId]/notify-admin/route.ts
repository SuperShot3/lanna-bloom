import { NextRequest, NextResponse } from 'next/server';
import { sendAdminNewOrderNotificationOnce } from '@/lib/orderNotification';
import { getOrderByIdWithPublicToken } from '@/lib/orders';
import { checkNotifyAdminRateLimit } from '@/lib/rateLimit';

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

/**
 * Notify admin about a new order (idempotent).
 * Called when the customer lands on the confirmation-pending page so that
 * if the notification was not sent at order creation, it is sent when the page is seen.
 * Safe to call multiple times: sendAdminNewOrderNotificationOnce skips if already sent.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  const normalized = orderId?.trim();
  if (!normalized) {
    return NextResponse.json({ error: 'orderId required' }, { status: 400 });
  }

  const ip = getClientIp(request);
  if (!checkNotifyAdminRateLimit(ip, normalized)) {
    console.warn('[orders/notify-admin] rate-limited', { ip });
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const publicToken =
    typeof b.publicToken === 'string'
      ? b.publicToken.trim()
      : typeof b.public_token === 'string'
        ? b.public_token.trim()
        : '';
  if (!publicToken) {
    return NextResponse.json({ error: 'publicToken required' }, { status: 401 });
  }

  try {
    const order = await getOrderByIdWithPublicToken(normalized, publicToken);
    if (!order) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    await sendAdminNewOrderNotificationOnce(normalized);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[orders/notify-admin] failed:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to notify' },
      { status: 500 }
    );
  }
}
