/**
 * Supabase catalog write layer (admin + partner approval).
 */
import 'server-only';

import { randomUUID } from 'crypto';
import type { BouquetStatus } from '@/lib/bouquets';
import type { DeliveryDestinationId } from '@/lib/delivery/markets';
import { normalizeCatalogDiscountPercent } from '@/lib/catalogDiscount';
import type { CatalogBouquetPricing, CatalogStoredImage } from '@/lib/catalog/types';
import { CATALOG_SYSTEM_PARTNER_LEGACY_ID } from '@/lib/catalog/types';
import { slugFromName } from '@/lib/catalog/mappers';
import {
  ensureFourSizeSlots,
  pricingPayloadForSave,
  primaryCatalogPriceFromPricing,
  type PricingType,
} from '@/lib/catalog/pricing';
import { isStorefrontCatalogImage } from '@/lib/catalog/storefrontImages';
import {
  buildCatalogImageRecord,
  CATALOG_BUCKET,
  catalogPublicUrl,
  uploadBufferToCatalog,
} from '@/lib/catalog/storage';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export type { CatalogStoredImage };
export type CatalogImageUploadInput = CatalogStoredImage;

function requireSupabase() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return supabase;
}

async function upsertSlugRegistry(
  entityType: 'bouquet' | 'product',
  entityId: string,
  slugEn: string,
  slugTh: string
): Promise<void> {
  const supabase = requireSupabase();
  const rows = [
    { slug: slugEn, locale: 'en' as const, entity_type: entityType, entity_id: entityId },
    { slug: slugTh, locale: 'th' as const, entity_type: entityType, entity_id: entityId },
  ];
  const { error } = await supabase.from('catalog_slug_registry').upsert(rows, {
    onConflict: 'slug,locale',
  });
  if (error) throw new Error(`Slug registry upsert failed: ${error.message}`);
}

export interface CreateCatalogPartnerInput {
  shopName: string;
  contactName: string;
  phoneNumber: string;
  lineOrWhatsapp?: string;
  shopAddress?: string;
  city?: string;
  supabaseUserId?: string;
  legacySanityId?: string;
}

export interface UpdateCatalogPartnerProfileInput {
  phoneNumber: string;
  lineOrWhatsapp?: string;
  shopAddress?: string;
  city?: string;
  shopBioEn?: string;
  shopBioTh?: string;
}

export interface CatalogBouquetSizeInput {
  key: import('@/lib/bouquetOptions').SizeKey;
  label: string;
  price: number;
  description: string;
  preparationTime?: number;
  availability?: boolean;
}

export interface CreateCatalogBouquetInput {
  partnerId: string;
  nameEn: string;
  nameTh?: string;
  slugEn?: string;
  slugTh?: string;
  descriptionEn?: string;
  descriptionTh?: string;
  compositionEn?: string;
  compositionTh?: string;
  colors?: string[];
  flowerTypes?: string[];
  occasion?: string[];
  presentationFormats?: string[];
  excludedDeliveryDestinations?: string[];
  images: CatalogImageUploadInput[];
  sizes: CatalogBouquetSizeInput[];
  legacySanityId?: string;
}

export interface CreateCatalogProductInput {
  partnerId: string;
  nameEn: string;
  nameTh?: string;
  slugEn?: string;
  slugTh?: string;
  descriptionEn?: string;
  descriptionTh?: string;
  category: string;
  price: number;
  cost?: number;
  images: CatalogImageUploadInput[];
  excludedDeliveryDestinations?: string[];
  legacySanityId?: string;
}

/** Upload processed product image variants to Storage `catalog` bucket. */
export async function uploadCatalogProductImages(files: {
  webp: File;
  pngMaster: File;
  alt?: string;
  prefix?: string;
}): Promise<CatalogImageUploadInput[]> {
  const supabase = requireSupabase();
  const prefix = files.prefix ?? `products/${randomUUID()}`;
  const webpPath = `${prefix}/primary.webp`;
  const pngPath = `${prefix}/master.png`;

  const webpBuffer = Buffer.from(await files.webp.arrayBuffer());
  const pngBuffer = Buffer.from(await files.pngMaster.arrayBuffer());

  await Promise.all([
    uploadBufferToCatalog(supabase, webpPath, webpBuffer, 'image/webp'),
    uploadBufferToCatalog(supabase, pngPath, pngBuffer, 'image/png'),
  ]);

  return [
    buildCatalogImageRecord(supabase, webpPath, {
      format: 'webp',
      is_primary: true,
      alt: files.alt,
      sort_order: 0,
    }),
    buildCatalogImageRecord(supabase, pngPath, {
      format: 'png_master',
      is_primary: false,
      alt: files.alt,
      sort_order: 1,
    }),
  ];
}

