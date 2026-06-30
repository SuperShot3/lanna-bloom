import 'server-only';

import type { CartItem } from '@/contexts/CartContext';
import {
  sanitizeCartItemsForShare,
  SharedCartValidationError,
} from '@/lib/cart/sharedCart';
import { clipCheckoutField, CHECKOUT_FIELD_LIMITS } from '@/lib/checkout/checkoutFieldLimits';
import { isValidGoogleMapsUrl } from '@/lib/googleMapsUrl';
import type { Locale } from '@/lib/i18n';
import { clipLocationText, DELIVERY_LOCATION_TEXT_MAX } from '@/lib/delivery/deliveryLocationRequestClient';

export { DELIVERY_LOCATION_TEXT_MAX };

export type DeliveryLocationSubmissionChannel = 'form' | 'whatsapp' | 'facebook' | 'line';

export type DeliveryLocationRequestInput = {
  lang: Locale;
  locationText?: string;
  googleMapsUrl?: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  consentAccepted: boolean;
  items: unknown;
  sourcePath?: string;
  userAgent?: string;
  submissionChannel?: DeliveryLocationSubmissionChannel;
};

export type ValidatedDeliveryLocationRequest = {
  lang: 'en' | 'th';
  locationText: string | null;
  googleMapsUrl: string | null;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string;
  consentAcceptedAt: string;
  items: CartItem[];
  sourcePath: string | null;
  userAgent: string | null;
  submissionChannel: DeliveryLocationSubmissionChannel;
};

export function validateDeliveryLocationRequestInput(
  input: DeliveryLocationRequestInput
): { ok: true; data: ValidatedDeliveryLocationRequest } | { ok: false; message: string } {
  if (!input.consentAccepted) {
    return { ok: false, message: 'Consent is required to process your request.' };
  }

  const locationTextRaw =
    typeof input.locationText === 'string' ? clipLocationText(input.locationText).trim() : '';
  const mapsRaw =
    typeof input.googleMapsUrl === 'string'
      ? clipCheckoutField(input.googleMapsUrl.trim(), 'googleMapsUrl')
      : '';

  if (!locationTextRaw && !mapsRaw) {
    return {
      ok: false,
      message: 'Please enter your location or paste a Google Maps link.',
    };
  }

  if (mapsRaw && !isValidGoogleMapsUrl(mapsRaw)) {
    return {
      ok: false,
      message:
        'Please paste a valid Google Maps link (Share → Copy link from the Google Maps app).',
    };
  }

  const customerName = clipCheckoutField(
    typeof input.customerName === 'string' ? input.customerName.trim() : '',
    'customerName'
  );
  if (!customerName) {
    return { ok: false, message: 'Please enter your name.' };
  }

  const customerPhoneRaw =
    typeof input.customerPhone === 'string' ? input.customerPhone.replace(/\D/g, '') : '';
  const customerPhone =
    customerPhoneRaw.length > 0
      ? customerPhoneRaw.slice(0, CHECKOUT_FIELD_LIMITS.phoneNational)
      : null;
  if (customerPhone && customerPhone.length < 8) {
    return { ok: false, message: 'Please enter a valid phone number or leave it blank.' };
  }

  const emailRaw =
    typeof input.customerEmail === 'string' ? input.customerEmail.trim() : '';
  if (!emailRaw) {
    return { ok: false, message: 'Please enter your email address so we can reply.' };
  }
  const customerEmail = clipCheckoutField(emailRaw, 'customerEmail');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    return { ok: false, message: 'Please enter a valid email address.' };
  }

  const lang = input.lang === 'th' ? 'th' : 'en';

  let items: CartItem[];
  try {
    items = sanitizeCartItemsForShare(input.items);
  } catch (err) {
    const message =
      err instanceof SharedCartValidationError ? err.message : 'Cart is empty or invalid.';
    return { ok: false, message };
  }

  const channel = input.submissionChannel;
  const submissionChannel: DeliveryLocationSubmissionChannel =
    channel === 'whatsapp' || channel === 'facebook' || channel === 'line' ? channel : 'form';

  return {
    ok: true,
    data: {
      lang,
      locationText: locationTextRaw || null,
      googleMapsUrl: mapsRaw || null,
      customerName,
      customerPhone,
      customerEmail,
      consentAcceptedAt: new Date().toISOString(),
      items,
      sourcePath:
        typeof input.sourcePath === 'string' && input.sourcePath.trim()
          ? input.sourcePath.trim().slice(0, 500)
          : null,
      userAgent:
        typeof input.userAgent === 'string' && input.userAgent.trim()
          ? input.userAgent.trim().slice(0, 500)
          : null,
      submissionChannel,
    },
  };
}
