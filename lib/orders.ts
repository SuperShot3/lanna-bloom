/**
 * Order types and storage for Lanna Bloom.
 * Re-exports from lib/orders/ (router + types).
 * Storage: Supabase primary (when configured) with Blob fallback. See docs/ORDERS_SUPABASE.md.
 */

export type {
  OrderCardType,
  OrderWrappingOption,
  OrderItemAddOns,
  OrderItem,
  DeliveryDistrictKey,
  OrderDelivery,
  OrderPricing,
  ContactPreferenceOption,
  OrderPayload,
  OrderPaymentStatus,
  FulfillmentStatus,
  Order,
} from './orders/types';

export {
  generateOrderId,
  getOrderById,
  getOrderByStripeSessionId,
  createOrder,
  createPendingOrder,
  updateOrderPaymentStatus,
  deleteOrder,
  listOrders,
} from './orders/router';

/** Base URL for public links. Never returns localhost when running on Vercel. */
export function getBaseUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const isLocalhost = (url: string) =>
    /^https?:\/\/localhost(\d*)(\s|$|\/)/i.test(url) || /^https?:\/\/127\.0\.0\.1/i.test(url);
  if (appUrl && !isLocalhost(appUrl)) return appUrl.replace(/\/$/, '');
  if (process.env.VERCEL && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
}

export function getOrderDetailsUrl(orderId: string): string {
  return `${getBaseUrl()}/order/${encodeURIComponent(orderId)}`;
}
