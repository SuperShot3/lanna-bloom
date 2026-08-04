import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import {
  ORDER_CHAT_MAX_BODY_LENGTH,
  ORDER_CHAT_RETENTION_AFTER_DELIVERY_MS,
} from './constants';
import type {
  OrderChatAdminState,
  OrderChatAvailability,
  OrderChatMessage,
  OrderChatSenderType,
  OrderChatUnreadSummary,
} from './types';

type MessageRow = {
  id: string;
  order_id: string;
  sender_type: string;
  body: string;
  created_at: string;
};

type AdminStateRow = {
  order_id: string;
  last_read_at: string | null;
  purge_after: string | null;
};

function mapMessage(row: MessageRow): OrderChatMessage {
  return {
    id: row.id,
    orderId: row.order_id,
    senderType: row.sender_type === 'admin' ? 'admin' : 'customer',
    body: row.body,
    createdAt: row.created_at,
  };
}

function mapAdminState(row: AdminStateRow): OrderChatAdminState {
  return {
    orderId: row.order_id,
    lastReadAt: row.last_read_at,
    purgeAfter: row.purge_after,
  };
}

export function sanitizeChatBody(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().replace(/\u0000/g, '');
  if (trimmed.length < 1 || trimmed.length > ORDER_CHAT_MAX_BODY_LENGTH) return null;
  return trimmed;
}

function purgeAfterIsoFromNow(now = Date.now()): string {
  return new Date(now + ORDER_CHAT_RETENTION_AFTER_DELIVERY_MS).toISOString();
}

async function getOrderStatus(orderId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('orders')
    .select('order_status')
    .eq('order_id', orderId)
    .maybeSingle();
  if (error || !data) return null;
  return typeof data.order_status === 'string' ? data.order_status.toUpperCase() : null;
}

export async function getChatAdminState(orderId: string): Promise<OrderChatAdminState | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('order_chat_admin_state')
    .select('order_id, last_read_at, purge_after')
    .eq('order_id', orderId)
    .maybeSingle();
  if (error || !data) return null;
  return mapAdminState(data as AdminStateRow);
}

/**
 * Ensure a DELIVERED order has purge_after set (lazy backfill for pre-feature deliveries).
 */
async function ensurePurgeScheduled(orderId: string): Promise<string> {
  const existing = await getChatAdminState(orderId);
  if (existing?.purgeAfter) return existing.purgeAfter;

  const purgeAfter = purgeAfterIsoFromNow();
  const supabase = getSupabaseAdmin();
  if (!supabase) return purgeAfter;

  await supabase.from('order_chat_admin_state').upsert(
    {
      order_id: orderId,
      purge_after: purgeAfter,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'order_id' }
  );
  return purgeAfter;
}

export async function getChatAvailability(orderId: string): Promise<OrderChatAvailability | null> {
  const status = await getOrderStatus(orderId);
  if (status == null) return null;

  if (status !== 'DELIVERED') {
    const state = await getChatAdminState(orderId);
    return {
      open: true,
      purgeAfter: state?.purgeAfter ?? null,
      orderStatus: status,
    };
  }

  const purgeAfter = await ensurePurgeScheduled(orderId);
  const open = Date.now() < new Date(purgeAfter).getTime();
  return { open, purgeAfter, orderStatus: status };
}

export async function listChatMessages(orderId: string): Promise<OrderChatMessage[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('order_chat_messages')
    .select('id, order_id, sender_type, body, created_at')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })
    .limit(500);
  if (error || !data) {
    if (error) console.error('[orderChat] list error:', error.message);
    return [];
  }
  return (data as MessageRow[]).map(mapMessage);
}

export async function sendChatMessage(
  orderId: string,
  senderType: OrderChatSenderType,
  body: string
): Promise<OrderChatMessage | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('order_chat_messages')
    .insert({
      order_id: orderId,
      sender_type: senderType,
      body,
    })
    .select('id, order_id, sender_type, body, created_at')
    .single();

  if (error || !data) {
    console.error('[orderChat] send error:', error?.message);
    return null;
  }

  // Ensure admin_state row exists so unread aggregation works
  if (senderType === 'customer') {
    await supabase.from('order_chat_admin_state').upsert(
      {
        order_id: orderId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'order_id', ignoreDuplicates: true }
    );
  }

  return mapMessage(data as MessageRow);
}

