import { NextRequest, NextResponse } from 'next/server';
import { completePayLinkFromStripeSession } from '@/lib/payLinks/completePayLinkReturn';
import { checkStripeOrderStatusRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let body: { linkId?: unknown; token?: unknown; sessionId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const linkId = typeof body.linkId === 'string' ? body.linkId.trim() : '';
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
  if (!linkId || !token || !sessionId) {
    return NextResponse.json({ error: 'linkId, token, and sessionId are required' }, { status: 400 });
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1';
  if (!checkStripeOrderStatusRateLimit(ip, sessionId)) {
    return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
  }

  const result = await completePayLinkFromStripeSession({ linkId, publicToken: token, sessionId });
  if (result.kind === 'not_found') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (result.kind === 'error') {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  if (result.kind === 'pending') {
    return NextResponse.json({ status: 'pending' });
  }
  return NextResponse.json({
    status: 'paid',
    amount: result.receipt.amount,
    description: result.receipt.description,
    orderId: result.receipt.orderId ?? null,
    publicToken: result.receipt.publicToken ?? null,
  });
}
