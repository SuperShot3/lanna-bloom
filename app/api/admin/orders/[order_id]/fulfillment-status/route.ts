import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';

/**
 * Deprecated: Fulfillment status has been removed. Use order_status (PATCH /api/admin/orders/[order_id]/status)
 * as the single operational pipeline. Customer-facing text is derived from order_status.
 */
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ order_id: string }> }
) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  const { order_id } = await params;
  if (!order_id?.trim()) {
    return NextResponse.json({ error: 'order_id required' }, { status: 400 });
  }

  return NextResponse.json(
    {
      error: 'Fulfillment status is deprecated. Use order_status (PATCH .../status) instead. Customer-facing status is derived from order_status.',
    },
    { status: 410 }
  );
}
