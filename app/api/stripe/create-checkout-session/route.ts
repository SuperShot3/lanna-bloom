import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { computeOrderTotals, type CartItemIdentifier } from '@/lib/stripePricing';
import {
  buildStripeCheckoutLineItems,
  stripeCheckoutDraftSuccessUrl,
} from '@/lib/stripe/checkoutStripeLineItems';
import { getBaseUrl } from '@/lib/orders';
import { getReferralCommissionForCode, validateReferralCode } from '@/lib/referral';
import type { OrderPayload, ContactPreferenceOption, OrderDeliveryDestinationId } from '@/lib/orders';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { isWelcomeCode, lookupDbWelcomeCode } from '@/lib/promo/welcomeCode';
import { resolveOrderDiscountServer } from '@/lib/promo/resolveOrderDiscountServer';
import { inferPostalCodeFromDelivery } from '@/lib/delivery/postalInference';
import { resolveDeliveryZoneFromPlace } from '@/lib/delivery/resolveDeliveryZoneFromPlace';
import { buildDriverMapsSearchUrl } from '@/lib/google/buildDriverMapsUrl';
import {
  findZoneDef,
  isInferredPostcodeAllowedForZone,
  legacyDistrictFromChiangMaiZone,
  zoneLabel,
} from '@/lib/delivery/zones';
import { buildStripeCheckoutDraftMetadata } from '@/lib/stripe/metadata';
import { upsertCheckoutDraft } from '@/lib/checkout/checkoutDrafts';
import { scheduleCheckoutAbandonment } from '@/lib/checkout/abandonedCheckout';
import { createStripeServerClient, getStripeServerConfig } from '@/lib/stripe/server';
import { stripeIdempotencyFingerprint } from '@/lib/stripe/idempotency';
import { isValidGoogleMapsUrl } from '@/lib/googleMapsUrl';
import {
  DELIVERY_ADDRESS_MIN_CHARS,
  isDeliveryAddressSufficient,
} from '@/lib/checkout/premiumCheckoutValidation';
import {
  callingCodeMismatchError,
  normalizeOptionalCallingCodeDigits,
  stripDuplicateThaiLeading66,
  thaiFullPhoneHasDuplicateCountryCode,
} from '@/lib/phoneFieldHints';
import { BALLOON_TEXT_MAX_LENGTH, normalizeBalloonText } from '@/lib/balloonCustomization';
import {
  isSpecificWrappingPaperColor,
  isWrappingPaperColorId,
} from '@/lib/wrappingPaperColors';
import { EXPANSION_MARKUP_DESTINATIONS } from '@/lib/expansionMarkup';
import { isValidLineUserId, normalizeLineUserId } from '@/lib/lineUserId';
import { CHECKOUT_FIELD_LIMITS } from '@/lib/checkout/checkoutFieldLimits';
import { validateCheckoutFieldMaxLengths } from '@/lib/checkout/validateCheckoutFieldLimits';

