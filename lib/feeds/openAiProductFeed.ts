import type { Bouquet } from '@/lib/bouquets';
import type { BouquetSellableOption } from '@/lib/bouquetOptions';
import { applyCatalogDiscountThb } from '@/lib/catalogDiscount';
import {
  getBouquetDisplayCategory,
  getProductDisplayCategory,
  type DisplayCategory,
} from '@/lib/catalogCategories';
import type { CatalogProduct } from '@/lib/catalog/types';
import { feedIdentifierExists, feedMpn } from '@/lib/catalog/productCode';
import {
  compactFeedId,
  DEFAULT_BASE_URL,
  FEED_BRAND,
  formatFeedColors,
  formatFeedPrice,
  highResFeedImageUrl,
  sanitiseFeedField,
  taxonomyIdForDisplayCategory,
} from '@/lib/feeds/googleMerchantFeed';

/** Honest, non-claiming delivery note — no city list. */
export const FEED_DELIVERY_NOTE =
  'Delivery is available to supported locations in Thailand. Available options depend on destination and date.';

const GENERIC_SIZE_LABEL = /^(standard|—|-)$/i;

export const OPENAI_FEED_HEADERS = [
  'id',
  'title',
  'description',
  'link',
  'image_link',
  'additional_image_link',
  'condition',
  'availability',
  'price',
  'sale_price',
  'brand',
  'mpn',
  'identifier_exists',
  'item_group_id',
  'item_group_title',
  'google_product_category',
  'product_type',
  'color',
  'size',
  'is_eligible_search',
  'is_eligible_checkout',
  'target_countries',
  'store_country',
  'seller_name',
  'seller_url',
  'return_policy',
  'seller_privacy_policy',
  'seller_tos',
] as const;

export type OpenAiFeedSkipReason =
  | 'missing_id'
  | 'missing_price'
  | 'missing_image'
  | 'unrecoverable_title';

export interface OpenAiFeedSkippedProduct {
  id: string;
  productType: 'bouquet' | 'catalog_product';
  reason: OpenAiFeedSkipReason;
  detail?: string;
}

export interface OpenAiProductFeedInput {
  bouquets: Bouquet[];
  products: CatalogProduct[];
  baseUrl?: string;
}

export interface OpenAiProductFeedResult {
  csv: string;
  rowCount: number;
  skipped: OpenAiFeedSkippedProduct[];
}

function feedBaseUrl(override?: string): string {
  const raw = override?.trim() || DEFAULT_BASE_URL;
  return raw.replace(/\/$/, '');
}

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function pushRow(rows: string[], fields: string[]): void {
  rows.push(fields.map((f) => csvEscape(sanitiseFeedField(f))).join(','));
}

function skip(skipped: OpenAiFeedSkippedProduct[], entry: OpenAiFeedSkippedProduct): void {
  skipped.push(entry);
}

function sellerUrls(baseUrl: string) {
  return {
    sellerUrl: `${baseUrl}/en`,
    returnPolicy: `${baseUrl}/en/refund-replacement`,
    privacy: `${baseUrl}/en/privacy`,
    terms: `${baseUrl}/en/terms`,
  };
}

function withDeliveryNote(description: string): string {
  const base = description.trim();
  const combined = base ? `${base} ${FEED_DELIVERY_NOTE}` : FEED_DELIVERY_NOTE;
  return sanitiseFeedField(combined).slice(0, 5000);
}

function buildTitleFallback(parts: {
  productType: string;
  colorOrSize?: string;
  nameHint?: string;
}): string {
  return sanitiseFeedField(
    [FEED_BRAND, parts.productType, parts.colorOrSize || parts.nameHint].filter(Boolean).join(' ')
  );
}

function resolveDescription(
  primary: string | undefined,
  secondary: string | undefined,
  productName: string,
  category: DisplayCategory
): string {
  const candidate = (primary || secondary || '').trim();
  if (candidate) return withDeliveryNote(candidate);
  return withDeliveryNote(
    `High-quality ${productName.trim() || 'gift'} available at our store. Perfect for ${category}. Price includes VAT.`
  );
}

