import type { CartItem } from '@/contexts/CartContext';
import type { DeliveryFormValues } from '@/components/DeliveryForm';
import { normalizeBalloonText } from '@/lib/balloonCustomization';
import {
  CHECKOUT_FIELD_LIMITS,
  clipCheckoutField,
  sanitizeDeliveryFormValues,
} from '@/lib/checkout/checkoutFieldLimits';
import type { RecoveredCartForm } from '@/lib/checkout/recoveredCartForm';
import { DISTRICTS, type DistrictKey } from '@/lib/deliveryFees';
import { getCheckoutZonesForDestination } from '@/lib/delivery/zones';
import {
  parseDeliveryDestinationId,
  type DeliveryDestinationId,
} from '@/lib/delivery/markets';
import { isValidGoogleMapsUrl } from '@/lib/googleMapsUrl';
import type { GoogleAddressComponent } from '@/lib/google/placesAddressComponents';
import { sanitizeLineUserIdInput } from '@/lib/lineUserId';
import { normalizeGiftCardMessagesForUi } from '@/lib/orders/giftCardMessages';
import type { ContactPreferenceOption } from '@/lib/orders';
import {
  isSpecificDeliveryTime,
  isWindowDeliveryTimeSlot,
} from '@/lib/deliveryTimeSelection';
import { isWrappingPaperColorId } from '@/lib/wrappingPaperColors';

export const SHARED_CART_MAX_LINES = 20;
export const SHARED_CART_MAX_UNITS = 50;

const CONTACT_OPTIONS: ContactPreferenceOption[] = ['phone', 'line', 'whatsapp', 'telegram'];
const DISTRICT_KEYS = new Set<string>(DISTRICTS.map((d) => d.key));
const MAX_ADDRESS_COMPONENTS = 40;
const MAX_PLACE_ID_LEN = 256;
const MAX_SHORT_LABEL = 80;
const MAX_PRODUCT_ADDON_KEYS = 30;

export class SharedCartValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SharedCartValidationError';
  }
}

function clampQuantity(qty: unknown): number {
  const n = typeof qty === 'number' ? qty : Number(qty);
  if (!Number.isFinite(n)) return 1;
  return Math.min(99, Math.max(1, Math.floor(n)));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidCartLine(item: unknown): item is CartItem {
  if (!item || typeof item !== 'object') return false;
  const row = item as CartItem;
  if (!isNonEmptyString(row.bouquetId)) return false;
  if (!isNonEmptyString(row.slug)) return false;
  if (!row.size || typeof row.size !== 'object') return false;
  if (!isNonEmptyString(row.size.optionId)) return false;
  if (typeof row.size.price !== 'number' || !Number.isFinite(row.size.price)) return false;
  return true;
}

function optionalClippedString(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  if (!t) return null;
  return t.slice(0, max);
}

function clipOrEmpty(value: unknown, field: keyof typeof CHECKOUT_FIELD_LIMITS): string {
  return typeof value === 'string' ? clipCheckoutField(value, field) : '';
}

function sanitizeCoord(value: unknown, min: number, max: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (value < min || value > max) return null;
  return value;
}

function sanitizeYmd(value: unknown): string {
  if (typeof value !== 'string') return '';
  const t = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : '';
}

function sanitizeTimeSlot(value: unknown): string {
  if (typeof value !== 'string') return '';
  const t = value.trim();
  if (isWindowDeliveryTimeSlot(t) || isSpecificDeliveryTime(t)) return t;
  return '';
}

function sanitizeAddressComponents(raw: unknown): GoogleAddressComponent[] | null {
  if (!Array.isArray(raw)) return null;
  const out: GoogleAddressComponent[] = [];
  for (const row of raw.slice(0, MAX_ADDRESS_COMPONENTS)) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const long_name = typeof o.long_name === 'string' ? o.long_name.slice(0, 120) : '';
    const short_name = typeof o.short_name === 'string' ? o.short_name.slice(0, 120) : '';
    const types = Array.isArray(o.types)
      ? o.types.filter((t): t is string => typeof t === 'string').slice(0, 12)
      : [];
    if (!long_name && !short_name) continue;
    out.push({ long_name, short_name, types });
  }
  return out.length > 0 ? out : null;
}

function sanitizeProductAddOns(raw: unknown): Record<string, boolean> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value !== 'boolean') continue;
    const k = key.trim().slice(0, 80);
    if (!k) continue;
    out[k] = value;
    if (Object.keys(out).length >= MAX_PRODUCT_ADDON_KEYS) break;
  }
  return out;
}

