import { ATTRIBUTION_WINDOW_MS } from './constants';
import { hasGoogleClickId } from './params';
import type { AttributionSnapshot, AttributionSource } from './types';

export function googleClickIdsAreFresh(
  snap: Pick<AttributionSnapshot, 'gclid' | 'gbraid' | 'wbraid' | 'googleClickAt'> | null | undefined,
  nowMs: number,
): boolean {
  if (!hasGoogleClickId(snap)) return false;
  const at = snap?.googleClickAt;
  if (at == null || !Number.isFinite(at)) return true;
  return nowMs - at <= ATTRIBUTION_WINDOW_MS;
}

export function isGoogleAdsAttributed(
  snap: Pick<AttributionSnapshot, 'gclid' | 'gbraid' | 'wbraid' | 'googleClickAt'> | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  return googleClickIdsAreFresh(snap, nowMs);
}

/**
 * Last Google Ads click wins. A later visit without gclid|gbraid|wbraid does not
 * clear stored click ids. Non-Google UTMs update source fields only.
 */
export function mergeAttributionSnapshot(
  existing: AttributionSnapshot | null | undefined,
  incoming: AttributionSnapshot,
  nowMs: number,
): AttributionSnapshot {
  const base: AttributionSnapshot = { ...(existing ?? {}) };
  const incomingHasClick = hasGoogleClickId(incoming);

  if (incomingHasClick) {
    base.gclid = incoming.gclid;
    base.gbraid = incoming.gbraid;
    base.wbraid = incoming.wbraid;
    base.googleClickAt = nowMs;
  } else if (base.googleClickAt != null && nowMs - base.googleClickAt > ATTRIBUTION_WINDOW_MS) {
    delete base.gclid;
    delete base.gbraid;
    delete base.wbraid;
    delete base.googleClickAt;
  }

  if (incoming.utmSource) base.utmSource = incoming.utmSource;
  if (incoming.utmMedium) base.utmMedium = incoming.utmMedium;
  if (incoming.utmCampaign) base.utmCampaign = incoming.utmCampaign;
  if (incoming.utmContent) base.utmContent = incoming.utmContent;
  if (incoming.utmTerm) base.utmTerm = incoming.utmTerm;
  if (incoming.campaignId) base.campaignId = incoming.campaignId;
  if (incoming.adgroupId) base.adgroupId = incoming.adgroupId;
  if (incoming.keyword) base.keyword = incoming.keyword;
  if (incoming.device) base.device = incoming.device;
  if (incoming.network) base.network = incoming.network;
  if (incoming.matchtype) base.matchtype = incoming.matchtype;
  if (incoming.landingPage) base.landingPage = incoming.landingPage;
  if (incoming.referrer) base.referrer = incoming.referrer;
  if (incoming.visitorId) base.visitorId = incoming.visitorId;

  base.updatedAt = nowMs;
  return base;
}

function referrerHost(referrer: string | undefined): string | undefined {
  if (!referrer) return undefined;
  try {
    return new URL(referrer).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return undefined;
  }
}

export function classifyAttribution(
  snap: AttributionSnapshot,
  nowMs: number = Date.now(),
): { source: AttributionSource; medium: string } {
  if (isGoogleAdsAttributed(snap, nowMs)) {
    return {
      source: 'google',
      medium: snap.utmMedium?.trim() || 'cpc',
    };
  }

  const utmSource = snap.utmSource?.trim().toLowerCase();
  const utmMedium = snap.utmMedium?.trim().toLowerCase();
  if (utmSource) {
    if (utmSource === 'google' && (utmMedium === 'organic' || !utmMedium)) {
      return { source: 'organic', medium: utmMedium || 'organic' };
    }
    return {
      source: utmSource === 'google' ? 'unknown' : (utmSource as AttributionSource),
      medium: utmMedium || 'unknown',
    };
  }

  const host = referrerHost(snap.referrer);
  if (host) {
    if (host === 'google.com' || host.endsWith('.google.com') || host === 'google.co.th') {
      return { source: 'organic', medium: 'organic' };
    }
    return { source: 'referral', medium: 'referral' };
  }

  if (!snap.landingPage && !snap.updatedAt) {
    return { source: 'unknown', medium: 'unknown' };
  }
  return { source: 'direct', medium: 'none' };
}

export function snapshotToSessionFields(snap: AttributionSnapshot, nowMs: number = Date.now()) {
  const { source, medium } = classifyAttribution(snap, nowMs);
  const attributed = isGoogleAdsAttributed(snap, nowMs);
  return {
    source,
    medium,
    gclid: attributed ? snap.gclid ?? null : null,
    gbraid: attributed ? snap.gbraid ?? null : null,
    wbraid: attributed ? snap.wbraid ?? null : null,
    utm_source: snap.utmSource ?? null,
    utm_medium: snap.utmMedium ?? null,
    utm_campaign: snap.utmCampaign ?? null,
    utm_content: snap.utmContent ?? null,
    utm_term: snap.utmTerm ?? null,
    campaign_id: snap.campaignId ?? null,
    adgroup_id: snap.adgroupId ?? null,
    keyword: snap.keyword ?? null,
    device: snap.device ?? null,
    network: snap.network ?? null,
    matchtype: snap.matchtype ?? null,
    landing_page: snap.landingPage ?? null,
    referrer: snap.referrer ?? null,
  };
}

export function sessionRowToSnapshot(row: {
  visitor_id?: string | null;
  gclid?: string | null;
  gbraid?: string | null;
  wbraid?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  campaign_id?: string | null;
  adgroup_id?: string | null;
  keyword?: string | null;
  device?: string | null;
  network?: string | null;
  matchtype?: string | null;
  landing_page?: string | null;
  referrer?: string | null;
  last_seen_at?: string | null;
}): AttributionSnapshot {
  const lastSeen = row.last_seen_at ? Date.parse(row.last_seen_at) : undefined;
  const hasClick = Boolean(row.gclid?.trim() || row.gbraid?.trim() || row.wbraid?.trim());
  return {
    ...(row.visitor_id ? { visitorId: row.visitor_id } : {}),
    ...(row.gclid ? { gclid: row.gclid } : {}),
    ...(row.gbraid ? { gbraid: row.gbraid } : {}),
    ...(row.wbraid ? { wbraid: row.wbraid } : {}),
    ...(row.utm_source ? { utmSource: row.utm_source } : {}),
    ...(row.utm_medium ? { utmMedium: row.utm_medium } : {}),
    ...(row.utm_campaign ? { utmCampaign: row.utm_campaign } : {}),
    ...(row.utm_content ? { utmContent: row.utm_content } : {}),
    ...(row.utm_term ? { utmTerm: row.utm_term } : {}),
    ...(row.campaign_id ? { campaignId: row.campaign_id } : {}),
    ...(row.adgroup_id ? { adgroupId: row.adgroup_id } : {}),
    ...(row.keyword ? { keyword: row.keyword } : {}),
    ...(row.device ? { device: row.device } : {}),
    ...(row.network ? { network: row.network } : {}),
    ...(row.matchtype ? { matchtype: row.matchtype } : {}),
    ...(row.landing_page ? { landingPage: row.landing_page } : {}),
    ...(row.referrer ? { referrer: row.referrer } : {}),
    ...(hasClick && Number.isFinite(lastSeen) ? { googleClickAt: lastSeen } : {}),
    ...(Number.isFinite(lastSeen) ? { updatedAt: lastSeen } : {}),
  };
}
