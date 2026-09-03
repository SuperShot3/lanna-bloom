import type { CatalogSupabaseClient } from '@/lib/catalog/storage';
import type { Bouquet, Partner } from '@/lib/bouquets';
import type { BouquetSellableOption } from '@/lib/bouquetOptions';
import { parseExcludedDeliveryDestinations } from '@/lib/bouquetDestinationAvailability';
import { normalizeCatalogDiscountPercent } from '@/lib/catalogDiscount';
import {
  attachVariantImagesToSellableOptions,
  type VariantImageSet,
} from '@/lib/catalog/bouquetImages';
import { buildSellableOptions, primaryCatalogPriceFromPricing, resolvePricingType } from '@/lib/catalog/pricing';
import { isCatalogNewArrival } from '@/lib/catalog/newArrival';
import type { CatalogProduct } from '@/lib/catalog/types';
import { isStorefrontRenderableImageUrl } from '@/lib/catalog/catalogImage';
import { isCatalogImageAiGenerated } from '@/lib/catalog/imageAiGenerated';
import { filterStorefrontCatalogStoredImages } from '@/lib/catalog/storefrontImages';
import { storedImagePublicUrl } from '@/lib/catalog/storage';
import {
  buildProductImageAlt,
  compositionFromCustomAttributes,
  pickStoredImageAlt,
} from '@/lib/catalog/productImageAlt';
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
): { urls: string[]; alts: string[]; altsTh: string[]; aiGenerated: boolean[] } {
  const sorted = filterStorefrontCatalogStoredImages(images).sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || Number(b.is_primary) - Number(a.is_primary)
  );
  const urls: string[] = [];
  const alts: string[] = [];
  const altsTh: string[] = [];
  const aiGenerated: boolean[] = [];
  for (const img of sorted) {
    if (!img.storage_path) continue;
    const url = storedImagePublicUrl(supabase, img);
    if (!isStorefrontRenderableImageUrl(url)) continue;
    urls.push(url);
    alts.push(img.alt?.trim() ?? '');
    altsTh.push(img.alt_th?.trim() ?? '');
    aiGenerated.push(isCatalogImageAiGenerated(img.source_type));
  }
  return { urls, alts, altsTh, aiGenerated };
}

function withFallbackImageAlts(
  imageUrls: string[],
  imageAlts: string[],
  imageAltsTh: string[] | undefined,
  locale: 'en' | 'th',
  fallback: { altEn: string; altTh: string }
): string[] {
  return imageUrls.map((_, i) =>
    pickStoredImageAlt({ alt: imageAlts[i], alt_th: imageAltsTh?.[i] }, locale, fallback)
  );
}

