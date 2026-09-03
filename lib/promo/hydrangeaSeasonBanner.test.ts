/**
 * Hydrangea season promo banner config.
 * Run: npx tsx lib/promo/hydrangeaSeasonBanner.test.ts
 */
import assert from 'node:assert/strict';
import { buildCatalogSearchString } from '@/lib/catalogFilterParams';
import {
  HYDRANGEA_SEASON_BANNER_ENABLED,
  HYDRANGEA_SEASON_BANNER_IMAGE_SIZES,
  HYDRANGEA_SEASON_BANNER_LANDSCAPE_MIN_PX,
  HYDRANGEA_SEASON_BANNER_PORTRAIT_MAX_PX,
  HYDRANGEA_SEASON_HORIZONTAL,
  HYDRANGEA_SEASON_SLIDES,
  HYDRANGEA_SEASON_VERTICAL,
} from './hydrangeaSeasonBanner';

assert.equal(typeof HYDRANGEA_SEASON_BANNER_ENABLED, 'boolean');

// `sizes` must describe the same breakpoints the Tailwind classes use.
assert.ok(
  HYDRANGEA_SEASON_BANNER_IMAGE_SIZES.includes(
    `(min-width: ${HYDRANGEA_SEASON_BANNER_LANDSCAPE_MIN_PX}px)`
  ),
  'sizes must switch at the landscape breakpoint'
);
assert.ok(
  HYDRANGEA_SEASON_BANNER_IMAGE_SIZES.includes(`${HYDRANGEA_SEASON_BANNER_PORTRAIT_MAX_PX}px`),
  'sizes must cap the portrait slot'
);
assert.ok(
  HYDRANGEA_SEASON_BANNER_IMAGE_SIZES.includes('min(512px, calc(100vw - 32px))'),
  'mobile sizes must match px-4 gutters, not 100vw'
);
assert.ok(
  !HYDRANGEA_SEASON_BANNER_IMAGE_SIZES.trim().endsWith('100vw'),
  'mobile sizes must not fall back to 100vw'
);

// A 4:5 portrait at full tablet width would be taller than the viewport.
const portraitHeightAtCap =
  (HYDRANGEA_SEASON_BANNER_PORTRAIT_MAX_PX * HYDRANGEA_SEASON_VERTICAL.height) /
  HYDRANGEA_SEASON_VERTICAL.width;
assert.ok(
  portraitHeightAtCap < HYDRANGEA_SEASON_BANNER_LANDSCAPE_MIN_PX,
  'capped portrait must stay shorter than the landscape breakpoint'
);

assert.equal(HYDRANGEA_SEASON_SLIDES.length, 4);
assert.equal(HYDRANGEA_SEASON_HORIZONTAL.width / HYDRANGEA_SEASON_HORIZONTAL.height, 3);
assert.equal(
  Number((HYDRANGEA_SEASON_VERTICAL.width / HYDRANGEA_SEASON_VERTICAL.height).toFixed(2)),
  0.8
);

const ids = HYDRANGEA_SEASON_SLIDES.map((slide) => slide.id);
assert.equal(new Set(ids).size, ids.length, 'slide ids must be unique');

for (const slide of HYDRANGEA_SEASON_SLIDES) {
  assert.match(slide.horizontalSrc, /^\/promo_banner\/Hydrangea\/.+\.png$/);
  assert.match(slide.verticalSrc, /^\/promo_banner\/Hydrangea\/.+\.png$/);
  assert.doesNotMatch(slide.horizontalSrc, /\.png\.png$/);
  assert.doesNotMatch(slide.verticalSrc, /\.png\.png$/);
}

const href = `/en/catalog${buildCatalogSearchString({ types: ['hydrangea'] })}`;
assert.equal(href, '/en/catalog?types=hydrangea');

console.log('lib/promo/hydrangeaSeasonBanner.test.ts: ok');
