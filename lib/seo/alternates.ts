/**
 * Shared SEO alternates helpers — self-canonical + en/th hreflang.
 * Canonicals never include query params (utm_*, srsltid, etc.).
 */
import type { Metadata } from 'next';
import { getBaseUrl } from '@/lib/siteUrl';
import type { Locale } from '@/lib/i18n';

/** Storefront locales that participate in SEO (sitemap + hreflang). */
export const SEO_LOCALES = ['en', 'th'] as const;
export type SeoLocale = (typeof SEO_LOCALES)[number];

export function isSeoLocale(lang: string): lang is SeoLocale {
  return (SEO_LOCALES as readonly string[]).includes(lang);
}

/**
 * Robots for thin locales (ru / zh-*). SEO locales return undefined so
 * page-level robots stay the sole source (avoids duplicate/conflicting tags).
 */
export function nonSeoLocaleRobots(
  lang: string
): NonNullable<Metadata['robots']> | undefined {
  if (isSeoLocale(lang)) return undefined;
  return { index: false, follow: true };
}

/**
 * Strip query/hash and normalize to an absolute canonical URL.
 * Accepts absolute URLs or site-relative paths (with or without leading slash).
 */
export function cleanCanonicalUrl(urlOrPath: string): string {
  const base = getBaseUrl().replace(/\/$/, '');
  let raw = urlOrPath.trim();
  if (!raw) return base;

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      const u = new URL(raw);
      return `${u.origin}${u.pathname.replace(/\/$/, '') || '/'}`;
    } catch {
      return raw.split('?')[0].split('#')[0];
    }
  }

  const path = raw.split('?')[0].split('#')[0];
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const withoutTrailing =
    normalized.length > 1 && normalized.endsWith('/')
      ? normalized.slice(0, -1)
      : normalized;
  return `${base}${withoutTrailing === '/' ? '' : withoutTrailing}` || base;
}

/**
 * Absolute path for a locale + pathSuffix.
 * pathSuffix examples: "", "/catalog", "/phuket/flower-delivery", "/info/delivery-policy"
 */
export function localePath(lang: SeoLocale | Locale, pathSuffix = ''): string {
  const suffix = pathSuffix
    ? pathSuffix.startsWith('/')
      ? pathSuffix
      : `/${pathSuffix}`
    : '';
  const clean = suffix.split('?')[0].split('#')[0];
  return `/${lang}${clean === '/' ? '' : clean}`;
}

/** Build en/th (+ x-default→en) language map for a path suffix shared across locales. */
export function buildLanguageAlternates(pathSuffix = ''): Record<string, string> {
  const base = getBaseUrl().replace(/\/$/, '');
  const enPath = localePath('en', pathSuffix);
  const thPath = localePath('th', pathSuffix);
  return {
    en: `${base}${enPath}`,
    th: `${base}${thPath}`,
    'x-default': `${base}${enPath}`,
  };
}

export function buildAlternates(params: {
  lang: Locale | string;
  /** Path after locale, e.g. "/catalog/red-rose-romance" or "/phuket/flower-delivery" */
  pathSuffix?: string;
  /** Full absolute or relative canonical override (query params stripped). */
  canonical?: string;
}): NonNullable<Metadata['alternates']> {
  const pathSuffix = params.pathSuffix ?? '';
  const canonical =
    params.canonical != null
      ? cleanCanonicalUrl(params.canonical)
      : cleanCanonicalUrl(localePath(params.lang as Locale, pathSuffix));

  return {
    canonical,
    languages: buildLanguageAlternates(pathSuffix),
  };
}
