/**
 * Slim replacement for Next.js `polyfill-module`.
 *
 * Next unconditionally ships polyfills for Baseline features that modern
 * browsers already support (Array.at/flat/flatMap, Object.fromEntries/hasOwn,
 * String.trimStart/trimEnd). That shows up as ~12 KiB "Legacy JavaScript" in
 * Lighthouse. We keep only URL.canParse, which Next still calls and which is
 * newer than the rest (Chrome 120+, Safari 17+).
 *
 * Revisit when upgrading Next past a release that gates polyfills on browserslist:
 * https://github.com/vercel/next.js/issues/86785
 */
if (!('canParse' in URL)) {
  URL.canParse = function canParse(url, base) {
    try {
      return !!new URL(url, base);
    } catch {
      return false;
    }
  };
}
