import 'server-only';

import { getSupabaseAdmin } from '@/lib/supabase/server';
import { isSupabaseMissingColumnError } from '@/lib/supabase/columnErrors';
import { offlineConversionStatusForPaidOrder } from './eligibility';
import { getAttributionSessionById, isMissingAttributionRelationError } from './store';
import { sessionRowToSnapshot } from './rules';
import { isGoogleAdsAttributed } from './rules';

export async function enqueueGoogleAdsOfflineConversion(orderId: string): Promise<void> {
  const id = orderId.trim();
  if (!id) return;

  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(
      'order_id, payment_status, paid_at, grand_total, gclid, gbraid, wbraid, attribution_id',
    )
    .eq('order_id', id)
    .maybeSingle();

  if (orderError) {
    if (
      isMissingAttributionRelationError(orderError) ||
      isSupabaseMissingColumnError(orderError, 'attribution_id')
    ) {
      return;
    }
    console.error('[attribution] enqueue load order failed:', orderError.message);
    return;
  }
  if (!order) return;

  let googleClickAt: number | undefined;
  const attrId =
    typeof (order as { attribution_id?: string | null }).attribution_id === 'string'
      ? (order as { attribution_id: string }).attribution_id
      : null;
  if (attrId) {
    const session = await getAttributionSessionById(attrId);
    if (session) {
      const snap = sessionRowToSnapshot(session);
      if (isGoogleAdsAttributed(snap)) {
        googleClickAt = snap.googleClickAt;
      }
    }
  }

  const status = offlineConversionStatusForPaidOrder({
    paymentStatus: order.payment_status,
    paidAt: order.paid_at,
    grandTotal: order.grand_total,
    gclid: order.gclid,
    gbraid: order.gbraid,
    wbraid: order.wbraid,
    googleClickAt,
  });

  const { error } = await supabase.from('google_ads_offline_conversions').insert({
    order_id: id,
    status,
  });

  if (error) {
    if (error.code === '23505' || /duplicate key|unique constraint/i.test(String(error.message))) {
      return;
    }
    if (isMissingAttributionRelationError(error)) return;
    console.error('[attribution] enqueue insert failed:', error.message);
  }
}
