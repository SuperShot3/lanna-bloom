/**
 * Backend order and payment status enums.
 * Customer-facing text is derived from order_status via orderStatusToCustomerLabel.
 */

export const ORDER_STATUS = [
  'NEW',
  'ACCEPTED',
  'PREPARING',
  'READY_FOR_DELIVERY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
] as const;

export type OrderStatus = (typeof ORDER_STATUS)[number];

/**
 * Payment status values must match the DB constraint `orders_payment_status_check`.
 *
 * NOTE: The admin UI previously exposed READY_TO_PAY, but the database constraint does not
 * allow it. Keeping the enum aligned prevents “it saves but DB rejects” behavior.
 */
export const PAYMENT_STATUS = ['NOT_PAID', 'PAID', 'CANCELLED', 'ERROR'] as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[number];

/** Display labels for admin (dropdowns, badges, filters). */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: 'New',
  ACCEPTED: 'Accepted',
  PREPARING: 'Preparing',
  READY_FOR_DELIVERY: 'Ready for delivery',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  // Semantics: order exists but no confirmed payment yet.
  NOT_PAID: 'Pending payment',
  PAID: 'Paid',
  CANCELLED: 'Cancelled',
  ERROR: 'Error',
};

/** Customer-facing fulfillment-style label derived from order_status (no separate fulfillment field). */
export function orderStatusToCustomerLabel(status: string | null | undefined): string {
  if (!status) return 'New';
  const s = String(status).toUpperCase();
  const map: Record<string, string> = {
    NEW: 'New',
    ACCEPTED: 'Accepted',
    PREPARING: 'Preparing',
    READY_FOR_DELIVERY: 'Ready for delivery',
    OUT_FOR_DELIVERY: 'Out for delivery',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
  };
  const normalized = OLD_ORDER_STATUS_TO_NEW[s] ?? (ORDER_STATUS.includes(s as OrderStatus) ? (s as OrderStatus) : undefined);
  return normalized ? map[normalized] : status;
}

/**
 * Map backend order_status to a display key for customer order page (badge class and i18n).
 * Used when fulfillment_status is no longer stored; customer UI derives from order_status.
 */
export function orderStatusToFulfillmentDisplay(status: string | null | undefined): string {
  if (!status) return 'new';
  const upper = String(status).trim().toUpperCase();
  // Normalize legacy values (e.g. READY_TO_DISPATCH -> READY_FOR_DELIVERY)
  const normalized = OLD_ORDER_STATUS_TO_NEW[upper] ?? upper;
  const map: Record<string, string> = {
    NEW: 'new',
    ACCEPTED: 'accepted',
    PREPARING: 'preparing',
    READY_FOR_DELIVERY: 'ready_for_delivery',
    OUT_FOR_DELIVERY: 'out_for_delivery',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
  };
  return map[normalized] ?? 'new';
}

/** Format order status for display (admin badges/tables). */
export function formatOrderStatus(status: string | null | undefined): string {
  if (!status) return '—';
  const s = String(status).toUpperCase();
  return ORDER_STATUS_LABELS[s as OrderStatus] ?? status.replace(/_/g, ' ');
}

/** Format payment status for display. */
export function formatPaymentStatus(status: string | null | undefined): string {
  if (!status) return '—';
  const s = String(status).toUpperCase();
  return PAYMENT_STATUS_LABELS[s as PaymentStatus] ?? status;
}

/** Map old order_status values to new enum (for migration and backward compat). */
export const OLD_ORDER_STATUS_TO_NEW: Record<string, OrderStatus> = {
  NEW: 'NEW',
  PAID: 'NEW',
  PROCESSING: 'PREPARING',
  ACCEPTED: 'ACCEPTED',
  ORDER_ACCEPTED: 'ACCEPTED',
  PREPARING: 'PREPARING',
  READY_TO_DISPATCH: 'READY_FOR_DELIVERY',
  READY_FOR_DISPATCH: 'READY_FOR_DELIVERY',
  READY_FOR_DELIVERY: 'READY_FOR_DELIVERY',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DISPATCHED: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  CANCELED: 'CANCELLED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'CANCELLED',
};

/** Map old payment_status to new enum. */
export const OLD_PAYMENT_STATUS_TO_NEW: Record<string, PaymentStatus> = {
  PENDING: 'NOT_PAID',
  NOT_PAID: 'NOT_PAID',
  READY_TO_PAY: 'NOT_PAID',
  PAID: 'PAID',
  FAILED: 'ERROR',
  ERROR: 'ERROR',
  CANCELLED: 'CANCELLED',
};

export function normalizeOrderStatus(value: string | null | undefined): OrderStatus {
  if (!value) return 'NEW';
  const upper = String(value).trim().toUpperCase();
  return OLD_ORDER_STATUS_TO_NEW[upper] ?? (ORDER_STATUS.includes(upper as OrderStatus) ? (upper as OrderStatus) : 'NEW');
}

export function normalizePaymentStatus(value: string | null | undefined): PaymentStatus {
  if (!value) return 'NOT_PAID';
  const upper = String(value).trim().toUpperCase();
  return OLD_PAYMENT_STATUS_TO_NEW[upper] ?? (PAYMENT_STATUS.includes(upper as PaymentStatus) ? (upper as PaymentStatus) : 'NOT_PAID');
}
