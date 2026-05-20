/**
 * Build JSON body for POST /api/stripe/create-checkout-session from cart UI state.
 * Shape must match validateStripePayload in app/api/stripe/create-checkout-session/route.ts.
 * When `contactPreference` includes `line`, include `lineId` (normalized plain ID); the API requires it.
 */

import type { Locale } from '@/lib/i18n';
import type { ContactPreferenceOption } from '@/lib/orders';
import type { DeliveryFormValues } from '@/components/DeliveryForm';
import type { CartItem } from '@/contexts/CartContext';
import { getStoredReferral } from '@/lib/referral';
import { resolveOrderDiscount } from '@/lib/promo/resolveOrderDiscount';
import type { OrderDeliveryDestinationId } from '@/lib/orders';
import { getZoneFee, isSupportedZone } from '@/lib/delivery/zones';
import { getAddOnsTotal } from '@/lib/addonsConfig';
import { normalizeBalloonText } from '@/lib/balloonCustomization';
import { normalizeLineUserId } from '@/lib/lineUserId';

function mapWrappingForStripe(
  pref: CartItem['addOns']['wrappingPreference']
): string | undefined {
  if (pref === 'classic') return 'standard';
  if (pref === 'premium') return 'premium';
  if (pref === 'none') return 'no paper';
  return undefined;
}

function mapCardTypeForStripe(card: CartItem['addOns']['cardType']): string | undefined {
  if (card === 'free') return 'free';
  if (card === 'beautiful') return 'beautiful';
  return undefined;
}

/**
 * One Stripe line item per cart unit (quantity expanded) for server-side pricing.
 */
export function cartItemsToStripeCheckoutItems(cartItems: CartItem[]): unknown[] {
  const rows: unknown[] = [];
  for (const item of cartItems) {
    const qty = item.quantity ?? 1;
    const wrappingOption = mapWrappingForStripe(item.addOns.wrappingPreference);
    const cardType = mapCardTypeForStripe(item.addOns.cardType);
    const balloonText = item.itemType === 'balloon'
      ? normalizeBalloonText(item.addOns.balloonText)
      : undefined;
    for (let i = 0; i < qty; i++) {
      rows.push({
        itemType: item.itemType ?? 'bouquet',
        bouquetId: item.bouquetId,
        bouquetSlug: item.slug,
        size: item.size.optionId,
        addOns: {
          cardType,
          cardMessage: item.addOns.cardMessage?.trim() ?? '',
          wrappingOption,
          ...(balloonText && { balloonText }),
          productAddOns: item.addOns.productAddOns,
        },
        imageUrl: item.imageUrl,
      });
    }
  }
  return rows;
}

export function buildStripeCheckoutSessionRequestBody(params: {
  lang: Locale;
  cartItems: CartItem[];
  delivery: DeliveryFormValues;
  customerName: string;
  phone: string;
  /** ITU calling code digits for customer phone (must match start of `phone`). */
  phoneCountryCode: string;
  customerEmail?: string;
  marketingEmailConsent?: boolean;
  contactPreference: ContactPreferenceOption[];
  /** Required in API when `contactPreference` includes `line`. */
  lineId?: string;
  submissionToken: string;
  recipientName?: string;
  recipientPhone?: string;
  /** ITU calling code digits for recipient when ordering for someone else. */
  recipientPhoneCountryCode?: string;
  surpriseDelivery?: boolean;
  /** @deprecated Prefer delivery.deliveryNote on DeliveryFormValues */
  deliveryNotes?: string;
}): Record<string, unknown> {
  const {
    lang,
    cartItems,
    delivery,
    customerName,
    phone,
    phoneCountryCode,
    customerEmail,
    marketingEmailConsent,
    contactPreference,
    lineId,
    submissionToken,
    recipientName,
    recipientPhone,
    recipientPhoneCountryCode,
    surpriseDelivery,
    deliveryNotes,
  } = params;

  const addressLineTrim =
    delivery.deliveryFormattedAddress?.trim() ||
    delivery.addressLine?.trim() ||
    '';
  const preferredTimeSlot =
    delivery.date && delivery.timeSlot
      ? `${delivery.date} ${delivery.timeSlot}`
      : delivery.date || delivery.timeSlot || '';

  const deliveryDestination = (delivery.deliveryDestination ??
    'CHIANG_MAI') as OrderDeliveryDestinationId;
  const deliveryZoneId = delivery.deliveryZoneId?.trim() ?? '';

  const itemsTotal = cartItems.reduce(
    (sum, item) =>
      sum +
      (item.size.price + getAddOnsTotal(item.addOns?.productAddOns ?? {})) *
        (item.quantity ?? 1),
    0
  );
  const deliveryFee =
    deliveryZoneId && isSupportedZone(deliveryDestination, deliveryZoneId)
      ? (getZoneFee(deliveryDestination, deliveryZoneId) ?? 0)
      : 0;
  const referral = getStoredReferral();
  const resolvedDiscount = resolveOrderDiscount({
    itemsTotal,
    deliveryFee,
    referralCode: referral?.code,
    deliveryDestination,
  });
  const referralDiscount = resolvedDiscount?.discount ?? 0;

  const body: Record<string, unknown> = {
    lang,
    customerName: customerName.trim(),
    phone,
    phoneCountryCode: phoneCountryCode.replace(/\D/g, ''),
    contactPreference,
    items: cartItemsToStripeCheckoutItems(cartItems),
    submission_token: submissionToken,
    delivery: {
      address: addressLineTrim,
      preferredTimeSlot,
      recipientName: recipientName?.trim() || undefined,
      recipientPhone: recipientPhone?.trim() || undefined,
      ...(recipientPhoneCountryCode != null &&
        recipientPhoneCountryCode.replace(/\D/g, '') && {
          recipientPhoneCountryCode: recipientPhoneCountryCode.replace(/\D/g, ''),
        }),
      ...(surpriseDelivery !== undefined && { surpriseDelivery }),
      deliveryDestination,
      deliveryZoneId,
      deliveryGoogleMapsUrl: delivery.deliveryGoogleMapsUrl?.trim() || undefined,
      notes:
        delivery.deliveryNote?.trim() ||
        deliveryNotes?.trim() ||
        undefined,
    },
  };

  const email = customerEmail?.trim();
  if (email) body.customerEmail = email;

  if (marketingEmailConsent === true) {
    body.marketingEmailConsent = true;
  }

  if (contactPreference.includes('line')) {
    body.lineId = normalizeLineUserId(lineId ?? '');
  }

  if (resolvedDiscount && referralDiscount > 0) {
    body.referralCode = resolvedDiscount.code;
    body.referralDiscount = referralDiscount;
  }

  return body;
}
