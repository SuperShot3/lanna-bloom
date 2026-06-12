import { Mulish, Noto_Sans } from 'next/font/google';

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
});

export const fontVariables = `${mulish.variable} ${notoSansCyrillic.variable}`;