function isGenericSizeLabel(label: string): boolean {
  return !label.trim() || GENERIC_SIZE_LABEL.test(label.trim());
}

function variantTitle(nameEn: string, optionLabel: string, optionCount: number): string {
  const name = nameEn.trim();
  const label = optionLabel.trim();
  if (!name) return '';
  if (optionCount > 1 && !isGenericSizeLabel(label)) return `${name} — ${label}`;
  if (optionCount === 1 && !isGenericSizeLabel(label)) return `${name} — ${label}`;
  return name;
}

function feedImages(urls: string[]): { imageLink: string; additionalImageLink: string } {
  const all = urls.map(highResFeedImageUrl).filter(Boolean);
  return {
    imageLink: all[0] ?? '',
    additionalImageLink: all.slice(1).join(','),
  };
}

function salePriceField(listThb: number, discountPercent?: number): string {
  const sale = applyCatalogDiscountThb(listThb, discountPercent);
  if (sale > 0 && sale < listThb) return formatFeedPrice(sale);
  return '';
}

function availabilityValue(available: boolean | undefined): string {
  return available !== false ? 'in_stock' : 'out_of_stock';
}

function catalogSellableOptions(product: CatalogProduct): BouquetSellableOption[] {
  const fromSizes = (product.sizes ?? []).filter(
    (s) => Boolean(s.optionId?.trim()) && Number.isFinite(s.price) && (s.price ?? 0) > 0
  );
  if (fromSizes.length) return fromSizes;
  if (Number.isFinite(product.price) && product.price > 0) {
    return [
      {
        optionId: 'default',
        price: product.price,
        label: product.sizeLabel ?? '',
        availability: true,
      },
    ];
  }
  return [];
}

function emitVariantRows(args: {
  rows: string[];
  skipped: OpenAiFeedSkippedProduct[];
  productType: 'bouquet' | 'catalog_product';
  productId: string;
  slug: string;
  nameEn: string | undefined;
  fallbackProductType: string;
  fallbackColorOrSize?: string;
  description: string;
  link: string;
  imageLink: string;
  additionalImageLink: string;
  taxonomyId: string;
  productTypeLabel: string;
  color: string;
  discountPercent?: number;
  options: BouquetSellableOption[];
  seller: ReturnType<typeof sellerUrls>;
  productCode?: string;
}): void {
  const optionCount = args.options.length;
  const grouped = optionCount > 1;
  const itemGroupId = grouped ? args.slug : '';
  const itemGroupTitle = grouped ? sanitiseFeedField(args.nameEn?.trim() || '') : '';

  for (const option of args.options) {
    const sku = `${args.productId}_${option.optionId}`.trim();
    if (!args.productId.trim() || !option.optionId?.trim()) {
      skip(args.skipped, {
        id: args.productId || args.slug,
        productType: args.productType,
        reason: 'missing_id',
      });
      continue;
    }

    const listThb = option.price ?? 0;
    if (listThb <= 0) {
      skip(args.skipped, { id: sku, productType: args.productType, reason: 'missing_price' });
      continue;
    }

    const titleBase = variantTitle(args.nameEn ?? '', option.label, optionCount);
    const title = titleBase
      ? sanitiseFeedField(titleBase)
      : buildTitleFallback({
          productType: args.fallbackProductType,
          colorOrSize: args.fallbackColorOrSize || option.label,
          nameHint: args.slug,
        });

    if (!title) {
      skip(args.skipped, {
        id: sku,
        productType: args.productType,
        reason: 'unrecoverable_title',
      });
      continue;
    }

    const mpn = feedMpn(args.productCode);
    pushRow(args.rows, [
      compactFeedId(sku),
      title,
      args.description,
      args.link,
      args.imageLink,
      args.additionalImageLink,
      'new',
      availabilityValue(option.availability),
      formatFeedPrice(listThb),
      salePriceField(listThb, args.discountPercent),
      FEED_BRAND,
      mpn,
      feedIdentifierExists(mpn),
      itemGroupId,
      itemGroupTitle,
      args.taxonomyId,
      args.productTypeLabel,
      args.color,
      option.label,
      'true',
      'false',
      'TH',
      'TH',
      FEED_BRAND,
      args.seller.sellerUrl,
      args.seller.returnPolicy,
      args.seller.privacy,
      args.seller.terms,
    ]);
  }
}

