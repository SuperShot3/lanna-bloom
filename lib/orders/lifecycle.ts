import { orderStatusToFulfillmentDisplay } from './statusConstants';

export const ORDER_LIFECYCLE_STATUSES = [
  'order_received',
  'payment_confirmed',
  'order_accepted',
  'preparing',
  'ready_for_delivery',
  'out_for_delivery',
  'delivered',
] as const;

export type OrderLifecycleStatus = (typeof ORDER_LIFECYCLE_STATUSES)[number];
export type OrderStatusTimestamps = Partial<Record<OrderLifecycleStatus, string | null | undefined>>;

export type OrderStatusHistoryEntry = {
  to_status?: string | null;
  created_at?: string | null;
};

function normalizeStatusKey(status: string | null | undefined): string {
  return String(status ?? '').trim().toLowerCase();
}

export function getCurrentOrderLifecycleStatus(
  fulfillmentStatus: string | undefined,
  paid: boolean,
): OrderLifecycleStatus {
  const status = normalizeStatusKey(fulfillmentStatus);
  if (status === 'delivered') return 'delivered';
  if (status === 'dispatched' || status === 'out_for_delivery') return 'out_for_delivery';
  if (
    status === 'ready_to_dispatch' ||
    status === 'ready_for_dispatch' ||
    status === 'ready_for_delivery'
  ) {
    return 'ready_for_delivery';
  }
  if (status === 'preparing' || status === 'processing') return 'preparing';
  if (status === 'confirmed' || status === 'accepted' || status === 'order_accepted') {
    return 'order_accepted';
  }
  return paid ? 'payment_confirmed' : 'order_received';
}

export function lifecycleStatusFromStoredStatus(
  status: string | null | undefined,
): OrderLifecycleStatus | null {
  const upper = String(status ?? '').trim().toUpperCase();
  if (!upper) return null;
  if (upper === 'PAID') return 'payment_confirmed';
  if (upper === 'NEW') return 'order_received';

  const displayStatus = orderStatusToFulfillmentDisplay(upper);
  if (displayStatus === 'accepted' || displayStatus === 'confirmed') return 'order_accepted';
  if (displayStatus === 'preparing') return 'preparing';
  if (displayStatus === 'ready_for_delivery' || displayStatus === 'ready_to_dispatch') {
    return 'ready_for_delivery';
  }
  if (displayStatus === 'out_for_delivery' || displayStatus === 'dispatched') {
    return 'out_for_delivery';
  }
  if (displayStatus === 'delivered') return 'delivered';
  if (displayStatus === 'new') return 'order_received';
  return null;
}

export function getLifecycleTimestampForStatus(
  timestamps: OrderStatusTimestamps,
  status: OrderLifecycleStatus,
): string | null {
  return timestamps[status] ?? null;
}

export function buildOrderLifecycleTimestamps({
  orderCreatedAt,
  paidAt,
  statusHistory = [],
  fulfillmentStatus,
  currentStatus,
  fallbackUpdatedAt,
}: {
  orderCreatedAt?: string | null;
  paidAt?: string | null;
  statusHistory?: OrderStatusHistoryEntry[];
  fulfillmentStatus?: string;
  currentStatus: OrderLifecycleStatus;
  fallbackUpdatedAt?: string | null;
}): OrderStatusTimestamps {
  const timestamps: OrderStatusTimestamps = {
    order_received: orderCreatedAt ?? null,
    payment_confirmed: paidAt ?? null,
    order_accepted: null,
    preparing: null,
    ready_for_delivery: null,
    out_for_delivery: null,
    delivered: null,
  };

  for (const entry of statusHistory) {
    const key = lifecycleStatusFromStoredStatus(entry.to_status);
    if (!key || !entry.created_at) continue;
    if (key === 'order_received' && timestamps.order_received) continue;
    timestamps[key] = entry.created_at;
  }

  const fallbackStatus = lifecycleStatusFromStoredStatus(fulfillmentStatus) ?? currentStatus;
  if (fallbackUpdatedAt && fallbackStatus && !timestamps[fallbackStatus]) {
    timestamps[fallbackStatus] = fallbackUpdatedAt;
  }

  return timestamps;
}
