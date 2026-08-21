import 'server-only';

import { getSupabaseAdmin } from '@/lib/supabase/server';
import { CLAIMABLE_OFFLINE_STATUSES } from './eligibility';
import { getDataManagerIngestConfig, ingestDataManagerEvents } from './dataManager';
import { isMissingAttributionRelationError } from './store';

const MAX_ATTEMPTS = 8;
const BATCH_SIZE = 50;
const MIN_RETRY_GAP_MS = 90_000;

type QueueRow = {
  order_id: string;
  status: string;
  attempts: number | null;
  last_attempt_at: string | null;
};

type OrderClickRow = {
  order_id: string;
  paid_at: string | null;
  grand_total: number | null;
  gclid: string | null;
  gbraid: string | null;
  wbraid: string | null;
  order_json: Record<string, unknown> | null;
};

function backoffReady(row: QueueRow, nowMs: number): boolean {
  if (row.last_attempt_at == null) return true;
  const last = Date.parse(row.last_attempt_at);
  if (!Number.isFinite(last)) return true;
  const attempts = Math.max(0, row.attempts ?? 0);
  const gap = MIN_RETRY_GAP_MS * Math.max(1, Math.min(attempts, 6));
  return nowMs - last >= gap;
}

function currencyFromOrder(row: OrderClickRow): string {
  const fromJson = row.order_json && typeof row.order_json.currency === 'string'
    ? row.order_json.currency.trim()
    : '';
  return fromJson || 'THB';
}

function clickIds(row: OrderClickRow): { gclid?: string; gbraid?: string; wbraid?: string } | null {
  const gclid = row.gclid?.trim();
  const gbraid = row.gbraid?.trim();
  const wbraid = row.wbraid?.trim();
  if (!gclid && !gbraid && !wbraid) return null;
  return {
    ...(gclid ? { gclid } : {}),
    ...(gbraid ? { gbraid } : {}),
    ...(wbraid ? { wbraid } : {}),
  };
}

export async function uploadPendingGoogleAdsOfflineConversions(): Promise<{
  ok: true;
  skipped?: string;
  claimed?: number;
  sent?: number;
  failed?: number;
}> {
  const config = await getDataManagerIngestConfig();
  if (!config) {
    return { ok: true, skipped: 'not_configured' };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { ok: true, skipped: 'no_supabase' };
  }

  const { data: queued, error: queueError } = await supabase
    .from('google_ads_offline_conversions')
    .select('order_id, status, attempts, last_attempt_at')
    .in('status', CLAIMABLE_OFFLINE_STATUSES)
    .lt('attempts', MAX_ATTEMPTS)
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (queueError) {
    if (isMissingAttributionRelationError(queueError)) {
      return { ok: true, skipped: 'missing_table' };
    }
    throw new Error(queueError.message);
  }

  const nowMs = Date.now();
  const due = ((queued ?? []) as QueueRow[]).filter((row) => backoffReady(row, nowMs));
  if (due.length === 0) {
    return { ok: true, claimed: 0, sent: 0, failed: 0 };
  }

  const claimed: QueueRow[] = [];
  for (const row of due) {
    const nextAttempts = (row.attempts ?? 0) + 1;
    const { data, error } = await supabase
      .from('google_ads_offline_conversions')
      .update({
        attempts: nextAttempts,
        last_attempt_at: new Date(nowMs).toISOString(),
        last_error: null,
      })
      .eq('order_id', row.order_id)
      .in('status', CLAIMABLE_OFFLINE_STATUSES)
      .select('order_id, status, attempts, last_attempt_at')
      .maybeSingle();
    if (error || !data) continue;
    claimed.push(data as QueueRow);
  }

  if (claimed.length === 0) {
    return { ok: true, claimed: 0, sent: 0, failed: 0 };
  }

  const orderIds = claimed.map((r) => r.order_id);
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('order_id, paid_at, grand_total, gclid, gbraid, wbraid, order_json')
    .in('order_id', orderIds);

  if (ordersError) {
    throw new Error(ordersError.message);
  }

  const orderById = new Map(((orders ?? []) as OrderClickRow[]).map((o) => [o.order_id, o]));
  const events: Array<{
    orderId: string;
    transactionId: string;
    eventTimestamp: string;
    conversionValue: number;
    currency: string;
    gclid?: string;
    gbraid?: string;
    wbraid?: string;
  }> = [];

  for (const row of claimed) {
    const order = orderById.get(row.order_id);
    const ids = order ? clickIds(order) : null;
    const value = Number(order?.grand_total ?? 0);
    if (!order || !ids || !Number.isFinite(value) || value <= 0) {
      await supabase
        .from('google_ads_offline_conversions')
        .update({
          status: 'not_applicable',
          last_error: 'missing_click_id_or_value',
        })
        .eq('order_id', row.order_id);
      continue;
    }
    const paidAt = order.paid_at?.trim();
    events.push({
      orderId: row.order_id,
      transactionId: row.order_id,
      eventTimestamp: paidAt || new Date(nowMs).toISOString(),
      conversionValue: value,
      currency: currencyFromOrder(order),
      ...ids,
    });
  }

  if (events.length === 0) {
    return { ok: true, claimed: claimed.length, sent: 0, failed: 0 };
  }

  try {
    const { requestId } = await ingestDataManagerEvents(config, events);
    const sentAt = new Date().toISOString();
    for (const ev of events) {
      await supabase
        .from('google_ads_offline_conversions')
        .update({
          status: 'sent',
          sent_at: sentAt,
          last_error: null,
          request_id: requestId,
        })
        .eq('order_id', ev.orderId);
    }
    return { ok: true, claimed: claimed.length, sent: events.length, failed: 0 };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ingest_failed';
    for (const ev of events) {
      const claimedRow = claimed.find((c) => c.order_id === ev.orderId);
      const attempts = claimedRow?.attempts ?? 1;
      await supabase
        .from('google_ads_offline_conversions')
        .update({
          status: attempts >= MAX_ATTEMPTS ? 'failed' : 'retry',
          last_error: message.slice(0, 500),
        })
        .eq('order_id', ev.orderId);
    }
    return { ok: true, claimed: claimed.length, sent: 0, failed: events.length };
  }
}
