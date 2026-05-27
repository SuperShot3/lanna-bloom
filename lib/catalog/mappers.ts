import type { CatalogSupabaseClient } from '@/lib/catalog/storage';
import type { Bouquet, Partner } from '@/lib/bouquets';
import type { BouquetSellableOption } from '@/lib/bouquetOptions';
import { parseExcludedDeliveryDestinations } from '@/lib/bouquetDestinationAvailability';
import { normalizeCatalogDiscountPercent } from '@/lib/catalogDiscount';
import {
  attachVariantImagesToSellableOptions,
  type VariantImageSet,
} from '@/lib/catalog/bouquetImages';
import { buildSellableOptions, resolvePricingType } from '@/lib/catalog/pricing';
import type { CatalogProduct } from '@/lib/catalog/types';
import { storedImagePublicUrl } from '@/lib/catalog/storage';
import type {
  CatalogBouquetPricing,
  CatalogBouquetRow,
  CatalogPartnerRow,
  CatalogProductRow,
  CatalogStoredImage,
} from '@/lib/catalog/types';

const BOUQUET_PLACEHOLDER =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"%3E%3Crect fill="%23f9f5f0" width="600" height="600"/%3E%3Ctext fill="%236b6560" font-family="sans-serif" font-size="24" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3ENo image%3C/text%3E%3C/svg%3E';

const PRODUCT_PLACEHOLDER = BOUQUET_PLACEHOLDER;

