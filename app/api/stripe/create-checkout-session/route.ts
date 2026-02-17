import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { computeOrderTotals, type CartItemIdentifier } from '@/lib/stripePricing';
import { createPendingOrder, getBaseUrl } from '@/lib/orders';
import type { OrderPayload, ContactPreferenceOption } from '@/lib/orders';
import type { Locale } from '@/lib/i18n';
import type { DistrictKey } from '@/lib/deliveryFees';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

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

  const customerName = typeof b.customerName === 'string' ? b.customerName.trim() : '';
  if (!customerName) return { ok: false, message: 'customerName is required' };

  const phone = typeof b.phone === 'string' ? b.phone.trim() : '';
  if (!phone) return { ok: false, message: 'phone is required' };
  if (!/^\d+$/.test(phone)) return { ok: false, message: 'phone must contain only digits' };
  if (phone.length < 9 || phone.length > 16) {
    return { ok: false, message: 'phone must be 9–16 digits' };
  }

  const contactPreferenceRaw = b.contactPreference;
  const contactPreference: ContactPreferenceOption[] = Array.isArray(contactPreferenceRaw)
    ? contactPreferenceRaw.filter(
        (v): v is ContactPreferenceOption =>
          v === 'phone' || v === 'line' || v === 'telegram' || v === 'whatsapp'
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
    return {
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
      },
      imageUrl: typeof i.imageUrl === 'string' ? i.imageUrl : undefined,
    };
  });

  const preferredTimeSlot =
    typeof d.preferredTimeSlot === 'string' ? d.preferredTimeSlot : '';
  const recipientName = typeof d.recipientName === 'string' ? d.recipientName.trim() : undefined;
  const recipientPhone = typeof d.recipientPhone === 'string' ? d.recipientPhone.trim() : undefined;

  const validDistricts = ['MUEANG','SARAPHI','SAN_SAI','HANG_DONG','SAN_KAMPHAENG','MAE_RIM','DOI_SAKET','MAE_ON','SAMOENG','MAE_TAENG','UNKNOWN'] as const;
  const deliveryDistrict = typeof d.deliveryDistrict === 'string' && validDistricts.includes(d.deliveryDistrict as typeof validDistricts[number])
    ? (d.deliveryDistrict as typeof validDistricts[number])
    : 'UNKNOWN';
  const isMueangCentral = d.deliveryDistrict === 'MUEANG' && d.isMueangCentral === true;

  return {
    ok: true,
    data: {
      lang,
      customerName,
      phone,
      contactPreference,
      items: cartItems,
      delivery: {
        address,
        preferredTimeSlot,
        recipientName,
        recipientPhone,
        notes: typeof d.notes === 'string' ? d.notes : undefined,
        deliveryLat: typeof d.deliveryLat === 'number' ? d.deliveryLat : undefined,
        deliveryLng: typeof d.deliveryLng === 'number' ? d.deliveryLng : undefined,
        deliveryGoogleMapsUrl: typeof d.deliveryGoogleMapsUrl === 'string' ? d.deliveryGoogleMapsUrl : undefined,
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
  contactPreference: ContactPreferenceOption[];
  items: CartItemIdentifier[];
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
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
  }

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

    const orderPayload: OrderPayload = {
      customerName: data.customerName,
      phone: data.phone,
      contactPreference: data.contactPreference,
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
        deliveryDistrict: data.delivery.deliveryDistrict,
        isMueangCentral: data.delivery.isMueangCentral,
      },
      pricing: {
        itemsTotal: totals.itemsTotal,
        deliveryFee: totals.deliveryFee,
        grandTotal: totals.grandTotal,
      },
    };

    const order = await createPendingOrder(orderPayload);
    const baseUrl = getBaseUrl();

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = totals.items.map(
      (item) => ({
        price_data: {
          currency: 'thb',
          product_data: {
            name: `${item.bouquetTitle} — ${item.size}`,
            description:
              item.addOns.cardType === 'premium'
                ? 'With premium message card'
                : undefined,
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: 1,
      })
    );

    if (totals.deliveryFee > 0) {
      lineItems.push({
        price_data: {
          currency: 'thb',
          product_data: {
            name: 'Delivery fee',
          },
          unit_amount: Math.round(totals.deliveryFee * 100),
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        line_items: lineItems,
        success_url: `${baseUrl}/${data.lang}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/${data.lang}/cart`,
        metadata: {
          orderId: order.orderId,
          lang: data.lang,
        },
      },
      { idempotencyKey: order.orderId }
    );

    if (!session.url) {
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
    }

    return NextResponse.json({
      orderId: order.orderId,
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
