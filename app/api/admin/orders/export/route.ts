import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/adminRbac';
import { getOrdersForExport } from '@/lib/supabase/adminQueries';
import type { OrdersFilters } from '@/lib/supabase/adminQueries';

function escapeCsv(value: string | number | null | undefined): string {
  if (value == null) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult.response;

  const { searchParams } = request.nextUrl;
  const filters: OrdersFilters = {
    orderId: searchParams.get('orderId')?.trim() || undefined,
    recipientPhone: searchParams.get('recipientPhone')?.trim() || undefined,
    orderStatus: searchParams.get('orderStatus') || undefined,
    paymentStatus: (searchParams.get('paymentStatus') as 'paid' | 'unpaid') || undefined,
    district: searchParams.get('district') || undefined,
    deliveryDateFrom: searchParams.get('deliveryDateFrom') || undefined,
    deliveryDateTo: searchParams.get('deliveryDateTo') || undefined,
  };

  const orders = await getOrdersForExport(filters);

  const headers = [
    'order_id',
    'customer_name',
    'customer_email',
    'recipient_name',
    'recipient_phone',
    'address',
    'district',
    'delivery_date',
    'delivery_window',
    'order_status',
    'payment_status',
    'grand_total',
    'total_amount',
    'cogs_amount',
    'delivery_cost',
    'payment_fee',
    'paid_at',
    'created_at',
  ];

  const rows = orders.map((o) =>
    headers
      .map((h) => {
        const v = (o as unknown as Record<string, unknown>)[h];
        return escapeCsv(v as string | number | null | undefined);
      })
      .join(',')
  );

  const csv = [headers.join(','), ...rows].join('\n');
  const filename = `orders-export-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
