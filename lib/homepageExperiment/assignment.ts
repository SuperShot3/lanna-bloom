import type { HomepageVariant } from './config';

const CRAWLER_UA =
  /googlebot|bingbot|yandex|duckduckbot|baiduspider|facebookexternalhit|slurp|applebot|twitterbot|linkedinbot|embedly|preview/i;

export function parseHomepageVariant(raw: string | undefined | null): HomepageVariant | null {
  if (raw === 'v1' || raw === 'v2') return raw;
  return null;
}

export function isKnownCrawler(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return CRAWLER_UA.test(userAgent);
}

export function pickWeightedVariant(
  v1Weight: number,
  v2Weight: number,
  random: number
): HomepageVariant {
  const w1 = Math.max(0, v1Weight);
  const w2 = Math.max(0, v2Weight);
  const total = w1 + w2;
  if (total <= 0) return 'v1';
  return random < w1 / total ? 'v1' : 'v2';
}

export type ResolveHomepageExperimentInput = {
  enabled: boolean;
  preview: HomepageVariant | null;
  cookie: HomepageVariant | null;
  isCrawler: boolean;
  v1Weight: number;
  v2Weight: number;
  random?: number;
};

export type ResolveHomepageExperimentResult = {
  variant: HomepageVariant;
  persistCookie: boolean;
  noindex: boolean;
};

export function resolveHomepageExperiment(
  input: ResolveHomepageExperimentInput
): ResolveHomepageExperimentResult {
  if (!input.enabled) {
    return { variant: 'v1', persistCookie: false, noindex: false };
  }
  if (input.preview) {
    return { variant: input.preview, persistCookie: false, noindex: true };
  }
  if (input.isCrawler) {
    return { variant: 'v1', persistCookie: false, noindex: false };
  }
  if (input.cookie) {
    return { variant: input.cookie, persistCookie: true, noindex: false };
  }
  const variant = pickWeightedVariant(
    input.v1Weight,
    input.v2Weight,
    input.random ?? Math.random()
  );
  return { variant, persistCookie: true, noindex: false };
}
