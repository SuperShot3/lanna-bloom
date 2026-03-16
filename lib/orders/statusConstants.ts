/**
 * Backend order and payment status enums.
 * Customer-facing text is derived from order_status via orderStatusToCustomerLabel.
 */

export const ORDER_STATUS = [
  'NEW',
  'PROCESSING',
  'READY_TO_DISPATCH',
  'DISPATCHED',
  'DELIVERED',
  'CANCELLED',
] as const;

export type OrderStatus = (typeof ORDER_STATUS)[number];

export const PAYMENT_STATUS = ['NOT_PAID', 'READY_TO_PAY', 'PAID', 'CANCELLED', 'ERROR'] as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[number];

/** Display labels for admin (dropdowns, badges, filters). */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: 'New',
  PROCESSING: 'Processing',
  READY_TO_DISPATCH: 'Ready to dispatch',
  DISPATCHED: 'Dispatched',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  NOT_PAID: 'Not ready for payment',
  READY_TO_PAY: 'Ready for payment',
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
    PROCESSING: 'Processing',
    READY_TO_DISPATCH: 'Ready to dispatch',
    DISPATCHED: 'Dispatched',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
  };
  return map[s] ?? status;
}

/**
 * Map backend order_status to a display key for customer order page (badge class and i18n).
 * Used when fulfillment_status is no longer stored; customer UI derives from order_status.
 */
export function orderStatusToFulfillmentDisplay(status: string | null | undefined): string {
  if (!status) return 'new';
  const upper = String(status).trim().toUpperCase();
  // Normalize legacy values (e.g. READY_FOR_DISPATCH → READY_TO_DISPATCH)
  const normalized = OLD_ORDER_STATUS_TO_NEW[upper] ?? upper;
  const map: Record<string, string> = {
    NEW: 'new',
    PROCESSING: 'preparing',
    READY_TO_DISPATCH: 'ready_to_dispatch',
    DISPATCHED: 'dispatched',
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
  PAID: 'PROCESSING',
  ACCEPTED: 'PROCESSING',
  PREPARING: 'PROCESSING',
  READY_FOR_DISPATCH: 'READY_TO_DISPATCH',
  OUT_FOR_DELIVERY: 'DISPATCHED',
  DISPATCHED: 'DISPATCHED',
  DELIVERED: 'DELIVERED',
  CANCELED: 'CANCELLED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'CANCELLED',
};

/** Map old payment_status to new enum. */
export const OLD_PAYMENT_STATUS_TO_NEW: Record<string, PaymentStatus> = {
  PENDING: 'NOT_PAID',
  NOT_PAID: 'NOT_PAID',
  READY_TO_PAY: 'READY_TO_PAY',
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
