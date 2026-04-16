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
  /** 'bouquet' | 'product' | 'plushyToy' — for profit/cost tracking */
  itemType?: 'bouquet' | 'product' | 'plushyToy';
  /** Partner cost (for products); used for COGS auto-fill */
  cost?: number;
  /** Platform commission amount (for products) */
  commissionAmount?: number;
}

/** District key for delivery fee calculation. */
export type DeliveryDistrictKey =
  | 'MUEANG' | 'SARAPHI' | 'SAN_SAI' | 'HANG_DONG' | 'SAN_KAMPHAENG'
  | 'MAE_RIM' | 'DOI_SAKET' | 'MAE_ON' | 'SAMOENG' | 'MAE_TAENG' | 'LAMPHUN' | 'UNKNOWN';

export interface OrderDelivery {
  address: string;
  district?: string;
  preferredTimeSlot: string;
  recipientName?: string;
  recipientPhone?: string;
  /** When ordering for someone else: true = surprise (do not tip off recipient), false = not a surprise. */
  surpriseDelivery?: boolean;
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

export type ContactPreferenceOption = 'phone' | 'line' | 'whatsapp';

/** Legacy value that may still appear in stored order JSON. */
export type ContactPreferenceStored = ContactPreferenceOption | 'telegram';

/** Extra fields from the /custom-order form; stored in order_json for admin and customer view. */
export interface CustomOrderDetails {
  giftDescription: string;
  occasion?: string;
  greetingCard?: string;
  estimatedBudgetTHB?: string;
  /** Human-readable delivery date (or partial) */
  deliveryDateLabel?: string;
  timePreference?: string;
  timeComments?: string;
  referenceImageUrl?: string | null;
  referenceImageFilename?: string | null;
  customerComments?: string;
  locale?: 'en' | 'th';
}

export interface OrderPayload {
  customerName?: string;
  phone?: string;
  customerEmail?: string;
  items: OrderItem[];
  delivery: OrderDelivery;
  pricing: OrderPricing;
  contactPreference?: ContactPreferenceStored[];
  referralCode?: string;
  referralDiscount?: number;
  /** Optional GA4 client_id from frontend for server-side purchase attribution (stored in DB only). */
  ga_client_id?: string;
  /** Channel hint for admin/ops reporting. */
  orderSource?: 'web' | 'custom_form' | 'legacy_line';
  /** When set, order came from the custom order form; details for ops and customer. */
  customOrderDetails?: CustomOrderDetails;
  /**
   * Browser-generated idempotency key for this checkout attempt.
   * Stored in DB; not shown in customer UI. Omitted from persisted order_json.
   */
  submissionToken?: string;
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

/**
 * Public order page: after delivery, sensitive fields may be redacted to null.
 */
export type OrderDeliveryCustomerView = Omit<
  OrderDelivery,
  'address' | 'deliveryGoogleMapsUrl' | 'recipientName' | 'recipientPhone'
> & {
  address: string | null;
  deliveryGoogleMapsUrl?: string | null;
  recipientName?: string | null;
  recipientPhone?: string | null;
};

export type OrderCustomerView = Omit<Order, 'delivery'> & {
  delivery: OrderDeliveryCustomerView;
};
