import 'server-only';
/**
 * Order store — Supabase is the single source of truth.
 * Blob is legacy; all reads/writes go through Supabase.
 */

import type { Order, OrderPayload } from './types';
import { generateOrderId } from './orderId';
import * as supabaseStore from './supabaseStore';
import { getSupabaseAdmin } from '@/lib/supabase/server';

function requireSupabase() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error(
      'Supabase is required for orders. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    );
  }
  return supabase;
}

export { generateOrderId };

export async function getOrderById(orderId: string): Promise<Order | null> {
  requireSupabase();
  return supabaseStore.supabaseGetOrderById(orderId);
}

export async function getOrderByStripeSessionId(stripeSessionId: string): Promise<Order | null> {
  requireSupabase();
  return supabaseStore.supabaseGetOrderByStripeSessionId(stripeSessionId);
}

export async function createOrder(
  payload: OrderPayload
): Promise<{ order: Order; created: boolean }> {
  requireSupabase();
  return supabaseStore.supabaseCreateOrder(payload);
}

export async function createPendingOrder(
  payload: OrderPayload
): Promise<{ order: Order; created: boolean }> {
  requireSupabase();
  return supabaseStore.supabaseCreateOrder(payload, 'pending_payment');
}

export async function updateOrderPaymentStatus(
  orderId: string,
  update: {
    status: 'paid' | 'payment_failed';
    stripeSessionId?: string;
    paymentIntentId?: string;
    amountTotal?: number;
    currency?: string;
    paidAt?: string;
  }
): Promise<Order | null> {
  requireSupabase();
  return supabaseStore.supabaseUpdateOrderPaymentStatus(orderId, update);
}

export async function deleteOrder(orderId: string): Promise<boolean> {
  requireSupabase();
  return supabaseStore.supabaseDeleteOrder(orderId);
}

export async function listOrders(): Promise<Order[]> {
  requireSupabase();
  return supabaseStore.supabaseListOrders();
}

export async function updateOrderLinePush(
  orderId: string,
  patch: { last_line_push_status: string; last_line_push_at: string }
): Promise<void> {
  requireSupabase();
  return supabaseStore.supabaseUpdateOrderLinePush(orderId, patch);
}

export async function listOrdersByLineUserId(lineUserId: string, limit = 5): Promise<Order[]> {
  requireSupabase();
  return supabaseStore.supabaseListOrdersByLineUserId(lineUserId, limit);
}
