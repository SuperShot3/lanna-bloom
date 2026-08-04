import { NextRequest, NextResponse } from 'next/server';
import { getOrderByIdWithPublicToken } from '@/lib/orders';
import { isOrderChatEnabled } from '@/lib/orderChat/enabled';
import {
  getChatAvailability,
  listChatMessages,
  sanitizeChatBody,
  sendChatMessage,
} from '@/lib/orderChat/store';
import { checkOrderChatPostRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

function normalizeOrderToken(raw: string | null): string | null {
  if (!raw) return null;
  const t = raw.trim();
  if (t.length < 8 || t.length > 128) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(t)) return null;
  return t;
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

async function resolveAuthorizedOrder(
  request: NextRequest,
  orderId: string
): Promise<{ ok: true; orderId: string } | { ok: false; response: NextResponse }> {
  if (!isOrderChatEnabled()) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Not found' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      ),
    };
  }

  const normalized = orderId?.trim();
  if (!normalized) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'orderId required' }, { status: 400 }),
    };
  }

  const tokenFromQuery = request.nextUrl.searchParams.get('token');
  const tokenFromHeader = request.headers.get('x-order-token');
  const orderToken = normalizeOrderToken(tokenFromQuery ?? tokenFromHeader);
  if (!orderToken) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Order not found' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      ),
    };
  }

  const order = await getOrderByIdWithPublicToken(normalized, orderToken);
  if (!order) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Order not found' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      ),
    };
  }

  return { ok: true, orderId: order.orderId };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId: rawId } = await params;
  const auth = await resolveAuthorizedOrder(request, rawId);
  if (!auth.ok) return auth.response;

  const availability = await getChatAvailability(auth.orderId);
  if (!availability) {
    return NextResponse.json(
      { error: 'Order not found' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  if (!availability.open) {
    return NextResponse.json(
      { closed: true, messages: [], purgeAfter: availability.purgeAfter },
      { status: 410, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const messages = await listChatMessages(auth.orderId);
  return NextResponse.json(
    {
      closed: false,
      messages,
      purgeAfter: availability.purgeAfter,
      orderStatus: availability.orderStatus,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId: rawId } = await params;
  const auth = await resolveAuthorizedOrder(request, rawId);
  if (!auth.ok) return auth.response;

  const ip = getClientIp(request);
  if (!checkOrderChatPostRateLimit(ip, auth.orderId)) {
    return NextResponse.json(
      { error: 'Too many messages. Please try again later.' },
      { status: 429, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const availability = await getChatAvailability(auth.orderId);
  if (!availability) {
    return NextResponse.json(
      { error: 'Order not found' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } }
    );
  }
  if (!availability.open) {
    return NextResponse.json(
      { error: 'Chat closed', closed: true },
      { status: 410, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const text = sanitizeChatBody(
    body && typeof body === 'object' && 'body' in body
      ? (body as { body?: unknown }).body
      : null
  );
  if (!text) {
    return NextResponse.json(
      { error: 'Message must be 1–2000 characters' },
      { status: 400 }
    );
  }

  const message = await sendChatMessage(auth.orderId, 'customer', text);
  if (!message) {
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
  }

  return NextResponse.json(
    { ok: true, message, purgeAfter: availability.purgeAfter },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