function imageUrlsFromStored(
  supabase: CatalogSupabaseClient,
  images: CatalogStoredImage[] | null | undefined
): { urls: string[]; alts: string[] } {
  const sorted = [...(images ?? [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || Number(b.is_primary) - Number(a.is_primary)
  );
  const urls: string[] = [];
  const alts: string[] = [];
  for (const img of sorted) {
    if (!img.storage_path) continue;
    urls.push(storedImagePublicUrl(supabase, img));
    alts.push(img.alt?.trim() ?? '');
  }
  return { urls, alts };
}

function withFallbackImageAlts(imageUrls: string[], imageAlts: string[], fallbackText: string): string[] {
  const fallback = fallbackText.trim();
  return imageUrls.map((_, i) => imageAlts[i]?.trim() || fallback || '');
}

export type MapBouquetImageContext = {
  /** When set, overrides inline row.images for the main gallery */
  mainImages?: VariantImageSet;
  variantImages?: Map<string, VariantImageSet>;
};

export function mapPartnerRowToPartner(
  supabase: CatalogSupabaseClient,
  row: CatalogPartnerRow
): Partner {
  return {
    id: row.id,
    shopName: row.shop_name,
    contactName: row.contact_name,
    phoneNumber: row.phone_number,
    lineOrWhatsapp: row.line_or_whatsapp ?? undefined,
    shopAddress: row.shop_address ?? undefined,
    shopBioEn: row.shop_bio_en ?? undefined,
    shopBioTh: row.shop_bio_th ?? undefined,
    portraitUrl: row.portrait?.storage_path
      ? storedImagePublicUrl(supabase, row.portrait)
      : undefined,
    city: row.city,
    status: row.status,
    supabaseUserId: row.supabase_user_id ?? undefined,
  };
}

export function mapBouquetRowToBouquet(
  supabase: CatalogSupabaseClient,
  row: CatalogBouquetRow,
  partner?: CatalogPartnerRow | null,
  localeSlug?: string,
  imageContext?: MapBouquetImageContext
): Bouquet {
  const slug = localeSlug ?? row.slug_en;
  const pricingType = resolvePricingType(row);
  let sizes: BouquetSellableOption[] = buildSellableOptions(
    { pricing_type: row.pricing_type, pricing: row.pricing },
    'en'
  );

  if (imageContext?.variantImages?.size) {
    sizes = attachVariantImagesToSellableOptions(sizes, pricingType, imageContext.variantImages);
  }

  const inline = imageUrlsFromStored(supabase, row.images);
  const main =
    imageContext?.mainImages && imageContext.mainImages.urls.length > 0
      ? imageContext.mainImages
      : inline;

  const fallbackText = row.description_en || row.description_th || row.name_en || row.name_th;
  const fallbackImageAlts = withFallbackImageAlts(main.urls, main.alts, fallbackText);

  return {
    id: row.id,
    slug,
    nameEn: row.name_en,
    nameTh: row.name_th,
    descriptionEn: row.description_en,
    descriptionTh: row.description_th,
    compositionEn: row.composition_en,
    compositionTh: row.composition_th,
    pricingType,
    colors: row.colors?.length ? row.colors : [],
    flowerTypes: row.flower_types?.length ? row.flower_types : [],
    deliveryOptions: row.delivery_options?.length ? row.delivery_options : undefined,
    excludedDeliveryDestinations: parseExcludedDeliveryDestinations(row.excluded_delivery_destinations),
    presentationFormats: row.presentation_formats?.length ? row.presentation_formats : undefined,
    occasion: row.occasion?.length ? row.occasion : undefined,
    images: main.urls.length ? main.urls : [BOUQUET_PLACEHOLDER],
    imageAlts: main.urls.length ? fallbackImageAlts : [''],
    sizes,
    partnerId: row.partner_id ?? undefined,
    partnerName: partner?.shop_name,
    partnerCity: partner?.city,
    partnerShopBioEn: partner?.shop_bio_en ?? undefined,
    partnerShopBioTh: partner?.shop_bio_th ?? undefined,
    partnerPortraitUrl: partner?.portrait?.storage_path
      ? storedImagePublicUrl(supabase, partner.portrait)
      : undefined,
    status: row.status,
    featuredPopular: row.featured_popular,
    discountPercent: normalizeCatalogDiscountPercent(row.discount_percent ?? undefined),
  };
}

function catalogKindFromCategory(category: string): CatalogProduct['catalogKind'] {
  if (category === 'plushy_toys') return 'plushyToy';
  if (category === 'balloons') return 'balloon';
  return 'product';
}

export function mapProductRowToCatalogProduct(
  supabase: CatalogSupabaseClient,
  row: CatalogProductRow,
  localeSlug?: string
): CatalogProduct {
  const slug = localeSlug ?? row.slug_en;
  const overrides = row.admin_overrides;
  const nameEn = overrides?.nameEn?.trim() || row.name_en;
  const nameTh = overrides?.nameTh?.trim() || row.name_th || undefined;
  const descriptionEn = overrides?.descriptionEn?.trim() || row.description_en || undefined;
  const descriptionTh = overrides?.descriptionTh?.trim() || row.description_th || undefined;
  const { urls, alts } = imageUrlsFromStored(supabase, row.images);
  const fallbackImageAlts = withFallbackImageAlts(
    urls,
    alts,
    descriptionEn ?? descriptionTh ?? nameEn ?? nameTh ?? ''
  );

  return {
    id: row.id,
    slug,
    nameEn,
    nameTh: nameTh || undefined,
    descriptionEn,
    descriptionTh,
    category: row.category,
    catalogKind: catalogKindFromCategory(row.category),
    sizeLabel: row.structured_attributes?.sizeLabel,
    price: Number(row.price),
    cost: row.cost != null ? Number(row.cost) : undefined,
    commissionPercent: row.commission_percent != null ? Number(row.commission_percent) : undefined,
    images: urls.length ? urls : [PRODUCT_PLACEHOLDER],
    imageAlts: urls.length ? fallbackImageAlts : [''],
    excludedDeliveryDestinations: parseExcludedDeliveryDestinations(row.excluded_delivery_destinations),
    preparationTime: row.structured_attributes?.preparationTime,
    occasion: row.structured_attributes?.occasion,
    discountPercent: normalizeCatalogDiscountPercent(row.discount_percent ?? undefined),
  };
}

export function bouquetPricingFromSanityDoc(doc: {
  sizes?: CatalogBouquetPricing['sizes'];
  singleStemOptions?: CatalogBouquetPricing['singleStemOptions'];
  fixedVariants?: CatalogBouquetPricing['fixedVariants'];
  customTiers?: CatalogBouquetPricing['customTiers'];
}): CatalogBouquetPricing {
  return {
    sizes: doc.sizes,
    singleStemOptions: doc.singleStemOptions,
    fixedVariants: doc.fixedVariants,
    customTiers: doc.customTiers,
  };
}

export function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'item';
}