export async function createCatalogPartner(input: CreateCatalogPartnerInput): Promise<string> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('catalog_partners')
    .insert({
      shop_name: input.shopName.trim(),
      contact_name: input.contactName.trim(),
      phone_number: input.phoneNumber.trim(),
      line_or_whatsapp: input.lineOrWhatsapp?.trim() || null,
      shop_address: input.shopAddress?.trim() || null,
      city: (input.city || 'Chiang Mai').trim(),
      status: input.supabaseUserId ? 'approved' : 'pending_review',
      supabase_user_id: input.supabaseUserId?.trim() || null,
      legacy_sanity_id: input.legacySanityId ?? null,
    })
    .select('id')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to create catalog partner');
  return data.id;
}

export async function updateCatalogPartnerProfile(
  partnerId: string,
  input: UpdateCatalogPartnerProfileInput
): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from('catalog_partners')
    .update({
      phone_number: input.phoneNumber.trim(),
      line_or_whatsapp: input.lineOrWhatsapp?.trim() || null,
      shop_address: input.shopAddress?.trim() || null,
      city: input.city?.trim() || 'Chiang Mai',
      shop_bio_en: input.shopBioEn?.trim() || null,
      shop_bio_th: input.shopBioTh?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', partnerId);

  if (error) throw new Error(error.message);
}

export async function createCatalogBouquet(input: CreateCatalogBouquetInput): Promise<string> {
  const supabase = requireSupabase();
  const slugEn = slugFromName(input.slugEn || input.nameEn);
  const slugTh = slugFromName(input.slugTh || input.nameEn);

  const { data, error } = await supabase
    .from('catalog_bouquets')
    .insert({
      partner_id: input.partnerId,
      slug_en: slugEn,
      slug_th: slugTh,
      name_en: input.nameEn.trim(),
      name_th: (input.nameTh || '').trim(),
      description_en: (input.descriptionEn || '').trim(),
      description_th: (input.descriptionTh || '').trim(),
      composition_en: (input.compositionEn || '').trim(),
      composition_th: (input.compositionTh || '').trim(),
      pricing_type: 'single_price',
      pricing: {
        price: input.sizes[0]?.price ?? 0,
        sizes: input.sizes.map((s) => ({
          key: s.key,
          label: s.label,
          price: Number(s.price),
          description: s.description,
          preparationTime: s.preparationTime,
          availability: s.availability ?? true,
        })),
      },
      status: 'pending_review',
      colors: input.colors ?? [],
      flower_types: input.flowerTypes ?? [],
      occasion: input.occasion ?? [],
      presentation_formats: input.presentationFormats ?? [],
      excluded_delivery_destinations: input.excludedDeliveryDestinations ?? [],
      images: input.images,
      legacy_sanity_id: input.legacySanityId ?? null,
    })
    .select('id')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to create catalog bouquet');
  await upsertSlugRegistry('bouquet', data.id, slugEn, slugTh);
  return data.id;
}

export async function createCatalogProduct(input: CreateCatalogProductInput): Promise<string> {
  const supabase = requireSupabase();
  const slugEn = slugFromName(input.slugEn || input.nameEn);
  const slugTh = slugFromName(input.slugTh || input.nameEn);

  const { data, error } = await supabase
    .from('catalog_products')
    .insert({
      partner_id: input.partnerId,
      slug_en: slugEn,
      slug_th: slugTh,
      name_en: input.nameEn.trim(),
      name_th: (input.nameTh || '').trim(),
      description_en: (input.descriptionEn || '').trim(),
      description_th: (input.descriptionTh || '').trim(),
      category: input.category,
      price: Number(input.price),
      cost: input.cost != null ? Number(input.cost) : null,
      moderation_status: 'submitted',
      excluded_delivery_destinations: input.excludedDeliveryDestinations ?? [],
      images: input.images,
      legacy_sanity_id: input.legacySanityId ?? null,
    })
    .select('id')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to create catalog product');
  await upsertSlugRegistry('product', data.id, slugEn, slugTh);
  return data.id;
}

export type UpdateCatalogBouquetByAdminInput = {
  nameEn?: string;
  nameTh?: string;
  descriptionEn?: string;
  descriptionTh?: string;
  compositionEn?: string;
  compositionTh?: string;
  featuredPopular?: boolean;
  discountPercent?: number | null;
  pricingType?: import('@/lib/catalog/pricing').PricingType;
  singlePrice?: number;
  pricing?: CatalogBouquetPricing;
  colors?: string[];
  flowerTypes?: string[];
  occasion?: string[];
  presentationFormats?: string[];
  deliveryOptions?: string[];
  excludedDeliveryDestinations?: DeliveryDestinationId[];
};

export async function updateCatalogBouquetByAdmin(
  bouquetId: string,
  input: UpdateCatalogBouquetByAdminInput
): Promise<void> {
  const supabase = requireSupabase();
  const { data: existing, error: loadError } = await supabase
    .from('catalog_bouquets')
    .select('pricing, pricing_type')
    .eq('id', bouquetId)
    .maybeSingle();

  if (loadError) throw new Error(loadError.message);
  if (!existing) throw new Error('Bouquet not found');

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.pricingType != null) patch.pricing_type = input.pricingType;
  if (input.pricing != null) patch.pricing = input.pricing;

  if (input.nameEn != null) patch.name_en = input.nameEn.trim();
  if (input.nameTh != null) patch.name_th = input.nameTh.trim();
  if (input.descriptionEn != null) patch.description_en = input.descriptionEn.trim();
  if (input.descriptionTh != null) patch.description_th = input.descriptionTh.trim();
  if (input.compositionEn != null) patch.composition_en = input.compositionEn.trim();
  if (input.compositionTh != null) patch.composition_th = input.compositionTh.trim();
  if (input.featuredPopular != null) patch.featured_popular = input.featuredPopular;
  if (input.colors != null) patch.colors = input.colors;
  if (input.flowerTypes != null) patch.flower_types = input.flowerTypes;
  if (input.occasion != null) patch.occasion = input.occasion;
  if (input.presentationFormats != null) patch.presentation_formats = input.presentationFormats;
  if (input.deliveryOptions != null) patch.delivery_options = input.deliveryOptions;
  if (input.excludedDeliveryDestinations != null) {
    patch.excluded_delivery_destinations = input.excludedDeliveryDestinations;
  }

  if (input.discountPercent !== undefined) {
    const normalized =
      input.discountPercent == null
        ? null
        : normalizeCatalogDiscountPercent(input.discountPercent) ?? null;
    patch.discount_percent = normalized;
  }

  const { error } = await supabase.from('catalog_bouquets').update(patch).eq('id', bouquetId);
  if (error) throw new Error(error.message);
}

