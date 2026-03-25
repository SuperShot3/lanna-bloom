import 'server-only';

import { getSupabaseAdmin } from '@/lib/supabase/server';
import { updateOrderLinePush } from '@/lib/orders';
import { logLineIntegrationEvent } from '@/lib/line-integration/log';

export interface PendingPaymentNotificationRow {
  id: string;
  order_id: string;
  line_user_id: string;
  public_order_url: string;
  created_at: string;
}

/**
 * Queue a payment-confirmed notification for the LINE agent (no LINE API on website).
 * Idempotent: skips if an undelivered row already exists for this order_id.
 */
export async function queuePaymentNotificationForAgent(
  orderId: string,
  lineUserId: string,
  publicOrderUrl: string
): Promise<{ queued: boolean }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.warn('[line-notifications] Supabase not configured; skip queue');
    return { queued: false };
  }

  const oid = orderId.trim();
  const uid = lineUserId.trim();
  if (!oid || !uid) return { queued: false };

  const { data: existing } = await supabase
    .from('line_agent_payment_notifications')
    .select('id')
    .eq('order_id', oid)
    .is('delivered_at', null)
    .maybeSingle();

  if (existing?.id) {
    return { queued: false };
  }

  const { error } = await supabase.from('line_agent_payment_notifications').insert({
    order_id: oid,
    line_user_id: uid,
    public_order_url: publicOrderUrl.trim(),
  });

  if (error) {
    console.error('[line-notifications] queue insert error:', error.message);
    return { queued: false };
  }

  await updateOrderLinePush(oid, {
    last_line_push_status: 'queued_agent',
    last_line_push_at: new Date().toISOString(),
  });

  return { queued: true };
}

export async function listPendingPaymentNotifications(
  limit = 50
): Promise<PendingPaymentNotificationRow[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('line_agent_payment_notifications')
    .select('id, order_id, line_user_id, public_order_url, created_at')
    .is('delivered_at', null)
    .order('created_at', { ascending: true })
    .limit(Math.min(100, Math.max(1, limit)));

  if (error) {
    console.error('[line-notifications] list pending error:', error.message);
    return [];
  }

  return (data ?? []) as PendingPaymentNotificationRow[];
}

export async function acknowledgePaymentNotifications(
  ids: string[]
): Promise<{ acknowledged: number }> {
  const supabase = getSupabaseAdmin();
  if (!supabase || !ids.length) return { acknowledged: 0 };

  const now = new Date().toISOString();
  const unique = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
  if (!unique.length) return { acknowledged: 0 };

  const { data: rows, error: fetchErr } = await supabase
    .from('line_agent_payment_notifications')
    .select('id, order_id')
    .in('id', unique)
    .is('delivered_at', null);

  if (fetchErr || !rows?.length) {
    return { acknowledged: 0 };
  }

  const { error: updErr } = await supabase
    .from('line_agent_payment_notifications')
    .update({ delivered_at: now })
    .in(
      'id',
      rows.map((r: { id: string }) => r.id)
    );

  if (updErr) {
    console.error('[line-notifications] ack update error:', updErr.message);
    return { acknowledged: 0 };
  }

  const rowList = rows as { order_id: string; id: string }[];
  for (const r of rowList) {
    await updateOrderLinePush(r.order_id, {
      last_line_push_status: 'delivered_by_agent',
      last_line_push_at: now,
    });
    void logLineIntegrationEvent('line_notify_acknowledged_by_agent', {
      orderId: r.order_id,
      extra: { notificationId: r.id },
    });
  }

  return { acknowledged: rows.length };
}
