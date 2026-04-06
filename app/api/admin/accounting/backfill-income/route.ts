import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { upsertOrderIncome } from '@/lib/accounting/upsertOrderIncome';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel: allow up to 60s for backfill

/**
 * POST /api/admin/accounting/backfill-income
 *
 * Scans ALL orders in Supabase where payment_status = 'PAID' and creates
 * missing income_records. Existing records (matched by UNIQUE order_id) are
 * skipped automatically. The operation is fully idempotent and safe to run
 * multiple times.
 *
 * Optional body: { dryRun: true } — lists what would be created without inserting.
 */
export async function POST(request: NextRequest) {
  const authResult = await requireRole(['OWNER']);
  if (!authResult.ok) return authResult.response;
  const { session } = authResult;

  let dryRun = false;
  try {
    const body = await request.json().catch(() => ({}));
    dryRun = body?.dryRun === true;
  } catch { /* ignore */ }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  // 1. Fetch all paid orders
  const { data: paidOrders, error: fetchError } = await supabase
    .from('orders')
    .select('order_id, payment_method, grand_total, items_total, stripe_payment_intent_id, paid_at')
    .eq('payment_status', 'PAID');

  if (fetchError) {
    console.error('[backfill-income] fetch orders error:', fetchError.message);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const orders = paidOrders ?? [];
  if (orders.length === 0) {
    return NextResponse.json({ message: 'No paid orders found', created: 0, skipped: 0, total: 0 });
  }

  // 2. Fetch existing income record order_ids (to show skipped count in dry-run)
  const { data: existingIncome } = await supabase
    .from('income_records')
    .select('order_id')
    .not('order_id', 'is', null);

  const existingOrderIds = new Set(
    (existingIncome ?? []).map((r: { order_id: string }) => r.order_id).filter(Boolean)
  );

  const toProcess = orders.filter((o) => !existingOrderIds.has(o.order_id));
  const alreadySkipped = orders.length - toProcess.length;

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      total:          orders.length,
      wouldCreate:    toProcess.length,
      wouldSkip:      alreadySkipped,
      preview:        toProcess.slice(0, 20).map((o) => ({
        order_id:     o.order_id,
        amount:       o.grand_total ?? o.items_total ?? 0,
        payment_method: o.payment_method,
      })),
    });
  }

  // 3. Process each order that needs an income record
  let created = 0;
  let failed  = 0;
  const errors: string[] = [];
  const createdBy = `admin:${session.user.email ?? 'unknown'}:backfill`;

  for (const order of toProcess) {
    const amount = parseFloat(String(order.grand_total ?? order.items_total ?? 0)) || 0;
    if (amount <= 0) {
      console.warn('[backfill-income] Skipping order with zero amount:', order.order_id);
      continue;
    }

    const { created: didCreate, error } = await upsertOrderIncome({
      orderId:               order.order_id,
      amount,
      currency:              'THB',
      paymentMethod:         order.payment_method,
      stripePaymentIntentId: order.stripe_payment_intent_id ?? null,
      createdBy,
    }).then(() => ({ created: true, error: undefined }))
      .catch((e) => ({ created: false, error: String(e) }));

    if (didCreate === false && error) {
      failed++;
      errors.push(`${order.order_id}: ${error}`);
    } else {
      created++;
    }
  }

  console.log('[backfill-income] complete', {
    total: orders.length,
    created,
    skipped: alreadySkipped,
    failed,
  });

  return NextResponse.json({
    message:  `Backfill complete. Created: ${created}, Skipped: ${alreadySkipped + (toProcess.length - created - failed)}, Failed: ${failed}`,
    total:    orders.length,
    created,
    skipped:  alreadySkipped,
    failed,
    errors:   errors.length > 0 ? errors.slice(0, 10) : undefined,
  });
}
