import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function GET() {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const { data, error } = await supabase
    .from('orders')
    .select('order_id, paid_at, created_at, payment_status, cogs_amount')
    .eq('payment_status', 'PAID')
    .or('cogs_amount.is.null,cogs_amount.lte.0')
    .order('paid_at', { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const orders = data ?? [];
  return NextResponse.json({
    count: orders.length,
    orders: orders.map((o) => ({
      order_id: o.order_id,
      paid_at: o.paid_at,
      cogs_amount: o.cogs_amount,
    })),
  });
}

