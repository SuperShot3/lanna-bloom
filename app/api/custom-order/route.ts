import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createOrder, getOrderDetailsUrl, getOrderPublicToken } from '@/lib/orders';
import type { CustomOrderDetails, DeliveryDistrictKey, OrderPayload, OrderItem } from '@/lib/orders';
import { sendAdminNewOrderNotificationOnce } from '@/lib/orderNotification';
import { calcDeliveryFeeTHB } from '@/lib/deliveryFees';
import { detectDistrictFromAddress } from '@/lib/deliveryFees';
import type { DeliveryDestinationId } from '@/lib/delivery/markets';
import { getZoneFee, isSupportedZone, legacyDistrictFromChiangMaiZone, zoneLabel } from '@/lib/delivery/zones';
import {
  CUSTOM_ORDER_REFERENCE_IMAGE_MAX_BYTES,
  getValidCustomOrderReferenceImageContentType,
  uploadCustomOrderReferenceImage,
} from '@/lib/customOrder/uploadReferenceImage';
import { stripDuplicateThaiLeading66, thaiFullPhoneHasDuplicateCountryCode } from '@/lib/phoneFieldHints';

const CUSTOM_ORDER_ITEM_ID = 'custom-order-request';
const DELIVERY_DESTINATIONS: DeliveryDestinationId[] = [
  'CHIANG_MAI',
  'PATTAYA',
  'PHUKET',
  'KRABI',
  'SAMUI',
  'HUA_HIN',
];

function normalizeDigits(s: string): string {
  return s.replace(/\D/g, '');
}

function getString(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === 'string' ? v.trim() : '';
}

function buildPreferredTimeSlot(input: {
  day: string;
  month: string;
  year: string;
  timePreference: string;
  timeComments: string;
}): string {
  const { day, month, year, timePreference, timeComments } = input;
  const d = day && /^\d{1,2}$/.test(day) ? day.padStart(2, '0') : '';
  const m = month && /^\d{1,2}$/.test(month) ? month.padStart(2, '0') : '';
  const y = year && /^\d{4}$/.test(year) ? year : '';
  const datePart = d && m && y ? `${y}-${m}-${d}` : '';
  const parts = [datePart, timePreference, timeComments].filter(Boolean);
  return parts.length ? parts.join(' ') : '—';
}

