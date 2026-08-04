import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { isOrderChatEnabled } from '@/lib/orderChat/enabled';
import { getUnreadChatSummary } from '@/lib/orderChat/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isOrderChatEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const authResult = await requireRole(['OWNER', 'MANAGER', 'SUPPORT']);
  if (!authResult.ok) return authResult.response;

  const summary = await getUnreadChatSummary();
  return NextResponse.json(
    {
      count: summary.totalUnreadOrders,
      byOrderId: summary.byOrderId,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
