import {
  getArticleBySlug,
  getArticleCoverAlt,
} from '@/app/[lang]/info/_data/articles';
import type { Locale } from '@/lib/i18n';
import type {
  MarketPathSlug,
  MarketRegistryEntry,
} from '@/lib/delivery/markets';
import {
  shareImagesFromPath,
  type ShareOgImage,
} from '@/lib/seo/shareMetadata';

/**
 * City shop/catalog share JPEGs, cropped from the matching info-article cover.
 * Krabi has no article cover yet and stays on the Chiang Mai default.
 */
export const MARKET_SHARE_ARTICLE_SLUG: Partial<Record<MarketPathSlug, string>> =
  {
    bangkok: 'flower-delivery-bangkok',
    pattaya: 'flower-delivery-pattaya',
    phuket: 'flower-delivery-phuket',
    'hua-hin': 'flower-delivery-hua-hin',
    samui: 'flower-delivery-samui',
    pai: 'flower-delivery-pai',
    lamphun: 'flower-delivery-lamphun-province',
  };

export function marketOgJpegPath(pathSlug: MarketPathSlug): string | null {
  if (!MARKET_SHARE_ARTICLE_SLUG[pathSlug]) return null;
  return `/og/${pathSlug}.jpg`;
}

export function marketShareImages(
  market: Pick<MarketRegistryEntry, 'pathSlug'>,
  lang: Locale
): ShareOgImage[] | undefined {
  const jpegPath = marketOgJpegPath(market.pathSlug);
  const articleSlug = MARKET_SHARE_ARTICLE_SLUG[market.pathSlug];
  if (!jpegPath || !articleSlug) return undefined;
  const article = getArticleBySlug(articleSlug);
  const alt = article ? getArticleCoverAlt(article, lang) : undefined;
  return shareImagesFromPath(jpegPath, alt);
}

export function articleShareImages(
  articleSlug: string,
  lang: string
): ShareOgImage[] | undefined {
  const pathSlug = (
    Object.entries(MARKET_SHARE_ARTICLE_SLUG) as [MarketPathSlug, string][]
  ).find(([, slug]) => slug === articleSlug)?.[0];
  if (!pathSlug) return undefined;
  const jpegPath = marketOgJpegPath(pathSlug);
  if (!jpegPath) return undefined;
  const article = getArticleBySlug(articleSlug);
  const alt = article ? getArticleCoverAlt(article, lang) : undefined;
  return shareImagesFromPath(jpegPath, alt);
}
