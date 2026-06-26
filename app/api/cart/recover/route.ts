import { NextRequest, NextResponse } from 'next/server';
import {
  getCheckoutRecoveryByToken,
  normalizeRecoveryToken,
} from '@/lib/checkout/checkoutRecovery';
import { checkCheckoutRecoveryReadRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkCheckoutRecoveryReadRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: NO_STORE }
    );
  }

  const token = normalizeRecoveryToken(req.nextUrl.searchParams.get('token'));
  if (!token) {
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers: NO_STORE });
  }

  const payload = await getCheckoutRecoveryByToken(token);
  if (!payload) {
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers: NO_STORE });
  }

  return NextResponse.json(
    { items: payload.items, form: payload.form, locale: payload.locale },
    { status: 200, headers: NO_STORE }
  );
}
