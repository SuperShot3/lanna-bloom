/**
 * Read GA4 / Google Ads identifiers from the browser for checkout and first-party attribution.
 * Safe to call only on the client.
 */

import {
  AD_CLICK_COOKIE_GBRAID,
  AD_CLICK_COOKIE_GCLID,
  AD_CLICK_COOKIE_WBRAID,
  AD_CLICK_STORAGE_KEY,
  ATTR_PARAMS_STORAGE_KEY,
  ATTRIBUTION_COOKIE_MAX_AGE_SEC,
} from '@/lib/attribution/constants';
import {
  parseAttributionSearchParams,
  urlHasAttributionQuery,
} from '@/lib/attribution/params';
import { mergeAttributionSnapshot } from '@/lib/attribution/rules';
import type { AttributionSnapshot } from '@/lib/attribution/types';

export interface CheckoutAnalyticsContext {
  ga_client_id?: string;
  ga_session_id?: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  visitor_id?: string;
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
}

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  if (!match?.[1]) return undefined;
  try {
    return decodeURIComponent(match[1].trim());
  } catch {
    return match[1].trim();
  }
}

function writeCookie(name: string, value: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${ATTRIBUTION_COOKIE_MAX_AGE_SEC}; Path=/; SameSite=Lax`;
}

/** Parse `_ga` cookie → GA4 client_id (`XXXXXXXXXX.YYYYYYYYYY`). */
export function readGaClientIdFromCookie(): string | undefined {
  const raw = readCookie('_ga');
  if (!raw) return undefined;
  const parts = raw.split('.');
  if (parts.length >= 4) {
    const clientId = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
    if (/^\d+\.\d+$/.test(clientId)) return clientId;
  }
  return undefined;
}

/** Parse `_ga_<container>` cookie → GA4 session_id (third dot-separated segment). */
export function readGaSessionIdFromCookie(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  for (const chunk of document.cookie.split(';')) {
    const trimmed = chunk.trim();
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const name = trimmed.slice(0, eq);
    if (!name.startsWith('_ga_')) continue;
    const value = trimmed.slice(eq + 1);
    let decoded = value;
    try {
      decoded = decodeURIComponent(value);
    } catch {
      // use raw
    }
    const parts = decoded.split('.');
    if (parts.length >= 3 && (parts[0] === 'GS1' || parts[0] === 'GS2')) {
      const sessionPart = parts[2];
      if (sessionPart) {
        const sessionId = sessionPart.startsWith('s') ? sessionPart.slice(1) : sessionPart;
        if (sessionId) return sessionId;
      }
    }
  }
  return undefined;
}

function readStoredSnapshot(): AttributionSnapshot {
  const gclid = readCookie(AD_CLICK_COOKIE_GCLID)?.trim();
  const gbraid = readCookie(AD_CLICK_COOKIE_GBRAID)?.trim();
  const wbraid = readCookie(AD_CLICK_COOKIE_WBRAID)?.trim();
  let fromStorage: AttributionSnapshot = {};
  if (typeof window !== 'undefined') {
    try {
      const clickRaw = window.sessionStorage.getItem(AD_CLICK_STORAGE_KEY);
      if (clickRaw) {
        const parsed = JSON.parse(clickRaw) as Record<string, string | undefined>;
        fromStorage = {
          ...(parsed.gclid?.trim() ? { gclid: parsed.gclid.trim() } : {}),
          ...(parsed.gbraid?.trim() ? { gbraid: parsed.gbraid.trim() } : {}),
          ...(parsed.wbraid?.trim() ? { wbraid: parsed.wbraid.trim() } : {}),
        };
      }
      const attrRaw = window.sessionStorage.getItem(ATTR_PARAMS_STORAGE_KEY);
      if (attrRaw) {
        fromStorage = mergeAttributionSnapshot(
          fromStorage,
          JSON.parse(attrRaw) as AttributionSnapshot,
          Date.now(),
        );
      }
    } catch {
      // ignore
    }
  }
  return mergeAttributionSnapshot(
    fromStorage,
    {
      ...(gclid ? { gclid } : {}),
      ...(gbraid ? { gbraid } : {}),
      ...(wbraid ? { wbraid } : {}),
    },
    Date.now(),
  );
}

function persistClientSnapshot(snap: AttributionSnapshot): void {
  if (snap.gclid) writeCookie(AD_CLICK_COOKIE_GCLID, snap.gclid);
  if (snap.gbraid) writeCookie(AD_CLICK_COOKIE_GBRAID, snap.gbraid);
  if (snap.wbraid) writeCookie(AD_CLICK_COOKIE_WBRAID, snap.wbraid);
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(
      AD_CLICK_STORAGE_KEY,
      JSON.stringify({
        gclid: snap.gclid,
        gbraid: snap.gbraid,
        wbraid: snap.wbraid,
      }),
    );
    window.sessionStorage.setItem(ATTR_PARAMS_STORAGE_KEY, JSON.stringify(snap));
  } catch {
    // ignore
  }
}

/** Persist ad click ids + UTMs from URL. Does not wipe existing Google click ids on a later direct visit. */
export function captureAdClickIdsFromUrl(): void {
  if (typeof window === 'undefined') return;
  try {
    const params = new URLSearchParams(window.location.search);
    const incoming = parseAttributionSearchParams(params);
    incoming.landingPage = `${window.location.pathname}${window.location.search}`;
    if (document.referrer) incoming.referrer = document.referrer;
    const existing = readStoredSnapshot();
    if (!urlHasAttributionQuery(params) && !incoming.gclid && !incoming.utmSource) {
      return;
    }
    const merged = mergeAttributionSnapshot(existing, incoming, Date.now());
    persistClientSnapshot(merged);
  } catch {
    // ignore
  }
}

export function readCheckoutAnalyticsContext(): CheckoutAnalyticsContext {
  const ga_client_id = readGaClientIdFromCookie();
  const ga_session_id = readGaSessionIdFromCookie();
  const snap = readStoredSnapshot();
  return {
    ...(ga_client_id ? { ga_client_id } : {}),
    ...(ga_session_id ? { ga_session_id } : {}),
    ...(snap.gclid ? { gclid: snap.gclid } : {}),
    ...(snap.gbraid ? { gbraid: snap.gbraid } : {}),
    ...(snap.wbraid ? { wbraid: snap.wbraid } : {}),
    ...(snap.utmSource ? { utm_source: snap.utmSource } : {}),
    ...(snap.utmMedium ? { utm_medium: snap.utmMedium } : {}),
    ...(snap.utmCampaign ? { utm_campaign: snap.utmCampaign } : {}),
    ...(snap.utmContent ? { utm_content: snap.utmContent } : {}),
    ...(snap.utmTerm ? { utm_term: snap.utmTerm } : {}),
    ...(snap.campaignId ? { campaign_id: snap.campaignId } : {}),
    ...(snap.adgroupId ? { adgroup_id: snap.adgroupId } : {}),
    ...(snap.keyword ? { keyword: snap.keyword } : {}),
    ...(snap.device ? { device: snap.device } : {}),
    ...(snap.network ? { network: snap.network } : {}),
    ...(snap.matchtype ? { matchtype: snap.matchtype } : {}),
  };
}

/** Fire-and-forget upsert of the first-party attribution session. Cookies still survive if this fails. */
export function touchAttributionSession(): void {
  if (typeof window === 'undefined') return;
  try {
    captureAdClickIdsFromUrl();
    const ctx = readCheckoutAnalyticsContext();
    const body: Record<string, string> = {};
    if (ctx.gclid) body.gclid = ctx.gclid;
    if (ctx.gbraid) body.gbraid = ctx.gbraid;
    if (ctx.wbraid) body.wbraid = ctx.wbraid;
    if (ctx.utm_source) body.utm_source = ctx.utm_source;
    if (ctx.utm_medium) body.utm_medium = ctx.utm_medium;
    if (ctx.utm_campaign) body.utm_campaign = ctx.utm_campaign;
    if (ctx.utm_content) body.utm_content = ctx.utm_content;
    if (ctx.utm_term) body.utm_term = ctx.utm_term;
    if (ctx.campaign_id) body.campaign_id = ctx.campaign_id;
    if (ctx.adgroup_id) body.adgroup_id = ctx.adgroup_id;
    if (ctx.keyword) body.keyword = ctx.keyword;
    if (ctx.device) body.device = ctx.device;
    if (ctx.network) body.network = ctx.network;
    if (ctx.matchtype) body.matchtype = ctx.matchtype;
    body.landing_page = `${window.location.pathname}${window.location.search}`.slice(0, 300);
    if (document.referrer) body.referrer = document.referrer.slice(0, 300);

    void fetch('/api/attribution/touch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {
      // ignore
    });
  } catch {
    // ignore
  }
}
