import 'server-only';
/**
 * Order store router. Supabase is single source of truth when configured.
 *
 * ORDERS_PRIMARY_STORE = "supabase" | "blob" (default: "supabase" when Supabase configured)
 * ORDERS_READ_FALLBACK = "blob" | "none" (default: "none" — no Blob fallback)
 */

import type { Order, OrderPayload } from './types';
import * as blobStore from './blobStore';
import * as supabaseStore from './supabaseStore';
import { getSupabaseAdmin } from '@/lib/supabase/server';

function getPrimaryStore(): 'supabase' | 'blob' {
  const env = process.env.ORDERS_PRIMARY_STORE?.toLowerCase().trim();
  if (env === 'blob') return 'blob';
  if (env === 'supabase') return 'supabase';
  // Default: supabase if configured, else blob
  return getSupabaseAdmin() ? 'supabase' : 'blob';
}

function getReadFallback(): 'blob' | 'none' {
  const env = process.env.ORDERS_READ_FALLBACK?.toLowerCase().trim();
  if (env === 'blob') return 'blob';
  return 'none'; // default: Supabase only, no Blob fallback
}

export function generateOrderId(): string {
  return blobStore.generateOrderId();
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  const primary = getPrimaryStore();
  const fallback = getReadFallback();

  if (primary === 'supabase') {
    const order = await supabaseStore.supabaseGetOrderById(orderId);
    if (order) return order;
    if (fallback === 'blob') {
      const blobOrder = await blobStore.blobGetOrderById(orderId);
      if (blobOrder) {
        // Auto-backfill: copy from Blob to Supabase in background
        void supabaseStore.supabaseUpsertOrder(blobOrder).catch((e) => {
          console.error('[orders/router] Auto-backfill failed:', e);
        });
        return blobOrder;
      }
    }
    return null;
  }

  // primary === 'blob'
  return blobStore.blobGetOrderById(orderId);
}

export async function getOrderByStripeSessionId(stripeSessionId: string): Promise<Order | null> {
  const primary = getPrimaryStore();
  const fallback = getReadFallback();

  if (primary === 'supabase') {
    const order = await supabaseStore.supabaseGetOrderByStripeSessionId(stripeSessionId);
    if (order) return order;
    if (fallback === 'blob') {
      return blobStore.blobGetOrderByStripeSessionId(stripeSessionId);
    }
    return null;
  }

  return blobStore.blobGetOrderByStripeSessionId(stripeSessionId);
}

export async function createOrder(payload: OrderPayload): Promise<Order> {
  const primary = getPrimaryStore();

  if (primary === 'supabase') {
    return supabaseStore.supabaseCreateOrder(payload);
  }

  const order = await blobStore.blobCreateOrder(payload);
  void import('@/lib/supabase/orderAdapter').then(({ dualWriteOrder }) =>
    dualWriteOrder(order).catch(() => {})
  );
  return order;
}

export async function createPendingOrder(payload: OrderPayload): Promise<Order> {
  const primary = getPrimaryStore();

  if (primary === 'supabase') {
    return supabaseStore.supabaseCreateOrder(payload, 'pending_payment');
  }

  const order = await blobStore.blobCreateOrder(payload, 'pending_payment');
  void import('@/lib/supabase/orderAdapter').then(({ dualWriteOrder }) =>
    dualWriteOrder(order).catch(() => {})
  );
  return order;
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
  const primary = getPrimaryStore();

  if (primary === 'supabase') {
    return supabaseStore.supabaseUpdateOrderPaymentStatus(orderId, update);
  }

  return blobStore.blobUpdateOrderPaymentStatus(orderId, update);
}

export async function deleteOrder(orderId: string): Promise<boolean> {
  const primary = getPrimaryStore();

  if (primary === 'supabase') {
    return supabaseStore.supabaseDeleteOrder(orderId);
  }

  return blobStore.blobDeleteOrder(orderId);
}

export async function listOrders(): Promise<Order[]> {
  const primary = getPrimaryStore();

  if (primary === 'supabase') {
    return supabaseStore.supabaseListOrders();
  }

  return blobStore.blobListOrders();
}
