/**
 * Server-side LINE order-intent draft (not a real order).
 * Item shape matches CartItem / CartContext for handoff replace.
 */

import type { BouquetSize } from '@/lib/bouquets';
import type { ContactPreferenceOption } from '@/lib/orders';
import type { DistrictKey } from '@/lib/deliveryFees';

/** Mirrors AddOnsValues from AddOnsSection (avoid importing client module on server). */
export interface LineDraftAddOns {
  cardType: 'free' | 'beautiful' | null;
  cardMessage: string;
  wrappingPreference: 'none' | 'classic' | 'premium' | null;
  productAddOns?: Record<string, boolean>;
}

export interface LineDraftCartItem {
  itemType?: 'bouquet' | 'product';
  bouquetId: string;
  slug: string;
  nameEn: string;
  nameTh: string;
  imageUrl?: string;
  size: BouquetSize;
  addOns: LineDraftAddOns;
  quantity?: number;
}

/** Partial delivery fields compatible with DeliveryFormValues. */
export interface LineDraftDeliveryPartial {
  addressLine?: string;
  date?: string;
  timeSlot?: string;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  deliveryGoogleMapsUrl?: string | null;
  deliveryDistrict?: DistrictKey | '';
  isMueangCentral?: boolean;
}

/** Partial form state applied on handoff (replace lanna-bloom-cart-form). */
export interface LineDraftFormPartial {
  customerName?: string;
  customerEmail?: string;
  countryCode?: string;
  phoneNational?: string;
  recipientName?: string;
  recipientCountryCode?: string;
  recipientPhoneNational?: string;
  contactPreference?: ContactPreferenceOption[];
  isOrderingForSomeoneElse?: boolean;
  delivery?: LineDraftDeliveryPartial;
}

export interface LineDraftPayload {
  items: LineDraftCartItem[];
  form?: LineDraftFormPartial;
  lang?: 'en' | 'th';
}

export const LINE_DRAFT_TTL_MS = 48 * 60 * 60 * 1000; // 48h
