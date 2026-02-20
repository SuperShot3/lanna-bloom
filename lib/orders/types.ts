/**
 * Order types for Lanna Bloom. Shared across store backends.
 */

/** Add-on card type for API (free | premium maps to beautiful). */
export type OrderCardType = 'free' | 'premium' | null;

/** Wrapping option for API (standard = classic, premium = premium, no paper = none). */
export type OrderWrappingOption = 'standard' | 'premium' | 'no paper' | null;

export interface OrderItemAddOns {
  cardType: OrderCardType;
  cardMessage: string;
  wrappingOption: OrderWrappingOption;
}

export interface OrderItem {
  bouquetId: string;
  bouquetTitle: string;
  size: string;
  price: number;
  addOns: OrderItemAddOns;
  imageUrl?: string;
  bouquetSlug?: string;
}

/** District key for delivery fee calculation. */
export type DeliveryDistrictKey =
  | 'MUEANG' | 'SARAPHI' | 'SAN_SAI' | 'HANG_DONG' | 'SAN_KAMPHAENG'
  | 'MAE_RIM' | 'DOI_SAKET' | 'MAE_ON' | 'SAMOENG' | 'MAE_TAENG' | 'UNKNOWN';

export interface OrderDelivery {
  address: string;
  district?: string;
  preferredTimeSlot: string;
  recipientName?: string;
  recipientPhone?: string;
  notes?: string;
  deliveryLat?: number;
  deliveryLng?: number;
  deliveryGoogleMapsUrl?: string;
  deliveryDistrict?: DeliveryDistrictKey;
  isMueangCentral?: boolean;
}

export interface OrderPricing {
  itemsTotal: number;
  deliveryFee: number;
  grandTotal: number;
}

export type ContactPreferenceOption = 'phone' | 'line' | 'telegram' | 'whatsapp';

export interface OrderPayload {
  customerName?: string;
  phone?: string;
  customerEmail?: string;
  items: OrderItem[];
  delivery: OrderDelivery;
  pricing: OrderPricing;
  contactPreference?: ContactPreferenceOption[];
  referralCode?: string;
  referralDiscount?: number;
}

export type OrderPaymentStatus = 'pending_payment' | 'paid' | 'payment_failed';

export type FulfillmentStatus =
  | 'new'
  | 'confirmed'
  | 'preparing'
  | 'dispatched'
  | 'delivered'
  | 'cancelled'
  | 'issue';

export interface Order extends OrderPayload {
  orderId: string;
  createdAt: string;
  status?: OrderPaymentStatus;
  stripeSessionId?: string;
  paymentIntentId?: string;
  amountTotal?: number;
  currency?: string;
  paidAt?: string;
  /** Customer-facing fulfillment status. Stored in Supabase. */
  fulfillmentStatus?: FulfillmentStatus;
  fulfillmentStatusUpdatedAt?: string;
}
