import 'server-only';

import type { CartItem } from '@/contexts/CartContext';
import type {
  ContactPreferenceOption,
  OrderItem,
  OrderPayload,
  OrderWrappingOption,
} from '@/lib/orders';
import type { RecoveredCartForm } from '@/lib/checkout/recoveredCartForm';
export type { RecoveredCartForm } from '@/lib/checkout/recoveredCartForm';
import { normalizeSharedCartToken } from '@/lib/cart/sharedCart';
import type { Locale } from '@/lib/i18n';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getOrderBySubmissionToken } from '@/lib/orders';
import { isSpecificWrappingPaperColor } from '@/lib/wrappingPaperColors';

export type CheckoutRecoveryPayload = {
  items: CartItem[];
  form: RecoveredCartForm;
  locale: Locale;
};

export function normalizeRecoveryToken(raw: string | null): string | null {
  return normalizeSharedCartToken(raw);
}

function parsePreferredTimeSlot(slot: string): { date: string; timeSlot: string } {
  const parts = slot.trim().split(/\s+/);
  if (parts.length >= 2 && /^\d{4}-\d{2}-\d{2}$/.test(parts[0]) && parts[1].includes('-')) {
    return { date: parts[0], timeSlot: parts[1] };
  }
  return { date: slot.trim(), timeSlot: '' };
}

function mapWrappingToCart(
  opt: OrderWrappingOption | null | undefined
): CartItem['addOns']['wrappingPreference'] {
  if (!opt) return null;
  const lower = opt.toLowerCase();
  if (lower === 'standard' || lower === 'classic') return 'classic';
  if (lower === 'premium') return 'premium';
  if (lower === 'no paper' || lower === 'none') return 'none';
  return null;
}

function mapCardToCart(
  ct: OrderItem['addOns']['cardType']
): CartItem['addOns']['cardType'] {
  if (ct === 'premium') return 'beautiful';
  if (ct === 'free') return 'free';
  return null;
}

function splitPhone(
  full: string | undefined,
  countryCode?: string
): { countryCode: string; national: string } {
  const digits = (full ?? '').replace(/\D/g, '');
  const cc = (countryCode ?? '66').replace(/\D/g, '') || '66';
  if (digits.startsWith(cc) && digits.length > cc.length) {
    return { countryCode: cc, national: digits.slice(cc.length) };
  }
  return { countryCode: cc, national: digits };
}

function cartLineKey(item: OrderItem): string {
  return JSON.stringify({
    bouquetId: item.bouquetId,
    slug: item.bouquetSlug ?? '',
    size: item.size,
    itemType: item.itemType ?? 'bouquet',
    addOns: item.addOns,
  });
}

function orderItemToCartItem(item: OrderItem): CartItem {
  const title = item.bouquetTitle?.trim() || '';
  return {
    itemType: item.itemType ?? 'bouquet',
    bouquetId: item.bouquetId,
    slug: item.bouquetSlug?.trim() || '',
    nameEn: title,
    nameTh: title,
    imageUrl: item.imageUrl,
    size: {
      optionId: item.size,
      label: item.size,
      price: item.price,
    },
    quantity: 1,
    addOns: {
      cardType: mapCardToCart(item.addOns?.cardType ?? null),
      cardMessage: item.addOns?.cardMessage?.trim() ?? '',
      wrappingPreference: mapWrappingToCart(item.addOns?.wrappingOption),
      paperColor: isSpecificWrappingPaperColor(item.addOns?.paperColor)
        ? item.addOns.paperColor
        : null,
      balloonText: item.addOns?.balloonText?.trim() ?? '',
      productAddOns: {},
    },
  };
}

/** Group expanded order lines (qty 1 each) back into cart lines with quantity. */
export function orderItemsToCartItems(items: OrderItem[]): CartItem[] {
  const grouped = new Map<string, CartItem>();
  for (const item of items) {
    const key = cartLineKey(item);
    const existing = grouped.get(key);
    if (existing) {
      existing.quantity = (existing.quantity ?? 1) + 1;
      continue;
    }
    grouped.set(key, orderItemToCartItem(item));
  }
  return Array.from(grouped.values());
}

