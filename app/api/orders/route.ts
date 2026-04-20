import { NextRequest, NextResponse } from 'next/server';
import { createOrder, getOrderDetailsUrl, getOrderPublicToken } from '@/lib/orders';
import type { OrderPayload, ContactPreferenceOption, DeliveryDistrictKey } from '@/lib/orders';
import { calcDeliveryFeeTHB } from '@/lib/deliveryFees';
import { getDiscountForCode } from '@/lib/referral';
import { validateCatalogItemRef } from '@/lib/line-catalog/searchCatalog';
import { isValidGoogleMapsUrl } from '@/lib/googleMapsUrl';
import { stripDuplicateThaiLeading66, thaiFullPhoneHasDuplicateCountryCode } from '@/lib/phoneFieldHints';

function validatePayload(body: unknown): { ok: true; payload: OrderPayload } | { ok: false; message: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, message: 'Invalid JSON body' };
  }
  const b = body as Record<string, unknown>;
  const items = b.items;
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, message: 'items must be a non-empty array' };
  }

  // Enforce: orders can only contain products that exist in the website catalog.
  for (const it of items) {
    if (!it || typeof it !== 'object') return { ok: false, message: 'Invalid item in items[]' };
    const i = it as Record<string, unknown>;
    const bouquetId = typeof i.bouquetId === 'string' ? i.bouquetId.trim() : '';
    const bouquetSlug = typeof i.bouquetSlug === 'string' ? i.bouquetSlug.trim() : '';
    const ref = validateCatalogItemRef({ id: bouquetId, slug: bouquetSlug || undefined });
    if (!ref.ok) {
      return { ok: false, message: `Invalid catalog item in items[]: ${ref.message}` };
    }
  }
  const delivery = b.delivery;
  if (!delivery || typeof delivery !== 'object') {
    return { ok: false, message: 'delivery is required' };
  }
  const d = delivery as Record<string, unknown>;
  const address = typeof d.address === 'string' ? d.address.trim() : '';
  const preferredTimeSlot = typeof d.preferredTimeSlot === 'string' ? d.preferredTimeSlot : '';
  const recipientName = typeof d.recipientName === 'string' ? d.recipientName.trim() : undefined;
  const recipientPhoneRaw = typeof d.recipientPhone === 'string' ? d.recipientPhone.trim() : undefined;
  const recipientPhone = recipientPhoneRaw
    ? stripDuplicateThaiLeading66(recipientPhoneRaw)
    : undefined;
  const surpriseDelivery =
    d.surpriseDelivery === true ? true : d.surpriseDelivery === false ? false : undefined;
  if (!address || address.length < 10 || address.length > 500) {
    return { ok: false, message: 'delivery.address is required (10–500 characters)' };
  }
  const deliveryGoogleMapsUrlRaw =
    typeof d.deliveryGoogleMapsUrl === 'string' ? d.deliveryGoogleMapsUrl.trim() : '';
  if (deliveryGoogleMapsUrlRaw && !isValidGoogleMapsUrl(deliveryGoogleMapsUrlRaw)) {
    return { ok: false, message: 'delivery.deliveryGoogleMapsUrl must be a valid Google Maps link' };
  }
  const validDistricts: DeliveryDistrictKey[] = ['MUEANG','SARAPHI','SAN_SAI','HANG_DONG','SAN_KAMPHAENG','MAE_RIM','DOI_SAKET','MAE_ON','SAMOENG','MAE_TAENG','LAMPHUN','UNKNOWN'];
  const deliveryDistrict = typeof d.deliveryDistrict === 'string' && validDistricts.includes(d.deliveryDistrict as DeliveryDistrictKey)
    ? (d.deliveryDistrict as DeliveryDistrictKey)
    : 'UNKNOWN';
  const isMueangCentral = d.deliveryDistrict === 'MUEANG' && d.isMueangCentral === true;
  const pricing = b.pricing;
  if (!pricing || typeof pricing !== 'object') {
    return { ok: false, message: 'pricing is required' };
  }
  const p = pricing as Record<string, unknown>;
  const grandTotal = typeof p.grandTotal === 'number' ? p.grandTotal : NaN;
  if (Number.isNaN(grandTotal) || grandTotal < 0) {
    return { ok: false, message: 'pricing.grandTotal must be a non-negative number' };
  }
  const customerName = typeof b.customerName === 'string' ? b.customerName.trim() : '';
  if (!customerName) {
    return { ok: false, message: 'customerName is required' };
  }

  const phone = stripDuplicateThaiLeading66(typeof b.phone === 'string' ? b.phone.trim() : '');
  if (!phone) {
    return { ok: false, message: 'phone is required' };
  }
  if (!/^\d+$/.test(phone)) {
    return { ok: false, message: 'phone must contain only digits (numbers)' };
  }
  if (phone.length < 9 || phone.length > 16) {
    return { ok: false, message: 'phone must be 9–16 digits (country code + number)' };
  }
  if (thaiFullPhoneHasDuplicateCountryCode(phone)) {
    return {
      ok: false,
      message: 'phone must not repeat country code 66 (use one full number, e.g. 66952572645)',
    };
  }
  if (
    recipientPhone &&
    /^\d+$/.test(recipientPhone) &&
    thaiFullPhoneHasDuplicateCountryCode(recipientPhone)
  ) {
    return {
      ok: false,
      message:
        'recipientPhone must not repeat country code 66 (use one full number, e.g. 66952572645)',
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
    return { ok: false, message: 'At least one contactPreference is required (phone, line, or whatsapp)' };
  }

  const itemsFromPayload = items.map((it: unknown) => {
    const i = it as Record<string, unknown>;
    return { price: typeof i.price === 'number' ? i.price : 0 };
  });
  const itemsTotal = itemsFromPayload.reduce((sum, it) => sum + it.price, 0);
  const deliveryFee = calcDeliveryFeeTHB({ district: deliveryDistrict, isMueangCentral });
  const subtotal = itemsTotal + deliveryFee;
  const refCode = typeof b.referralCode === 'string' ? (b.referralCode as string).trim() : '';
  const refDiscount = refCode ? getDiscountForCode(refCode, subtotal) : 0;

  const gaClientIdRaw = typeof b.ga_client_id === 'string' ? (b.ga_client_id as string).trim() : '';
  const ga_client_id = gaClientIdRaw.length > 0 && gaClientIdRaw.length <= 200 ? gaClientIdRaw : undefined;

  const submissionTokenRaw = typeof b.submission_token === 'string' ? b.submission_token.trim() : '';
  if (!submissionTokenRaw || submissionTokenRaw.length < 8 || submissionTokenRaw.length > 128) {
    return { ok: false, message: 'submission_token is required (8–128 characters)' };
  }
  if (!/^[0-9a-fA-F-]+$/.test(submissionTokenRaw)) {
    return { ok: false, message: 'submission_token has invalid format' };
  }

  const payload: OrderPayload = {
    customerName,
    phone: typeof b.phone === 'string' ? b.phone.trim() || undefined : undefined,
    customerEmail: customerEmail || undefined,
    items: items.map((it: unknown) => {
      const i = it as Record<string, unknown>;
      const addOns = (i.addOns as Record<string, unknown>) ?? {};
      const bouquetId = typeof i.bouquetId === 'string' ? i.bouquetId.trim() : '';
      const bouquetSlug = typeof i.bouquetSlug === 'string' ? i.bouquetSlug.trim() : '';
      const catalog = validateCatalogItemRef({ id: bouquetId, slug: bouquetSlug || undefined });
      return {
        bouquetId,
        bouquetTitle: typeof i.bouquetTitle === 'string' ? i.bouquetTitle : '',
        size: typeof i.size === 'string' ? i.size : '',
        price: typeof i.price === 'number' ? i.price : 0,
        addOns: {
          cardType: (addOns.cardType as OrderPayload['items'][0]['addOns']['cardType']) ?? null,
          cardMessage: typeof addOns.cardMessage === 'string' ? addOns.cardMessage : '',
          wrappingOption: (addOns.wrappingOption as OrderPayload['items'][0]['addOns']['wrappingOption']) ?? null,
        },
        imageUrl: typeof i.imageUrl === 'string' ? i.imageUrl : undefined,
        bouquetSlug: bouquetSlug || undefined,
        ...(catalog.ok
          ? {
              itemType:
                catalog.item.type === 'product'
                  ? 'product'
                  : catalog.item.type === 'plushyToy'
                    ? 'plushyToy'
                    : 'bouquet',
            }
          : {}),
      };
    }),
    delivery: {
      address,
      preferredTimeSlot,
      recipientName: recipientName || undefined,
      recipientPhone: recipientPhone || undefined,
      ...(surpriseDelivery !== undefined && { surpriseDelivery }),
      notes: typeof d.notes === 'string' ? d.notes : undefined,
      deliveryLat: typeof d.deliveryLat === 'number' ? d.deliveryLat : undefined,
      deliveryLng: typeof d.deliveryLng === 'number' ? d.deliveryLng : undefined,
      deliveryGoogleMapsUrl: deliveryGoogleMapsUrlRaw || undefined,
      deliveryDistrict,
      isMueangCentral,
    },
    pricing: {
      itemsTotal,
      deliveryFee,
      grandTotal: subtotal - refDiscount,
    },
    contactPreference,
    ...(refCode && refDiscount > 0 ? { referralCode: refCode, referralDiscount: refDiscount } : {}),
    ...(ga_client_id && { ga_client_id }),
    submissionToken: submissionTokenRaw,
  };
  return { ok: true, payload };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = validatePayload(body);
    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }
    const { order } = await createOrder(result.payload);
    const orderToken = await getOrderPublicToken(order.orderId);
    const publicOrderUrl = getOrderDetailsUrl(order.orderId, { token: orderToken });
    const shareText = `New order: ${order.orderId}. Details: ${publicOrderUrl}`;

    // Admin email: website checkout uses Stripe (notify on payment). Legacy POST callers that
    // create unpaid orders do not trigger admin email here — use custom-order or ops workflows.

    return NextResponse.json({
      orderId: order.orderId,
      publicOrderUrl,
      shareText,
    });
  } catch (e) {
    const message =
      (e && typeof e === 'object' && 'message' in e && typeof (e as { message?: unknown }).message === 'string')
        ? (e as { message: string }).message
        : e instanceof Error
          ? e.message
          : 'Failed to create order';
    console.error('[api/orders] POST error:', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
