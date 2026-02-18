import { NextRequest, NextResponse } from 'next/server';
import { createOrder, getOrderDetailsUrl } from '@/lib/orders';
import type { OrderPayload, ContactPreferenceOption, DeliveryDistrictKey } from '@/lib/orders';
import { sendOrderNotificationEmail, sendCustomerConfirmationEmail } from '@/lib/orderEmail';
import { calcDeliveryFeeTHB } from '@/lib/deliveryFees';

function validatePayload(body: unknown): { ok: true; payload: OrderPayload } | { ok: false; message: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, message: 'Invalid JSON body' };
  }
  const b = body as Record<string, unknown>;
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
  const preferredTimeSlot = typeof d.preferredTimeSlot === 'string' ? d.preferredTimeSlot : '';
  const recipientName = typeof d.recipientName === 'string' ? d.recipientName.trim() : undefined;
  const recipientPhone = typeof d.recipientPhone === 'string' ? d.recipientPhone.trim() : undefined;
  if (!address || address.length < 10 || address.length > 500) {
    return { ok: false, message: 'delivery.address is required (10–500 characters)' };
  }
  const validDistricts: DeliveryDistrictKey[] = ['MUEANG','SARAPHI','SAN_SAI','HANG_DONG','SAN_KAMPHAENG','MAE_RIM','DOI_SAKET','MAE_ON','SAMOENG','MAE_TAENG','UNKNOWN'];
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

  const phone = typeof b.phone === 'string' ? b.phone.trim() : '';
  if (!phone) {
    return { ok: false, message: 'phone is required' };
  }
  if (!/^\d+$/.test(phone)) {
    return { ok: false, message: 'phone must contain only digits (numbers)' };
  }
  if (phone.length < 9 || phone.length > 16) {
    return { ok: false, message: 'phone must be 9–16 digits (country code + number)' };
  }

  const customerEmail = typeof b.customerEmail === 'string' ? b.customerEmail.trim() : undefined;
  if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    return { ok: false, message: 'customerEmail must be a valid email address' };
  }

  const contactPreferenceRaw = b.contactPreference;
  const contactPreference: ContactPreferenceOption[] = Array.isArray(contactPreferenceRaw)
    ? contactPreferenceRaw.filter(
        (v): v is ContactPreferenceOption =>
          v === 'phone' || v === 'line' || v === 'telegram' || v === 'whatsapp'
      )
    : [];
  if (contactPreference.length === 0) {
    return { ok: false, message: 'At least one contactPreference is required (phone, line, whatsapp, or telegram)' };
  }

  const payload: OrderPayload = {
    customerName,
    phone: typeof b.phone === 'string' ? b.phone.trim() || undefined : undefined,
    customerEmail: customerEmail || undefined,
    items: items.map((it: unknown) => {
      const i = it as Record<string, unknown>;
      const addOns = (i.addOns as Record<string, unknown>) ?? {};
      return {
        bouquetId: typeof i.bouquetId === 'string' ? i.bouquetId : '',
        bouquetTitle: typeof i.bouquetTitle === 'string' ? i.bouquetTitle : '',
        size: typeof i.size === 'string' ? i.size : '',
        price: typeof i.price === 'number' ? i.price : 0,
        addOns: {
          cardType: (addOns.cardType as OrderPayload['items'][0]['addOns']['cardType']) ?? null,
          cardMessage: typeof addOns.cardMessage === 'string' ? addOns.cardMessage : '',
          wrappingOption: (addOns.wrappingOption as OrderPayload['items'][0]['addOns']['wrappingOption']) ?? null,
        },
        imageUrl: typeof i.imageUrl === 'string' ? i.imageUrl : undefined,
        bouquetSlug: typeof i.bouquetSlug === 'string' ? i.bouquetSlug : undefined,
      };
    }),
    delivery: {
      address,
      preferredTimeSlot,
      recipientName: recipientName || undefined,
      recipientPhone: recipientPhone || undefined,
      notes: typeof d.notes === 'string' ? d.notes : undefined,
      deliveryLat: typeof d.deliveryLat === 'number' ? d.deliveryLat : undefined,
      deliveryLng: typeof d.deliveryLng === 'number' ? d.deliveryLng : undefined,
      deliveryGoogleMapsUrl: typeof d.deliveryGoogleMapsUrl === 'string' ? d.deliveryGoogleMapsUrl : undefined,
      deliveryDistrict,
      isMueangCentral,
    },
    pricing: (() => {
      const itemsFromPayload = items.map((it: unknown) => {
        const i = it as Record<string, unknown>;
        return { price: typeof i.price === 'number' ? i.price : 0 };
      });
      const itemsTotal = itemsFromPayload.reduce((sum, it) => sum + it.price, 0);
      const deliveryFee = calcDeliveryFeeTHB({ district: deliveryDistrict, isMueangCentral });
      const subtotal = itemsTotal + deliveryFee;
      const refCode = typeof b.referralCode === 'string' ? (b.referralCode as string).trim() : '';
      const refDiscountRaw = typeof b.referralDiscount === 'number' ? b.referralDiscount : 0;
      const refDiscount = refCode && refDiscountRaw > 0
        ? Math.min(100, Math.floor(refDiscountRaw), subtotal)
        : 0;
      return {
        itemsTotal,
        deliveryFee,
        grandTotal: subtotal - refDiscount,
      };
    })(),
    contactPreference,
    ...(typeof b.referralCode === 'string' && (b.referralCode as string).trim() && typeof b.referralDiscount === 'number' && (b.referralDiscount as number) > 0
      ? {
          referralCode: (b.referralCode as string).trim(),
          referralDiscount: Math.min(100, Math.floor(b.referralDiscount as number)),
        }
      : {}),
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
    const order = await createOrder(result.payload);
    const publicOrderUrl = getOrderDetailsUrl(order.orderId);
    const shareText = `New order: ${order.orderId}. Details: ${publicOrderUrl}`;

    sendOrderNotificationEmail(order, publicOrderUrl).catch((e) => {
      console.error('[api/orders] Notification email failed:', e);
    });
    sendCustomerConfirmationEmail(order, publicOrderUrl).catch((e) => {
      console.error('[api/orders] Customer confirmation email failed:', e);
    });

    return NextResponse.json({
      orderId: order.orderId,
      publicOrderUrl,
      shareText,
    });
  } catch (e) {
    console.error('[api/orders] POST error:', e);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
