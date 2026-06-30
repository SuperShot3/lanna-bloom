import { NextRequest, NextResponse } from 'next/server';
import { createDeliveryLocationRequest } from '@/lib/delivery/deliveryLocationRequestStore';
import { validateDeliveryLocationRequestInput } from '@/lib/delivery/deliveryLocationRequestValidate';
import { isValidLocale } from '@/lib/i18n';
import { checkDeliveryLocationRequestRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkDeliveryLocationRequestRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: NO_STORE }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers: NO_STORE });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400, headers: NO_STORE });
  }

  const b = body as Record<string, unknown>;
  const localeRaw = typeof b.lang === 'string' ? b.lang : 'en';
  const lang = isValidLocale(localeRaw) ? localeRaw : 'en';

  const validation = validateDeliveryLocationRequestInput({
    lang,
    locationText: typeof b.locationText === 'string' ? b.locationText : undefined,
    googleMapsUrl: typeof b.googleMapsUrl === 'string' ? b.googleMapsUrl : undefined,
    customerName: typeof b.customerName === 'string' ? b.customerName : '',
    customerPhone: typeof b.customerPhone === 'string' ? b.customerPhone : '',
    customerEmail: typeof b.customerEmail === 'string' ? b.customerEmail : '',
    consentAccepted: b.consentAccepted === true,
    items: b.items,
    sourcePath: typeof b.sourcePath === 'string' ? b.sourcePath : undefined,
    userAgent: req.headers.get('user-agent') ?? undefined,
    submissionChannel:
      b.submissionChannel === 'whatsapp' ||
      b.submissionChannel === 'facebook' ||
      b.submissionChannel === 'line'
        ? b.submissionChannel
        : 'form',
  });

  if (!validation.ok) {
    return NextResponse.json({ error: validation.message }, { status: 400, headers: NO_STORE });
  }

  try {
    const result = await createDeliveryLocationRequest(validation.data);
    return NextResponse.json(
      {
        ok: true,
        requestId: result.requestId,
        sharedCartUrl: result.sharedCartUrl,
      },
      { status: 200, headers: NO_STORE }
    );
  } catch (err) {
    console.error('[delivery-location-requests] POST failed', err);
    return NextResponse.json(
      { error: 'Could not submit delivery request. Please try again.' },
      { status: 500, headers: NO_STORE }
    );
  }
}
