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
  OrderSource,
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

/** Base URL and public order / pay-link URLs. */
export { getBaseUrl, getOrderDetailsUrl, getPayLinkUrl, getPayLinkStripeSuccessUrl } from './orders/publicUrls';
