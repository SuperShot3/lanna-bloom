/** Shared catalog image helpers — Next.js Image optimizer for Supabase CDN URLs. */

export const CATALOG_CARD_IMAGE_SIZES =
  '(max-width: 600px) 50vw, (max-width: 900px) 50vw, 33vw';

/** Homepage “Shop by flower type” marquee tiles: 4.75rem / 6rem / 7rem. */
export const HOME_FLOWER_TYPE_TILE_IMAGE_SIZES =
  '(max-width: 640px) 76px, (max-width: 768px) 96px, 112px';

/** Loop-copy marquee tiles share one cached width instead of a second srcset. */
export const HOME_FLOWER_TYPE_TILE_DUP_WIDTH = 128;

/** Homepage hero carousel cards: 272 / 288 / 336 / 384 CSS px (not full viewport). */
export const HERO_CAROUSEL_IMAGE_SIZES =
  '(max-width: 640px) 272px, (max-width: 768px) 288px, (max-width: 1024px) 336px, 384px';

export const HERO_LCP_IMAGE_QUALITY = 70;

/**
 * Fallback preload width when `imagesrcset` is unavailable. Lighthouse mobile
 * (~272 CSS px × 1.75 DPR) selects 480 from next.config imageSizes.
 */
export const HERO_LCP_PRELOAD_WIDTH = 480;

/** Below-fold delivery section photo: full-bleed on small screens, cap on desktop. */
export const HOME_DELIVERY_IMAGE_SIZES =
  '(max-width: 768px) 100vw, (max-width: 1280px) 100vw, 1280px';

export const CATALOG_PDP_HERO_SIZES = '(max-width: 600px) 100vw, 50vw';

export const CATALOG_PDP_LIGHTBOX_SIZES = '100vw';

export const CATALOG_PDP_PRELOAD_WIDTH = 750;

export const CATALOG_STICKY_THUMB_SIZE = 48;

/** Only data URLs and local SVGs skip the optimizer. */
export function catalogImageUnoptimized(src: string): boolean {
  if (!src) return true;
  if (src.startsWith('data:')) return true;
  if (src.startsWith('/') && src.endsWith('.svg')) return true;
  return false;
}

function configuredSupabaseHostname(): string | null {
  const raw = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  try {
    return new URL(raw).hostname.toLowerCase() || null;
  } catch {
    return null;
  }
}

function isSanityCdnHostname(hostname: string): boolean {
  return hostname.includes('cdn.sanity.io') || hostname.endsWith('.sanity.io');
}

function isSupabaseStorageHostname(hostname: string): boolean {
  return hostname.endsWith('.supabase.co') || hostname === configuredSupabaseHostname();
}

/** True when a URL is safe to pass to `next/image` (matches next.config remotePatterns). */
export function isStorefrontRenderableImageUrl(src: string | undefined | null): boolean {
  const raw = src?.trim();
  if (!raw) return false;
  if (raw.startsWith('data:image/')) return true;
  if (raw.startsWith('/') && !raw.startsWith('//')) return true;

  try {
    const { protocol, hostname, pathname } = new URL(raw);
    if (protocol !== 'https:' && protocol !== 'http:') return false;
    const host = hostname.toLowerCase();
    if (host === 'images.unsplash.com') return true;
    if (isSanityCdnHostname(host)) return false;
    if (isSupabaseStorageHostname(host)) {
      return pathname.includes('/storage/v1/object/public/');
    }
    return false;
  } catch {
    return false;
  }
}

export function firstStorefrontRenderableImageUrl(
  urls: string[] | null | undefined
): string | null {
  for (const url of urls ?? []) {
    if (isStorefrontRenderableImageUrl(url)) return url.trim();
  }
  return null;
}

export function filterStorefrontRenderableImageUrls(urls: string[]): string[] {
  return urls.filter(isStorefrontRenderableImageUrl);
}

/** Build a /_next/image URL for link preload hints. */
export function catalogOptimizedImageUrl(
  src: string,
  width: number,
  quality = 75
): string {
  if (catalogImageUnoptimized(src)) return src;
  const params = new URLSearchParams({
    url: src,
    w: String(width),
    q: String(quality),
  });
  return `/_next/image?${params.toString()}`;
}

const preloadedKeys = new Set<string>();

/** Preload an optimized catalog image (client-only, deduped). */
export function preloadCatalogImage(src: string, width: number): void {
  if (typeof document === 'undefined') return;
  if (catalogImageUnoptimized(src)) return;

  const href = catalogOptimizedImageUrl(src, width);
  const key = href;
  if (preloadedKeys.has(key)) return;
  preloadedKeys.add(key);

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = href;
  document.head.appendChild(link);
}

/** Load active slide and immediate neighbors in the PDP gallery. */
export function shouldLoadGallerySlideImage(index: number, activeIndex: number): boolean {
  return Math.abs(index - activeIndex) <= 1;
}
