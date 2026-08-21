import { ATTR_COOKIE, VISITOR_COOKIE } from './constants';
import { isVisitorId } from './params';
import type { AttributionSnapshot, CookieReader } from './types';

/** Compact cookie payload. Keep under ~2KB. */
interface AttrCookieV1 {
  v: 1;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  us?: string;
  um?: string;
  uc?: string;
  uo?: string;
  ut?: string;
  cid?: string;
  aid?: string;
  kw?: string;
  dv?: string;
  nw?: string;
  mt?: string;
  lp?: string;
  rf?: string;
  gts?: number;
  ts?: number;
}

function compact(snap: AttributionSnapshot): AttrCookieV1 {
  return {
    v: 1,
    ...(snap.gclid ? { gclid: snap.gclid } : {}),
    ...(snap.gbraid ? { gbraid: snap.gbraid } : {}),
    ...(snap.wbraid ? { wbraid: snap.wbraid } : {}),
    ...(snap.utmSource ? { us: snap.utmSource } : {}),
    ...(snap.utmMedium ? { um: snap.utmMedium } : {}),
    ...(snap.utmCampaign ? { uc: snap.utmCampaign } : {}),
    ...(snap.utmContent ? { uo: snap.utmContent } : {}),
    ...(snap.utmTerm ? { ut: snap.utmTerm } : {}),
    ...(snap.campaignId ? { cid: snap.campaignId } : {}),
    ...(snap.adgroupId ? { aid: snap.adgroupId } : {}),
    ...(snap.keyword ? { kw: snap.keyword } : {}),
    ...(snap.device ? { dv: snap.device } : {}),
    ...(snap.network ? { nw: snap.network } : {}),
    ...(snap.matchtype ? { mt: snap.matchtype } : {}),
    ...(snap.landingPage ? { lp: snap.landingPage } : {}),
    ...(snap.referrer ? { rf: snap.referrer } : {}),
    ...(snap.googleClickAt != null ? { gts: snap.googleClickAt } : {}),
    ...(snap.updatedAt != null ? { ts: snap.updatedAt } : {}),
  };
}

function expand(raw: AttrCookieV1): AttributionSnapshot {
  return {
    ...(raw.gclid ? { gclid: raw.gclid } : {}),
    ...(raw.gbraid ? { gbraid: raw.gbraid } : {}),
    ...(raw.wbraid ? { wbraid: raw.wbraid } : {}),
    ...(raw.us ? { utmSource: raw.us } : {}),
    ...(raw.um ? { utmMedium: raw.um } : {}),
    ...(raw.uc ? { utmCampaign: raw.uc } : {}),
    ...(raw.uo ? { utmContent: raw.uo } : {}),
    ...(raw.ut ? { utmTerm: raw.ut } : {}),
    ...(raw.cid ? { campaignId: raw.cid } : {}),
    ...(raw.aid ? { adgroupId: raw.aid } : {}),
    ...(raw.kw ? { keyword: raw.kw } : {}),
    ...(raw.dv ? { device: raw.dv } : {}),
    ...(raw.nw ? { network: raw.nw } : {}),
    ...(raw.mt ? { matchtype: raw.mt } : {}),
    ...(raw.lp ? { landingPage: raw.lp } : {}),
    ...(raw.rf ? { referrer: raw.rf } : {}),
    ...(typeof raw.gts === 'number' ? { googleClickAt: raw.gts } : {}),
    ...(typeof raw.ts === 'number' ? { updatedAt: raw.ts } : {}),
  };
}

export function encodeAttrCookie(snap: AttributionSnapshot): string {
  return encodeURIComponent(JSON.stringify(compact(snap)));
}

export function decodeAttrCookie(raw: string | null | undefined): AttributionSnapshot | null {
  if (!raw?.trim()) return null;
  try {
    const json = JSON.parse(decodeURIComponent(raw)) as AttrCookieV1;
    if (!json || json.v !== 1 || typeof json !== 'object') return null;
    return expand(json);
  } catch {
    return null;
  }
}

export function readVisitorIdFromCookies(cookies: CookieReader): string | undefined {
  const raw = cookies.get(VISITOR_COOKIE)?.value?.trim();
  return isVisitorId(raw) ? raw : undefined;
}

export function readAttrSnapshotFromCookies(cookies: CookieReader): AttributionSnapshot | null {
  return decodeAttrCookie(cookies.get(ATTR_COOKIE)?.value);
}

export function attributionCookieOptions(maxAgeSec: number): {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax';
  path: '/';
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSec,
  };
}
