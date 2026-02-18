import { NextRequest, NextResponse } from 'next/server';
import { getOrderById, listOrders } from '@/lib/orders';
import { getSupabaseAdmin } from '@/lib/supabase/server';

function isAdminAuthorized(request: NextRequest): boolean {
  const secret = process.env.ORDERS_ADMIN_SECRET;
  if (!secret) return process.env.NODE_ENV === 'development';
  const header =
    request.headers.get('x-admin-secret') ??
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  return header === secret;
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const orderId = request.nextUrl.searchParams.get('orderId')?.trim();
  const limit = Math.min(
    20,
    Math.max(1, parseInt(request.nextUrl.searchParams.get('limit') ?? '10', 10))
  );

  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({
        error: 'Supabase not configured',
        hint: 'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY',
      }, { status: 503 });
    }

    if (orderId) {
      const legacyOrder = await getOrderById(orderId);
      const { data: supabaseOrder, error } = await supabase
        .from('orders')
        .select('*')
        .eq('order_id', orderId)
        .single();

      if (error && error.code !== 'PGRST116') {
        return NextResponse.json({
          error: 'Supabase query failed',
          message: error.message,
        }, { status: 500 });
      }

      const match =
        legacyOrder &&
        supabaseOrder &&
        String(legacyOrder.pricing?.grandTotal ?? 0) ===
          String(supabaseOrder.grand_total ?? 0) &&
        (legacyOrder.status === 'paid') === (supabaseOrder.payment_status === 'PAID');

      return NextResponse.json({
        orderId,
        legacy: legacyOrder
          ? {
              orderId: legacyOrder.orderId,
              grandTotal: legacyOrder.pricing?.grandTotal,
              status: legacyOrder.status,
              deliveryWindow: legacyOrder.delivery?.preferredTimeSlot,
            }
          : null,
        supabase: supabaseOrder
          ? {
              order_id: supabaseOrder.order_id,
              grand_total: supabaseOrder.grand_total,
              payment_status: supabaseOrder.payment_status,
              order_status: supabaseOrder.order_status,
              delivery_window: supabaseOrder.delivery_window,
            }
          : null,
        match,
      });
    }

    const legacyOrders = await listOrders();
    const legacySlice = legacyOrders.slice(0, limit);

    const { data: supabaseOrders, error } = await supabase
      .from('orders')
      .select('order_id, grand_total, payment_status, order_status, delivery_window, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({
        error: 'Supabase query failed',
        message: error.message,
      }, { status: 500 });
    }

    const legacyIds = new Set(legacySlice.map((o) => o.orderId));
    const supabaseIds = new Set((supabaseOrders ?? []).map((o) => o.order_id));

    const matches: string[] = [];
    const mismatches: { orderId: string; reason: string }[] = [];
    const legacyOnly: string[] = [];
    const supabaseOnly: string[] = [];

    for (const leg of legacySlice) {
      const sup = (supabaseOrders ?? []).find((s) => s.order_id === leg.orderId);
      if (!sup) {
        legacyOnly.push(leg.orderId);
        continue;
      }
      const legPaid = leg.status === 'paid';
      const supPaid = sup.payment_status === 'PAID';
      const legTotal = leg.pricing?.grandTotal ?? 0;
      const supTotal = sup.grand_total ?? 0;
      if (legPaid === supPaid && Math.abs(legTotal - supTotal) < 0.01) {
        matches.push(leg.orderId);
      } else {
        mismatches.push({
          orderId: leg.orderId,
          reason: `legacy paid=${legPaid} total=${legTotal} vs supabase paid=${supPaid} total=${supTotal}`,
        });
      }
    }

    for (const sup of supabaseOrders ?? []) {
      if (!legacyIds.has(sup.order_id)) {
        supabaseOnly.push(sup.order_id);
      }
    }

    return NextResponse.json({
      legacy: legacySlice.map((o) => ({
        orderId: o.orderId,
        grandTotal: o.pricing?.grandTotal,
        status: o.status,
      })),
      supabase: supabaseOrders ?? [],
      matches,
      mismatches,
      legacyOnly,
      supabaseOnly,
    });
  } catch (e) {
    console.error('[verify-supabase] error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
