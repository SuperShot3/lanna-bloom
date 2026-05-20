import type { DeliveryFormValues } from '@/components/DeliveryForm';
import { isDeliveryTimeSlotSelectableForDate } from '@/components/DeliveryForm';
import { isSupportedZone } from '@/lib/delivery/zones';
import { isValidGoogleMapsUrl } from '@/lib/googleMapsUrl';
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

export function hasDeliveryAddressInput(delivery: DeliveryFormValues): boolean {
  const address = delivery.addressLine?.trim() ?? '';
  const maps = delivery.deliveryGoogleMapsUrl?.trim() ?? '';
  const place = delivery.deliveryPlaceId?.trim() ?? '';
  return Boolean(place || (maps && isValidGoogleMapsUrl(maps)) || address.length >= 10);
}

export function isPremiumDeliveryValid(delivery: DeliveryFormValues): boolean {
  if (!delivery.deliveryZoneId) return false;
  if (!isSupportedZone(delivery.deliveryDestination, delivery.deliveryZoneId)) return false;
  if (!hasDeliveryAddressInput(delivery)) return false;
  const address = delivery.addressLine?.trim() ?? '';
  if (address.length > 300) return false;
  const maps = delivery.deliveryGoogleMapsUrl?.trim() ?? '';
  if (maps && !isValidGoogleMapsUrl(maps)) return false;
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
  } = params;

  if (!delivery.deliveryZoneId || !isSupportedZone(delivery.deliveryDestination, delivery.deliveryZoneId)) {
    return { sectionId: 'delivery', message: copy.pleaseSelectDeliveryArea };
  }

  const maps = delivery.deliveryGoogleMapsUrl?.trim() ?? '';
  if (maps && !isValidGoogleMapsUrl(maps)) {
    return { sectionId: 'delivery', message: copy.invalidMapsLink };
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

  if (!recipientName.trim()) {
    return { sectionId: 'recipient', message: copy.pleaseAddRecipientName };
  }

  if (!nationalDigitsValidForCheckout(recipientCountryCode, recipientPhoneNational)) {
    return { sectionId: 'recipient', message: copy.pleaseAddRecipientPhone };
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

  return null;
}
