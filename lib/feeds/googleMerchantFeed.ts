import type { Bouquet } from '@/lib/bouquets';
import { bouquetIsAvailableForDestination } from '@/lib/bouquetDestinationAvailability';
import { applyCatalogDiscountThb } from '@/lib/catalogDiscount';
import {
  getBouquetDisplayCategory,
  getProductDisplayCategory,
  type DisplayCategory,
} from '@/lib/catalogCategories';
import type { CatalogProduct } from '@/lib/sanity';

export const FEED_BRAND = 'Lanna Bloom';
export const FEED_DESTINATION = 'CHIANG_MAI' as const;
/** Flat standard delivery for Chiang Mai feed (no region code — invalid for TH in Merchant Center). */
export const FEED_SHIPPING = 'TH::Standard:350.00 THB';

export const DEFAULT_BASE_URL = 'https://lannabloom.shop';
export const MAX_FEED_ID_LENGTH = 49;

/** Official Google Product Taxonomy numeric IDs (taxonomy.google.com). */
export const GOOGLE_TAXONOMY_ID: Record<string, string> = {
  fresh_cut_flowers: '2899',
  bouquets: '2899',
  potted_flowers: '279',
  flowers_in_basket: '2899',
  flowers_in_box: '2899',
  flowers_in_vase: '2899',
  flower_arrangement: '2899',
  plushy_toys: '1254',
  balloons: '2559',
  gifts: '94',
  money_flowers: '2899',
  handmade_floral: '2899',
  food_sweets: '422',
  wellness: '567',
  home_lifestyle: '436',
  stationery: '922',
  baby_family: '2847',
  fashion: '1604',
  seasonal: '2899',
  other: '2899',
};

const DISPLAY_CATEGORY_TO_TAXONOMY: Record<DisplayCategory, string> = {
  Bouquets: GOOGLE_TAXONOMY_ID.bouquets,
  'Potted flowers': GOOGLE_TAXONOMY_ID.potted_flowers,
  'Flowers in basket': GOOGLE_TAXONOMY_ID.flowers_in_basket,
  'Flowers in box': GOOGLE_TAXONOMY_ID.flowers_in_box,
  'Flowers in vase': GOOGLE_TAXONOMY_ID.flowers_in_vase,
  'Flower arrangement': GOOGLE_TAXONOMY_ID.flower_arrangement,
  'Plushy toys': GOOGLE_TAXONOMY_ID.plushy_toys,
  Balloons: GOOGLE_TAXONOMY_ID.balloons,
  'Gifts & Sets': GOOGLE_TAXONOMY_ID.gifts,
  'Money Flowers': GOOGLE_TAXONOMY_ID.money_flowers,
  'Handmade Floral': GOOGLE_TAXONOMY_ID.handmade_floral,
  'Food & Sweets': GOOGLE_TAXONOMY_ID.food_sweets,
  Wellness: GOOGLE_TAXONOMY_ID.wellness,
  'Home & Lifestyle': GOOGLE_TAXONOMY_ID.home_lifestyle,
  Stationery: GOOGLE_TAXONOMY_ID.stationery,
  'Baby & Family': GOOGLE_TAXONOMY_ID.baby_family,
  'Fashion & Accessories': GOOGLE_TAXONOMY_ID.fashion,
  Seasonal: GOOGLE_TAXONOMY_ID.seasonal,
  Other: GOOGLE_TAXONOMY_ID.other,
};

export const FEED_HEADERS = [
  'id',
  'title',
  'description',
  'link',
  'image_link',
  'additional_image_link',
  'condition',
  'availability',
  'price',
  'brand',
  'identifier_exists',
  'item_group_id',
  'google_product_category',
  'color',
  'size',
  'custom_label_0',
  'shipping',
] as const;

export type FeedSkipReason =
  | 'not_chiang_mai'
  | 'missing_id'
  | 'missing_price'
  | 'missing_image'
  | 'unrecoverable_title';

