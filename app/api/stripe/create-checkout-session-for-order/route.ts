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
  const visitor_id = optionalTrimmedString(b.visitor_id, 64);
  const utm_source = optionalTrimmedString(b.utm_source, 200);
  const utm_medium = optionalTrimmedString(b.utm_medium, 200);
  const utm_campaign = optionalTrimmedString(b.utm_campaign, 200);
  const utm_content = optionalTrimmedString(b.utm_content, 200);
  const utm_term = optionalTrimmedString(b.utm_term, 200);
  const campaign_id = optionalTrimmedString(b.campaign_id, 200);
  const adgroup_id = optionalTrimmedString(b.adgroup_id, 200);
  const keyword = optionalTrimmedString(b.keyword, 200);
  const device = optionalTrimmedString(b.device, 64);
  const network = optionalTrimmedString(b.network, 64);
  const matchtype = optionalTrimmedString(b.matchtype, 64);
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
      ...(visitor_id ? { visitor_id } : {}),
      ...(utm_source ? { utm_source } : {}),
      ...(utm_medium ? { utm_medium } : {}),
      ...(utm_campaign ? { utm_campaign } : {}),
      ...(utm_content ? { utm_content } : {}),
      ...(utm_term ? { utm_term } : {}),
      ...(campaign_id ? { campaign_id } : {}),
      ...(adgroup_id ? { adgroup_id } : {}),
      ...(keyword ? { keyword } : {}),
      ...(device ? { device } : {}),
      ...(network ? { network } : {}),
      ...(matchtype ? { matchtype } : {}),
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
    cookies: request.cookies,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ url: result.url, orderId: result.orderId });
}
