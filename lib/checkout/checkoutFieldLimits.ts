/**
 * Max lengths for checkout / delivery form text fields.
 * Used on inputs (maxLength + clip), client validation, API payload validation, and draft payloads.
 */

import type { DeliveryFormValues } from '@/components/DeliveryForm';

export const CHECKOUT_FIELD_LIMITS = {
  deliveryAddress: 180,
  googleMapsUrl: 500,
  deliveryNote: 160,
  customerName: 50,
  phoneNational: 24,
  /** Frontend input only; server validates email format, not this length. */
  customerEmail: 80,
  recipientName: 50,
  recipientPhoneNational: 24,
  referralCode: 24,
  giftCardMessage: 160,
} as const;

export type CheckoutFieldLimitKey = keyof typeof CHECKOUT_FIELD_LIMITS;

export function clipCheckoutField(value: string, field: CheckoutFieldLimitKey): string {
  return value.slice(0, CHECKOUT_FIELD_LIMITS[field]);
}

export function isWithinCheckoutFieldLimit(value: string, field: CheckoutFieldLimitKey): boolean {
  return value.length <= CHECKOUT_FIELD_LIMITS[field];
}

/** National digits after optional calling code prefix on a full international number. */
export function nationalDigitsLengthFromFullPhone(
  fullDigits: string,
  callingCodeDigits: string | undefined
): number {
  const cc = callingCodeDigits?.replace(/\D/g, '') ?? '';
  if (cc && fullDigits.startsWith(cc) && fullDigits.length > cc.length) {
    return fullDigits.length - cc.length;
  }
  return fullDigits.length;
}

/** Clip persisted delivery fields so stale localStorage cannot exceed limits. */
export function sanitizeDeliveryFormValues(delivery: DeliveryFormValues): DeliveryFormValues {
  const clipAddr = (s: string) => clipCheckoutField(s, 'deliveryAddress');
  return {
    ...delivery,
    addressLine: clipAddr(delivery.addressLine ?? ''),
    deliveryFormattedAddress: delivery.deliveryFormattedAddress
      ? clipAddr(delivery.deliveryFormattedAddress)
      : delivery.deliveryFormattedAddress,
    deliveryGoogleMapsUrl: delivery.deliveryGoogleMapsUrl
      ? clipCheckoutField(delivery.deliveryGoogleMapsUrl, 'googleMapsUrl')
      : delivery.deliveryGoogleMapsUrl,
    deliveryNote: delivery.deliveryNote
      ? clipCheckoutField(delivery.deliveryNote, 'deliveryNote')
      : delivery.deliveryNote,
  };
}