export async function updateCatalogBouquetStatus(
  bouquetId: string,
  status: BouquetStatus,
  metadata?: { approvedBy?: string; approvedAt?: string }
): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from('catalog_bouquets')
    .update({
      status,
      ...(status === 'approved' && {
        approved_by: metadata?.approvedBy?.trim() || null,
        approved_at: metadata?.approvedAt || new Date().toISOString(),
      }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', bouquetId);

  if (error) throw new Error(error.message);
}

export async function updateCatalogProductModerationStatus(
  productId: string,
  moderationStatus: 'submitted' | 'live' | 'needs_changes' | 'rejected',
  adminNote?: string
): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from('catalog_products')
    .update({
      moderation_status: moderationStatus,
      admin_note: adminNote ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', productId);

  if (error) throw new Error(error.message);
}

export async function updateCatalogProductCommission(
  productId: string,
  commissionPercent: number
): Promise<void> {
  const supabase = requireSupabase();
  const pct = Math.max(0, Math.min(500, Number(commissionPercent)));
  const { error } = await supabase
    .from('catalog_products')
    .update({ commission_percent: pct, updated_at: new Date().toISOString() })
    .eq('id', productId);

  if (error) throw new Error(error.message);
}

export async function upsertCatalogSiteSettings(input: {
  heroImage?: CatalogImageUploadInput | null;
  heroCarouselImages?: CatalogImageUploadInput[];
}): Promise<void> {
  const supabase = requireSupabase();

  let heroImage = input.heroImage;
  let heroCarouselImages = input.heroCarouselImages;

  if (heroImage === undefined || heroCarouselImages === undefined) {
    const { data, error: readError } = await supabase
      .from('catalog_site_settings')
      .select('hero_image, hero_carousel_images')
      .eq('id', 'default')
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (heroImage === undefined) {
      heroImage = (data?.hero_image as CatalogImageUploadInput | null) ?? null;
    }
    if (heroCarouselImages === undefined) {
      heroCarouselImages = (data?.hero_carousel_images as CatalogImageUploadInput[]) ?? [];
    }
  }

  const { error } = await supabase.from('catalog_site_settings').upsert({
    id: 'default',
    hero_image: heroImage ?? null,
    hero_carousel_images: heroCarouselImages ?? [],
    updated_at: new Date().toISOString(),
  });

  if (error) throw new Error(error.message);
}

/** Resolve public URL for a catalog storage path (server-side helper). */
export function getCatalogStoragePublicUrl(storagePath: string): string {
  return catalogPublicUrl(requireSupabase(), storagePath);
}

export { CATALOG_BUCKET };

// --- Admin product creation / moderation (Phase 3) ---

export type CatalogWriteImageInput = {
  /** Supabase storage path (stored in `assetId` from admin UI for API compatibility). */
  assetId: string;
  alt?: string;
  format?: 'webp' | 'png_master' | 'source';
  isPrimary?: boolean;
};

export type CreateAdminCatalogBouquetInput = {
  nameEn: string;
  nameTh?: string;
  slug?: string;
  descriptionEn?: string;
  descriptionTh?: string;
  compositionEn?: string;
  compositionTh?: string;
  price: number;
  images: CatalogWriteImageInput[];
  colors?: string[];
  flowerTypes?: string[];
  occasion?: string[];
  presentationFormats?: string[];
  deliveryOptions?: string[];
  excludedDeliveryDestinations?: string[];
  featuredPopular?: boolean;
  pricingType?: PricingType;
  createdBy?: string;
  createdAt?: string;
};

function adminCreateCatalogPricing(
  pricingType: PricingType,
  price: number
): { pricingType: PricingType; pricing: CatalogBouquetPricing } {
  if (pricingType === 'size_based') {
    const rows = ensureFourSizeSlots([]).map((row) =>
      row.key === 'm'
        ? { ...row, enabled: true, price, availability: true }
        : { ...row, enabled: false, availability: false }
    );
    return {
      pricingType: 'size_based',
      pricing: pricingPayloadForSave('size_based', { sizes: rows }),
    };
  }
  if (pricingType === 'stem_count') {
    return {
      pricingType: 'stem_count',
      pricing: pricingPayloadForSave('stem_count', {
        stemOptions: [{ stemCount: 12, price, availability: true }],
      }),
    };
  }
  return {
    pricingType: 'single_price',
    pricing: pricingPayloadForSave('single_price', { singlePrice: price }),
  };
}

export type CreateAdminCatalogProductInput = {
  nameEn: string;
  nameTh?: string;
  slug?: string;
  descriptionEn?: string;
  descriptionTh?: string;
  category: string;
  price: number;
  pricingType?: PricingType;
  images: CatalogWriteImageInput[];
  occasion?: string[];
  excludedDeliveryDestinations?: string[];
  customAttributes?: Array<{ key: string; value: string }>;
  createdBy?: string;
  createdAt?: string;
};

export type UpdateCatalogProductByAdminInput = {
  nameEn?: string;
  nameTh?: string;
  descriptionEn?: string;
  descriptionTh?: string;
  price?: number;
  pricingType?: import('@/lib/catalog/pricing').PricingType;
  pricing?: CatalogBouquetPricing;
  discountPercent?: number | null;
  occasion?: string[];
  excludedDeliveryDestinations?: DeliveryDestinationId[];
  adminOverrides?: {
    nameEn?: string | null;
    nameTh?: string | null;
    descriptionEn?: string | null;
    descriptionTh?: string | null;
  };
  adminChangeSummary?: string | null;
  adminLastEditedBy?: string | null;
};

function writeImagesToStored(
  supabase: ReturnType<typeof requireSupabase>,
  images: CatalogWriteImageInput[]
): CatalogStoredImage[] {
  const primaryFirst = [...images]
    .filter((image) => image.assetId.trim())
    .filter((image) =>
      isStorefrontCatalogImage({
        storage_path: image.assetId,
        format: image.format,
      })
    )
    .sort((a, b) => Number(b.isPrimary === true) - Number(a.isPrimary === true));

  return primaryFirst.slice(0, 20).map((image, index) =>
    buildCatalogImageRecord(supabase, image.assetId.trim(), {
      format: image.format === 'webp' || image.format === 'png_master' ? image.format : undefined,
      is_primary: image.isPrimary === true,
      alt: image.alt?.trim() || undefined,
      sort_order: index,
    })
  );
}

async function slugTaken(slug: string): Promise<boolean> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('catalog_slug_registry')
    .select('slug')
    .eq('slug', slug)
    .limit(1);
  if (error) throw new Error(`Slug registry check failed: ${error.message}`);
  return (data?.length ?? 0) > 0;
}

async function ensureUniqueCatalogSlug(baseSlug: string): Promise<string> {
  const clean = slugFromName(baseSlug) || 'product';
  if (!(await slugTaken(clean))) return clean;
  let n = 2;
  while (true) {
    const candidate = `${clean}-${n}`;
    if (!(await slugTaken(candidate))) return candidate;
    n += 1;
  }
}

/** Built-in partner for admin-created non-flower products (no Sanity partner ref). */
export async function ensureCatalogSystemPartner(): Promise<string> {
  const supabase = requireSupabase();
  const { data: existing } = await supabase
    .from('catalog_partners')
    .select('id')
    .eq('legacy_sanity_id', CATALOG_SYSTEM_PARTNER_LEGACY_ID)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from('catalog_partners')
    .insert({
      legacy_sanity_id: CATALOG_SYSTEM_PARTNER_LEGACY_ID,
      shop_name: 'Lanna Bloom',
      contact_name: 'Catalog',
      phone_number: '0000000000',
      city: 'Chiang Mai',
      status: 'approved',
    })
    .select('id')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to create system catalog partner');
  return data.id;
}

export async function createAdminReviewBouquetInCatalog(
  input: CreateAdminCatalogBouquetInput
): Promise<{ id: string; slug: string }> {
  const supabase = requireSupabase();
  const slug = await ensureUniqueCatalogSlug(input.slug || input.nameEn);
  const price = Math.max(0, Number(input.price));
  const images = writeImagesToStored(supabase, input.images);
  const occasion = input.occasion?.filter((value) => value.trim()) ?? [];
  const pricingType = input.pricingType ?? 'single_price';
  const { pricingType: resolvedType, pricing } = adminCreateCatalogPricing(pricingType, price);

  const { data, error } = await supabase
    .from('catalog_bouquets')
    .insert({
      partner_id: null,
      slug_en: slug,
      slug_th: slug,
      name_en: input.nameEn.trim(),
      name_th: (input.nameTh || '').trim(),
      description_en: (input.descriptionEn || '').trim(),
      description_th: (input.descriptionTh || '').trim(),
      composition_en: (input.compositionEn || '').trim(),
      composition_th: (input.compositionTh || '').trim(),
      pricing_type: resolvedType,
      pricing,
      status: 'pending_review',
      featured_popular: input.featuredPopular === true,
      delivery_options: input.deliveryOptions ?? [],
      excluded_delivery_destinations: input.excludedDeliveryDestinations ?? [],
      presentation_formats: input.presentationFormats ?? [],
      colors: input.colors ?? [],
      flower_types: input.flowerTypes ?? [],
      occasion,
      images,
      source: 'admin_ai_product_creation',
      created_by: input.createdBy?.trim() || null,
    })
    .select('id')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to create catalog bouquet');
  await upsertSlugRegistry('bouquet', data.id, slug, slug);
  return { id: data.id, slug };
}

export async function createAdminReviewProductInCatalog(
  input: CreateAdminCatalogProductInput
): Promise<{ id: string; slug: string }> {
  const supabase = requireSupabase();
  const partnerId = await ensureCatalogSystemPartner();
  const slug = await ensureUniqueCatalogSlug(input.slug || input.nameEn || 'product');
  const price = Math.max(0, Number(input.price));
  const images = writeImagesToStored(supabase, input.images);
  const occasion = input.occasion?.find((value) => value.trim());
  const pricingType = input.pricingType ?? 'single_price';
  const { pricingType: resolvedType, pricing } = adminCreateCatalogPricing(pricingType, price);
  const customAttributes = (input.customAttributes ?? [])
    .filter((attribute) => attribute.key.trim() && attribute.value.trim())
    .map((attribute) => ({
      key: attribute.key.trim(),
      value: attribute.value.trim(),
    }));

  const { data, error } = await supabase
    .from('catalog_products')
    .insert({
      partner_id: partnerId,
      slug_en: slug,
      slug_th: slug,
      name_en: input.nameEn.trim(),
      name_th: (input.nameTh || '').trim(),
      description_en: (input.descriptionEn || '').trim(),
      description_th: (input.descriptionTh || '').trim(),
      category: input.category,
      price,
      pricing_type: resolvedType,
      pricing,
      cost: price,
      commission_percent: 0,
      moderation_status: 'submitted',
      excluded_delivery_destinations: input.excludedDeliveryDestinations ?? [],
      images,
      structured_attributes: occasion ? { occasion } : {},
      custom_attributes: customAttributes,
    })
    .select('id')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to create catalog product');
  await upsertSlugRegistry('product', data.id, slug, slug);
  return { id: data.id, slug };
}

export async function appendCatalogBouquetImage(
  bouquetId: string,
  image: CatalogWriteImageInput
): Promise<void> {
  const supabase = requireSupabase();
  const { data: row, error: loadError } = await supabase
    .from('catalog_bouquets')
    .select('images')
    .eq('id', bouquetId)
    .maybeSingle();

  if (loadError) throw new Error(loadError.message);
  if (!row) throw new Error('Bouquet not found');

  const existing = (row.images ?? []) as CatalogStoredImage[];
  const next = [
    ...existing,
    ...writeImagesToStored(supabase, [{ ...image, isPrimary: false }]),
  ];

  const { error } = await supabase
    .from('catalog_bouquets')
    .update({ images: next, updated_at: new Date().toISOString() })
    .eq('id', bouquetId);

  if (error) throw new Error(error.message);
}

export async function updateCatalogProductByAdmin(
  productId: string,
  input: UpdateCatalogProductByAdminInput
): Promise<void> {
  const supabase = requireSupabase();
  const { data: existing, error: loadError } = await supabase
    .from('catalog_products')
    .select('structured_attributes, pricing_type, pricing')
    .eq('id', productId)
    .maybeSingle();

  if (loadError) throw new Error(loadError.message);
  if (!existing) throw new Error('Product not found');

  const structured = (existing.structured_attributes ?? {}) as Record<string, unknown>;
  if (input.occasion != null) {
    structured.occasion = input.occasion.length ? input.occasion.join(', ') : undefined;
  }

  let nextPricingType =
    input.pricingType ?? (existing.pricing_type as PricingType | undefined) ?? 'single_price';
  let nextPricing = (input.pricing ??
    existing.pricing ??
    {}) as CatalogBouquetPricing;

  if (input.pricingType != null || input.pricing != null) {
    if (input.pricing != null) {
      nextPricing = input.pricing;
    }
    if (input.pricingType != null) {
      nextPricingType = input.pricingType;
    }
  }

  const syncedPrice =
    input.price ??
    (input.pricingType != null || input.pricing != null
      ? primaryCatalogPriceFromPricing(nextPricingType, nextPricing)
      : undefined);

  const patch: Record<string, unknown> = {
    ...(input.nameEn != null && { name_en: input.nameEn.trim() }),
    ...(input.nameTh != null && { name_th: input.nameTh.trim() }),
    ...(input.descriptionEn != null && { description_en: input.descriptionEn.trim() }),
    ...(input.descriptionTh != null && { description_th: input.descriptionTh.trim() }),
    ...(syncedPrice != null && Number.isFinite(syncedPrice) && { price: syncedPrice }),
    ...(input.pricingType != null && { pricing_type: input.pricingType }),
    ...(input.pricing != null && { pricing: input.pricing }),
    ...(input.discountPercent !== undefined && {
      discount_percent: input.discountPercent,
    }),
    ...(input.excludedDeliveryDestinations != null && {
      excluded_delivery_destinations: input.excludedDeliveryDestinations,
    }),
    ...(input.occasion != null && { structured_attributes: structured }),
    ...(input.adminOverrides != null && { admin_overrides: input.adminOverrides }),
    ...(input.adminChangeSummary != null && { admin_change_summary: input.adminChangeSummary }),
    ...(input.adminLastEditedBy != null && { admin_last_edited_by: input.adminLastEditedBy }),
    admin_last_edited_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('catalog_products').update(patch).eq('id', productId);

  if (error) throw new Error(error.message);
}

type CatalogDeleteEntityType = 'bouquet' | 'product';

function storagePathsFromInlineImages(images: unknown): string[] {
  if (!Array.isArray(images)) return [];
  const paths: string[] = [];
  for (const item of images) {
    if (!item || typeof item !== 'object') continue;
    const storagePath = (item as { storage_path?: unknown }).storage_path;
    if (typeof storagePath === 'string' && storagePath.trim()) {
      paths.push(storagePath.trim());
    }
  }
  return paths;
}

async function purgeCatalogEntityDependencies(
  entityType: CatalogDeleteEntityType,
  entityId: string
): Promise<void> {
  const supabase = requireSupabase();
  const table = entityType === 'bouquet' ? 'catalog_bouquets' : 'catalog_products';

  const [{ data: imageRows, error: imagesError }, { data: entityRow, error: entityError }] =
    await Promise.all([
      supabase
        .from('catalog_product_images')
        .select('storage_path')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId),
      supabase.from(table).select('images').eq('id', entityId).maybeSingle(),
    ]);

  if (imagesError) throw new Error(imagesError.message);
  if (entityError) throw new Error(entityError.message);

  const storagePaths = Array.from(
    new Set([
      ...(imageRows ?? [])
        .map((row) => row.storage_path)
        .filter((path): path is string => typeof path === 'string' && path.trim().length > 0),
      ...storagePathsFromInlineImages(entityRow?.images),
    ])
  );

  if (storagePaths.length > 0) {
    const { error: storageError } = await supabase.storage.from(CATALOG_BUCKET).remove(storagePaths);
    if (storageError) {
      console.warn('[catalog] storage remove failed:', storageError.message);
    }
  }

  const dependentDeletes = await Promise.all([
    supabase.from('catalog_product_images').delete().eq('entity_type', entityType).eq('entity_id', entityId),
    supabase.from('catalog_slug_registry').delete().eq('entity_type', entityType).eq('entity_id', entityId),
    supabase.from('catalog_collection_items').delete().eq('entity_type', entityType).eq('entity_id', entityId),
    supabase.from('catalog_product_revisions').delete().eq('entity_type', entityType).eq('entity_id', entityId),
    supabase.from('catalog_audit_events').delete().eq('entity_type', entityType).eq('entity_id', entityId),
  ]);

  const dependentError = dependentDeletes.find((result) => result.error)?.error;
  if (dependentError) throw new Error(dependentError.message);
}

export async function deleteCatalogBouquet(bouquetId: string): Promise<void> {
  await purgeCatalogEntityDependencies('bouquet', bouquetId);
  const supabase = requireSupabase();
  const { error } = await supabase.from('catalog_bouquets').delete().eq('id', bouquetId);
  if (error) throw new Error(error.message);
}

export async function deleteCatalogProduct(productId: string): Promise<void> {
  await purgeCatalogEntityDependencies('product', productId);
  const supabase = requireSupabase();
  const { error } = await supabase.from('catalog_products').delete().eq('id', productId);
  if (error) throw new Error(error.message);
}
