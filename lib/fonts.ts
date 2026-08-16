import { Mulish, Noto_Sans, Noto_Sans_TC } from 'next/font/google';

export const mulish = Mulish({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  adjustFontFallback: true,
  variable: '--font-sans',
});

/** Supplemental Cyrillic metrics for /ru routes (Mulish lacks Cyrillic subset). */
export const notoSansCyrillic = Noto_Sans({
  subsets: ['cyrillic', 'latin'],
  display: 'swap',
  adjustFontFallback: true,
  variable: '--font-sans-cyrillic',
  preload: false,
});

/** Traditional Chinese for /zh-hk routes. */
export const notoSansTc = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  adjustFontFallback: true,
  variable: '--font-sans-tc',
  preload: false,
});

/** @deprecated Prefer `mulish.variable`; Cyrillic is applied only on /ru layouts. */
export const fontVariables = mulish.variable;
