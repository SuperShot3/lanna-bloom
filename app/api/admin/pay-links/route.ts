import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { createOrder, getOrderPublicToken, getPayLinkUrl } from '@/lib/orders';
import {
  buildAdminPayLinkOrderPayload,
  validateAdminPayLinkInput,
} from '@/lib/payLinks/adminPayLink';
import { listAdminPayLinks } from '@/lib/payLinks/listAdminPayLinks';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  const statusRaw = request.nextUrl.searchParams.get('paymentStatus');
  const paymentStatus =
    statusRaw === 'PAID' || statusRaw === 'NOT_PAID' || statusRaw === 'all' ? statusRaw : 'all';

  const result = await listAdminPayLinks({ paymentStatus });
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ rows: result.rows });
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Body must be an object' }, { status: 400 });
  }

  const parsed = validateAdminPayLinkInput(body as Record<string, unknown>);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const payload = buildAdminPayLinkOrderPayload(parsed.value);
    const { order } = await createOrder(payload);
    const token = await getOrderPublicToken(order.orderId);
    const reviewUrl = getPayLinkUrl(order.orderId, { token });
    return NextResponse.json(
      {
        orderId: order.orderId,
        reviewUrl,
        amount: parsed.value.amount,
        description: parsed.value.description,
      },
      { status: 201 }
    );
  } catch (e) {
    const message =
      e && typeof e === 'object' && 'message' in e && typeof (e as { message?: unknown }).message === 'string'
        ? (e as { message: string }).message
        : e instanceof Error
          ? e.message
          : 'Failed to create pay link';
    const details =
      e && typeof e === 'object' && 'details' in e && typeof (e as { details?: unknown }).details === 'string'
        ? (e as { details: string }).details
        : undefined;
    console.error('[pay-links] create failed:', e);
    return NextResponse.json(
      { error: details ? `${message} (${details})` : message },
      { status: 500 }
    );
  }
}
