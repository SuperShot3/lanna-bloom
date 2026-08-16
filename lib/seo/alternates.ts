/**
 * Shared SEO alternates helpers — self-canonical + storefront hreflang.
 * Canonicals never include query params (utm_*, srsltid, etc.).
 */
import type { Metadata } from 'next';
import { getBaseUrl, isLocalHostname } from '@/lib/siteUrl';
import type { Locale } from '@/lib/i18n';

/** Storefront locales that participate in SEO (sitemap + hreflang). */
export const SEO_LOCALES = ['en', 'th', 'zh-hk'] as const;
export type SeoLocale = (typeof SEO_LOCALES)[number];

/** Info articles stay EN/TH only — zh-hk articles are English fallbacks, not indexed. */
export const ARTICLE_SEO_LOCALES = ['en', 'th'] as const;
export type ArticleSeoLocale = (typeof ARTICLE_SEO_LOCALES)[number];

export function isSeoLocale(lang: string): lang is SeoLocale {
  return (SEO_LOCALES as readonly string[]).includes(lang);
}

export function isArticleSeoLocale(lang: string): lang is ArticleSeoLocale {
  return (ARTICLE_SEO_LOCALES as readonly string[]).includes(lang);
}

/** HTML hreflang code for a storefront locale (`zh-hk` URL → `zh-HK`). */
export function hreflangForLocale(lang: string): string {
  if (lang === 'zh-hk') return 'zh-HK';
  return lang;
}

/**
 * Robots for thin locales (ru / zh-sg). SEO locales return undefined so
 * page-level robots stay the sole source (avoids duplicate/conflicting tags).
 */
export function nonSeoLocaleRobots(
  lang: string
): NonNullable<Metadata['robots']> | undefined {
  if (isSeoLocale(lang)) return undefined;
  return { index: false, follow: true };
}

/** noindex untranslated article locales; respect per-article noindex. */
export function articlePageRobots(
  lang: string,
  articleNoindex?: boolean
): NonNullable<Metadata['robots']> | undefined {
  if (articleNoindex) return { index: false, follow: false };
  if (!isArticleSeoLocale(lang)) return { index: false, follow: true };
  return undefined;
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
      if (u.protocol === 'http:' && !isLocalHostname(u.hostname)) {
        u.protocol = 'https:';
      }
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

/** Language map for a path suffix shared across the given locales. */
export function buildLanguageAlternates(
  pathSuffix = '',
  locales: readonly string[] = SEO_LOCALES
): Record<string, string> {
  const base = getBaseUrl().replace(/\/$/, '');
  const languages: Record<string, string> = {};
  for (const lang of locales) {
    languages[hreflangForLocale(lang)] = `${base}${localePath(lang as Locale, pathSuffix)}`;
  }
  languages['x-default'] = `${base}${localePath('en', pathSuffix)}`;
  return languages;
}

export function buildAlternates(params: {
  lang: Locale | string;
  /** Path after locale, e.g. "/catalog/red-rose-romance" or "/phuket/flower-delivery" */
  pathSuffix?: string;
  /** Full absolute or relative canonical override (query params stripped). */
  canonical?: string;
  /** Locales to advertise in hreflang. Defaults to storefront SEO locales. */
  languageLocales?: readonly string[];
}): NonNullable<Metadata['alternates']> {
  const pathSuffix = params.pathSuffix ?? '';
  const languageLocales = params.languageLocales ?? SEO_LOCALES;
  const canonical =
    params.canonical != null
      ? cleanCanonicalUrl(params.canonical)
      : cleanCanonicalUrl(localePath(params.lang as Locale, pathSuffix));

  return {
    canonical,
    languages: buildLanguageAlternates(pathSuffix, languageLocales),
  };
}

/**
 * Info article / hub alternates: EN+TH hreflang only.
 * Non-article locales canonicalise to English so untranslated copies are not indexed.
 */
export function buildArticleAlternates(params: {
  lang: Locale | string;
  pathSuffix: string;
}): NonNullable<Metadata['alternates']> {
  const canonicalLang = isArticleSeoLocale(params.lang) ? params.lang : 'en';
  return buildAlternates({
    lang: canonicalLang,
    pathSuffix: params.pathSuffix,
    languageLocales: ARTICLE_SEO_LOCALES,
  });
}
