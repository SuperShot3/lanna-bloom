import {
  ATTRIBUTION_QUERY_KEYS,
  CLICK_ID_MAX_LEN,
  LANDING_MAX_LEN,
  UTM_MAX_LEN,
  VISITOR_ID_MAX_LEN,
} from './constants';
import type { AttributionSnapshot } from './types';

function clip(raw: string | null | undefined, max: number): string | undefined {
  if (raw == null) return undefined;
  const t = raw.trim();
  if (!t) return undefined;
  return t.length > max ? t.slice(0, max) : t;
}

export function isVisitorId(raw: string | null | undefined): raw is string {
  const t = raw?.trim() ?? '';
  if (t.length < 8 || t.length > VISITOR_ID_MAX_LEN) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(t);
}

export function createVisitorId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function getParam(params: URLSearchParams, key: string, max = UTM_MAX_LEN): string | undefined {
  return clip(params.get(key), max);
}

export function urlHasAttributionQuery(searchParams: URLSearchParams): boolean {
  for (const key of ATTRIBUTION_QUERY_KEYS) {
    const v = searchParams.get(key)?.trim();
    if (v) return true;
  }
  return false;
}

export function parseAttributionSearchParams(searchParams: URLSearchParams): AttributionSnapshot {
  const gclid = getParam(searchParams, 'gclid', CLICK_ID_MAX_LEN);
  const gbraid = getParam(searchParams, 'gbraid', CLICK_ID_MAX_LEN);
  const wbraid = getParam(searchParams, 'wbraid', CLICK_ID_MAX_LEN);
  const campaignId =
    getParam(searchParams, 'campaignid') || getParam(searchParams, 'gad_campaignid');
  return {
    ...(gclid ? { gclid } : {}),
    ...(gbraid ? { gbraid } : {}),
    ...(wbraid ? { wbraid } : {}),
    ...(getParam(searchParams, 'utm_source') ? { utmSource: getParam(searchParams, 'utm_source') } : {}),
    ...(getParam(searchParams, 'utm_medium') ? { utmMedium: getParam(searchParams, 'utm_medium') } : {}),
    ...(getParam(searchParams, 'utm_campaign')
      ? { utmCampaign: getParam(searchParams, 'utm_campaign') }
      : {}),
    ...(getParam(searchParams, 'utm_content') ? { utmContent: getParam(searchParams, 'utm_content') } : {}),
    ...(getParam(searchParams, 'utm_term') ? { utmTerm: getParam(searchParams, 'utm_term') } : {}),
    ...(campaignId ? { campaignId } : {}),
    ...(getParam(searchParams, 'adgroupid') ? { adgroupId: getParam(searchParams, 'adgroupid') } : {}),
    ...(getParam(searchParams, 'keyword') ? { keyword: getParam(searchParams, 'keyword') } : {}),
    ...(getParam(searchParams, 'device') ? { device: getParam(searchParams, 'device') } : {}),
    ...(getParam(searchParams, 'network') ? { network: getParam(searchParams, 'network') } : {}),
    ...(getParam(searchParams, 'matchtype') ? { matchtype: getParam(searchParams, 'matchtype') } : {}),
  };
}

export function hasGoogleClickId(
  snap: Pick<AttributionSnapshot, 'gclid' | 'gbraid' | 'wbraid'> | null | undefined,
): boolean {
  if (!snap) return false;
  return Boolean(snap.gclid?.trim() || snap.gbraid?.trim() || snap.wbraid?.trim());
}

export function clipLanding(raw: string | null | undefined): string | undefined {
  return clip(raw, LANDING_MAX_LEN);
}

export function clipReferrer(raw: string | null | undefined): string | undefined {
  return clip(raw, LANDING_MAX_LEN);
}

export function snapshotIsEmpty(snap: AttributionSnapshot): boolean {
  return (
    !hasGoogleClickId(snap) &&
    !snap.utmSource &&
    !snap.utmMedium &&
    !snap.utmCampaign &&
    !snap.landingPage &&
    !snap.referrer &&
    !snap.campaignId
  );
}
