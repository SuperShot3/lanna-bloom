import { NextRequest, NextResponse } from 'next/server';
import { sendAdminNewOrderNotificationOnce } from '@/lib/orderNotification';

/**
 * Notify admin about a new order (idempotent).
 * Called when the customer lands on the confirmation-pending page so that
 * if the notification was not sent at order creation, it is sent when the page is seen.
 * Safe to call multiple times: sendAdminNewOrderNotificationOnce skips if already sent.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  const normalized = orderId?.trim();
  if (!normalized) {
    return NextResponse.json({ error: 'orderId required' }, { status: 400 });
  }
  try {
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