export interface FeedSkippedProduct {
  id: string;
  productType: 'bouquet' | 'plushy_toy' | 'balloon';
  reason: FeedSkipReason;
  detail?: string;
}

export interface GoogleMerchantFeedInput {
  bouquets: Bouquet[];
  plushyToys: CatalogProduct[];
  balloons: CatalogProduct[];
  baseUrl?: string;
}

export interface GoogleMerchantFeedResult {
  tsv: string;
  rowCount: number;
  skipped: FeedSkippedProduct[];
}

function feedBaseUrl(override?: string): string {
  const raw = override?.trim() || DEFAULT_BASE_URL;
  return raw.replace(/\/$/, '');
}

/** Strip tabs/newlines for TSV safety. */
export function sanitiseFeedField(value: string): string {
  return value.replace(/\t/g, ' ').replace(/[\r\n]+/g, ' ').trim();
}

function hashFeedId(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(36).padStart(7, '0');
}

export function compactFeedId(value: string): string {
  const normalised = sanitiseFeedField(value)
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (normalised.length <= MAX_FEED_ID_LENGTH) return normalised;

  const suffix = hashFeedId(normalised);
  const prefixLength = MAX_FEED_ID_LENGTH - suffix.length - 1;
  const prefix = normalised.slice(0, prefixLength).replace(/_+$/g, '');
  return `${prefix}_${suffix}`;
}

export function formatFeedPrice(amountThb: number): string {
  return `${amountThb.toFixed(2)} THB`;
}

/** Prefer high-res Sanity CDN URLs for Merchant Center image quality. */
export function highResFeedImageUrl(url: string): string {
  if (!url || url.startsWith('data:')) return '';
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('cdn.sanity.io')) {
      parsed.searchParams.set('w', '1200');
      parsed.searchParams.set('q', '85');
      return parsed.toString();
    }
  } catch {
    /* keep original */
  }
  return url;
}

export function formatFeedColors(colors: string[] | undefined): string {
  if (!colors?.length) return '';
  return colors.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join('/');
}

function taxonomyIdForDisplayCategory(category: DisplayCategory): string {
  return DISPLAY_CATEGORY_TO_TAXONOMY[category] ?? GOOGLE_TAXONOMY_ID.other;
}

function taxonomyIdForBouquet(bouquet: Bouquet): string {
  return taxonomyIdForDisplayCategory(getBouquetDisplayCategory(bouquet));
}

function taxonomyIdForCatalogProduct(product: CatalogProduct): string {
  return taxonomyIdForDisplayCategory(getProductDisplayCategory(product));
}

function buildTitleFallback(parts: {
  brand?: string;
  productType: string;
  colorOrSize?: string;
  nameHint?: string;
}): string {
  const brand = parts.brand ?? FEED_BRAND;
  const segment = [brand, parts.productType, parts.colorOrSize || parts.nameHint]
    .filter(Boolean)
    .join(' ');
  return sanitiseFeedField(segment);
}

function buildDescriptionFallback(productName: string, category: DisplayCategory): string {
  const name = productName.trim() || 'gift';
  return sanitiseFeedField(
    `High-quality ${name} available at our store. Perfect for ${category}. Price includes VAT.`
  );
}

function resolveTitle(
  nameEn: string | undefined,
  fallback: { brand?: string; productType: string; colorOrSize?: string }
): string {
  const trimmed = nameEn?.trim();
  if (trimmed) return sanitiseFeedField(trimmed);
  return buildTitleFallback(fallback);
}

function resolveDescription(
  primary: string | undefined,
  secondary: string | undefined,
  productName: string,
  category: DisplayCategory
): string {
  const candidate = (primary || secondary || '').trim();
  if (candidate) return sanitiseFeedField(candidate);
  return buildDescriptionFallback(productName, category);
}

function pushRow(rows: string[], fields: string[]): void {
  rows.push(fields.map((f) => sanitiseFeedField(f)).join('\t'));
}