function validateStripePayload(
  body: unknown
): { ok: true; data: StripeCheckoutPayload } | { ok: false; message: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, message: 'Invalid JSON body' };
  }
  const b = body as Record<string, unknown>;

  const lang = (typeof b.lang === 'string' && isValidLocale(b.lang) ? b.lang : 'en') as Locale;

  const items = b.items;
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, message: 'items must be a non-empty array' };
  }
  const cardMessages: string[] = [];
  for (const it of items) {
    const i = it as Record<string, unknown>;
    const addOns = (i.addOns as Record<string, unknown>) ?? {};
    if (
      i.itemType === 'balloon' &&
      typeof addOns.balloonText === 'string' &&
      addOns.balloonText.trim().length > BALLOON_TEXT_MAX_LENGTH
    ) {
      return {
        ok: false,
        message: `balloonText must be ${BALLOON_TEXT_MAX_LENGTH} characters or fewer`,
      };
    }
    if (typeof addOns.cardMessage === 'string') {
      cardMessages.push(addOns.cardMessage.trim());
    }
    const itemTypeRaw = i.itemType;
    const itemTypeForPaper =
      itemTypeRaw === 'product'
        ? 'product'
        : itemTypeRaw === 'plushyToy'
          ? 'plushyToy'
          : itemTypeRaw === 'balloon'
            ? 'balloon'
            : 'bouquet';
    if (addOns.paperColor != null && addOns.paperColor !== '') {
      if (!isWrappingPaperColorId(addOns.paperColor)) {
        return { ok: false, message: 'Invalid paperColor value' };
      }
      if (itemTypeForPaper !== 'bouquet') {
        return { ok: false, message: 'paperColor is only allowed for bouquet items' };
      }
    }
  }

  const delivery = b.delivery;
  if (!delivery || typeof delivery !== 'object') {
    return { ok: false, message: 'delivery is required' };
  }
  const d = delivery as Record<string, unknown>;
  const address = typeof d.address === 'string' ? d.address.trim() : '';
  const deliveryPlaceId =
    typeof d.deliveryPlaceId === 'string' ? d.deliveryPlaceId.trim() : '';
  const deliveryLat = typeof d.deliveryLat === 'number' ? d.deliveryLat : undefined;
  const deliveryLng = typeof d.deliveryLng === 'number' ? d.deliveryLng : undefined;
  const hasGooglePlace =
    Boolean(deliveryPlaceId) &&
    typeof deliveryLat === 'number' &&
    typeof deliveryLng === 'number';
  if (deliveryPlaceId && !hasGooglePlace) {
    return {
      ok: false,
      message: 'delivery coordinates are required when deliveryPlaceId is set',
    };
  }
  let deliveryGoogleMapsUrlRaw =
    typeof d.deliveryGoogleMapsUrl === 'string' ? d.deliveryGoogleMapsUrl.trim() : '';
  if (hasGooglePlace && !deliveryGoogleMapsUrlRaw) {
    deliveryGoogleMapsUrlRaw = buildDriverMapsSearchUrl(deliveryLat!, deliveryLng!);
  }
  if (deliveryGoogleMapsUrlRaw) {
    if (deliveryGoogleMapsUrlRaw.length > CHECKOUT_FIELD_LIMITS.googleMapsUrl) {
      return { ok: false, message: 'delivery.deliveryGoogleMapsUrl exceeds maximum length' };
    }
    if (!isValidGoogleMapsUrl(deliveryGoogleMapsUrlRaw)) {
      return { ok: false, message: 'delivery.deliveryGoogleMapsUrl must be a valid Google Maps link' };
    }
  }
  if (address.length > CHECKOUT_FIELD_LIMITS.deliveryAddress) {
    return {
      ok: false,
      message: `delivery.address exceeds maximum length (${CHECKOUT_FIELD_LIMITS.deliveryAddress})`,
    };
  }
  if (!isDeliveryAddressSufficient(address, deliveryGoogleMapsUrlRaw || undefined)) {
    return {
      ok: false,
      message: `delivery.address is required (${DELIVERY_ADDRESS_MIN_CHARS}–${CHECKOUT_FIELD_LIMITS.deliveryAddress} characters) or a valid Google Maps link`,
    };
  }

  const deliveryNotesRaw = typeof d.notes === 'string' ? d.notes.trim() : '';

  const customerName = typeof b.customerName === 'string' ? b.customerName.trim() : '';
  if (!customerName) return { ok: false, message: 'customerName is required' };
  if (customerName.length > CHECKOUT_FIELD_LIMITS.customerName) {
    return { ok: false, message: 'customerName exceeds maximum length' };
  }

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

  const phoneCcRaw = b.phoneCountryCode;
  if (
    phoneCcRaw !== undefined &&
    phoneCcRaw !== null &&
    String(phoneCcRaw).trim() !== '' &&
    !normalizeOptionalCallingCodeDigits(phoneCcRaw)
  ) {
    return { ok: false, message: 'phoneCountryCode must be 1–3 digits (calling code only)' };
  }
  const phoneCcErr = callingCodeMismatchError(phone, phoneCcRaw, 'phoneCountryCode');
  if (phoneCcErr) {
    return { ok: false, message: phoneCcErr };
  }

  const customerEmail = typeof b.customerEmail === 'string' ? b.customerEmail.trim() : undefined;
  if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    return { ok: false, message: 'customerEmail must be a valid email address' };
  }

  const marketingEmailConsent = b.marketingEmailConsent === true;

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

  const lineIdNormalized =
    typeof b.lineId === 'string' ? normalizeLineUserId(b.lineId) : '';
  const wantsLineContact = contactPreference.includes('line');
  if (wantsLineContact) {
    if (!lineIdNormalized) {
      return { ok: false, message: 'lineId is required when LINE is selected as a contact method' };
    }
    if (!isValidLineUserId(lineIdNormalized)) {
      return {
        ok: false,
        message:
          'lineId must be plain LINE profile text (letters, numbers, . _ -), 4–64 characters — no links or @',
      };
    }
  }

  const cartItems: CartItemIdentifier[] = items.map((it: unknown) => {
    const i = it as Record<string, unknown>;
    const addOns = (i.addOns as Record<string, unknown>) ?? {};
    const cardType = addOns.cardType as string | undefined;
    const wrappingOption = addOns.wrappingOption as string | undefined;
    const itemType = (i.itemType === 'product'
      ? 'product'
      : i.itemType === 'plushyToy'
        ? 'plushyToy'
        : i.itemType === 'balloon'
          ? 'balloon'
        : 'bouquet') as 'bouquet' | 'product' | 'plushyToy' | 'balloon';
    const balloonText = itemType === 'balloon' ? normalizeBalloonText(addOns.balloonText) : undefined;
    const paperColorRaw = addOns.paperColor;
    const paperColor =
      itemType === 'bouquet' &&
      typeof paperColorRaw === 'string' &&
      isSpecificWrappingPaperColor(paperColorRaw)
        ? paperColorRaw
        : undefined;
    const productAddOnsRaw = addOns.productAddOns;
    const productAddOns =
      productAddOnsRaw && typeof productAddOnsRaw === 'object'
        ? (productAddOnsRaw as Record<string, boolean>)
        : undefined;
    return {
      itemType,
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
        ...(balloonText && { balloonText }),
        ...(paperColor && { paperColor }),
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

  const recipientCcRaw = d.recipientPhoneCountryCode;
  if (
    recipientCcRaw !== undefined &&
    recipientCcRaw !== null &&
    String(recipientCcRaw).trim() !== '' &&
    !normalizeOptionalCallingCodeDigits(recipientCcRaw)
  ) {
    return {
      ok: false,
      message: 'recipientPhoneCountryCode must be 1–3 digits (calling code only)',
    };
  }
  if (recipientPhone && /^\d+$/.test(recipientPhone)) {
    const recCcErr = callingCodeMismatchError(
      recipientPhone,
      recipientCcRaw,
      'recipientPhoneCountryCode'
    );
    if (recCcErr) {
      return { ok: false, message: recCcErr };
    }
  } else if (normalizeOptionalCallingCodeDigits(recipientCcRaw)) {
    return { ok: false, message: 'recipientPhoneCountryCode requires delivery.recipientPhone' };
  }

  const allowedDest: OrderDeliveryDestinationId[] = [
    'CHIANG_MAI',
    'PATTAYA',
    'PHUKET',
    'KRABI',
    'SAMUI',
    'HUA_HIN',
  ];
  const destRaw = d.deliveryDestination;
  const deliveryDestination =
    typeof destRaw === 'string' && (allowedDest as string[]).includes(destRaw)
      ? (destRaw as OrderDeliveryDestinationId)
      : null;
  if (!deliveryDestination) {
    return { ok: false, message: 'delivery.deliveryDestination is required' };
  }
  const deliveryZoneId =
    typeof d.deliveryZoneId === 'string' ? d.deliveryZoneId.trim() : '';
  if (!deliveryZoneId) {
    return { ok: false, message: 'delivery.deliveryZoneId is required' };
  }
  const referralCodeRaw = typeof b.referralCode === 'string' ? b.referralCode.trim() : undefined;
  let referralCode: string | undefined;
  if (referralCodeRaw) {
    const referralCodeValidation = validateReferralCode(referralCodeRaw);
    if (!referralCodeValidation.valid) {
      return {
        ok: false,
        message: referralCodeValidation.error ?? 'Invalid referral code',
      };
    }
    referralCode = referralCodeValidation.code;
  }
  const referralDiscount = typeof b.referralDiscount === 'number' && b.referralDiscount > 0 ? b.referralDiscount : 0;

  const submissionTokenRaw = typeof b.submission_token === 'string' ? b.submission_token.trim() : '';
  if (!submissionTokenRaw || submissionTokenRaw.length < 8 || submissionTokenRaw.length > 128) {
    return { ok: false, message: 'submission_token is required (8–128 characters)' };
  }
  if (!/^[0-9a-fA-F-]+$/.test(submissionTokenRaw)) {
    return { ok: false, message: 'submission_token has invalid format' };
  }

  const fieldLimitCheck = validateCheckoutFieldMaxLengths({
    deliveryAddress: address,
    deliveryGoogleMapsUrl: deliveryGoogleMapsUrlRaw || undefined,
    deliveryNotes: deliveryNotesRaw || undefined,
    customerName,
    phone,
    phoneCountryCode: phoneCcRaw,
    recipientName,
    recipientPhone,
    recipientPhoneCountryCode: recipientCcRaw,
    referralCode,
    cardMessages,
  });
  if (!fieldLimitCheck.ok) {
    return fieldLimitCheck;
  }

  return {
    ok: true,
    data: {
      lang,
      customerName,
      phone,
      customerEmail,
      ...(marketingEmailConsent ? { marketingEmailConsent: true } : {}),
      contactPreference,
      ...(wantsLineContact && lineIdNormalized ? { lineId: lineIdNormalized } : {}),
      items: cartItems,
      referralCode,
      referralDiscount: referralCode && referralDiscount > 0 ? referralDiscount : 0,
      submissionToken: submissionTokenRaw,
      delivery: {
        address,
        preferredTimeSlot,
        recipientName,
        recipientPhone,
        ...(normalizeOptionalCallingCodeDigits(recipientCcRaw) && {
          recipientPhoneCountryCode: normalizeOptionalCallingCodeDigits(recipientCcRaw),
        }),
        surpriseDelivery,
        notes: deliveryNotesRaw || undefined,
        deliveryLat,
        deliveryLng,
        deliveryGoogleMapsUrl: deliveryGoogleMapsUrlRaw || undefined,
        deliveryPlaceId: deliveryPlaceId || undefined,
        deliveryPlaceName:
          typeof d.deliveryPlaceName === 'string' ? d.deliveryPlaceName.trim() : undefined,
        deliveryFormattedAddress:
          typeof d.deliveryFormattedAddress === 'string'
            ? d.deliveryFormattedAddress.trim()
            : undefined,
        deliveryPostalCode:
          typeof d.deliveryPostalCode === 'string' ? d.deliveryPostalCode.trim() : undefined,
        deliveryProvince:
          typeof d.deliveryProvince === 'string' ? d.deliveryProvince.trim() : undefined,
        deliveryDistrictLabel:
          typeof d.deliveryDistrictLabel === 'string'
            ? d.deliveryDistrictLabel.trim()
            : undefined,
        deliverySubdistrict:
          typeof d.deliverySubdistrict === 'string'
            ? d.deliverySubdistrict.trim()
            : undefined,
        deliveryDestination,
        deliveryZoneId,
      },
      ...(normalizeOptionalCallingCodeDigits(phoneCcRaw) && {
        phoneCountryCode: normalizeOptionalCallingCodeDigits(phoneCcRaw),
      }),
    },
  };
}

interface StripeCheckoutPayload {
  lang: Locale;
  customerName: string;
  phone: string;
  phoneCountryCode?: string;
  customerEmail?: string;
  marketingEmailConsent?: boolean;
  contactPreference: ContactPreferenceOption[];
  lineId?: string;
  items: CartItemIdentifier[];
  referralCode?: string;
  referralDiscount?: number;
  submissionToken: string;
  delivery: {
    address: string;
    preferredTimeSlot: string;
    recipientName?: string;
    recipientPhone?: string;
    recipientPhoneCountryCode?: string;
    surpriseDelivery?: boolean;
    notes?: string;
    deliveryLat?: number;
    deliveryLng?: number;
    deliveryGoogleMapsUrl?: string;
    deliveryPlaceId?: string;
    deliveryPlaceName?: string;
    deliveryFormattedAddress?: string;
    deliveryPostalCode?: string;
    deliveryProvince?: string;
    deliveryDistrictLabel?: string;
    deliverySubdistrict?: string;
    deliveryDestination: OrderDeliveryDestinationId;
    deliveryZoneId: string;
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

    const serverZoneId = resolveDeliveryZoneFromPlace({
      deliveryDestination: data.delivery.deliveryDestination,
      clientZoneId: data.delivery.deliveryZoneId,
      address: data.delivery.address,
      formattedAddress: data.delivery.deliveryFormattedAddress,
      lat: data.delivery.deliveryLat,
      lng: data.delivery.deliveryLng,
      postalCode: data.delivery.deliveryPostalCode,
      province: data.delivery.deliveryProvince,
    });
    if (!serverZoneId || !findZoneDef(data.delivery.deliveryDestination, serverZoneId)) {
      return NextResponse.json(
        { error: 'Could not determine delivery area for this address. Please try again.' },
        { status: 400 }
      );
    }

    const inferredPostal = inferPostalCodeFromDelivery({
      address: data.delivery.address,
      deliveryPostalCode: data.delivery.deliveryPostalCode,
      deliveryGoogleMapsUrl: data.delivery.deliveryGoogleMapsUrl,
    });
    const zoneDef = findZoneDef(data.delivery.deliveryDestination, serverZoneId);
    if (
      inferredPostal &&
      !isInferredPostcodeAllowedForZone(inferredPostal, zoneDef)
    ) {
      return NextResponse.json(
        {
          error:
            'The address postcode does not match the selected delivery area. Please check the address or choose a different area.',
        },
        { status: 400 }
      );
    }

    const computed = await computeOrderTotals(
      data.items,
      {
        deliveryDestination: data.delivery.deliveryDestination,
        deliveryZoneId: serverZoneId,
      },
      data.lang
    );
    if (!computed.ok) {
      return NextResponse.json({ error: computed.message }, { status: 400 });
    }
    const { totals } = computed;
    if (EXPANSION_MARKUP_DESTINATIONS.has(data.delivery.deliveryDestination)) {
      for (const it of totals.items) {
        if (it.price % 10 !== 0) {
          return NextResponse.json(
            { error: 'Pricing mismatch. Please refresh the page and try again.' },
            { status: 400 }
          );
        }
      }
    }
    let welcomeCodeId: string | null = null;
    const resolvedDiscount = await resolveOrderDiscountServer({
      itemsTotal: totals.itemsTotal,
      deliveryFee: totals.deliveryFee,
      referralCode: data.referralCode,
      deliveryDestination: data.delivery.deliveryDestination,
      customerEmail: data.customerEmail,
    });

    if (data.referralCode) {
      if (!resolvedDiscount) {
        if (isWelcomeCode(data.referralCode) && !data.customerEmail) {
          return NextResponse.json(
            { error: 'Welcome code requires an email address' },
            { status: 400 }
          );
        }
        if (isWelcomeCode(data.referralCode)) {
          const db = await lookupDbWelcomeCode(data.referralCode);
          if (!db.valid) {
            if (db.reason === 'redeemed') {
              return NextResponse.json({ error: 'Welcome code already used' }, { status: 400 });
            }
            if (db.reason === 'expired') {
              return NextResponse.json({ error: 'Welcome code expired' }, { status: 400 });
            }
          } else if (db.email !== data.customerEmail!.trim().toLowerCase()) {
            return NextResponse.json(
              { error: 'Welcome code does not match this email address' },
              { status: 400 }
            );
          }
        }
        return NextResponse.json(
          { error: 'Referral code is invalid or not available for this order' },
          { status: 400 }
        );
      }
      if (isWelcomeCode(resolvedDiscount.code)) {
        const db = await lookupDbWelcomeCode(resolvedDiscount.code);
        if (db.valid) {
          welcomeCodeId = db.id;
        }
      }
    }

    const referralCode = resolvedDiscount?.code;
    const referralDiscount = resolvedDiscount?.discount ?? 0;
    const discountAllocation = resolvedDiscount?.allocation ?? 'all';
    const referralCommission =
      referralCode && referralDiscount > 0 && resolvedDiscount?.source === 'manual'
        ? getReferralCommissionForCode(referralCode, totals.itemsTotal, {
            deliveryDestination: data.delivery.deliveryDestination,
          })
        : null;
    const effectiveGrandTotal = Math.max(0, totals.grandTotal - referralDiscount);

    const legacyGeo =
      data.delivery.deliveryDestination === 'CHIANG_MAI'
        ? legacyDistrictFromChiangMaiZone(serverZoneId)
        : { deliveryDistrict: 'UNKNOWN' as const, isMueangCentral: false };

    const zoneLbl =
      zoneLabel(
        data.delivery.deliveryDestination,
        serverZoneId,
        data.lang === 'th' ? 'th' : 'en'
      ) ?? undefined;

    const orderPayload: OrderPayload = {
      customerName: data.customerName,
      phone: data.phone,
      ...(data.phoneCountryCode && { phoneCountryCode: data.phoneCountryCode }),
      customerEmail: data.customerEmail,
      ...(data.marketingEmailConsent ? { marketingEmailConsent: true } : {}),
      contactPreference: data.contactPreference,
      ...(data.lineId ? { lineId: data.lineId } : {}),
      items: totals.items,
      delivery: {
        address: data.delivery.address,
        preferredTimeSlot: data.delivery.preferredTimeSlot,
        recipientName: data.delivery.recipientName,
        recipientPhone: data.delivery.recipientPhone,
        ...(data.delivery.recipientPhoneCountryCode && {
          recipientPhoneCountryCode: data.delivery.recipientPhoneCountryCode,
        }),
        ...(data.delivery.surpriseDelivery !== undefined && {
          surpriseDelivery: data.delivery.surpriseDelivery,
        }),
        notes: data.delivery.notes,
        deliveryLat: data.delivery.deliveryLat,
        deliveryLng: data.delivery.deliveryLng,
        deliveryGoogleMapsUrl: data.delivery.deliveryGoogleMapsUrl,
        deliveryPlaceId: data.delivery.deliveryPlaceId,
        deliveryPlaceName: data.delivery.deliveryPlaceName,
        deliveryFormattedAddress: data.delivery.deliveryFormattedAddress,
        deliveryPostalCode: data.delivery.deliveryPostalCode ?? inferredPostal ?? undefined,
        deliveryProvince: data.delivery.deliveryProvince,
        deliveryDistrictLabel: data.delivery.deliveryDistrictLabel,
        deliverySubdistrict: data.delivery.deliverySubdistrict,
        deliveryDestination: data.delivery.deliveryDestination,
        deliveryZoneId: serverZoneId,
        ...(zoneLbl && { deliveryZoneLabel: zoneLbl }),
        ...(inferredPostal && { postalCode: inferredPostal }),
        deliveryDistrict: legacyGeo.deliveryDistrict,
        isMueangCentral: legacyGeo.isMueangCentral,
      },
      pricing: {
        itemsTotal: totals.itemsTotal,
        deliveryFee: totals.deliveryFee,
        grandTotal: effectiveGrandTotal,
      },
      ...(referralCode && referralDiscount > 0 && {
        referralCode,
        referralDiscount,
        ...(referralCommission && {
          referralPartnerName: referralCommission.partnerName,
          referralCommissionRate: referralCommission.commissionPercent,
          referralCommissionAmount: referralCommission.commissionAmount,
        }),
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
    if (welcomeCodeId) {
      stripeMetadata.welcome_code_id = welcomeCodeId;
    }
    stripeMetadata.pricing_rules_version = 'expansion_markup_v1';

    console.log('[stripe/create-checkout-session] checkout draft saved (order created after payment)', {
      checkoutDraftId,
      mode: stripeConfig.mode,
      hasCustomerEmail: Boolean(data.customerEmail),
    });

    const lineItems = buildStripeCheckoutLineItems({
      computedItems: totals.items,
      deliveryFee: totals.deliveryFee,
      effectiveGrandTotal,
      referralCode,
      referralDiscount,
      discountAllocation,
    });

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
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
    };
    const session = await stripe.checkout.sessions.create(
      sessionParams,
      {
        idempotencyKey: `checkout-${data.submissionToken}-${stripeIdempotencyFingerprint(sessionParams)}`,
      }
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

    if (data.customerEmail?.trim()) {
      void scheduleCheckoutAbandonment({
        stripeSessionId: session.id,
        checkoutDraftId,
        submissionToken: data.submissionToken,
        customerEmail: data.customerEmail,
        customerName: data.customerName,
        lang: data.lang,
        payload: orderPayload,
      }).catch((err) => {
        console.error('[stripe/create-checkout-session] abandonment schedule failed', err);
      });
    }

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
