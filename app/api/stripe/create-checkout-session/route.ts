import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { computeOrderTotals, type CartItemIdentifier } from '@/lib/stripePricing';
import {
  buildStripeCheckoutLineItems,
  stripeCheckoutDraftSuccessUrl,
} from '@/lib/stripe/checkoutStripeLineItems';
import { getBaseUrl } from '@/lib/orders';
import { getDiscountForCode } from '@/lib/referral';
import type { OrderPayload, ContactPreferenceOption } from '@/lib/orders';
import type { Locale } from '@/lib/i18n';
import type { DistrictKey } from '@/lib/deliveryFees';
import { buildStripeCheckoutDraftMetadata } from '@/lib/stripe/metadata';
import { upsertCheckoutDraft } from '@/lib/checkout/checkoutDrafts';
import { createStripeServerClient, getStripeServerConfig } from '@/lib/stripe/server';
import { isValidGoogleMapsUrl } from '@/lib/googleMapsUrl';
import { stripDuplicateThaiLeading66, thaiFullPhoneHasDuplicateCountryCode } from '@/lib/phoneFieldHints';

function validateStripePayload(
  body: unknown
): { ok: true; data: StripeCheckoutPayload } | { ok: false; message: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, message: 'Invalid JSON body' };
  }
  const b = body as Record<string, unknown>;

  const lang = (b.lang === 'th' || b.lang === 'en' ? b.lang : 'en') as Locale;

  const items = b.items;
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, message: 'items must be a non-empty array' };
  }

  const delivery = b.delivery;
  if (!delivery || typeof delivery !== 'object') {
    return { ok: false, message: 'delivery is required' };
  }
  const d = delivery as Record<string, unknown>;
  const address = typeof d.address === 'string' ? d.address.trim() : '';
  if (!address || address.length < 10 || address.length > 500) {
    return { ok: false, message: 'delivery.address is required (10–500 characters)' };
  }
  const deliveryGoogleMapsUrlRaw =
    typeof d.deliveryGoogleMapsUrl === 'string' ? d.deliveryGoogleMapsUrl.trim() : '';
  if (deliveryGoogleMapsUrlRaw && !isValidGoogleMapsUrl(deliveryGoogleMapsUrlRaw)) {
    return { ok: false, message: 'delivery.deliveryGoogleMapsUrl must be a valid Google Maps link' };
  }

  const customerName = typeof b.customerName === 'string' ? b.customerName.trim() : '';
  if (!customerName) return { ok: false, message: 'customerName is required' };

  const phone = stripDuplicateThaiLeading66(typeof b.phone === 'string' ? b.phone.trim() : '');
  if (!phone) return { ok: false, message: 'phone is required' };
  if (!/^\d+$/.test(phone)) return { ok: false, message: 'phone must contain only digits' };
  if (phone.length < 9 || phone.length > 16) {
    return { ok: false, message: 'phone must be 9–16 digits' };
  }
  if (thaiFullPhoneHasDuplicateCountryCode(phone)) {
    return {
      ok: false,
      message: 'phone must not repeat country code 66 (e.g. use 66952572645, not 666952572645)',
    };
  }

  const customerEmail = typeof b.customerEmail === 'string' ? b.customerEmail.trim() : undefined;
  if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    return { ok: false, message: 'customerEmail must be a valid email address' };
  }

  const contactPreferenceRaw = b.contactPreference;
  const contactPreference: ContactPreferenceOption[] = Array.isArray(contactPreferenceRaw)
    ? contactPreferenceRaw.filter(
        (v): v is ContactPreferenceOption =>
          v === 'phone' || v === 'line' || v === 'whatsapp'
      )
    : [];
  if (contactPreference.length === 0) {
    return { ok: false, message: 'At least one contactPreference is required' };
  }

  const cartItems: CartItemIdentifier[] = items.map((it: unknown) => {
    const i = it as Record<string, unknown>;
    const addOns = (i.addOns as Record<string, unknown>) ?? {};
    const cardType = addOns.cardType as string | undefined;
    const wrappingOption = addOns.wrappingOption as string | undefined;
    const productAddOnsRaw = addOns.productAddOns;
    const productAddOns =
      productAddOnsRaw && typeof productAddOnsRaw === 'object'
        ? (productAddOnsRaw as Record<string, boolean>)
        : undefined;
    return {
      itemType: (i.itemType === 'product'
        ? 'product'
        : i.itemType === 'plushyToy'
          ? 'plushyToy'
          : 'bouquet') as 'bouquet' | 'product' | 'plushyToy',
      bouquetId: typeof i.bouquetId === 'string' ? i.bouquetId : '',
      bouquetSlug: typeof i.bouquetSlug === 'string' ? i.bouquetSlug : undefined,
      size: typeof i.size === 'string' ? i.size : 'm',
      addOns: {
        cardType:
          cardType === 'free' ? 'free' : cardType === 'beautiful' || cardType === 'premium' ? 'premium' : null,
        cardMessage: typeof addOns.cardMessage === 'string' ? addOns.cardMessage : '',
        wrappingOption:
          wrappingOption === 'standard' || wrappingOption === 'classic'
            ? 'standard'
            : wrappingOption === 'premium'
              ? 'premium'
              : wrappingOption === 'no paper' || wrappingOption === 'none'
                ? 'no paper'
                : null,
        productAddOns,
      },
      imageUrl: typeof i.imageUrl === 'string' ? i.imageUrl : undefined,
    };
  });

  const preferredTimeSlot =
    typeof d.preferredTimeSlot === 'string' ? d.preferredTimeSlot : '';
  const recipientName = typeof d.recipientName === 'string' ? d.recipientName.trim() : undefined;
  const recipientPhoneRaw = typeof d.recipientPhone === 'string' ? d.recipientPhone.trim() : undefined;
  const recipientPhone = recipientPhoneRaw
    ? stripDuplicateThaiLeading66(recipientPhoneRaw)
    : undefined;
  const surpriseDelivery =
    d.surpriseDelivery === true ? true : d.surpriseDelivery === false ? false : undefined;

  if (
    recipientPhone &&
    /^\d+$/.test(recipientPhone) &&
    thaiFullPhoneHasDuplicateCountryCode(recipientPhone)
  ) {
    return {
      ok: false,
      message:
        'recipientPhone must not repeat country code 66 (e.g. use 66952572645, not 666952572645)',
    };
  }

  const validDistricts = ['MUEANG','SARAPHI','SAN_SAI','HANG_DONG','SAN_KAMPHAENG','MAE_RIM','DOI_SAKET','MAE_ON','SAMOENG','MAE_TAENG','LAMPHUN','UNKNOWN'] as const;
  const deliveryDistrict = typeof d.deliveryDistrict === 'string' && validDistricts.includes(d.deliveryDistrict as typeof validDistricts[number])
    ? (d.deliveryDistrict as typeof validDistricts[number])
    : 'UNKNOWN';
  const isMueangCentral = d.deliveryDistrict === 'MUEANG' && d.isMueangCentral === true;
  const referralCode = typeof b.referralCode === 'string' ? b.referralCode.trim() : undefined;
  const referralDiscount = typeof b.referralDiscount === 'number' && b.referralDiscount > 0 ? b.referralDiscount : 0;

  const submissionTokenRaw = typeof b.submission_token === 'string' ? b.submission_token.trim() : '';
  if (!submissionTokenRaw || submissionTokenRaw.length < 8 || submissionTokenRaw.length > 128) {
    return { ok: false, message: 'submission_token is required (8–128 characters)' };
  }
  if (!/^[0-9a-fA-F-]+$/.test(submissionTokenRaw)) {
    return { ok: false, message: 'submission_token has invalid format' };
  }

  return {
    ok: true,
    data: {
      lang,
      customerName,
      phone,
      customerEmail,
      contactPreference,
      items: cartItems,
      referralCode: referralCode && referralDiscount > 0 ? referralCode : undefined,
      referralDiscount: referralCode && referralDiscount > 0 ? referralDiscount : 0,
      submissionToken: submissionTokenRaw,
      delivery: {
        address,
        preferredTimeSlot,
        recipientName,
        recipientPhone,
        surpriseDelivery,
        notes: typeof d.notes === 'string' ? d.notes : undefined,
        deliveryLat: typeof d.deliveryLat === 'number' ? d.deliveryLat : undefined,
        deliveryLng: typeof d.deliveryLng === 'number' ? d.deliveryLng : undefined,
        deliveryGoogleMapsUrl: deliveryGoogleMapsUrlRaw || undefined,
        deliveryDistrict,
        isMueangCentral,
      },
    },
  };
}