export function buildOpenAiProductFeed(input: OpenAiProductFeedInput): OpenAiProductFeedResult {
  const baseUrl = feedBaseUrl(input.baseUrl);
  const seller = sellerUrls(baseUrl);
  const rows: string[] = [OPENAI_FEED_HEADERS.join(',')];
  const skipped: OpenAiFeedSkippedProduct[] = [];

  for (const bouquet of input.bouquets) {
    const category = getBouquetDisplayCategory(bouquet);
    const taxonomyId = taxonomyIdForDisplayCategory(category);
    const link = `${baseUrl}/en/catalog/${bouquet.slug}`;
    const { imageLink, additionalImageLink } = feedImages(bouquet.images);
    const color = formatFeedColors(bouquet.colors);
    const productTypeLabel = category === 'Bouquets' ? 'Bouquet' : category;

    if (!imageLink) {
      skip(skipped, { id: bouquet.id, productType: 'bouquet', reason: 'missing_image' });
      continue;
    }

    const description = resolveDescription(
      bouquet.descriptionEn,
      bouquet.compositionEn,
      bouquet.nameEn || bouquet.slug,
      category
    );

    const options = (bouquet.sizes ?? []).filter((s) => Boolean(s.optionId?.trim()));
    if (!options.length) {
      skip(skipped, { id: bouquet.id, productType: 'bouquet', reason: 'missing_price' });
      continue;
    }

    emitVariantRows({
      rows,
      skipped,
      productType: 'bouquet',
      productId: bouquet.id,
      slug: bouquet.slug,
      nameEn: bouquet.nameEn,
      fallbackProductType: productTypeLabel,
      fallbackColorOrSize: color,
      description,
      link,
      imageLink,
      additionalImageLink,
      taxonomyId,
      productTypeLabel,
      color,
      discountPercent: bouquet.discountPercent,
      options,
      seller,
      productCode: bouquet.productCode,
    });
  }

  for (const product of input.products) {
    const category = getProductDisplayCategory(product);
    const taxonomyId = taxonomyIdForDisplayCategory(category);
    const link = `${baseUrl}/en/catalog/${product.slug}`;
    const { imageLink, additionalImageLink } = feedImages(product.images);

    if (!imageLink) {
      skip(skipped, {
        id: product.id || product.slug,
        productType: 'catalog_product',
        reason: 'missing_image',
      });
      continue;
    }

    const options = catalogSellableOptions(product);
    if (!options.length) {
      skip(skipped, {
        id: product.id || product.slug,
        productType: 'catalog_product',
        reason: 'missing_price',
      });
      continue;
    }

    const description = resolveDescription(
      product.descriptionEn,
      undefined,
      product.nameEn || product.slug,
      category
    );

    emitVariantRows({
      rows,
      skipped,
      productType: 'catalog_product',
      productId: product.id,
      slug: product.slug,
      nameEn: product.nameEn,
      fallbackProductType: category,
      fallbackColorOrSize: product.sizeLabel,
      description,
      link,
      imageLink,
      additionalImageLink,
      taxonomyId,
      productTypeLabel: category,
      color: '',
      discountPercent: product.discountPercent,
      options,
      seller,
      productCode: product.productCode,
    });
  }

  return {
    csv: rows.join('\n'),
    rowCount: rows.length - 1,
    skipped,
  };
}

export function logOpenAiFeedSkippedProducts(skipped: OpenAiFeedSkippedProduct[]): void {
  if (!skipped.length) return;
  const summary = skipped.reduce<Record<string, number>>((acc, item) => {
    acc[item.reason] = (acc[item.reason] ?? 0) + 1;
    return acc;
  }, {});
  console.warn(
    `[Feed] openai-product-feed skipped ${skipped.length} item(s):`,
    summary,
    skipped
  );
}
