/**
 * Homepage V2 hydrangea season promo.
 * Artwork claims 30% off — this module only links to the hydrangea catalog
 * filter; it does not apply a discount. Flip ENABLED to hide the block.
 */

export const HYDRANGEA_SEASON_BANNER_ENABLED = true;

export const HYDRANGEA_SEASON_BANNER_AUTOPLAY_MS = 6000;

/**
 * Portrait art runs below this width, 3:1 landscape art at or above it.
 * Keep in sync with the `lg:` aspect/width classes in `HomePromoBanner`.
 */
export const HYDRANGEA_SEASON_BANNER_LANDSCAPE_MIN_PX = 1024;

/** Portrait slot is capped so a 4:5 banner never grows taller than a tablet screen. */
export const HYDRANGEA_SEASON_BANNER_PORTRAIT_MAX_PX = 512;

/**
 * Landscape fills `max-w-7xl` minus `lg:px-8` gutters; portrait is viewport
 * width until it hits the cap above.
 */
export const HYDRANGEA_SEASON_BANNER_IMAGE_SIZES =
  '(min-width: 1024px) 1216px, (min-width: 640px) 512px, 100vw';

export const HYDRANGEA_SEASON_HORIZONTAL = { width: 2172, height: 724 } as const;
export const HYDRANGEA_SEASON_VERTICAL = { width: 1122, height: 1402 } as const;

const ASSET = '/promo_banner/Hydrangea';

export type HydrangeaSeasonSlideId = 'blue' | 'white' | 'light-mix' | 'mixed-dark';

export type HydrangeaSeasonSlideAltKey =
  | 'promoHydrangeaSlideBlue'
  | 'promoHydrangeaSlideWhite'
  | 'promoHydrangeaSlideLightMix'
  | 'promoHydrangeaSlideMixedDark';

export type HydrangeaSeasonSlide = {
  id: HydrangeaSeasonSlideId;
  altKey: HydrangeaSeasonSlideAltKey;
  horizontalSrc: string;
  verticalSrc: string;
};

export const HYDRANGEA_SEASON_SLIDES: readonly HydrangeaSeasonSlide[] = [
  {
    id: 'blue',
    altKey: 'promoHydrangeaSlideBlue',
    horizontalSrc: `${ASSET}/blue_hydrangea_horizontal_promo_lannabloom.png`,
    verticalSrc: `${ASSET}/blue_hydrangea_vertical_promo_lannabloom.png`,
  },
  {
    id: 'white',
    altKey: 'promoHydrangeaSlideWhite',
    horizontalSrc: `${ASSET}/white_hydrangea_horizontal_promo_lannabloom.png`,
    verticalSrc: `${ASSET}/white_hydrangea_vertical_promo_lannabloom.png`,
  },
  {
    id: 'light-mix',
    altKey: 'promoHydrangeaSlideLightMix',
    horizontalSrc: `${ASSET}/mix_hydrangea_horizontal_promo_lannabloom.png`,
    verticalSrc: `${ASSET}/light_mix_hydrangea_vertical_promo_lannabloom.png`,
  },
  {
    id: 'mixed-dark',
    altKey: 'promoHydrangeaSlideMixedDark',
    horizontalSrc: `${ASSET}/mix_dark_hydrangea_horizontal_promo_lannabloom.png`,
    verticalSrc: `${ASSET}/mixed_hydrangea_vertical_promo_lannabloom.png`,
  },
];