interface StripeCheckoutPayload {
  lang: Locale;
  customerName: string;
  phone: string;
  customerEmail?: string;
  contactPreference: ContactPreferenceOption[];
  items: CartItemIdentifier[];
  referralCode?: string;
  referralDiscount?: number;
  submissionToken: string;
  delivery: {
    address: string;
    preferredTimeSlot: string;
    recipientName?: string;
    recipientPhone?: string;
    surpriseDelivery?: boolean;
    notes?: string;
    deliveryLat?: number;
    deliveryLng?: number;
    deliveryGoogleMapsUrl?: string;
    deliveryDistrict: string;
    isMueangCentral: boolean;
  };
}

export async function POST(request: NextRequest) {
  const stripeConfig = getStripeServerConfig();
  if (!stripeConfig) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
  }

  const stripe = createStripeServerClient(stripeConfig.secretKey);
  try {
    const body = await request.json();
    const validation = validateStripePayload(body);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.message }, { status: 400 });
    }
    const { data } = validation;

    const deliveryInput = {
      address: data.delivery.address,
      deliveryLat: data.delivery.deliveryLat,
      deliveryLng: data.delivery.deliveryLng,
      deliveryDistrict: data.delivery.deliveryDistrict as DistrictKey,
      isMueangCentral: data.delivery.isMueangCentral,
    };

    const computed = await computeOrderTotals(data.items, deliveryInput, data.lang);
    if (!computed.ok) {
      return NextResponse.json({ error: computed.message }, { status: 400 });
    }
    const { totals } = computed;
    const subtotal = totals.itemsTotal + totals.deliveryFee;
    const referralDiscount = data.referralCode
      ? getDiscountForCode(data.referralCode, subtotal)
      : 0;
    const effectiveGrandTotal = Math.max(0, totals.grandTotal - referralDiscount);

    const orderPayload: OrderPayload = {
      customerName: data.customerName,
      phone: data.phone,
      customerEmail: data.customerEmail,
      contactPreference: data.contactPreference,
      items: totals.items,
      delivery: {
        address: data.delivery.address,
        preferredTimeSlot: data.delivery.preferredTimeSlot,
        recipientName: data.delivery.recipientName,
        recipientPhone: data.delivery.recipientPhone,
        ...(data.delivery.surpriseDelivery !== undefined && {
          surpriseDelivery: data.delivery.surpriseDelivery,
        }),
        notes: data.delivery.notes,
        deliveryLat: data.delivery.deliveryLat,
        deliveryLng: data.delivery.deliveryLng,
        deliveryGoogleMapsUrl: data.delivery.deliveryGoogleMapsUrl,
        deliveryDistrict: data.delivery.deliveryDistrict as DistrictKey,
        isMueangCentral: data.delivery.isMueangCentral,
      },
      pricing: {
        itemsTotal: totals.itemsTotal,
        deliveryFee: totals.deliveryFee,
        grandTotal: effectiveGrandTotal,
      },
      ...(data.referralCode && referralDiscount > 0 && {
        referralCode: data.referralCode,
        referralDiscount,
      }),
      submissionToken: data.submissionToken,
    };

    const { id: checkoutDraftId } = await upsertCheckoutDraft({
      submissionToken: data.submissionToken,
      payload: orderPayload,
    });

    const baseUrl = getBaseUrl();
    const stripeMetadata = buildStripeCheckoutDraftMetadata({
      checkoutDraftId,
      submissionToken: data.submissionToken,
      source: 'lanna_bloom_checkout',
      customerEmail: data.customerEmail,
      lang: data.lang,
    });

    console.log('[stripe/create-checkout-session] checkout draft saved (order created after payment)', {
      checkoutDraftId,
      mode: stripeConfig.mode,
      hasCustomerEmail: Boolean(data.customerEmail),
    });

    const lineItems = buildStripeCheckoutLineItems({
      computedItems: totals.items,
      deliveryFee: totals.deliveryFee,
      effectiveGrandTotal,
      referralCode: data.referralCode,
      referralDiscount,
    });

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        line_items: lineItems,
        client_reference_id: checkoutDraftId,
        customer_email: data.customerEmail,
        success_url: stripeCheckoutDraftSuccessUrl(baseUrl, data.lang),
        cancel_url: `${baseUrl}/${data.lang}/cart`,
        metadata: stripeMetadata,
        payment_intent_data: {
          metadata: stripeMetadata,
        },
      },
      { idempotencyKey: `checkout-${data.submissionToken}` }
    );

    if (!session.url) {
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
    }

    console.log('[stripe/create-checkout-session] session created', {
      checkoutDraftId,
      sessionId: session.id,
      mode: stripeConfig.mode,
      metadata: stripeMetadata,
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (e) {
    console.error('[stripe/create-checkout-session] error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
