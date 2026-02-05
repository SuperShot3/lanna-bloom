import { NextRequest, NextResponse } from 'next/server';
import { createOrder, getOrderDetailsUrl, listOrders } from '@/lib/orders';
import type { OrderPayload, ContactPreferenceOption } from '@/lib/orders';
import { sendOrderNotificationEmail } from '@/lib/orderEmail';

function isAdminAuthorized(request: NextRequest): boolean {
  const secret = process.env.ORDERS_ADMIN_SECRET;
  if (!secret) return process.env.NODE_ENV === 'development';
  const header = request.headers.get('x-admin-secret') ?? request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  return header === secret;
}

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
  const district = typeof d.district === 'string' ? d.district : undefined;
  const preferredTimeSlot = typeof d.preferredTimeSlot === 'string' ? d.preferredTimeSlot : '';
  if (!address && !district) {
    return { ok: false, message: 'delivery.address or delivery.district is required' };
  }
  if (address.length > 0 && (address.length < 10 || address.length > 500)) {
    return { ok: false, message: 'delivery.address must be between 10 and 500 characters' };
  }
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
      };
    }),
    delivery: {
      address,
      district,
      preferredTimeSlot,
      notes: typeof d.notes === 'string' ? d.notes : undefined,
    },
    pricing: {
      itemsTotal: typeof p.itemsTotal === 'number' ? p.itemsTotal : grandTotal,
      deliveryFee: typeof p.deliveryFee === 'number' ? p.deliveryFee : 0,
      grandTotal,
    },
    contactPreference,
  };
  return { ok: true, payload };
}

/** List all orders (admin only). Requires x-admin-secret or ORDERS_ADMIN_SECRET in production. */
export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const orders = await listOrders();
    return NextResponse.json(orders);
  } catch (e) {
    console.error('[api/orders] GET error:', e);
    return NextResponse.json({ error: 'Failed to list orders' }, { status: 500 });
  }
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