function skip(
  skipped: FeedSkippedProduct[],
  entry: FeedSkippedProduct
): void {
  skipped.push(entry);
}

export function buildGoogleMerchantFeed(input: GoogleMerchantFeedInput): GoogleMerchantFeedResult {
  const baseUrl = feedBaseUrl(input.baseUrl);
  const rows: string[] = [FEED_HEADERS.join('\t')];
  const skipped: FeedSkippedProduct[] = [];

  for (const bouquet of input.bouquets) {
    if (!bouquetIsAvailableForDestination(bouquet, FEED_DESTINATION)) {
      skip(skipped, {
        id: bouquet.id,
        productType: 'bouquet',
        reason: 'not_chiang_mai',
        detail: 'excluded from Chiang Mai delivery',
      });
      continue;
    }

    const category = getBouquetDisplayCategory(bouquet);
    const taxonomyId = taxonomyIdForBouquet(bouquet);
    const link = `${baseUrl}/en/catalog/${bouquet.slug}`;
    const allImages = bouquet.images.map(highResFeedImageUrl).filter(Boolean);
    const imageLink = allImages[0];
    const additionalImage = allImages[1] ?? '';
    const color = formatFeedColors(bouquet.colors);
    const occasionLabel = bouquet.occasion?.length ? sanitiseFeedField(bouquet.occasion[0]) : '';
    const productType = category === 'Bouquets' ? 'Bouquet' : category;

    if (!imageLink) {
      skip(skipped, {
        id: bouquet.id,
        productType: 'bouquet',
        reason: 'missing_image',
      });
      continue;
    }

    const baseDesc = resolveDescription(
      bouquet.descriptionEn,
      bouquet.compositionEn,
      bouquet.nameEn || bouquet.slug,
      category
    );

    for (const option of bouquet.sizes) {
      const sku = `${bouquet.id}_${option.optionId}`.trim();
      const merchantId = compactFeedId(sku);
      if (!sku) {
        skip(skipped, {
          id: bouquet.id,
          productType: 'bouquet',
          reason: 'missing_id',
        });
        continue;
      }

      const priceThb = applyCatalogDiscountThb(option.price ?? 0, bouquet.discountPercent);
      if (priceThb <= 0) {
        skip(skipped, {
          id: sku,
          productType: 'bouquet',
          reason: 'missing_price',
        });
        continue;
      }

      const titleBase = bouquet.nameEn?.trim()
        ? `${bouquet.nameEn} — ${option.label}`
        : '';
      const title = titleBase
        ? sanitiseFeedField(titleBase)
        : buildTitleFallback({
            productType,
            colorOrSize: color || option.label,
            nameHint: bouquet.slug,
          });

      if (!title) {
        skip(skipped, {
          id: sku,
          productType: 'bouquet',
          reason: 'unrecoverable_title',
        });
        continue;
      }

      const availability = option.availability !== false ? 'in_stock' : 'out_of_stock';

      pushRow(rows, [
        merchantId,
        title,
        baseDesc,
        link,
        imageLink,
        additionalImage,
        'new',
        availability,
        formatFeedPrice(priceThb),
        FEED_BRAND,
        'no',
        bouquet.slug,
        taxonomyId,
        color,
        option.label,
        'Chiang Mai',
        FEED_SHIPPING,
      ]);
    }
  }

  for (const toy of input.plushyToys) {
    const category = getProductDisplayCategory(toy);
    const taxonomyId = taxonomyIdForCatalogProduct(toy);
    const link = `${baseUrl}/en/catalog/${toy.slug}`;
    const allImages = toy.images.map(highResFeedImageUrl).filter(Boolean);
    const imageLink = allImages[0];
    const additionalImage = allImages[1] ?? '';

    const sku = toy.id?.trim();
    if (!sku) {
      skip(skipped, {
        id: toy.slug,
        productType: 'plushy_toy',
        reason: 'missing_id',
      });
      continue;
    }

    if (!imageLink) {
      skip(skipped, { id: sku, productType: 'plushy_toy', reason: 'missing_image' });
      continue;
    }

    const priceThb = applyCatalogDiscountThb(toy.price ?? 0, toy.discountPercent);
    if (priceThb <= 0) {
      skip(skipped, { id: sku, productType: 'plushy_toy', reason: 'missing_price' });
      continue;
    }

    const titleBase = toy.sizeLabel
      ? `${toy.nameEn} — ${toy.sizeLabel}`
      : toy.nameEn;
    const title = resolveTitle(titleBase, {
      productType: 'Plushy Toy',
      colorOrSize: toy.sizeLabel,
    });
    if (!title) {
      skip(skipped, { id: sku, productType: 'plushy_toy', reason: 'unrecoverable_title' });
      continue;
    }

    const description = resolveDescription(
      toy.descriptionEn,
      undefined,
      toy.nameEn || toy.slug,
      category
    );

    pushRow(rows, [
      compactFeedId(sku),
      title,
      description,
      link,
      imageLink,
      additionalImage,
      'new',
      'in_stock',
      formatFeedPrice(priceThb),
      FEED_BRAND,
      'no',
      '',
      taxonomyId,
      '',
      toy.sizeLabel ?? '',
      'Chiang Mai',
      FEED_SHIPPING,
    ]);
  }

  for (const balloon of input.balloons) {
    const category = getProductDisplayCategory(balloon);
    const taxonomyId = taxonomyIdForCatalogProduct(balloon);
    const link = `${baseUrl}/en/catalog/${balloon.slug}`;
    const allImages = balloon.images.map(highResFeedImageUrl).filter(Boolean);
    const imageLink = allImages[0];
    const additionalImage = allImages[1] ?? '';

    const sku = balloon.id?.trim();
    if (!sku) {
      skip(skipped, {
        id: balloon.slug,
        productType: 'balloon',
        reason: 'missing_id',
      });
      continue;
    }

    if (!imageLink) {
      skip(skipped, { id: sku, productType: 'balloon', reason: 'missing_image' });
      continue;
    }

    const priceThb = applyCatalogDiscountThb(balloon.price ?? 0, balloon.discountPercent);
    if (priceThb <= 0) {
      skip(skipped, { id: sku, productType: 'balloon', reason: 'missing_price' });
      continue;
    }

    const titleBase = balloon.sizeLabel
      ? `${balloon.nameEn} — ${balloon.sizeLabel}`
      : balloon.nameEn;
    const title = resolveTitle(titleBase, {
      productType: 'Balloon',
      colorOrSize: balloon.sizeLabel,
    });
    if (!title) {
      skip(skipped, { id: sku, productType: 'balloon', reason: 'unrecoverable_title' });
      continue;
    }

    const description = resolveDescription(
      balloon.descriptionEn,
      undefined,
      balloon.nameEn || balloon.slug,
      category
    );

    pushRow(rows, [
      compactFeedId(sku),
      title,
      description,
      link,
      imageLink,
      additionalImage,
      'new',
      'in_stock',
      formatFeedPrice(priceThb),
      FEED_BRAND,
      'no',
      '',
      taxonomyId,
      '',
      balloon.sizeLabel ?? '',
      'Chiang Mai',
      FEED_SHIPPING,
    ]);
  }

  return {
    tsv: rows.join('\n'),
    rowCount: rows.length - 1,
    skipped,
  };
}

export function logFeedSkippedProducts(skipped: FeedSkippedProduct[]): void {
  if (!skipped.length) return;
  const summary = skipped.reduce<Record<FeedSkipReason, number>>((acc, item) => {
    acc[item.reason] = (acc[item.reason] ?? 0) + 1;
    return acc;
  }, {} as Record<FeedSkipReason, number>);
  console.warn(
    `[Feed] google-merchant-feed skipped ${skipped.length} item(s):`,
    summary,
    skipped
  );
}
