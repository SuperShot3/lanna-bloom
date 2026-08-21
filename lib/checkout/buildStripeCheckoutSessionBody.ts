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
import { hasCatalogDiscount } from '@/lib/catalogDiscount';
import type { OrderDeliveryDestinationId } from '@/lib/orders';
import { getZoneFee, isSupportedZone } from '@/lib/delivery/zones';
import { getAddOnsTotal } from '@/lib/addonsConfig';
import { normalizeBalloonText } from '@/lib/balloonCustomization';
import { clipCheckoutField } from '@/lib/checkout/checkoutFieldLimits';
import { normalizeLineUserId } from '@/lib/lineUserId';
import { isSpecificWrappingPaperColor } from '@/lib/wrappingPaperColors';
import { pairGiftCardMessagesWithItemTitles } from '@/lib/orders/giftCardMessages';
import { cartUnitTitlesForGiftCards } from '@/lib/cart/giftCardItemTitles';

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
    const paperColor =
      (item.itemType ?? 'bouquet') === 'bouquet' &&
      isSpecificWrappingPaperColor(item.addOns.paperColor)
        ? item.addOns.paperColor
        : undefined;
    for (let i = 0; i < qty; i++) {
      rows.push({
        itemType: item.itemType ?? 'bouquet',
        bouquetId: item.bouquetId,
        bouquetSlug: item.slug,
        size: item.size.optionId,
        addOns: {
          cardType,
          cardMessage: '',
          wrappingOption,
          ...(balloonText && { balloonText }),
          ...(paperColor && { paperColor }),
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
  checkoutRecoveryEmailConsent?: boolean;
  /** Required: customer agreed to personal data processing / Privacy Policy. */
  personalDataProcessingConsent?: boolean;
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
  ga_client_id?: string;
  ga_session_id?: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  visitor_id?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  campaign_id?: string;
  adgroup_id?: string;
  keyword?: string;
  device?: string;
  network?: string;
  matchtype?: string;
  /** Order-level gift card messages (max 3). */
  giftCardMessages?: string[];
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
    checkoutRecoveryEmailConsent,
    personalDataProcessingConsent,
    contactPreference,
    lineId,
    submissionToken,
    recipientName,
    recipientPhone,
    recipientPhoneCountryCode,
    surpriseDelivery,
    deliveryNotes,
    ga_client_id,
    ga_session_id,
    gclid,
    gbraid,
    wbraid,
    visitor_id,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    campaign_id,
    adgroup_id,
    keyword,
    device,
    network,
    matchtype,
    giftCardMessages,
  } = params;

  const addressLineTrim = clipCheckoutField(
    delivery.deliveryFormattedAddress?.trim() ||
      delivery.addressLine?.trim() ||
      '',
    'deliveryAddress'
  );
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
  // Client estimate only — server recomputes with catalog discount detection.
  const cartHasCatalogDiscount = cartItems.some((item) =>
    hasCatalogDiscount(item.catalogDiscountPercent)
  );
  const resolvedDiscount = resolveOrderDiscount({
    itemsTotal,
    deliveryFee,
    referralCode: referral?.code,
    deliveryDestination,
    deliveryDateYmd: delivery.date || undefined,
    hasCatalogProductDiscount: cartHasCatalogDiscount,
  });
  const referralDiscount = resolvedDiscount?.discount ?? 0;

  const body: Record<string, unknown> = {
    lang,
    customerName: clipCheckoutField(customerName.trim(), 'customerName'),
    phone,
    phoneCountryCode: phoneCountryCode.replace(/\D/g, ''),
    contactPreference,
    items: cartItemsToStripeCheckoutItems(cartItems),
    submission_token: submissionToken,
    delivery: {
      address: addressLineTrim,
      preferredTimeSlot,
      recipientName: recipientName
        ? clipCheckoutField(recipientName.trim(), 'recipientName')
        : undefined,
      recipientPhone: recipientPhone?.trim() || undefined,
      ...(recipientPhoneCountryCode != null &&
        recipientPhoneCountryCode.replace(/\D/g, '') && {
          recipientPhoneCountryCode: recipientPhoneCountryCode.replace(/\D/g, ''),
        }),
      ...(surpriseDelivery !== undefined && { surpriseDelivery }),
      deliveryDestination,
      deliveryZoneId,
      deliveryGoogleMapsUrl: delivery.deliveryGoogleMapsUrl
        ? clipCheckoutField(delivery.deliveryGoogleMapsUrl.trim(), 'googleMapsUrl')
        : undefined,
      notes: (() => {
        const raw =
          delivery.deliveryNote?.trim() || deliveryNotes?.trim() || '';
        return raw ? clipCheckoutField(raw, 'deliveryNote') : undefined;
      })(),
    },
  };

  const email = customerEmail?.trim();
  if (email) body.customerEmail = clipCheckoutField(email, 'customerEmail');

  if (marketingEmailConsent === true) {
    body.marketingEmailConsent = true;
  }

  if (checkoutRecoveryEmailConsent === true) {
    body.checkoutRecoveryEmailConsent = true;
  }

  if (personalDataProcessingConsent === true) {
    body.personalDataProcessingConsent = true;
  }

  if (contactPreference.includes('line')) {
    body.lineId = normalizeLineUserId(lineId ?? '');
  }

  if (resolvedDiscount && referralDiscount > 0) {
    body.referralCode = resolvedDiscount.code;
    body.referralDiscount = referralDiscount;
  }

  if (ga_client_id?.trim()) body.ga_client_id = ga_client_id.trim();
  if (ga_session_id?.trim()) body.ga_session_id = ga_session_id.trim();
  if (gclid?.trim()) body.gclid = gclid.trim();
  if (gbraid?.trim()) body.gbraid = gbraid.trim();
  if (wbraid?.trim()) body.wbraid = wbraid.trim();
  if (visitor_id?.trim()) body.visitor_id = visitor_id.trim();
  if (utm_source?.trim()) body.utm_source = utm_source.trim();
  if (utm_medium?.trim()) body.utm_medium = utm_medium.trim();
  if (utm_campaign?.trim()) body.utm_campaign = utm_campaign.trim();
  if (utm_content?.trim()) body.utm_content = utm_content.trim();
  if (utm_term?.trim()) body.utm_term = utm_term.trim();
  if (campaign_id?.trim()) body.campaign_id = campaign_id.trim();
  if (adgroup_id?.trim()) body.adgroup_id = adgroup_id.trim();
  if (keyword?.trim()) body.keyword = keyword.trim();
  if (device?.trim()) body.device = device.trim();
  if (network?.trim()) body.network = network.trim();
  if (matchtype?.trim()) body.matchtype = matchtype.trim();

  const persistedCards = pairGiftCardMessagesWithItemTitles(
    giftCardMessages ?? [],
    cartUnitTitlesForGiftCards(cartItems, lang)
  );
  if (persistedCards.length > 0) {
    body.giftCardMessages = persistedCards;
  }

  return body;
}
