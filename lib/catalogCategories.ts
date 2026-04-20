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



/**
 * Human-readable display category used for analytics (GA4 `item_category`)
 * and for any UI that needs a single label per item.
 *
 * For BOUQUETS: derived from `presentationFormats` (first match wins).
 * For PRODUCTS / PLUSHY TOYS: derived from `category` / `catalogKind`.
 *
 * Add new categories by adding a row to FORMAT_TO_DISPLAY (bouquets) or
 * PRODUCT_CATEGORY_LABEL (non-bouquet products).
 */
export type DisplayCategory =
  | 'Bouquets'
  | 'Potted flowers'
  | 'Flowers in basket'
  | 'Flowers in box'
  | 'Flowers in vase'
  | 'Flower arrangement'
  | 'Plushy toys'
  | 'Balloons'
  | 'Gifts & Sets'
  | 'Money Flowers'
  | 'Handmade Floral'
  | 'Food & Sweets'
  | 'Wellness'
  | 'Home & Lifestyle'
  | 'Stationery'
  | 'Baby & Family'
  | 'Fashion & Accessories'
  | 'Seasonal'
  | 'Other'
  | string;

const FORMAT_TO_DISPLAY: Array<[string, DisplayCategory]> = [
  ['potted', 'Potted flowers'],
  ['basket', 'Flowers in basket'],
  ['box', 'Flowers in box'],
  ['vase', 'Flowers in vase'],
  ['arrangement', 'Flower arrangement'],
  ['bouquet', 'Bouquets'],
];

/** Maps Sanity `product.category` value → human-readable label. */
export const PRODUCT_CATEGORY_LABEL: Record<string, DisplayCategory> = {
  balloons: 'Balloons',
  gifts: 'Gifts & Sets',
  money_flowers: 'Money Flowers',
  handmade_floral: 'Handmade Floral',
  food_sweets: 'Food & Sweets',
  wellness: 'Wellness',
  home_lifestyle: 'Home & Lifestyle',
  stationery: 'Stationery',
  baby_family: 'Baby & Family',
  fashion: 'Fashion & Accessories',
  seasonal: 'Seasonal',
  other: 'Other',
  plushy_toys: 'Plushy toys',
};

/** Derive a display category for a bouquet from its `presentationFormats`. */
export function getBouquetDisplayCategory(b: { presentationFormats?: string[] }): DisplayCategory {
  const formats = b.presentationFormats ?? [];
  for (const [value, label] of FORMAT_TO_DISPLAY) {
    if (formats.includes(value)) return label;
  }
  return 'Bouquets';
}

/** Derive a display category for a non-bouquet product / plushy toy. */
export function getProductDisplayCategory(p: {
  category?: string;
  catalogKind?: 'product' | 'plushyToy';
}): DisplayCategory {
  if (p.catalogKind === 'plushyToy' || p.category === 'plushy_toys') return 'Plushy toys';
  const key = p.category ?? '';
  return PRODUCT_CATEGORY_LABEL[key] ?? key;
}

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
