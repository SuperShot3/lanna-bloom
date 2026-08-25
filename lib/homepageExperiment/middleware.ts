import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  HOMEPAGE_EXPERIMENT_COOKIE,
  HOMEPAGE_EXPERIMENT_LOCALE,
  HOMEPAGE_PREVIEW_QUERY,
  HOMEPAGE_V2_PATH_SEGMENT,
  getHomepageExperimentWeights,
  homepageExperimentCookieOptions,
  isHomepageExperimentEnabled,
} from './config';
import {
  isKnownCrawler,
  parseHomepageVariant,
  resolveHomepageExperiment,
} from './assignment';

function localeHomepagePath(pathname: string): { lang: string } | null {
  const trimmed = pathname.replace(/\/$/, '') || '/';
  const parts = trimmed.split('/').filter(Boolean);
  if (parts.length !== 1) return null;
  return { lang: parts[0] };
}

function homepageV2Path(pathname: string): { lang: string } | null {
  const trimmed = pathname.replace(/\/$/, '') || '/';
  const parts = trimmed.split('/').filter(Boolean);
  if (parts.length !== 2) return null;
  if (parts[1] !== HOMEPAGE_V2_PATH_SEGMENT) return null;
  return { lang: parts[0] };
}

function copyCookies(from: NextResponse, to: NextResponse): void {
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie);
  }
}

/**
 * Assign / persist homepage variant for `/en` only.
 * Direct `/en/homepage-v2` visits redirect to `/en`.
 * Preview `?homepage=v1|v2` does not overwrite the sticky cookie.
 */
export function applyHomepageExperiment(
  req: NextRequest,
  incoming?: NextResponse
): NextResponse | undefined {
  const { pathname } = req.nextUrl;

  const v2Hit = homepageV2Path(pathname);
  if (v2Hit) {
    const dest = req.nextUrl.clone();
    dest.pathname = `/${v2Hit.lang}`;
    const redirect = NextResponse.redirect(dest, 308);
    if (incoming) copyCookies(incoming, redirect);
    return redirect;
  }

  const home = localeHomepagePath(pathname);
  if (!home || home.lang !== HOMEPAGE_EXPERIMENT_LOCALE) {
    return incoming;
  }

  const enabled = isHomepageExperimentEnabled();
  if (!enabled) {
    const res = incoming ?? NextResponse.next();
    if (req.cookies.get(HOMEPAGE_EXPERIMENT_COOKIE)) {
      res.cookies.set(HOMEPAGE_EXPERIMENT_COOKIE, '', {
        ...homepageExperimentCookieOptions(0),
        maxAge: 0,
      });
    }
    return res;
  }

  const preview = parseHomepageVariant(req.nextUrl.searchParams.get(HOMEPAGE_PREVIEW_QUERY));
  const cookie = parseHomepageVariant(req.cookies.get(HOMEPAGE_EXPERIMENT_COOKIE)?.value);
  const { v1Weight, v2Weight } = getHomepageExperimentWeights();
  const resolved = resolveHomepageExperiment({
    enabled,
    preview,
    cookie,
    isCrawler: isKnownCrawler(req.headers.get('user-agent')),
    v1Weight,
    v2Weight,
  });

  let res: NextResponse;
  if (resolved.variant === 'v2') {
    const rewriteUrl = req.nextUrl.clone();
    rewriteUrl.pathname = `/${HOMEPAGE_EXPERIMENT_LOCALE}/${HOMEPAGE_V2_PATH_SEGMENT}`;
    res = NextResponse.rewrite(rewriteUrl);
  } else {
    res = incoming ?? NextResponse.next();
  }

  if (incoming && res !== incoming) {
    copyCookies(incoming, res);
  }

  if (resolved.persistCookie) {
    res.cookies.set(
      HOMEPAGE_EXPERIMENT_COOKIE,
      resolved.variant,
      homepageExperimentCookieOptions()
    );
  }

  if (resolved.noindex) {
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  return res;
}
