import { NextRequest, NextResponse } from 'next/server';
import { checkAttributionTouchRateLimit } from '@/lib/rateLimit';
import {
  applyAttributionCookiesToResponse,
  resolveAndPersistAttribution,
  type AttributionHints,
} from '@/lib/attribution/resolve';

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip')?.trim() ||
    'unknown'
  );
}

function optionalTrimmed(raw: unknown, maxLen: number): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const t = raw.trim();
  if (!t || t.length > maxLen) return undefined;
  return t;
}

function parseHints(body: unknown): AttributionHints {
  if (!body || typeof body !== 'object') return {};
  const b = body as Record<string, unknown>;
  return {
    ...(optionalTrimmed(b.visitor_id, 64) ? { visitor_id: optionalTrimmed(b.visitor_id, 64) } : {}),
    ...(optionalTrimmed(b.gclid, 256) ? { gclid: optionalTrimmed(b.gclid, 256) } : {}),
    ...(optionalTrimmed(b.gbraid, 256) ? { gbraid: optionalTrimmed(b.gbraid, 256) } : {}),
    ...(optionalTrimmed(b.wbraid, 256) ? { wbraid: optionalTrimmed(b.wbraid, 256) } : {}),
    ...(optionalTrimmed(b.utm_source, 200) ? { utm_source: optionalTrimmed(b.utm_source, 200) } : {}),
    ...(optionalTrimmed(b.utm_medium, 200) ? { utm_medium: optionalTrimmed(b.utm_medium, 200) } : {}),
    ...(optionalTrimmed(b.utm_campaign, 200) ? { utm_campaign: optionalTrimmed(b.utm_campaign, 200) } : {}),
    ...(optionalTrimmed(b.utm_content, 200) ? { utm_content: optionalTrimmed(b.utm_content, 200) } : {}),
    ...(optionalTrimmed(b.utm_term, 200) ? { utm_term: optionalTrimmed(b.utm_term, 200) } : {}),
    ...(optionalTrimmed(b.campaign_id, 200) ? { campaign_id: optionalTrimmed(b.campaign_id, 200) } : {}),
    ...(optionalTrimmed(b.adgroup_id, 200) ? { adgroup_id: optionalTrimmed(b.adgroup_id, 200) } : {}),
    ...(optionalTrimmed(b.keyword, 200) ? { keyword: optionalTrimmed(b.keyword, 200) } : {}),
    ...(optionalTrimmed(b.device, 64) ? { device: optionalTrimmed(b.device, 64) } : {}),
    ...(optionalTrimmed(b.network, 64) ? { network: optionalTrimmed(b.network, 64) } : {}),
    ...(optionalTrimmed(b.matchtype, 64) ? { matchtype: optionalTrimmed(b.matchtype, 64) } : {}),
    ...(optionalTrimmed(b.landing_page, 300) ? { landing_page: optionalTrimmed(b.landing_page, 300) } : {}),
    ...(optionalTrimmed(b.referrer, 300) ? { referrer: optionalTrimmed(b.referrer, 300) } : {}),
  };
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!checkAttributionTouchRateLimit(ip)) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const resolved = await resolveAndPersistAttribution({
    cookies: request.cookies,
    hints: parseHints(body),
  });

  if (!resolved) {
    return NextResponse.json({ ok: true, persisted: false });
  }

  const response = NextResponse.json({
    ok: true,
    persisted: true,
    id: resolved.session?.id ?? null,
  });
  applyAttributionCookiesToResponse(response, resolved);
  return response;
}
