/** Shared catalog image helpers — Next.js Image optimizer for Supabase CDN URLs. */

export const CATALOG_CARD_IMAGE_SIZES =
  '(max-width: 600px) 50vw, (max-width: 900px) 50vw, 33vw';

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

/** Build a /_next/image URL for link preload hints. */
export function catalogOptimizedImageUrl(src: string, width: number): string {
  if (catalogImageUnoptimized(src)) return src;
  const params = new URLSearchParams({
    url: src,
    w: String(width),
    q: '75',
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
