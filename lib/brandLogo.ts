/**
 * Single source of truth for the Lanna Bloom rose mark.
 * All on-site logos, favicons, emails, and JSON-LD must use these paths.
 * Files live in `public/favicon_io/` — do not add a second logo file.
 */
export const BRAND_LOGO_DIR = '/favicon_io';

/** Sharpest raster — use for every visible logo (header, footer, emails). */
export const BRAND_LOGO_SRC = `${BRAND_LOGO_DIR}/android-chrome-512x512.png`;

export const BRAND_APPLE_TOUCH = `${BRAND_LOGO_DIR}/apple-touch-icon.png`;
export const BRAND_FAVICON_ICO = `${BRAND_LOGO_DIR}/favicon.ico`;
export const BRAND_FAVICON_32 = `${BRAND_LOGO_DIR}/favicon-32x32.png`;
export const BRAND_FAVICON_16 = `${BRAND_LOGO_DIR}/favicon-16x16.png`;
export const BRAND_PWA_192 = `${BRAND_LOGO_DIR}/android-chrome-192x192.png`;
export const BRAND_PWA_512 = BRAND_LOGO_SRC;
export const BRAND_WEB_MANIFEST = `${BRAND_LOGO_DIR}/site.webmanifest`;