export function orderPayloadToCartForm(payload: OrderPayload): RecoveredCartForm {
  const delivery = payload.delivery;
  const { date, timeSlot } = parsePreferredTimeSlot(delivery.preferredTimeSlot ?? '');
  const customerPhone = splitPhone(payload.phone, payload.phoneCountryCode);
  const recipientPhone = splitPhone(
    delivery.recipientPhone,
    delivery.recipientPhoneCountryCode
  );
  const hasRecipient =
    Boolean(delivery.recipientName?.trim()) || Boolean(delivery.recipientPhone?.trim());

  const contactPref = (payload.contactPreference ?? ['whatsapp']).filter(
    (o): o is ContactPreferenceOption => o === 'phone' || o === 'line' || o === 'whatsapp'
  );

  return {
    delivery: {
      addressLine: delivery.address ?? '',
      date,
      timeSlot,
      deliveryLat: delivery.deliveryLat ?? null,
      deliveryLng: delivery.deliveryLng ?? null,
      deliveryGoogleMapsUrl: delivery.deliveryGoogleMapsUrl ?? null,
      deliveryPlaceId: delivery.deliveryPlaceId ?? null,
      deliveryPlaceName: delivery.deliveryPlaceName ?? null,
      deliveryFormattedAddress: delivery.deliveryFormattedAddress ?? null,
      deliveryPostalCode: delivery.deliveryPostalCode ?? delivery.postalCode ?? null,
      deliveryProvince: delivery.deliveryProvince ?? null,
      deliveryDistrictLabel: delivery.deliveryDistrictLabel ?? null,
      deliverySubdistrict: delivery.deliverySubdistrict ?? null,
      deliveryNote: delivery.notes ?? '',
      deliveryDestination: delivery.deliveryDestination ?? 'CHIANG_MAI',
      deliveryZoneId: delivery.deliveryZoneId ?? '',
      deliveryDistrict: delivery.deliveryDistrict ?? '',
      isMueangCentral: delivery.isMueangCentral ?? false,
    },
    customerName: payload.customerName?.trim() ?? '',
    customerEmail: payload.customerEmail?.trim() ?? '',
    countryCode: customerPhone.countryCode,
    phoneNational: customerPhone.national,
    recipientName: delivery.recipientName?.trim() ?? '',
    recipientCountryCode: recipientPhone.countryCode,
    recipientPhoneNational: recipientPhone.national,
    contactPreference: contactPref.length > 0 ? contactPref : ['whatsapp'],
    lineId: payload.lineId?.trim() || undefined,
    isOrderingForSomeoneElse: hasRecipient,
    surpriseDelivery: delivery.surpriseDelivery ?? false,
    marketingEmailConsent: payload.marketingEmailConsent === true,
    checkoutRecoveryEmailConsent: payload.checkoutRecoveryEmailConsent === true,
    deliveryNotes: delivery.notes,
  };
}

export async function getCheckoutRecoveryByToken(
  token: string
): Promise<CheckoutRecoveryPayload | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('checkout_abandonments')
    .select(
      'payload_json, lang, expires_at, cancelled_at, recovery_email_sent_at, submission_token'
    )
    .eq('recovery_token', token)
    .maybeSingle();

  if (error || !data) return null;

  const expiresAt = data.expires_at ? new Date(String(data.expires_at)) : null;
  if (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    return null;
  }
  if (data.cancelled_at) return null;

  const submissionToken =
    typeof data.submission_token === 'string' ? data.submission_token.trim() : '';
  if (submissionToken) {
    const existing = await getOrderBySubmissionToken(submissionToken);
    if (existing?.status === 'paid') return null;
  }

  const payload = data.payload_json as OrderPayload | null;
  if (!payload || !Array.isArray(payload.items) || payload.items.length === 0) {
    return null;
  }

  const locale: Locale = data.lang === 'th' ? 'th' : 'en';
  const items = orderItemsToCartItems(payload.items);
  if (items.length === 0) return null;

  return {
    items,
    form: orderPayloadToCartForm(payload),
    locale,
  };
}
