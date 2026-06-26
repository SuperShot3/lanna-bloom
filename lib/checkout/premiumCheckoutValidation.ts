import type { DeliveryFormValues } from '@/components/DeliveryForm';
import { isDeliveryTimeSlotSelectableForDate } from '@/lib/deliveryTimeSelection';
import { CHECKOUT_FIELD_LIMITS } from '@/lib/checkout/checkoutFieldLimits';
import { isSupportedZone } from '@/lib/delivery/zones';
import type { ContactPreferenceOption } from '@/lib/orders';
import {
  nationalDigitsValidForCheckout,
} from '@/lib/phoneFieldHints';
import { isValidLineUserId, normalizeLineUserId } from '@/lib/lineUserId';
import { isValidGoogleMapsUrl } from '@/lib/googleMapsUrl';

function exceedsLimit(value: string, max: number): boolean {
  return value.trim().length > max;
}

export type CheckoutSectionId =
  | 'product'
  | 'delivery'
  | 'deliveryDate'
  | 'deliveryTime'
  | 'recipient'
  | 'sender'
  | 'payment';

export type CheckoutFieldIssue = {
  sectionId: CheckoutSectionId;
  message: string;
};

/** Minimum manual address length when no valid Google Maps link is present. */
export const DELIVERY_ADDRESS_MIN_CHARS = 6;

export function isDeliveryAddressSufficient(
  addressLine: string,
  deliveryGoogleMapsUrl?: string | null
): boolean {
  const manual = addressLine.trim();
  if (manual.length >= DELIVERY_ADDRESS_MIN_CHARS) return true;
  const mapsUrl = deliveryGoogleMapsUrl?.trim() ?? '';
  return mapsUrl.length > 0 && isValidGoogleMapsUrl(mapsUrl);
}

export function hasDeliveryAddressInput(delivery: DeliveryFormValues): boolean {
  const manual =
    delivery.deliveryFormattedAddress?.trim() ?? delivery.addressLine?.trim() ?? '';
  return isDeliveryAddressSufficient(manual, delivery.deliveryGoogleMapsUrl);
}

/** Soft hint: address entered but no room/floor note for driver. */
export function shouldShowDeliveryNoteHint(delivery: DeliveryFormValues): boolean {
  return hasDeliveryAddressInput(delivery) && !delivery.deliveryNote?.trim();
}

export function isPremiumDeliveryValid(delivery: DeliveryFormValues): boolean {
  if (!delivery.deliveryZoneId) return false;
  if (!isSupportedZone(delivery.deliveryDestination, delivery.deliveryZoneId)) return false;
  if (!hasDeliveryAddressInput(delivery)) return false;
  const address =
    delivery.deliveryFormattedAddress?.trim() ?? delivery.addressLine?.trim() ?? '';
  if (exceedsLimit(address, CHECKOUT_FIELD_LIMITS.deliveryAddress)) return false;
  const mapsUrl = delivery.deliveryGoogleMapsUrl?.trim() ?? '';
  if (mapsUrl) {
    if (exceedsLimit(mapsUrl, CHECKOUT_FIELD_LIMITS.googleMapsUrl)) return false;
    if (!isValidGoogleMapsUrl(mapsUrl)) return false;
  }
  const note = delivery.deliveryNote?.trim() ?? '';
  if (exceedsLimit(note, CHECKOUT_FIELD_LIMITS.deliveryNote)) return false;
  if (!delivery.date || !delivery.timeSlot) return false;
  if (!isDeliveryTimeSlotSelectableForDate(delivery.date, delivery.timeSlot)) return false;
  return true;
}

export function isPremiumSenderValid(params: {
  customerName: string;
  countryCode: string;
  phoneNational: string;
  contactPreference: ContactPreferenceOption[];
  lineId: string;
  customerEmail: string;
}): boolean {
  const { customerName, countryCode, phoneNational, contactPreference, lineId, customerEmail } =
    params;
  if (!customerName.trim()) return false;
  if (exceedsLimit(customerName, CHECKOUT_FIELD_LIMITS.customerName)) return false;
  if (exceedsLimit(phoneNational.replace(/\D/g, ''), CHECKOUT_FIELD_LIMITS.phoneNational)) {
    return false;
  }
  if (!nationalDigitsValidForCheckout(countryCode, phoneNational)) return false;
  if (contactPreference.length === 0) return false;
  if (contactPreference.includes('line')) {
    const norm = normalizeLineUserId(lineId);
    if (!isValidLineUserId(norm)) return false;
  }
  const emailTrim = customerEmail.trim();
  if (emailTrim) {
    if (exceedsLimit(emailTrim, CHECKOUT_FIELD_LIMITS.customerEmail)) return false;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) return false;
  }
  return true;
}

