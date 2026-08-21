import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { fetchItemPurchaseHistory } from '@/lib/admin/itemPurchaseHistory';

export async function GET(request: NextRequest) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  const bouquetId = request.nextUrl.searchParams.get('bouquet_id')?.trim() ?? '';
  const size = request.nextUrl.searchParams.get('size');
  const currentOrderId = request.nextUrl.searchParams.get('current_order_id');

  const result = await fetchItemPurchaseHistory({
    bouquetId,
    size,
    currentOrderId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data);
}
