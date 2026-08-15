import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSessionForExistingOrder } from '@/lib/stripe/createCheckoutSessionForExistingOrder';
import type { CheckoutAnalyticsContext } from '@/lib/analytics/captureAnalyticsContext';

export const dynamic = 'force-dynamic';

function optionalTrimmedString(raw: unknown, maxLen: number): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const t = raw.trim();
  if (!t || t.length > maxLen) return undefined;
  return t;
}

function parseCheckoutAnalyticsFields(b: Record<string, unknown>):
  | { ok: true; fields: CheckoutAnalyticsContext }
  | { ok: false; message: string } {
  const ga_client_id = optionalTrimmedString(b.ga_client_id, 64);
  const ga_session_id = optionalTrimmedString(b.ga_session_id, 64);
  const gclid = optionalTrimmedString(b.gclid, 256);
  const gbraid = optionalTrimmedString(b.gbraid, 256);
  const wbraid = optionalTrimmedString(b.wbraid, 256);
  if (ga_client_id && !/^\d+\.\d+$/.test(ga_client_id)) {
    return { ok: false, message: 'ga_client_id has invalid format' };
  }
  return {
    ok: true,
    fields: {
      ...(ga_client_id ? { ga_client_id } : {}),
      ...(ga_session_id ? { ga_session_id } : {}),
      ...(gclid ? { gclid } : {}),
      ...(gbraid ? { gbraid } : {}),
      ...(wbraid ? { wbraid } : {}),
    },
  };
}

/**
 * Create a Stripe Checkout Session for an existing order (e.g. from the order page "Pay with Card").
 * Body: { orderId: string, publicToken: string, lang?: string }
 * Returns: { url: string } to redirect the customer to Stripe Checkout.
 */
export async function POST(request: NextRequest) {
  let body: {
    orderId?: string;
    publicToken?: string;
    lang?: string;
    ga_client_id?: string;
    ga_session_id?: string;
    gclid?: string;
    gbraid?: string;
    wbraid?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const analyticsParsed = parseCheckoutAnalyticsFields(body as Record<string, unknown>);
  if (!analyticsParsed.ok) {
    return NextResponse.json({ error: analyticsParsed.message }, { status: 400 });
  }

  const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
  if (!orderId) {
    return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
  }

  const publicToken = typeof body.publicToken === 'string' ? body.publicToken.trim() : '';
  if (!publicToken) {
    return NextResponse.json({ error: 'publicToken is required' }, { status: 400 });
  }

  const lang = typeof body.lang === 'string' ? body.lang : undefined;
  const result = await createCheckoutSessionForExistingOrder({
    orderId,
    publicToken,
    lang,
    analytics: analyticsParsed.fields,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ url: result.url, orderId: result.orderId });
}
