import localFont from 'next/font/local';
import { Mulish, Noto_Sans, Noto_Sans_TC } from 'next/font/google';

export const mulish = Mulish({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  adjustFontFallback: true,
  variable: '--font-sans',
});

/** Display headings — HTML-preloaded so it does not wait on globals.css. */
export const arimaMadurai = localFont({
  src: [
    { path: '../public/fonts/arima-madurai-400.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/arima-madurai-700.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  adjustFontFallback: 'Times New Roman',
  fallback: ['ui-serif', 'Georgia', 'serif'],
  variable: '--font-display',
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
