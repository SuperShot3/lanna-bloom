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
  OrderDeliveryDestinationId,
  OrderDelivery,
  OrderDeliveryCustomerView,
  OrderPricing,
  ContactPreferenceOption,
  ContactPreferenceStored,
  CustomOrderDetails,
  OrderPayload,
  OrderPaymentStatus,
  FulfillmentStatus,
  Order,
  OrderCustomerView,
} from './orders/types';

export {
  generateOrderId,
  getOrderById,
  getOrderByIdWithPublicToken,
  getOrderByStripeSessionId,
  getOrderBySubmissionToken,
  getOrderPublicToken,
  createOrder,
  createPendingOrder,
  updateOrderPaymentStatus,
  deleteOrder,
  listOrders,
} from './orders/router';

/** Base URL for public links. Never returns localhost when running on Vercel. */
export { getBaseUrl } from '@/lib/siteUrl';
import { getBaseUrl } from '@/lib/siteUrl';

export function getOrderDetailsUrl(orderId: string, options?: { token?: string | null }): string {
  const base = `${getBaseUrl()}/order/${encodeURIComponent(orderId)}`;
  const token = options?.token?.trim();
  if (!token) return base;
  const qs = new URLSearchParams({ token }).toString();
  return `${base}?${qs}`;
}
