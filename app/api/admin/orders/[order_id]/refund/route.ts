import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { adminRefundOrder } from '@/lib/accounting/adminRefundOrder';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ order_id: string }> }
) {
  const authResult = await requireRole(['OWNER']);
  if (!authResult.ok) return authResult.response;
  const { session } = authResult;

  const { order_id } = await params;
  if (!order_id?.trim()) {
    return NextResponse.json({ error: 'order_id required' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const b = body as {
    amount?: unknown;
    stripe_commission?: unknown;
    notes?: unknown;
  };

  const amount = typeof b.amount === 'number' ? b.amount : Number(b.amount);
  const stripeCommission =
    typeof b.stripe_commission === 'number' ? b.stripe_commission : Number(b.stripe_commission);
  const notes = typeof b.notes === 'string' ? b.notes : undefined;

  if (!Number.isFinite(amount) || !Number.isFinite(stripeCommission)) {
    return NextResponse.json(
      { error: 'amount and stripe_commission are required numbers' },
      { status: 400 }
    );
  }

  const adminEmail = session.user.email ?? 'unknown';
  const result = await adminRefundOrder({
    orderId: order_id.trim(),
    amount,
    stripeCommission,
    notes,
    createdBy: adminEmail,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, refundId: result.refundId });
}
