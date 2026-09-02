import { auth } from '@/auth';
import { applyAttributionCookies } from '@/lib/attribution/middlewareCapture';
import { applyDeliveryRegionCookie } from '@/lib/delivery/deliveryRegionCookie';
import {
  matchPrettyMarketCatalogRewrite,
  matchRegionalProductRedirect,
  matchUglyMarketCatalogRedirect,
} from '@/lib/delivery/regionalProductRedirect';
import { NextResponse, type NextRequest } from 'next/server';

const STOREFRONT_LANGS = new Set(['en', 'th', 'ru', 'zh-sg', 'zh-hk']);
const RETIRED_HOMEPAGE_EXPERIMENT_COOKIE = 'lanna_hp_exp';
const HOMEPAGE_V2_PATH_SEGMENT = 'homepage-v2';

function copyCookies(from: NextResponse, to: NextResponse): void {
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie);
  }
}

function expireRetiredHomepageExperimentCookie(res: NextResponse): void {
  res.cookies.set(RETIRED_HOMEPAGE_EXPERIMENT_COOKIE, '', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

/**
 * Redirect leftover `/[lang]/homepage-v2` bookmarks and drop the retired A/B cookie.
 */
function applyRetiredHomepageExperimentCleanup(
  req: NextRequest,
  incoming?: NextResponse
): NextResponse | undefined {
  const trimmed = req.nextUrl.pathname.replace(/\/$/, '') || '/';
  const parts = trimmed.split('/').filter(Boolean);

  if (
    parts.length === 2 &&
    STOREFRONT_LANGS.has(parts[0]) &&
    parts[1] === HOMEPAGE_V2_PATH_SEGMENT
  ) {
    const dest = req.nextUrl.clone();
    dest.pathname = `/${parts[0]}`;
    const redirect = NextResponse.redirect(dest, 308);
    if (incoming) copyCookies(incoming, redirect);
    expireRetiredHomepageExperimentCookie(redirect);
    return redirect;
  }

  const isLocaleHome = parts.length === 1 && STOREFRONT_LANGS.has(parts[0]);
  if (!isLocaleHome || !req.cookies.get(RETIRED_HOMEPAGE_EXPERIMENT_COOKIE)) {
    return incoming;
  }

  const res = incoming ?? NextResponse.next();
  expireRetiredHomepageExperimentCookie(res);
  return res;
}

/**
 * 308 /[lang]/catalog/[region]/[slug] (and legacy /[lang]/[region]/catalog/[slug])
 * onto the canonical product URL, preserving the region in the delivery cookie.
 */
function applyRegionalProductRedirect(
  req: NextRequest,
  incoming?: NextResponse
): NextResponse | undefined {
  const match = matchRegionalProductRedirect(req.nextUrl.pathname);
  if (!match) return incoming;

  const dest = req.nextUrl.clone();
  dest.pathname = match.targetPath;
  const redirect = NextResponse.redirect(dest, 308);
  if (incoming) copyCookies(incoming, redirect);
  applyDeliveryRegionCookie(redirect, match.destinationId);
  return redirect;
}

/**
 * Public city catalogs are /[lang]/catalog/[market]. The nested /catalog page
 * is only the dynamic renderer (product ISR cannot share that segment).
 */
function applyMarketCatalogListing(
  req: NextRequest,
  incoming?: NextResponse
): NextResponse | undefined {
  const ugly = matchUglyMarketCatalogRedirect(req.nextUrl.pathname);
  if (ugly) {
    const dest = req.nextUrl.clone();
    dest.pathname = ugly.targetPath;
    const redirect = NextResponse.redirect(dest, 308);
    if (incoming) copyCookies(incoming, redirect);
    return redirect;
  }

  const pretty = matchPrettyMarketCatalogRewrite(req.nextUrl.pathname);
  if (!pretty) return incoming;

  const dest = req.nextUrl.clone();
  dest.pathname = pretty.targetPath;
  const rewrite = NextResponse.rewrite(dest);
  if (incoming) copyCookies(incoming, rewrite);
  return rewrite;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/admin')) {
    const isPublic =
      pathname === '/admin' ||
      pathname === '/admin/login' ||
      pathname.startsWith('/admin/login/');
    if (isPublic) return;
    if (!req.auth?.user) {
      const login = new URL('/admin/login', req.url);
      return Response.redirect(login);
    }
    return;
  }

  if (pathname.startsWith('/api') || pathname.startsWith('/_next')) {
    return;
  }

  const attrRes = applyAttributionCookies(req);
  const regional = applyRegionalProductRedirect(req, attrRes);
  if (regional && regional !== attrRes) return regional;
  const listing = applyMarketCatalogListing(req, regional ?? attrRes);
  if (listing && listing !== attrRes && listing !== regional) return listing;
  return (
    applyRetiredHomepageExperimentCleanup(req, listing ?? regional ?? attrRes) ??
    listing ??
    regional ??
    attrRes
  );
});

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/:lang(en|th|ru|zh-sg|zh-hk)',
    '/:lang(en|th|ru|zh-sg|zh-hk)/',
    '/:lang(en|th|ru|zh-sg|zh-hk)/homepage-v2',
    '/:lang(en|th|ru|zh-sg|zh-hk)/catalog/:path*',
    '/:lang(en|th|ru|zh-sg|zh-hk)/:market/catalog/:slug',
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)',
      has: [{ type: 'query', key: 'gclid' }],
    },
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)',
      has: [{ type: 'query', key: 'gbraid' }],
    },
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)',
      has: [{ type: 'query', key: 'wbraid' }],
    },
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)',
      has: [{ type: 'query', key: 'utm_source' }],
    },
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)',
      has: [{ type: 'query', key: 'utm_medium' }],
    },
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)',
      has: [{ type: 'query', key: 'utm_campaign' }],
    },
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)',
      has: [{ type: 'query', key: 'campaignid' }],
    },
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)',
      has: [{ type: 'query', key: 'gad_campaignid' }],
    },
  ],
};