function sanitizeExcludedDestinations(raw: unknown): DeliveryDestinationId[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: DeliveryDestinationId[] = [];
  for (const row of raw) {
    const id = parseDeliveryDestinationId(typeof row === 'string' ? row : null);
    if (id && !out.includes(id)) out.push(id);
  }
  return out.length > 0 ? out : undefined;
}

function sanitizeDistrictKey(value: unknown): DistrictKey | '' {
  if (typeof value !== 'string') return '';
  return DISTRICT_KEYS.has(value) ? (value as DistrictKey) : '';
}

function sanitizeContactPreference(raw: unknown): ContactPreferenceOption[] {
  if (!Array.isArray(raw)) return ['phone'];
  const filtered = raw.filter((o): o is ContactPreferenceOption =>
    CONTACT_OPTIONS.includes(o as ContactPreferenceOption)
  );
  return filtered.length > 0 ? filtered : ['phone'];
}

function sanitizeDigits(value: unknown, field: 'phoneNational' | 'recipientPhoneNational'): string {
  const digits = typeof value === 'string' ? value.replace(/\D/g, '') : '';
  return clipCheckoutField(digits, field);
}

function checkoutZoneId(destinationId: DeliveryDestinationId, rawZone: unknown): string {
  if (typeof rawZone !== 'string') return '';
  const zoneId = rawZone.trim();
  if (!zoneId) return '';
  const allowed = getCheckoutZonesForDestination(destinationId);
  return allowed.some((z) => z.id === zoneId) ? zoneId : '';
}

/** Strip per-item card messages; keep clipped balloon text; validate cart line shape. */
export function sanitizeCartItemsForShare(items: unknown): CartItem[] {
  if (!Array.isArray(items) || items.length === 0) {
    throw new SharedCartValidationError('Cart is empty');
  }
  if (items.length > SHARED_CART_MAX_LINES) {
    throw new SharedCartValidationError('Too many cart lines');
  }

  const sanitized: CartItem[] = [];
  let totalUnits = 0;

  for (const raw of items) {
    if (!isValidCartLine(raw)) {
      throw new SharedCartValidationError('Invalid cart item');
    }

    const qty = clampQuantity(raw.quantity);
    totalUnits += qty;
    if (totalUnits > SHARED_CART_MAX_UNITS) {
      throw new SharedCartValidationError('Too many items');
    }

    const addOnsRaw = raw.addOns && typeof raw.addOns === 'object' ? raw.addOns : {};
    const addOns = addOnsRaw as CartItem['addOns'];
    const balloonText =
      raw.itemType === 'balloon' ? (normalizeBalloonText(addOns.balloonText) ?? '') : '';
    const wrappingPreference =
      addOns.wrappingPreference === 'none' ||
      addOns.wrappingPreference === 'classic' ||
      addOns.wrappingPreference === 'premium'
        ? addOns.wrappingPreference
        : null;
    const cardType = addOns.cardType === 'free' || addOns.cardType === 'beautiful' ? addOns.cardType : null;

    sanitized.push({
      itemType: raw.itemType,
      bouquetId: raw.bouquetId.trim(),
      slug: raw.slug.trim(),
      nameEn: typeof raw.nameEn === 'string' ? raw.nameEn : '',
      nameTh: typeof raw.nameTh === 'string' ? raw.nameTh : '',
      imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl.slice(0, 2000) : undefined,
      size: raw.size,
      quantity: qty,
      excludedDeliveryDestinations: sanitizeExcludedDestinations(raw.excludedDeliveryDestinations),
      deliveryDestination: parseDeliveryDestinationId(
        typeof raw.deliveryDestination === 'string' ? raw.deliveryDestination : null
      ),
      deliveryOptions: Array.isArray(raw.deliveryOptions)
        ? raw.deliveryOptions.filter((v): v is string => typeof v === 'string').slice(0, 12)
        : undefined,
      addOns: {
        cardType,
        cardMessage: '',
        wrappingPreference,
        paperColor: isWrappingPaperColorId(addOns.paperColor) ? addOns.paperColor : null,
        balloonText,
        productAddOns: sanitizeProductAddOns(addOns.productAddOns),
      },
    });
  }

  return sanitized;
}

/**
 * Validate a shared-cart checkout form. Unknown destination → null (do not invent Chiang Mai).
 * Invalid / manual-quote zones are cleared; destination is kept.
 */
