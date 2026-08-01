import {
  CHECKOUT_FIELD_LIMITS,
  GIFT_CARD_MESSAGES_MAX_COUNT,
  isWithinCheckoutFieldLimit,
  nationalDigitsLengthFromFullPhone,
} from '@/lib/checkout/checkoutFieldLimits';
import { normalizeOptionalCallingCodeDigits } from '@/lib/phoneFieldHints';

/** Server-side max-length checks for checkout text fields (format rules are separate). */
export function validateCheckoutFieldMaxLengths(params: {
  deliveryAddress: string;
  deliveryGoogleMapsUrl?: string;
  deliveryNotes?: string;
  customerName: string;
  phone: string;
  phoneCountryCode?: unknown;
  recipientName?: string;
  recipientPhone?: string;
  recipientPhoneCountryCode?: unknown;
  referralCode?: string;
  cardMessages: string[];
  /** Optional; when set, also enforces max count of order-level gift cards. */
  giftCardMessagesCount?: number;
}): { ok: true } | { ok: false; message: string } {
  const {
    deliveryAddress,
    deliveryGoogleMapsUrl,
    deliveryNotes,
    customerName,
    phone,
    phoneCountryCode,
    recipientName,
    recipientPhone,
    recipientPhoneCountryCode,
    referralCode,
    cardMessages,
    giftCardMessagesCount,
  } = params;

  if (!isWithinCheckoutFieldLimit(deliveryAddress, 'deliveryAddress')) {
    return { ok: false, message: 'delivery.address exceeds maximum length' };
  }

  if (
    deliveryGoogleMapsUrl &&
    !isWithinCheckoutFieldLimit(deliveryGoogleMapsUrl, 'googleMapsUrl')
  ) {
    return { ok: false, message: 'delivery.deliveryGoogleMapsUrl exceeds maximum length' };
  }

  if (deliveryNotes && !isWithinCheckoutFieldLimit(deliveryNotes, 'deliveryNote')) {
    return { ok: false, message: 'delivery notes exceed maximum length' };
  }

  if (!isWithinCheckoutFieldLimit(customerName, 'customerName')) {
    return { ok: false, message: 'customerName exceeds maximum length' };
  }

  const phoneCc = normalizeOptionalCallingCodeDigits(phoneCountryCode);
  if (
    nationalDigitsLengthFromFullPhone(phone, phoneCc) >
    CHECKOUT_FIELD_LIMITS.phoneNational
  ) {
    return { ok: false, message: 'phone exceeds maximum length' };
  }

  if (recipientName && !isWithinCheckoutFieldLimit(recipientName, 'recipientName')) {
    return { ok: false, message: 'delivery.recipientName exceeds maximum length' };
  }

  if (recipientPhone) {
    const recCc = normalizeOptionalCallingCodeDigits(recipientPhoneCountryCode);
    if (
      nationalDigitsLengthFromFullPhone(recipientPhone, recCc) >
      CHECKOUT_FIELD_LIMITS.recipientPhoneNational
    ) {
      return { ok: false, message: 'delivery.recipientPhone exceeds maximum length' };
    }
  }

  if (referralCode && !isWithinCheckoutFieldLimit(referralCode, 'referralCode')) {
    return { ok: false, message: 'referralCode exceeds maximum length' };
  }

  for (const msg of cardMessages) {
    if (!isWithinCheckoutFieldLimit(msg, 'giftCardMessage')) {
      return { ok: false, message: 'giftCardMessages exceeds maximum length' };
    }
  }

  if (
    giftCardMessagesCount != null &&
    giftCardMessagesCount > GIFT_CARD_MESSAGES_MAX_COUNT
  ) {
    return {
      ok: false,
      message: `giftCardMessages exceeds maximum count of ${GIFT_CARD_MESSAGES_MAX_COUNT}`,
    };
  }

  return { ok: true };
}
