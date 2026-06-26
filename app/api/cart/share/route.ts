import { NextRequest, NextResponse } from 'next/server';
import {
  createSharedCart,
  getSharedCartByToken,
  normalizeSharedCartToken,
  SharedCartValidationError,
} from '@/lib/cart/sharedCart';
import { isValidLocale } from '@/lib/i18n';
import {
  checkSharedCartCreateRateLimit,
  checkSharedCartReadRateLimit,
} from '@/lib/rateLimit';

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
  if (!checkSharedCartCreateRateLimit(ip)) {
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
  const localeRaw = typeof b.locale === 'string' ? b.locale : 'en';
  const locale = isValidLocale(localeRaw) ? localeRaw : 'en';
  const shareLocale = locale === 'th' ? 'th' : 'en';

  try {
    const result = await createSharedCart({
      items: b.items,
      locale: shareLocale,
    });
    return NextResponse.json(
      { url: result.url, expiresAt: result.expiresAt },
      { status: 200, headers: NO_STORE }
    );
  } catch (err) {
    if (err instanceof SharedCartValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400, headers: NO_STORE });
    }
    console.error('[cart/share] POST failed', err);
    return NextResponse.json(
      { error: 'Could not create shared cart' },
      { status: 500, headers: NO_STORE }
    );
  }
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkSharedCartReadRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: NO_STORE }
    );
  }

  const token = normalizeSharedCartToken(req.nextUrl.searchParams.get('token'));
  if (!token) {
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers: NO_STORE });
  }

  const payload = await getSharedCartByToken(token);
  if (!payload) {
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers: NO_STORE });
  }

  return NextResponse.json(
    { items: payload.items, locale: payload.locale },
    { status: 200, headers: NO_STORE }
  );
}