export async function markAdminChatRead(orderId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  const now = new Date().toISOString();
  await supabase.from('order_chat_admin_state').upsert(
    {
      order_id: orderId,
      last_read_at: now,
      updated_at: now,
    },
    { onConflict: 'order_id' }
  );
}

/** Called when order becomes DELIVERED — start 2h retention clock. */
export async function schedulePurgeAfterDelivery(orderId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  const now = new Date().toISOString();
  const purgeAfter = purgeAfterIsoFromNow();
  await supabase.from('order_chat_admin_state').upsert(
    {
      order_id: orderId,
      purge_after: purgeAfter,
      updated_at: now,
    },
    { onConflict: 'order_id' }
  );
}

/** If status moves away from DELIVERED, clear purge so the thread stays open. */
export async function clearPurgeAfter(orderId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  await supabase
    .from('order_chat_admin_state')
    .update({ purge_after: null, updated_at: new Date().toISOString() })
    .eq('order_id', orderId);
}

export async function purgeExpiredChats(now = new Date()): Promise<{
  purgedOrders: number;
  deletedMessages: number;
}> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { purgedOrders: 0, deletedMessages: 0 };

  const nowIso = now.toISOString();
  const { data: expired, error } = await supabase
    .from('order_chat_admin_state')
    .select('order_id')
    .lte('purge_after', nowIso)
    .not('purge_after', 'is', null);

  if (error) {
    console.error('[orderChat] purge list error:', error.message);
    return { purgedOrders: 0, deletedMessages: 0 };
  }

  const orderIds = (expired ?? []).map((r) => String(r.order_id)).filter(Boolean);
  if (orderIds.length === 0) return { purgedOrders: 0, deletedMessages: 0 };

  const { data: deletedMsgs, error: msgErr } = await supabase
    .from('order_chat_messages')
    .delete()
    .in('order_id', orderIds)
    .select('id');

  if (msgErr) {
    console.error('[orderChat] purge messages error:', msgErr.message);
  }

  const { error: stateErr } = await supabase
    .from('order_chat_admin_state')
    .delete()
    .in('order_id', orderIds);

  if (stateErr) {
    console.error('[orderChat] purge state error:', stateErr.message);
  }

  return {
    purgedOrders: orderIds.length,
    deletedMessages: deletedMsgs?.length ?? 0,
  };
}

export async function getUnreadChatSummary(): Promise<OrderChatUnreadSummary> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { totalUnreadOrders: 0, byOrderId: {} };

  const nowIso = new Date().toISOString();

  // Active threads: no purge_after, or purge_after still in the future
  const { data: states, error: stateErr } = await supabase
    .from('order_chat_admin_state')
    .select('order_id, last_read_at, purge_after');

  if (stateErr) {
    console.error('[orderChat] unread states error:', stateErr.message);
    return { totalUnreadOrders: 0, byOrderId: {} };
  }

  const activeStates = (states ?? []).filter((s) => {
    if (s.purge_after == null) return true;
    return String(s.purge_after) > nowIso;
  }) as AdminStateRow[];

  if (activeStates.length === 0) return { totalUnreadOrders: 0, byOrderId: {} };

  const orderIds = activeStates.map((s) => s.order_id);
  const lastReadByOrder = new Map(
    activeStates.map((s) => [s.order_id, s.last_read_at ?? '1970-01-01T00:00:00.000Z'])
  );

  const { data: messages, error: msgErr } = await supabase
    .from('order_chat_messages')
    .select('order_id, created_at')
    .in('order_id', orderIds)
    .eq('sender_type', 'customer');

  if (msgErr) {
    console.error('[orderChat] unread messages error:', msgErr.message);
    return { totalUnreadOrders: 0, byOrderId: {} };
  }

  const byOrderId: Record<string, number> = {};
  for (const msg of messages ?? []) {
    const oid = String(msg.order_id);
    const lastRead = lastReadByOrder.get(oid) ?? '1970-01-01T00:00:00.000Z';
    if (String(msg.created_at) > lastRead) {
      byOrderId[oid] = (byOrderId[oid] ?? 0) + 1;
    }
  }

  const totalUnreadOrders = Object.keys(byOrderId).length;
  return { totalUnreadOrders, byOrderId };
}
