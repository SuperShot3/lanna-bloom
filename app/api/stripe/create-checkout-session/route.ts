import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { computeOrderTotals, type CartItemIdentifier } from '@/lib/stripePricing';
import { createPendingOrder, getBaseUrl } from '@/lib/orders';
import { getDiscountForCode } from '@/lib/referral';
import type { OrderPayload, ContactPreferenceOption } from '@/lib/orders';
import type { Locale } from '@/lib/i18n';
import type { DistrictKey } from '@/lib/deliveryFees';
import { buildStripeOrderMetadata } from '@/lib/stripe/metadata';
import { logLineIntegrationEvent } from '@/lib/line-integration/log';
import { createStripeServerClient, getStripeServerConfig } from '@/lib/stripe/server';
import { isValidGoogleMapsUrl } from '@/lib/googleMapsUrl';

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

  const phone = typeof b.phone === 'string' ? b.phone.trim() : '';
  if (!phone) return { ok: false, message: 'phone is required' };
  if (!/^\d+$/.test(phone)) return { ok: false, message: 'phone must contain only digits' };
  if (phone.length < 9 || phone.length > 16) {
    return { ok: false, message: 'phone must be 9–16 digits' };
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
  const recipientPhone = typeof d.recipientPhone === 'string' ? d.recipientPhone.trim() : undefined;

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

  const lineUserIdRaw = typeof b.lineUserId === 'string' ? b.lineUserId.trim() : '';
  const lineUserId = lineUserIdRaw.length > 0 && lineUserIdRaw.length <= 128 ? lineUserIdRaw : undefined;
  const orderSource =
    typeof b.orderSource === 'string' && (b.orderSource === 'line' || b.orderSource === 'web')
      ? b.orderSource
      : lineUserId
        ? 'line'
        : undefined;

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
      lineUserId,
      orderSource,
      submissionToken: submissionTokenRaw,
      delivery: {
        address,
        preferredTimeSlot,
        recipientName,
        recipientPhone,
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
  lineUserId?: string;
  orderSource?: 'line' | 'web';
  submissionToken: string;
  delivery: {
    address: string;
    preferredTimeSlot: string;
    recipientName?: string;
    recipientPhone?: string;
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
      ...(data.lineUserId && { lineUserId: data.lineUserId }),
      ...(data.orderSource && { orderSource: data.orderSource }),
      items: totals.items,
      delivery: {
        address: data.delivery.address,
        preferredTimeSlot: data.delivery.preferredTimeSlot,
        recipientName: data.delivery.recipientName,
        recipientPhone: data.delivery.recipientPhone,
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

    const { order, created } = await createPendingOrder(orderPayload);
    if (data.lineUserId && created) {
      void logLineIntegrationEvent('line_user_linked_to_order', {
        lineUserId: data.lineUserId,
        orderId: order.orderId,
      });
    }
    const baseUrl = getBaseUrl();
    const stripeMetadata = buildStripeOrderMetadata({
      orderId: order.orderId,
      source: 'lanna_bloom_checkout',
      customerEmail: data.customerEmail,
      lang: data.lang,
      lineUserId: data.lineUserId,
    });

    console.log(
      `[stripe/create-checkout-session] ${created ? 'pending order created' : 'idempotent reuse (same submission_token)'}`,
      {
        orderId: order.orderId,
        mode: stripeConfig.mode,
        hasCustomerEmail: Boolean(data.customerEmail),
      }
    );

    // Stripe requires unit_amount to be non-negative. Apply referral discount
    // proportionally across line items instead of adding a negative line.
    const subtotalCents = Math.round((totals.itemsTotal + totals.deliveryFee) * 100);
    const discountCents = Math.round(referralDiscount * 100);
    const discountRatio = subtotalCents > 0 ? discountCents / subtotalCents : 0;

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = totals.items.map(
      (item) => {
        const originalCents = Math.round(item.price * 100);
        const discountedCents = Math.max(0, Math.round(originalCents * (1 - discountRatio)));
        const productName = item.size === '—' ? item.bouquetTitle : `${item.bouquetTitle} — ${item.size}`;
        return {
          price_data: {
            currency: 'thb',
            product_data: {
              name: productName,
              description:
                item.addOns.cardType === 'premium'
                  ? 'With premium message card'
                  : undefined,
            },
            unit_amount: discountedCents,
          },
          quantity: 1,
        };
      }
    );

    if (totals.deliveryFee > 0) {
      const feeCents = Math.round(totals.deliveryFee * 100);
      const discountedFeeCents = Math.max(0, Math.round(feeCents * (1 - discountRatio)));
      lineItems.push({
        price_data: {
          currency: 'thb',
          product_data: {
            name:
              referralDiscount > 0 && data.referralCode
                ? `Delivery fee (referral: ${data.referralCode})`
                : 'Delivery fee',
          },
          unit_amount: discountedFeeCents,
        },
        quantity: 1,
      });
    }

    // Absorb any rounding difference into the first line item so Stripe total matches
    const currentTotalCents = lineItems.reduce(
      (sum, li) => sum + (li.price_data as { unit_amount?: number }).unit_amount! * (li.quantity ?? 1),
      0
    );
    const targetCents = Math.round(effectiveGrandTotal * 100);
    const diff = targetCents - currentTotalCents;
    if (diff !== 0 && lineItems.length > 0) {
      const first = lineItems[0];
      const pd = first.price_data as { unit_amount?: number };
      const newAmount = Math.max(0, (pd.unit_amount ?? 0) + diff);
      pd.unit_amount = newAmount;
    }

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        line_items: lineItems,
        client_reference_id: order.orderId,
        customer_email: data.customerEmail,
        // Redirect straight to public order page; order view handles pending vs paid.
        success_url: `${baseUrl}/order/${encodeURIComponent(order.orderId)}?checkout_token=${encodeURIComponent(data.submissionToken)}`,
        cancel_url: `${baseUrl}/${data.lang}/cart`,
        metadata: stripeMetadata,
        payment_intent_data: {
          metadata: stripeMetadata,
        },
      },
      { idempotencyKey: order.orderId }
    );

    if (!session.url) {
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
    }

    console.log('[stripe/create-checkout-session] session created', {
      orderId: order.orderId,
      sessionId: session.id,
      mode: stripeConfig.mode,
      metadata: stripeMetadata,
    });

    return NextResponse.json({
      orderId: order.orderId,
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
