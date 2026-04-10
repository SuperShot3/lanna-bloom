/**
 * Build JSON body for POST /api/stripe/create-checkout-session from cart UI state.
 * Shape must match validateStripePayload in app/api/stripe/create-checkout-session/route.ts.
 */

import type { Locale } from '@/lib/i18n';
import type { ContactPreferenceOption } from '@/lib/orders';
import type { DeliveryFormValues } from '@/components/DeliveryForm';
import type { CartItem } from '@/contexts/CartContext';
import { getStoredReferral, computeReferralDiscount } from '@/lib/referral';
import { calcDeliveryFeeTHB, type DistrictKey } from '@/lib/deliveryFees';
import { getAddOnsTotal } from '@/lib/addonsConfig';

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
    for (let i = 0; i < qty; i++) {
      rows.push({
        itemType: item.itemType ?? 'bouquet',
        bouquetId: item.bouquetId,
        bouquetSlug: item.slug,
        size: item.size.label,
        addOns: {
          cardType,
          cardMessage: item.addOns.cardMessage?.trim() ?? '',
          wrappingOption,
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
  customerEmail?: string;
  contactPreference: ContactPreferenceOption[];
  submissionToken: string;
  lineUserId?: string;
  orderSource?: 'line' | 'web';
  recipientName?: string;
  recipientPhone?: string;
}): Record<string, unknown> {
  const {
    lang,
    cartItems,
    delivery,
    customerName,
    phone,
    customerEmail,
    contactPreference,
    submissionToken,
    lineUserId,
    orderSource,
    recipientName,
    recipientPhone,
  } = params;

  const addressLineTrim = delivery.addressLine?.trim() ?? '';
  const preferredTimeSlot =
    delivery.date && delivery.timeSlot
      ? `${delivery.date} ${delivery.timeSlot}`
      : delivery.date || delivery.timeSlot || '';

  const district = (delivery.deliveryDistrict || 'UNKNOWN') as DistrictKey;
  const isMueangCentral = delivery.deliveryDistrict === 'MUEANG' && delivery.isMueangCentral;

  const itemsTotal = cartItems.reduce(
    (sum, item) =>
      sum +
      (item.size.price + getAddOnsTotal(item.addOns?.productAddOns ?? {})) *
        (item.quantity ?? 1),
    0
  );
  const deliveryFee = calcDeliveryFeeTHB({ district, isMueangCentral });
  const subtotal = itemsTotal + deliveryFee;
  const referral = getStoredReferral();
  const referralDiscount = computeReferralDiscount(subtotal, referral);

  const body: Record<string, unknown> = {
    lang,
    customerName: customerName.trim(),
    phone,
    contactPreference,
    items: cartItemsToStripeCheckoutItems(cartItems),
    submission_token: submissionToken,
    delivery: {
      address: addressLineTrim,
      preferredTimeSlot,
      recipientName: recipientName?.trim() || undefined,
      recipientPhone: recipientPhone?.trim() || undefined,
      deliveryDistrict: district,
      isMueangCentral,
      deliveryLat: delivery.deliveryLat ?? undefined,
      deliveryLng: delivery.deliveryLng ?? undefined,
      deliveryGoogleMapsUrl: delivery.deliveryGoogleMapsUrl?.trim() || undefined,
      notes: undefined,
    },
  };

  const email = customerEmail?.trim();
  if (email) body.customerEmail = email;

  if (referral && referralDiscount > 0) {
    body.referralCode = referral.code;
    body.referralDiscount = referralDiscount;
  }

  if (lineUserId) {
    body.lineUserId = lineUserId;
    body.orderSource = orderSource ?? 'line';
  }

  return body;
}