export function isPremiumRecipientValid(
  recipientName: string,
  recipientCountryCode: string,
  recipientPhoneNational: string
): boolean {
  if (!recipientName.trim()) return false;
  if (exceedsLimit(recipientName, CHECKOUT_FIELD_LIMITS.recipientName)) return false;
  if (
    exceedsLimit(
      recipientPhoneNational.replace(/\D/g, ''),
      CHECKOUT_FIELD_LIMITS.recipientPhoneNational
    )
  ) {
    return false;
  }
  if (!nationalDigitsValidForCheckout(recipientCountryCode, recipientPhoneNational)) return false;
  return true;
}

export function getFirstCheckoutFieldIssue(
  copy: {
    pleaseAddDeliveryAddress: string;
    pleaseChooseDeliveryDate: string;
    pleaseChooseDeliveryTime: string;
    pleaseSelectDeliveryArea: string;
    pleaseAddRecipientName: string;
    pleaseAddRecipientPhone: string;
    pleaseAddYourName: string;
    pleaseAddYourPhone: string;
    pleaseAddYourEmail: string;
    pleaseChooseContact: string;
    pleaseAddLineId: string;
    invalidMapsLink: string;
  },
  params: {
    delivery: DeliveryFormValues;
    customerName: string;
    countryCode: string;
    phoneNational: string;
    contactPreference: ContactPreferenceOption[];
    lineId: string;
    customerEmail: string;
    recipientName: string;
    recipientCountryCode: string;
    recipientPhoneNational: string;
    /** When false, recipient name/phone are not required. */
    isOrderingForSomeoneElse: boolean;
  }
): CheckoutFieldIssue | null {
  const {
    delivery,
    customerName,
    countryCode,
    phoneNational,
    contactPreference,
    lineId,
    customerEmail,
    recipientName,
    recipientCountryCode,
    recipientPhoneNational,
    isOrderingForSomeoneElse,
  } = params;

  if (!delivery.deliveryZoneId || !isSupportedZone(delivery.deliveryDestination, delivery.deliveryZoneId)) {
    return { sectionId: 'delivery', message: copy.pleaseSelectDeliveryArea };
  }

  if (!hasDeliveryAddressInput(delivery)) {
    return { sectionId: 'delivery', message: copy.pleaseAddDeliveryAddress };
  }

  const mapsUrl = delivery.deliveryGoogleMapsUrl?.trim() ?? '';
  if (
    mapsUrl &&
    (exceedsLimit(mapsUrl, CHECKOUT_FIELD_LIMITS.googleMapsUrl) ||
      !isValidGoogleMapsUrl(mapsUrl))
  ) {
    return { sectionId: 'delivery', message: copy.invalidMapsLink };
  }

  if (!delivery.date) {
    return { sectionId: 'deliveryDate', message: copy.pleaseChooseDeliveryDate };
  }

  if (!delivery.timeSlot || !isDeliveryTimeSlotSelectableForDate(delivery.date, delivery.timeSlot)) {
    return { sectionId: 'deliveryTime', message: copy.pleaseChooseDeliveryTime };
  }

  if (!customerName.trim()) {
    return { sectionId: 'sender', message: copy.pleaseAddYourName };
  }

  if (!nationalDigitsValidForCheckout(countryCode, phoneNational)) {
    return { sectionId: 'sender', message: copy.pleaseAddYourPhone };
  }

  if (contactPreference.length === 0) {
    return { sectionId: 'sender', message: copy.pleaseChooseContact };
  }

  if (contactPreference.includes('line')) {
    const norm = normalizeLineUserId(lineId);
    if (!isValidLineUserId(norm)) {
      return { sectionId: 'sender', message: copy.pleaseAddLineId };
    }
  }

  if (customerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
    return { sectionId: 'sender', message: copy.pleaseAddYourEmail };
  }

  if (isOrderingForSomeoneElse) {
    if (!recipientName.trim()) {
      return { sectionId: 'recipient', message: copy.pleaseAddRecipientName };
    }

    if (!nationalDigitsValidForCheckout(recipientCountryCode, recipientPhoneNational)) {
      return { sectionId: 'recipient', message: copy.pleaseAddRecipientPhone };
    }
  }

  return null;
}