function buildDeliveryDateLabel(input: {
  day: string;
  month: string;
  year: string;
}): string {
  const { day, month, year } = input;
  if (day && month && year) return `${day}/${month}/${year}`;
  return '';
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();

    const submissionToken = getString(form, 'submission_token');
    if (!submissionToken || submissionToken.length < 8 || submissionToken.length > 128) {
      return NextResponse.json({ error: 'submission_token is required' }, { status: 400 });
    }
    if (!/^[0-9a-fA-F-]+$/.test(submissionToken)) {
      return NextResponse.json({ error: 'submission_token has invalid format' }, { status: 400 });
    }

    const deliveryAddress = getString(form, 'deliveryAddress');
    if (deliveryAddress.length < 10 || deliveryAddress.length > 500) {
      return NextResponse.json(
        { error: 'deliveryAddress must be between 10 and 500 characters' },
        { status: 400 }
      );
    }

    const recipient = getString(form, 'recipient');
    if (!recipient) {
      return NextResponse.json({ error: 'recipient is required' }, { status: 400 });
    }

    const recipientPhoneRaw = getString(form, 'recipientPhone');
    const recipientPhone = stripDuplicateThaiLeading66(normalizeDigits(recipientPhoneRaw));
    if (recipientPhone.length < 9 || recipientPhone.length > 16) {
      return NextResponse.json({ error: 'recipientPhone must be 9–16 digits' }, { status: 400 });
    }
    if (thaiFullPhoneHasDuplicateCountryCode(recipientPhone)) {
      return NextResponse.json(
        { error: 'recipientPhone must not repeat 66 (use one full number, e.g. 66952572645)' },
        { status: 400 }
      );
    }

    const giftDescription = getString(form, 'giftDescription');
    if (!giftDescription) {
      return NextResponse.json({ error: 'giftDescription is required' }, { status: 400 });
    }

    const email = getString(form, 'email');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const yourPhoneRaw = getString(form, 'yourPhone');
    const yourPhone = stripDuplicateThaiLeading66(normalizeDigits(yourPhoneRaw));
    if (yourPhone.length < 9 || yourPhone.length > 16) {
      return NextResponse.json({ error: 'yourPhone must be 9–16 digits' }, { status: 400 });
    }
    if (thaiFullPhoneHasDuplicateCountryCode(yourPhone)) {
      return NextResponse.json(
        { error: 'yourPhone must not repeat 66 (use one full number, e.g. 66952572645)' },
        { status: 400 }
      );
    }

    const timePreference = getString(form, 'timePreference');
    if (!timePreference) {
      return NextResponse.json({ error: 'timePreference is required' }, { status: 400 });
    }

    const occasion = getString(form, 'occasion');
    if (!occasion) {
      return NextResponse.json({ error: 'occasion is required' }, { status: 400 });
    }

    const day = getString(form, 'deliveryDay');
    const month = getString(form, 'deliveryMonth');
    const year = getString(form, 'deliveryYear');
    const timeComments = getString(form, 'timeComments');
    const preferredTimeSlot = buildPreferredTimeSlot({
      day,
      month,
      year,
      timePreference,
      timeComments,
    });

    const langRaw = getString(form, 'lang');
    const locale: 'en' | 'th' = langRaw === 'th' ? 'th' : 'en';

    const destinationRaw = getString(form, 'deliveryDestination').toUpperCase();
    const deliveryDestination = DELIVERY_DESTINATIONS.includes(destinationRaw as DeliveryDestinationId)
      ? (destinationRaw as DeliveryDestinationId)
      : 'CHIANG_MAI';
    const deliveryZoneId = getString(form, 'deliveryZoneId');
    if (!deliveryZoneId || !isSupportedZone(deliveryDestination, deliveryZoneId)) {
      return NextResponse.json({ error: 'Valid delivery zone is required' }, { status: 400 });
    }
    const zoneFee = getZoneFee(deliveryDestination, deliveryZoneId);
    if (zoneFee == null) {
      return NextResponse.json({ error: 'Failed to resolve delivery fee for selected zone' }, { status: 400 });
    }
    const legacyDistrict =
      deliveryDestination === 'CHIANG_MAI'
        ? legacyDistrictFromChiangMaiZone(deliveryZoneId)
        : { deliveryDistrict: detectDistrictFromAddress(deliveryAddress) ?? 'UNKNOWN', isMueangCentral: false };
    const district: DeliveryDistrictKey = legacyDistrict.deliveryDistrict;
    const isMueangCentral = legacyDistrict.isMueangCentral;
    const deliveryFee = zoneFee;
    const deliveryZoneLabel = zoneLabel(deliveryDestination, deliveryZoneId, locale);

    const yourName = getString(form, 'yourName');
    const greetingCard = getString(form, 'greetingCard');
    const estimatedCost = getString(form, 'estimatedCost');
    const comments = getString(form, 'comments');

    const customOrderDetails: CustomOrderDetails = {
      giftDescription,
      occasion,
      greetingCard: greetingCard || undefined,
      estimatedBudgetTHB: estimatedCost || undefined,
      deliveryDateLabel: buildDeliveryDateLabel({ day, month, year }) || undefined,
      timePreference,
      timeComments: timeComments || undefined,
      customerComments: comments || undefined,
      locale,
    };

    const file = form.get('referenceImage');
    const uploadKey = randomUUID();
    if (file instanceof File && file.size > 0) {
      if (file.size > CUSTOM_ORDER_REFERENCE_IMAGE_MAX_BYTES) {
        return NextResponse.json({ error: 'Reference image must be 4 MB or smaller' }, { status: 400 });
      }
      const validContentType = await getValidCustomOrderReferenceImageContentType(file);
      if (!validContentType) {
        return NextResponse.json(
          { error: 'Reference image must be a JPEG, PNG, WebP, or GIF image' },
          { status: 400 }
        );
      }
      const uploaded = await uploadCustomOrderReferenceImage(file, uploadKey);
      if (uploaded) {
        customOrderDetails.referenceImageUrl = uploaded.url;
        customOrderDetails.referenceImageFilename = file.name;
      } else {
        customOrderDetails.referenceImageFilename = file.name;
      }
    }

    const syntheticItem: OrderItem = {
      bouquetId: CUSTOM_ORDER_ITEM_ID,
      bouquetTitle: 'Custom bouquet (request)',
      size: 'Quote pending',
      price: 0,
      addOns: {
        cardType: null,
        cardMessage: '',
        wrappingOption: null,
      },
      itemType: 'bouquet',
    };

    const payload: OrderPayload = {
      customerName: yourName || undefined,
      phone: yourPhone,
      customerEmail: email,
      items: [syntheticItem],
      delivery: {
        address: deliveryAddress,
        preferredTimeSlot,
        recipientName: recipient,
        recipientPhone,
        notes: comments || undefined,
        deliveryDestination,
        deliveryZoneId,
        deliveryZoneLabel: deliveryZoneLabel ?? undefined,
        deliveryDistrict: district,
        isMueangCentral,
      },
      pricing: {
        itemsTotal: 0,
        deliveryFee,
        grandTotal: deliveryFee,
      },
      contactPreference: ['phone', 'whatsapp'],
      orderSource: 'custom_form',
      customOrderDetails,
      submissionToken,
    };

    const { order, created } = await createOrder(payload);
    const orderToken = await getOrderPublicToken(order.orderId);
    const publicOrderUrl = getOrderDetailsUrl(order.orderId, { token: orderToken });

    await sendAdminNewOrderNotificationOnce(order.orderId).catch((e) => {
      console.error('[api/custom-order] Admin new-order notification failed:', e);
    });

    return NextResponse.json({
      orderId: order.orderId,
      publicOrderUrl,
      created,
    });
  } catch (e) {
    const message =
      e && typeof e === 'object' && 'message' in e && typeof (e as { message?: unknown }).message === 'string'
        ? (e as { message: string }).message
        : e instanceof Error
          ? e.message
          : 'Failed to create custom order';
    console.error('[api/custom-order] POST error:', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
