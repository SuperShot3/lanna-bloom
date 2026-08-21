import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  ATTR_COOKIE,
  ATTRIBUTION_COOKIE_MAX_AGE_SEC,
  VISITOR_COOKIE,
} from './constants';
import {
  attributionCookieOptions,
  decodeAttrCookie,
  encodeAttrCookie,
} from './cookieCodec';
import {
  clipLanding,
  clipReferrer,
  createVisitorId,
  parseAttributionSearchParams,
  urlHasAttributionQuery,
} from './params';
import { mergeAttributionSnapshot } from './rules';
import type { AttributionSnapshot } from './types';

function shouldSkipPath(pathname: string): boolean {
  if (pathname.startsWith('/admin')) return true;
  if (pathname.startsWith('/api')) return true;
  if (pathname.startsWith('/_next')) return true;
  return false;
}

export function landingPathFromUrl(url: URL): string {
  return clipLanding(`${url.pathname}${url.search}`) ?? url.pathname;
}

export function buildMergedSnapshotFromRequest(
  req: NextRequest,
  nowMs: number = Date.now(),
): { visitorId: string; snapshot: AttributionSnapshot } | null {
  const { pathname } = req.nextUrl;
  if (shouldSkipPath(pathname)) return null;
  if (!urlHasAttributionQuery(req.nextUrl.searchParams)) return null;

  const incoming = parseAttributionSearchParams(req.nextUrl.searchParams);
  incoming.landingPage = landingPathFromUrl(req.nextUrl);
  const referrer = clipReferrer(req.headers.get('referer'));
  if (referrer) incoming.referrer = referrer;

  const existing = decodeAttrCookie(req.cookies.get(ATTR_COOKIE)?.value);
  const visitorId = req.cookies.get(VISITOR_COOKIE)?.value?.trim() || createVisitorId();
  incoming.visitorId = visitorId;

  const snapshot = mergeAttributionSnapshot(existing, incoming, nowMs);
  snapshot.visitorId = visitorId;
  return { visitorId, snapshot };
}

/** Set HttpOnly attribution cookies when the URL actually has attribution keys. */
export function applyAttributionCookies(req: NextRequest): NextResponse | undefined {
  const merged = buildMergedSnapshotFromRequest(req);
  if (!merged) return undefined;

  const res = NextResponse.next();
  const opts = attributionCookieOptions(ATTRIBUTION_COOKIE_MAX_AGE_SEC);
  res.cookies.set(VISITOR_COOKIE, merged.visitorId, opts);
  res.cookies.set(ATTR_COOKIE, encodeAttrCookie(merged.snapshot), opts);
  return res;
}
