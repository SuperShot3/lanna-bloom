/**
 * Single source of truth for catalog categories.
 * Used by catalog filters, catalog page, and i18n.
 * Partners do NOT create new categories — platform-defined only.
 */

/** Top-level catalog categories (flowers = bouquets, others = Sanity products) */
export const CATALOG_TOP_CATEGORIES = [
  'flowers',
  'plushy_toys',
  'balloons',
  'gifts',
  'money_flowers',
  'handmade_floral',
] as const;

export type CatalogTopCategory = (typeof CATALOG_TOP_CATEGORIES)[number];



/** Non-flower product categories (must match Sanity product.category options) */
export const PRODUCT_CATEGORIES = [
  'balloons',
  'gifts',
  'money_flowers',
  'handmade_floral',
  'plushy_toys',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

/** i18n keys for top-level categories (under catalog.topCategory.*) */
export const CATEGORY_I18N_KEYS: Record<CatalogTopCategory, string> = {
  flowers: 'topCategoryFlowers',
  balloons: 'topCategoryBalloons',
  gifts: 'topCategoryGifts',
  money_flowers: 'topCategoryMoneyFlowers',
  handmade_floral: 'topCategoryHandmadeFloral',
  plushy_toys: 'topCategoryPlushyToys',
};



/** Occasion quick filters for bouquets (URL param occasion) — bar + sidebar */
export const CATALOG_OCCASION_CHIPS: {
  value: string;
  labelKey:
    | 'occasionAny'
    | 'occasionRomantic'
    | 'occasionBirthday'
    | 'occasionAnniversary'
    | 'occasionSympathy'
    | 'occasionCongrats'
    | 'occasionGetWell';
}[] = [
  { value: '', labelKey: 'occasionAny' },
  { value: 'romantic', labelKey: 'occasionRomantic' },
  { value: 'birthday', labelKey: 'occasionBirthday' },
  { value: 'anniversary', labelKey: 'occasionAnniversary' },
  { value: 'sympathy', labelKey: 'occasionSympathy' },
  { value: 'congrats', labelKey: 'occasionCongrats' },
  { value: 'get_well', labelKey: 'occasionGetWell' },
];
