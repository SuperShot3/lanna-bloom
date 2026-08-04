import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { isOrderChatEnabled } from '@/lib/orderChat/enabled';
import {
  getChatAvailability,
  listChatMessages,
  markAdminChatRead,
  sanitizeChatBody,
  sendChatMessage,
} from '@/lib/orderChat/store';

export const dynamic = 'force-dynamic';

async function requireChatAdmin() {
  if (!isOrderChatEnabled()) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Not found' }, { status: 404 }),
    };
  }
  return requireRole(['OWNER', 'MANAGER', 'SUPPORT']);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ order_id: string }> }
) {
  const authResult = await requireChatAdmin();
  if (!authResult.ok) return authResult.response;

  const { order_id } = await params;
  const orderId = order_id?.trim();
  if (!orderId) {
    return NextResponse.json({ error: 'order_id required' }, { status: 400 });
  }

  const availability = await getChatAvailability(orderId);
  if (!availability) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (!availability.open) {
    return NextResponse.json(
      { closed: true, messages: [], purgeAfter: availability.purgeAfter },
      { status: 410, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  await markAdminChatRead(orderId);
  const messages = await listChatMessages(orderId);

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
  { params }: { params: Promise<{ order_id: string }> }
) {
  const authResult = await requireChatAdmin();
  if (!authResult.ok) return authResult.response;

  const { order_id } = await params;
  const orderId = order_id?.trim();
  if (!orderId) {
    return NextResponse.json({ error: 'order_id required' }, { status: 400 });
  }

  const availability = await getChatAvailability(orderId);
  if (!availability) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
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

  const message = await sendChatMessage(orderId, 'admin', text);
  if (!message) {
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
  }

  await markAdminChatRead(orderId);

  return NextResponse.json(
    { ok: true, message, purgeAfter: availability.purgeAfter },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