export type MapBouquetImageContext = {
  /** When set, overrides inline row.images for the main gallery */
  mainImages?: VariantImageSet;
  variantImages?: Map<string, VariantImageSet>;
  locale?: 'en' | 'th';
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
  const locale = imageContext?.locale ?? 'en';
  const pricingType = resolvePricingType(row);
  let sizes: BouquetSellableOption[] = buildSellableOptions(
    { pricing_type: row.pricing_type, pricing: row.pricing },
    'en'
  );

  const altFallback = buildProductImageAlt({
    nameEn: row.name_en,
    nameTh: row.name_th,
    compositionEn: row.composition_en,
    compositionTh: row.composition_th,
  });

  if (imageContext?.variantImages?.size) {
    sizes = attachVariantImagesToSellableOptions(sizes, pricingType, imageContext.variantImages);
    sizes = sizes.map((opt) => {
      if (!opt.imageUrls?.length) return opt;
      const { imageAltsTh, ...rest } = opt;
      return {
        ...rest,
        imageAlts: withFallbackImageAlts(
          opt.imageUrls,
          opt.imageAlts ?? [],
          imageAltsTh,
          locale,
          altFallback
        ),
      };
    });
  }

  const inline = imageUrlsFromStored(supabase, row.images);
  const main =
    imageContext?.mainImages && imageContext.mainImages.urls.length > 0
      ? imageContext.mainImages
      : inline;

  const fallbackImageAlts = withFallbackImageAlts(
    main.urls,
    main.alts,
    main.altsTh,
    locale,
    altFallback
  );
  const imageAiGenerated = main.urls.length
    ? main.aiGenerated ?? main.urls.map(() => false)
    : [false];

  return {
    id: row.id,
    slug,
    productCode: row.product_code?.trim() || undefined,
    nameEn: row.name_en,
    nameTh: row.name_th,
    descriptionEn: row.description_en,
    descriptionTh: row.description_th,
    compositionEn: row.composition_en,
    compositionTh: row.composition_th,
    titleIntroEn: row.title_intro_en?.trim() || undefined,
    titleIntroTh: row.title_intro_th?.trim() || undefined,
    floristNoteEn: row.florist_note_en?.trim() || undefined,
    floristNoteTh: row.florist_note_th?.trim() || undefined,
    pricingType,
    colors: row.colors?.length ? row.colors : [],
    flowerTypes: row.flower_types?.length ? row.flower_types : [],
    deliveryOptions: row.delivery_options?.length ? row.delivery_options : undefined,
    excludedDeliveryDestinations: parseExcludedDeliveryDestinations(row.excluded_delivery_destinations),
    presentationFormats: row.presentation_formats?.length ? row.presentation_formats : undefined,
    occasion: row.occasion?.length ? row.occasion : undefined,
    images: main.urls.length ? main.urls : [BOUQUET_PLACEHOLDER],
    imageAlts: main.urls.length ? fallbackImageAlts : [''],
    imageAiGenerated: main.urls.length ? imageAiGenerated : [false],
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
    newArrivalStartedAt: row.new_arrival_started_at ?? null,
    isNewArrival: isCatalogNewArrival(row.new_arrival_started_at),
    contactBeforeOrder: row.contact_before_order === true,
    discountPercent: normalizeCatalogDiscountPercent(row.discount_percent ?? undefined),
    seoTitleEn: row.seo_title_en,
    seoTitleTh: row.seo_title_th,
    seoDescriptionEn: row.seo_description_en,
    seoDescriptionTh: row.seo_description_th,
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
  localeSlug?: string,
  locale: 'en' | 'th' = 'en'
): CatalogProduct {
  const slug = localeSlug ?? row.slug_en;
  const overrides = row.admin_overrides;
  const nameEn = overrides?.nameEn?.trim() || row.name_en;
  const nameTh = overrides?.nameTh?.trim() || row.name_th || undefined;
  const descriptionEn = overrides?.descriptionEn?.trim() || row.description_en || undefined;
  const descriptionTh = overrides?.descriptionTh?.trim() || row.description_th || undefined;
  const composition = compositionFromCustomAttributes(row.custom_attributes);
  const { urls, alts, altsTh, aiGenerated } = imageUrlsFromStored(supabase, row.images);
  const fallbackImageAlts = withFallbackImageAlts(
    urls,
    alts,
    altsTh,
    locale,
    buildProductImageAlt({
      nameEn,
      nameTh,
      compositionEn: composition.compositionEn,
      compositionTh: composition.compositionTh,
    })
  );

  const pricing = row.pricing ?? { price: row.price };
  const pricingType = resolvePricingType({
    pricing_type: row.pricing_type,
    pricing,
  });
  const sizes = buildSellableOptions({ pricing_type: pricingType, pricing }, 'en');
  const listPrice =
    primaryCatalogPriceFromPricing(pricingType, pricing) || Number(row.price);

  return {
    id: row.id,
    slug,
    productCode: row.product_code?.trim() || undefined,
    nameEn,
    nameTh: nameTh || undefined,
    descriptionEn,
    descriptionTh,
    category: row.category,
    catalogKind: catalogKindFromCategory(row.category),
    sizeLabel: row.structured_attributes?.sizeLabel,
    pricingType,
    sizes,
    price: listPrice,
    cost: row.cost != null ? Number(row.cost) : undefined,
    commissionPercent: row.commission_percent != null ? Number(row.commission_percent) : undefined,
    images: urls.length ? urls : [PRODUCT_PLACEHOLDER],
    imageAlts: urls.length ? fallbackImageAlts : [''],
    imageAiGenerated: urls.length ? aiGenerated : [false],
    excludedDeliveryDestinations: parseExcludedDeliveryDestinations(row.excluded_delivery_destinations),
    preparationTime: row.structured_attributes?.preparationTime,
    occasion: row.structured_attributes?.occasion,
    discountPercent: normalizeCatalogDiscountPercent(row.discount_percent ?? undefined),
    contactBeforeOrder: row.contact_before_order === true,
  };
}

export function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'item';
}
