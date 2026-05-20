import type { DeliveryFormValues } from '@/components/DeliveryForm';
import { isDeliveryTimeSlotSelectableForDate } from '@/components/DeliveryForm';
import { isSupportedZone } from '@/lib/delivery/zones';
import type { ContactPreferenceOption } from '@/lib/orders';
import {
  nationalDigitsValidForCheckout,
} from '@/lib/phoneFieldHints';
import { isValidLineUserId, normalizeLineUserId } from '@/lib/lineUserId';

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

/** Google Places selection with coordinates (authoritative for drivers). */
export function hasGooglePlaceDelivery(delivery: DeliveryFormValues): boolean {
  return Boolean(
    delivery.deliveryPlaceId?.trim() &&
      delivery.deliveryFormattedAddress?.trim() &&
      typeof delivery.deliveryLat === 'number' &&
      typeof delivery.deliveryLng === 'number'
  );
}

/** Manual fallback when Maps script unavailable or customer typed full address. */
export function hasManualDeliveryFallback(delivery: DeliveryFormValues): boolean {
  if (delivery.deliveryPlaceId?.trim()) return false;
  const manual =
    delivery.deliveryFormattedAddress?.trim() ?? delivery.addressLine?.trim() ?? '';
  return manual.length >= 10;
}

export function hasDeliveryAddressInput(delivery: DeliveryFormValues): boolean {
  return hasGooglePlaceDelivery(delivery) || hasManualDeliveryFallback(delivery);
}

/** Soft hint: place selected but no room/floor note for driver. */
export function shouldShowDeliveryNoteHint(delivery: DeliveryFormValues): boolean {
  return hasGooglePlaceDelivery(delivery) && !delivery.deliveryNote?.trim();
}

export function isPremiumDeliveryValid(delivery: DeliveryFormValues): boolean {
  if (!delivery.deliveryZoneId) return false;
  if (!isSupportedZone(delivery.deliveryDestination, delivery.deliveryZoneId)) return false;
  if (!hasDeliveryAddressInput(delivery)) return false;
  const address = delivery.addressLine?.trim() ?? '';
  if (address.length > 500) return false;
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
  if (!nationalDigitsValidForCheckout(countryCode, phoneNational)) return false;
  if (contactPreference.length === 0) return false;
  if (contactPreference.includes('line')) {
    const norm = normalizeLineUserId(lineId);
    if (!isValidLineUserId(norm)) return false;
  }
  if (customerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
    return false;
  }
  return true;
}

export function isPremiumRecipientValid(
  recipientName: string,
  recipientCountryCode: string,
  recipientPhoneNational: string
): boolean {
  if (!recipientName.trim()) return false;
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
