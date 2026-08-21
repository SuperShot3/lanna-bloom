import 'server-only';

import {
  ATTR_COOKIE,
  ATTRIBUTION_COOKIE_MAX_AGE_SEC,
  VISITOR_COOKIE,
} from './constants';
import {
  attributionCookieOptions,
  decodeAttrCookie,
  encodeAttrCookie,
  readVisitorIdFromCookies,
} from './cookieCodec';
import { createVisitorId, hasGoogleClickId, isVisitorId } from './params';
import { mergeAttributionSnapshot, sessionRowToSnapshot } from './rules';
import {
  getAttributionSessionByVisitorId,
  upsertAttributionSession,
} from './store';
import type { AttributionSnapshot, AttributionSessionRow, CookieReader } from './types';

export interface AttributionHints {
  visitor_id?: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  campaign_id?: string;
  adgroup_id?: string;
  keyword?: string;
  device?: string;
  network?: string;
  matchtype?: string;
  landing_page?: string;
  referrer?: string;
}

export interface ResolvedAttribution {
  visitorId: string;
  snapshot: AttributionSnapshot;
  session: AttributionSessionRow | null;
}

function hintsToSnapshot(hints: AttributionHints | null | undefined): AttributionSnapshot {
  if (!hints) return {};
  return {
    ...(hints.visitor_id ? { visitorId: hints.visitor_id } : {}),
    ...(hints.gclid ? { gclid: hints.gclid } : {}),
    ...(hints.gbraid ? { gbraid: hints.gbraid } : {}),
    ...(hints.wbraid ? { wbraid: hints.wbraid } : {}),
    ...(hints.utm_source ? { utmSource: hints.utm_source } : {}),
    ...(hints.utm_medium ? { utmMedium: hints.utm_medium } : {}),
    ...(hints.utm_campaign ? { utmCampaign: hints.utm_campaign } : {}),
    ...(hints.utm_content ? { utmContent: hints.utm_content } : {}),
    ...(hints.utm_term ? { utmTerm: hints.utm_term } : {}),
    ...(hints.campaign_id ? { campaignId: hints.campaign_id } : {}),
    ...(hints.adgroup_id ? { adgroupId: hints.adgroup_id } : {}),
    ...(hints.keyword ? { keyword: hints.keyword } : {}),
    ...(hints.device ? { device: hints.device } : {}),
    ...(hints.network ? { network: hints.network } : {}),
    ...(hints.matchtype ? { matchtype: hints.matchtype } : {}),
    ...(hints.landing_page ? { landingPage: hints.landing_page } : {}),
    ...(hints.referrer ? { referrer: hints.referrer } : {}),
  };
}

function clickIdsFromLegacyCookies(cookies: CookieReader): AttributionSnapshot {
  const gclid = cookies.get('lanna_ad_gclid')?.value?.trim();
  const gbraid = cookies.get('lanna_ad_gbraid')?.value?.trim();
  const wbraid = cookies.get('lanna_ad_wbraid')?.value?.trim();
  return {
    ...(gclid ? { gclid } : {}),
    ...(gbraid ? { gbraid } : {}),
    ...(wbraid ? { wbraid } : {}),
  };
}

export function readSnapshotFromRequest(
  cookies: CookieReader,
  hints?: AttributionHints | null,
  nowMs: number = Date.now(),
): { visitorId: string | undefined; snapshot: AttributionSnapshot } {
  const fromHttpOnly = decodeAttrCookie(cookies.get(ATTR_COOKIE)?.value) ?? {};
  const fromLegacy = clickIdsFromLegacyCookies(cookies);
  const fromHints = hintsToSnapshot(hints);
  let snap = mergeAttributionSnapshot(fromHttpOnly, fromLegacy, nowMs);
  snap = mergeAttributionSnapshot(snap, fromHints, nowMs);

  const visitorId =
    readVisitorIdFromCookies(cookies) ||
    (isVisitorId(hints?.visitor_id) ? hints?.visitor_id : undefined) ||
    snap.visitorId;

  if (visitorId) snap.visitorId = visitorId;
  return { visitorId, snapshot: snap };
}

export async function resolveAndPersistAttribution(input: {
  cookies: CookieReader;
  hints?: AttributionHints | null;
  nowMs?: number;
}): Promise<ResolvedAttribution | null> {
  const nowMs = input.nowMs ?? Date.now();
  const { visitorId: existingVid, snapshot } = readSnapshotFromRequest(
    input.cookies,
    input.hints,
    nowMs,
  );

  const hasSignal =
    hasGoogleClickId(snapshot) ||
    Boolean(snapshot.utmSource || snapshot.utmMedium || snapshot.utmCampaign);
  if (!existingVid && !hasSignal) return null;

  const visitorId = existingVid || createVisitorId();
  snapshot.visitorId = visitorId;

  const existing = await getAttributionSessionByVisitorId(visitorId);
  const merged = existing
    ? mergeAttributionSnapshot(sessionRowToSnapshot(existing), snapshot, nowMs)
    : snapshot;
  merged.visitorId = visitorId;

  const session = await upsertAttributionSession({ visitorId, snapshot: merged, nowMs });
  return { visitorId, snapshot: merged, session };
}

export function applyAttributionCookiesToResponse(
  response: { cookies: { set: (name: string, value: string, opts: object) => void } },
  resolved: ResolvedAttribution,
): void {
  const opts = attributionCookieOptions(ATTRIBUTION_COOKIE_MAX_AGE_SEC);
  response.cookies.set(VISITOR_COOKIE, resolved.visitorId, opts);
  response.cookies.set(ATTR_COOKIE, encodeAttrCookie(resolved.snapshot), opts);
}

export function resolvedClickIds(resolved: ResolvedAttribution | null): {
  attribution_id?: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
} {
  if (!resolved) return {};
  const gclid = resolved.snapshot.gclid?.trim();
  const gbraid = resolved.snapshot.gbraid?.trim();
  const wbraid = resolved.snapshot.wbraid?.trim();
  return {
    ...(resolved.session?.id ? { attribution_id: resolved.session.id } : {}),
    ...(gclid ? { gclid } : {}),
    ...(gbraid ? { gbraid } : {}),
    ...(wbraid ? { wbraid } : {}),
  };
}
