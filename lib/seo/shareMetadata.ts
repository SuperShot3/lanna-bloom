import type { Metadata } from 'next';
import { getBaseUrl } from '@/lib/siteUrl';

/** Landscape JPEG — WhatsApp / iMessage / LINE reject or degrade tall WebP previews. */
export const DEFAULT_SHARE_IMAGE_PATH = '/og/lanna-bloom.jpg';
export const DEFAULT_SHARE_IMAGE_WIDTH = 1200;
export const DEFAULT_SHARE_IMAGE_HEIGHT = 630;
export const DEFAULT_SHARE_IMAGE_TYPE = 'image/jpeg';
export const DEFAULT_SHARE_IMAGE_ALT =
  'Lanna Bloom — flower and gift delivery in Chiang Mai';

export type ShareOgImage = {
  url: string;
  secureUrl: string;
  width: number;
  height: number;
  type: string;
  alt: string;
};

export function absoluteSiteUrl(path = ''): string {
  const base = getBaseUrl().replace(/\/$/, '');
  if (!path) return base;
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

export function openGraphLocale(lang: string): string {
  if (lang === 'th') return 'th_TH';
  if (lang === 'zh-hk') return 'zh_HK';
  if (lang === 'ru') return 'ru_RU';
  if (lang === 'zh-sg') return 'zh_CN';
  return 'en_US';
}

export function defaultShareImageUrl(): string {
  return absoluteSiteUrl(DEFAULT_SHARE_IMAGE_PATH);
}

export function defaultShareImages(alt?: string): ShareOgImage[] {
  const url = defaultShareImageUrl();
  return [
    {
      url,
      secureUrl: url,
      width: DEFAULT_SHARE_IMAGE_WIDTH,
      height: DEFAULT_SHARE_IMAGE_HEIGHT,
      type: DEFAULT_SHARE_IMAGE_TYPE,
      alt: alt?.trim() || DEFAULT_SHARE_IMAGE_ALT,
    },
  ];
}

export function websiteOpenGraph(opts: {
  title: string;
  description: string;
  url: string;
  locale?: string;
  images?: NonNullable<NonNullable<Metadata['openGraph']>['images']>;
}): NonNullable<Metadata['openGraph']> {
  return {
    title: opts.title,
    description: opts.description,
    url: opts.url,
    siteName: 'Lanna Bloom',
    type: 'website',
    locale: opts.locale ?? 'en_US',
    images: opts.images ?? defaultShareImages(),
  };
}

export function websiteTwitter(opts: {
  title: string;
  description: string;
  imageUrl?: string;
}): NonNullable<Metadata['twitter']> {
  return {
    card: 'summary_large_image',
    title: opts.title,
    description: opts.description,
    images: [opts.imageUrl ?? defaultShareImageUrl()],
  };
}
