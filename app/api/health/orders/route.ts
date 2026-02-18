import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

const ENABLED =
  process.env.NODE_ENV === 'development' || process.env.HEALTH_CHECK_ENABLED === 'true';
const LIMIT = 10;

export async function GET() {
  if (!ENABLED) {
    return NextResponse.json({ error: 'Health check disabled' }, { status: 404 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: 'Supabase not configured', checks: [] },
      { status: 503 }
    );
  }

  const checks: { name: string; pass: boolean; detail?: string }[] = [];

  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('order_id, payment_status, paid_at')
      .order('created_at', { ascending: false })
      .limit(LIMIT);

    if (error) {
      checks.push({ name: 'fetch_orders', pass: false, detail: error.message });
      return NextResponse.json(
        { ok: false, error: 'Supabase query failed', checks },
        { status: 500 }
      );
    }

    const orderList = orders ?? [];
    checks.push({ name: 'fetch_orders', pass: true, detail: `Fetched ${orderList.length} orders` });

    let ordersWithItems = 0;
    let paidOrdersWithPaidAt = 0;
    let paidOrdersTotal = 0;

    for (const o of orderList) {
      const { data: items } = await supabase
        .from('order_items')
        .select('order_id')
        .eq('order_id', o.order_id)
        .limit(1);
      if (items && items.length > 0) ordersWithItems++;

      if (o.payment_status === 'PAID') {
        paidOrdersTotal++;
        if (o.paid_at) paidOrdersWithPaidAt++;
      }
    }

    const itemsPass = ordersWithItems === orderList.length;

    checks.push({
      name: 'orders_have_items',
      pass: itemsPass,
      detail: `${ordersWithItems}/${orderList.length} orders have items`,
    });

    const paidAtPass = paidOrdersTotal === 0 || paidOrdersWithPaidAt === paidOrdersTotal;
    checks.push({
      name: 'paid_orders_have_paid_at',
      pass: paidAtPass,
      detail: `${paidOrdersWithPaidAt}/${paidOrdersTotal} paid orders have paid_at`,
    });

    const ok = itemsPass && paidAtPass;

    return NextResponse.json({
      ok,
      checks,
      summary: {
        ordersChecked: orderList.length,
        ordersWithItems,
        paidOrdersTotal,
        paidOrdersWithPaidAt,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[health/orders] error:', msg);
    checks.push({ name: 'exception', pass: false, detail: msg });
    return NextResponse.json(
      { ok: false, error: msg, checks },
      { status: 500 }
    );
  }
}