export function sanitizeSharedCartForm(raw: unknown): RecoveredCartForm | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const deliveryRaw =
    row.delivery && typeof row.delivery === 'object'
      ? (row.delivery as Record<string, unknown>)
      : null;
  if (!deliveryRaw) return null;

  const destinationId = parseDeliveryDestinationId(
    typeof deliveryRaw.deliveryDestination === 'string' ? deliveryRaw.deliveryDestination : null
  );
  if (!destinationId) return null;

  const mapsRaw =
    typeof deliveryRaw.deliveryGoogleMapsUrl === 'string'
      ? clipCheckoutField(deliveryRaw.deliveryGoogleMapsUrl.trim(), 'googleMapsUrl')
      : '';
  const deliveryGoogleMapsUrl =
    mapsRaw && isValidGoogleMapsUrl(mapsRaw) ? mapsRaw : null;

  const timeModeRaw = deliveryRaw.deliveryTimeMode;
  const deliveryTimeMode =
    timeModeRaw === 'window' || timeModeRaw === 'custom' ? timeModeRaw : undefined;

  const delivery: DeliveryFormValues = sanitizeDeliveryFormValues({
    addressLine: clipOrEmpty(deliveryRaw.addressLine, 'deliveryAddress'),
    date: sanitizeYmd(deliveryRaw.date),
    timeSlot: sanitizeTimeSlot(deliveryRaw.timeSlot),
    deliveryTimeMode,
    deliveryLat: sanitizeCoord(deliveryRaw.deliveryLat, -90, 90),
    deliveryLng: sanitizeCoord(deliveryRaw.deliveryLng, -180, 180),
    deliveryGoogleMapsUrl,
    deliveryPlaceId: optionalClippedString(deliveryRaw.deliveryPlaceId, MAX_PLACE_ID_LEN),
    deliveryPlaceName: optionalClippedString(
      deliveryRaw.deliveryPlaceName,
      CHECKOUT_FIELD_LIMITS.deliveryAddress
    ),
    deliveryFormattedAddress: optionalClippedString(
      deliveryRaw.deliveryFormattedAddress,
      CHECKOUT_FIELD_LIMITS.deliveryAddress
    ),
    deliveryAddressComponents: sanitizeAddressComponents(deliveryRaw.deliveryAddressComponents),
    deliveryPostalCode: optionalClippedString(deliveryRaw.deliveryPostalCode, 16),
    deliveryProvince: optionalClippedString(deliveryRaw.deliveryProvince, MAX_SHORT_LABEL),
    deliveryDistrictLabel: optionalClippedString(
      deliveryRaw.deliveryDistrictLabel,
      MAX_SHORT_LABEL
    ),
    deliverySubdistrict: optionalClippedString(deliveryRaw.deliverySubdistrict, MAX_SHORT_LABEL),
    deliveryNote: clipOrEmpty(deliveryRaw.deliveryNote, 'deliveryNote'),
    deliveryDestination: destinationId,
    deliveryZoneId: checkoutZoneId(destinationId, deliveryRaw.deliveryZoneId),
    deliveryDistrict: sanitizeDistrictKey(deliveryRaw.deliveryDistrict),
    isMueangCentral: deliveryRaw.isMueangCentral === true,
  });

  const notesRaw =
    typeof row.deliveryNotes === 'string'
      ? clipCheckoutField(row.deliveryNotes, 'deliveryNote')
      : delivery.deliveryNote;

  return {
    delivery,
    customerName: clipOrEmpty(row.customerName, 'customerName'),
    customerEmail: clipOrEmpty(row.customerEmail, 'customerEmail'),
    countryCode:
      typeof row.countryCode === 'string' && /^\d{1,4}$/.test(row.countryCode.trim())
        ? row.countryCode.trim()
        : '66',
    phoneNational: sanitizeDigits(row.phoneNational, 'phoneNational'),
    recipientName: clipOrEmpty(row.recipientName, 'recipientName'),
    recipientCountryCode:
      typeof row.recipientCountryCode === 'string' &&
      /^\d{1,4}$/.test(row.recipientCountryCode.trim())
        ? row.recipientCountryCode.trim()
        : '66',
    recipientPhoneNational: sanitizeDigits(row.recipientPhoneNational, 'recipientPhoneNational'),
    contactPreference: sanitizeContactPreference(row.contactPreference),
    lineId: sanitizeLineUserIdInput(typeof row.lineId === 'string' ? row.lineId : '') || undefined,
    isOrderingForSomeoneElse: row.isOrderingForSomeoneElse === true,
    surpriseDelivery: row.surpriseDelivery === true,
    marketingEmailConsent: row.marketingEmailConsent === true,
    checkoutRecoveryEmailConsent: row.checkoutRecoveryEmailConsent === true,
    deliveryNotes: notesRaw || undefined,
  };
}

export function sanitizeSharedCartGiftMessages(raw: unknown): string[] | null {
  if (raw == null) return null;
  return normalizeGiftCardMessagesForUi(raw);
}
