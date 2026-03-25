import { NextRequest, NextResponse } from 'next/server';
import {
  acknowledgePaymentNotifications,
  listPendingPaymentNotifications,
} from '@/lib/line-notifications/pendingPayment';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function requireAgentAuth(req: NextRequest): boolean {
  const expected = process.env.LINE_AGENT_SECRET?.trim();
  if (!expected) return false;
  const auth = req.headers.get('authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  return token === expected;
}

/**
 * Agent polls pending payment-confirmation payloads, sends LINE push using LINE_CHANNEL_ACCESS_TOKEN on the agent,
 * then POSTs notification ids here to acknowledge.
 */
export async function GET(req: NextRequest) {
  if (!requireAgentAuth(req)) {
    return unauthorized();
  }
  if (!process.env.LINE_AGENT_SECRET?.trim()) {
    return NextResponse.json({ error: 'LINE_AGENT_SECRET is not configured' }, { status: 503 });
  }

  const limit = Math.min(
    100,
    Math.max(1, Number(req.nextUrl.searchParams.get('limit')) || 50)
  );
  const notifications = await listPendingPaymentNotifications(limit);

  return NextResponse.json({
    ok: true,
    notifications: notifications.map((n) => ({
      id: n.id,
      orderId: n.order_id,
      lineUserId: n.line_user_id,
      orderUrl: n.public_order_url,
      /** Suggested text; agent may localize. */
      suggestedText: `Payment received. Order ${n.order_id}. View details: ${n.public_order_url}`,
      createdAt: n.created_at,
    })),
  });
}

export async function POST(req: NextRequest) {
  if (!requireAgentAuth(req)) {
    return unauthorized();
  }
  if (!process.env.LINE_AGENT_SECRET?.trim()) {
    return NextResponse.json({ error: 'LINE_AGENT_SECRET is not configured' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const idsRaw = b.ids ?? b.notificationIds;
  const ids = Array.isArray(idsRaw)
    ? idsRaw.filter((id): id is string => typeof id === 'string' && id.length > 0)
    : [];

  if (!ids.length) {
    return NextResponse.json({ error: 'ids array required' }, { status: 400 });
  }

  const { acknowledged } = await acknowledgePaymentNotifications(ids);
  return NextResponse.json({ ok: true, acknowledged });
}
