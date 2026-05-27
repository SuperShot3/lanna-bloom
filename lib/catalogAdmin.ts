/**
 * Admin-only catalog reads (service role). Used when CATALOG_WRITE_SOURCE=supabase.
 */
import 'server-only';

import type { Bouquet } from '@/lib/bouquets';
import {
  mapBouquetRowToBouquet,
  mapProductRowToCatalogProduct,
} from '@/lib/catalog/mappers';
import {
  applyBouquetDraftToDetail,
  applyProductDraftToDetail,
  getActiveCatalogDraft,
  getCatalogDraftSummaries,
} from '@/lib/catalogDraft';
import {
  ensureCatalogProductImagesFromInline,
  getCatalogImageVariantKey,
  getCatalogProductImagesForRevision,
} from '@/lib/catalogCms';
import { storedImagePublicUrl } from '@/lib/catalog/storage';
import type {
  AdminCatalogProductImage,
  CatalogBouquetRow,
  CatalogPartnerRow,
  CatalogProductImageRow,
  CatalogProductRow,
} from '@/lib/catalog/types';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import type {
  AdminBouquetDetail,
  AdminCatalogIndex,
  AdminCatalogIndexItem,
  AdminProductDetail,
  CatalogSiteSettingsRow,
  CatalogStoredImage,
  ModerationProduct,
} from '@/lib/catalog/types';

const PLACEHOLDER =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"%3E%3Crect fill="%23f9f5f0" width="600" height="600"/%3E%3Ctext fill="%236b6560" font-family="sans-serif" font-size="24" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3ENo image%3C/text%3E%3C/svg%3E';

function requireSupabase() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return supabase;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

async function loadPartner(
  partnerId: string | null
): Promise<CatalogPartnerRow | null> {
  if (!partnerId) return null;
  const supabase = requireSupabase();
  const { data } = await supabase
    .from('catalog_partners')
    .select('*')
    .eq('id', partnerId)
    .maybeSingle();
  return (data as CatalogPartnerRow) ?? null;
}

/** Resolve catalog bouquet id from UUID or legacy Sanity document id. */
export async function resolveCatalogBouquetId(idOrLegacy: string): Promise<string | null> {
  const key = idOrLegacy.trim();
  if (!key) return null;
  const supabase = requireSupabase();

  if (isUuid(key)) {
    const { data } = await supabase.from('catalog_bouquets').select('id').eq('id', key).maybeSingle();
    return data?.id ?? null;
  }

  const { data: byLegacy } = await supabase
    .from('catalog_bouquets')
    .select('id')
    .eq('legacy_sanity_id', key)
    .maybeSingle();
  if (byLegacy?.id) return byLegacy.id;

  const { data: byId } = await supabase.from('catalog_bouquets').select('id').eq('id', key).maybeSingle();
  return byId?.id ?? null;
}

function indexImageUrl(
  supabase: ReturnType<typeof requireSupabase>,
  images: CatalogProductRow['images'] | CatalogBouquetRow['images']
): string | undefined {
  const list = images ?? [];
  const primary = list.find((i) => i.is_primary) ?? list[0];
  if (!primary?.storage_path) return undefined;
  return storedImagePublicUrl(supabase, primary);
}

/** Slim catalog list for the admin products studio shelf. */
export async function getAdminCatalogIndex(): Promise<AdminCatalogIndex> {
  const supabase = requireSupabase();
  const [{ data: bouquetRows, error: bouquetError }, { data: productRows, error: productError }] =
    await Promise.all([
      supabase
        .from('catalog_bouquets')
        .select('id, name_en, slug_en, status, images')
        .order('name_en', { ascending: true }),
      supabase
        .from('catalog_products')
        .select('id, name_en, slug_en, category, moderation_status, images')
        .order('name_en', { ascending: true }),
    ]);

  if (bouquetError) throw new Error(bouquetError.message);
  if (productError) throw new Error(productError.message);

  const bouquetIds = ((bouquetRows ?? []) as { id: string }[]).map((r) => r.id);
  const productIds = ((productRows ?? []) as { id: string }[]).map((r) => r.id);
  const [bouquetDrafts, productDrafts] = await Promise.all([
    getCatalogDraftSummaries('bouquet', bouquetIds),
    getCatalogDraftSummaries('product', productIds),
  ]);

  const bouquets: AdminCatalogIndexItem[] = ((bouquetRows ?? []) as Pick<
    CatalogBouquetRow,
    'id' | 'name_en' | 'slug_en' | 'status' | 'images'
  >[]).map((row) => ({
    id: row.id,
    entityType: 'bouquet' as const,
    nameEn: row.name_en,
    slug: row.slug_en,
    status: row.status,
    imageUrl: indexImageUrl(supabase, row.images),
    isPending: row.status === 'pending_review',
    hasDraft: bouquetDrafts.has(row.id),
  }));

  const products: AdminCatalogIndexItem[] = ((productRows ?? []) as Pick<
    CatalogProductRow,
    'id' | 'name_en' | 'slug_en' | 'category' | 'moderation_status' | 'images'
  >[]).map((row) => ({
    id: row.id,
    entityType: 'product' as const,
    nameEn: row.name_en,
    slug: row.slug_en,
    status: row.moderation_status,
    category: row.category,
    imageUrl: indexImageUrl(supabase, row.images),
    isPending: row.moderation_status === 'submitted',
    hasDraft: productDrafts.has(row.id),
  }));

  const pendingCount =
    bouquets.filter((b) => b.isPending).length + products.filter((p) => p.isPending).length;

  return { bouquets, products, pendingCount };
}

export async function getCatalogBouquetDetailForAdmin(
  idOrLegacy: string
): Promise<AdminBouquetDetail | null> {
  const resolvedId = await resolveCatalogBouquetId(idOrLegacy);
  if (!resolvedId) return null;

  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('catalog_bouquets')
    .select('*')
    .eq('id', resolvedId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as CatalogBouquetRow;
  const partner = await loadPartner(row.partner_id);
  const mapped = mapBouquetRowToBouquet(supabase, row, partner);

  const draft = await getActiveCatalogDraft('bouquet', row.id);

  let editableImages: AdminCatalogProductImage[] = [];
  try {
    const imageRows = draft
      ? await getCatalogProductImagesForRevision(draft.id)
      : await ensureCatalogProductImagesFromInline('bouquet', row.id);
    editableImages = imageRows.map((imageRow) => mapAdminImageRow(supabase, imageRow));
  } catch (err) {
    console.error('[catalogAdmin] Failed to load editable bouquet images:', err);
  }

  const pricing = row.pricing ?? {};
  return applyBouquetDraftToDetail(
    {
    id: row.id,
    slug: mapped.slug,
    nameEn: mapped.nameEn,
    nameTh: mapped.nameTh,
    descriptionEn: mapped.descriptionEn,
    descriptionTh: mapped.descriptionTh,
    compositionEn: mapped.compositionEn,
    compositionTh: mapped.compositionTh,
    status: mapped.status ?? 'pending_review',
    featuredPopular: mapped.featuredPopular === true,
    discountPercent: mapped.discountPercent,
    pricingType: mapped.pricingType ?? row.pricing_type,
    pricing: row.pricing ?? {},
    sizes: mapped.sizes,
    images: mapped.images,
    imageAlts: mapped.imageAlts,
    editableImages,
    colors: mapped.colors ?? [],
    flowerTypes: mapped.flowerTypes ?? [],
    occasion: mapped.occasion,
    presentationFormats: mapped.presentationFormats,
    deliveryOptions: mapped.deliveryOptions,
    excludedDeliveryDestinations: mapped.excludedDeliveryDestinations,
    partnerId: mapped.partnerId,
    partnerName: mapped.partnerName,
    },
    draft
  );
}

export async function getCatalogBouquetByIdForAdmin(idOrLegacy: string): Promise<Bouquet | null> {
  const resolvedId = await resolveCatalogBouquetId(idOrLegacy);
  if (!resolvedId) return null;

  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('catalog_bouquets')
    .select('*')
    .eq('id', resolvedId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as CatalogBouquetRow;
  const partner = await loadPartner(row.partner_id);
  return mapBouquetRowToBouquet(supabase, row, partner);
}

async function mapBouquetRowsToBouquets(rows: CatalogBouquetRow[]): Promise<Bouquet[]> {
  const supabase = requireSupabase();
  const partnerIds = Array.from(
    new Set(rows.map((r) => r.partner_id).filter((id): id is string => Boolean(id)))
  );
  const partnerMap = new Map<string, CatalogPartnerRow>();
  if (partnerIds.length) {
    const { data: partners } = await supabase
      .from('catalog_partners')
      .select('*')
      .in('id', partnerIds);
    for (const p of partners ?? []) {
      partnerMap.set(p.id, p as CatalogPartnerRow);
    }
  }

  return rows.map((row) =>
    mapBouquetRowToBouquet(
      supabase,
      row,
      row.partner_id ? partnerMap.get(row.partner_id) ?? null : null
    )
  );
}

export async function getPendingBouquetsFromCatalog(): Promise<Bouquet[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('catalog_bouquets')
    .select('*')
    .eq('status', 'pending_review')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return mapBouquetRowsToBouquets((data ?? []) as CatalogBouquetRow[]);
}

/** All bouquets in Supabase (e.g. after Sanity import — most are `approved`). */
export async function getAllBouquetsFromCatalog(): Promise<Bouquet[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('catalog_bouquets')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return mapBouquetRowsToBouquets((data ?? []) as CatalogBouquetRow[]);
}

function primaryImageUrl(supabase: ReturnType<typeof requireSupabase>, row: CatalogProductRow): string | undefined {
  const images = row.images ?? [];
  const primary = images.find((i) => i.is_primary) ?? images[0];
  if (!primary?.storage_path) return undefined;
  return storedImagePublicUrl(supabase, primary);
}

function mapAdminImageRow(
  supabase: ReturnType<typeof requireSupabase>,
  row: CatalogProductImageRow
): AdminCatalogProductImage {
  return {
    id: row.id,
    url: row.public_url?.trim() || supabase.storage.from('catalog').getPublicUrl(row.storage_path).data.publicUrl,
    storagePath: row.storage_path,
    sourceType: row.source_type,
    altEn: row.alt_en ?? '',
    altTh: row.alt_th ?? '',
    isPrimary: row.is_primary,
    sortOrder: row.sort_order,
    variantKey: getCatalogImageVariantKey(row),
  };
}

export async function getPendingProductsFromCatalog(): Promise<ModerationProduct[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('catalog_products')
    .select('*')
    .eq('moderation_status', 'submitted')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as CatalogProductRow[]).map((row) => ({
    id: row.id,
    nameEn: row.name_en,
    nameTh: row.name_th || undefined,
    category: row.category,
    price: Number(row.price),
    partnerId: row.partner_id,
    moderationStatus: row.moderation_status,
    imageUrl: primaryImageUrl(supabase, row),
  }));
}

export async function getAllProductsFromCatalog(): Promise<Array<ModerationProduct & { slug?: string }>> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('catalog_products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as CatalogProductRow[]).map((row) => ({
    id: row.id,
    slug: row.slug_en,
    nameEn: row.name_en,
    nameTh: row.name_th || undefined,
    category: row.category,
    price: Number(row.price),
    partnerId: row.partner_id,
    moderationStatus: row.moderation_status,
    imageUrl: primaryImageUrl(supabase, row),
  }));
}

export async function resolveCatalogProductId(idOrLegacy: string): Promise<string | null> {
  const key = idOrLegacy.trim();
  if (!key) return null;
  const supabase = requireSupabase();

  if (isUuid(key)) {
    const { data } = await supabase.from('catalog_products').select('id').eq('id', key).maybeSingle();
    return data?.id ?? null;
  }

  const { data: byLegacy } = await supabase
    .from('catalog_products')
    .select('id')
    .eq('legacy_sanity_id', key)
    .maybeSingle();
  if (byLegacy?.id) return byLegacy.id;

  const { data: byId } = await supabase.from('catalog_products').select('id').eq('id', key).maybeSingle();
  return byId?.id ?? null;
}

export async function getCatalogProductByIdForAdmin(
  idOrLegacy: string
): Promise<AdminProductDetail | null> {
  const resolvedId = await resolveCatalogProductId(idOrLegacy);
  if (!resolvedId) return null;

  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('catalog_products')
    .select('*')
    .eq('id', resolvedId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as CatalogProductRow;
  const mapped = mapProductRowToCatalogProduct(supabase, row);
  const overrides = row.admin_overrides;
  const draft = await getActiveCatalogDraft('product', row.id);

  let editableImages: AdminCatalogProductImage[] = [];
  try {
    const imageRows = draft
      ? await getCatalogProductImagesForRevision(draft.id)
      : await ensureCatalogProductImagesFromInline('product', row.id);
    editableImages = imageRows.map((imageRow) => mapAdminImageRow(supabase, imageRow));
  } catch (error) {
    console.error('[catalogAdmin] Failed to load editable product images:', error);
  }

  return applyProductDraftToDetail(
    {
      id: row.id,
      slug: row.slug_en,
      nameEn: mapped.nameEn,
      nameTh: mapped.nameTh,
      descriptionEn: mapped.descriptionEn,
      descriptionTh: mapped.descriptionTh,
      category: row.category,
      price: Number(row.price),
      cost: row.cost != null ? Number(row.cost) : undefined,
      moderationStatus: row.moderation_status,
      commissionPercent: row.commission_percent != null ? Number(row.commission_percent) : undefined,
      images: mapped.images.length ? mapped.images : [PLACEHOLDER],
      imageAlts: mapped.imageAlts,
      editableImages,
      preparationTime: row.structured_attributes?.preparationTime,
      occasion: row.structured_attributes?.occasion,
      excludedDeliveryDestinations: mapped.excludedDeliveryDestinations,
      customAttributes: (row.custom_attributes ?? [])
        .map((a) => ({ key: a.key ?? '', value: a.value ?? '' }))
        .filter((a) => a.key || a.value),
      partnerId: row.partner_id,
      adminOverrides: overrides ?? undefined,
      adminChangeSummary: row.admin_change_summary ?? undefined,
      adminLastEditedAt: row.admin_last_edited_at ?? undefined,
      adminLastEditedBy: row.admin_last_edited_by ?? undefined,
    },
    draft
  );
}

export type AdminHeroCarouselItem = {
  storagePath: string;
  url: string;
  alt: string;
  sortOrder: number;
};

export type AdminHeroSettings = {
  heroImageUrl: string | null;
  heroStoragePath: string | null;
  carousel: AdminHeroCarouselItem[];
};

function mapStoredHeroImage(
  supabase: ReturnType<typeof requireSupabase>,
  image: CatalogStoredImage | null | undefined
): { url: string | null; storagePath: string | null } {
  if (!image?.storage_path) return { url: null, storagePath: null };
  return {
    url: storedImagePublicUrl(supabase, image),
    storagePath: image.storage_path,
  };
}

export async function getCatalogSiteSettingsForAdmin(): Promise<AdminHeroSettings> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('catalog_site_settings')
    .select('hero_image, hero_carousel_images')
    .eq('id', 'default')
    .maybeSingle();

  if (error) throw new Error(error.message);

  const row = data as Pick<CatalogSiteSettingsRow, 'hero_image' | 'hero_carousel_images'> | null;
  const hero = mapStoredHeroImage(supabase, row?.hero_image);
  const carousel = ((row?.hero_carousel_images ?? []) as CatalogStoredImage[])
    .filter((img) => img.storage_path)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((img, index) => ({
      storagePath: img.storage_path,
      url: storedImagePublicUrl(supabase, img),
      alt: img.alt?.trim() ?? '',
      sortOrder: img.sort_order ?? index,
    }));

  return {
    heroImageUrl: hero.url,
    heroStoragePath: hero.storagePath,
    carousel,
  };
}

/** Raw site settings row for admin writes (merge carousel / hero jsonb). */
export async function getCatalogSiteSettingsRowForAdmin(): Promise<{
  heroImage: CatalogStoredImage | null;
  heroCarouselImages: CatalogStoredImage[];
}> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('catalog_site_settings')
    .select('hero_image, hero_carousel_images')
    .eq('id', 'default')
    .maybeSingle();

  if (error) throw new Error(error.message);

  return {
    heroImage: (data?.hero_image as CatalogStoredImage | null) ?? null,
    heroCarouselImages: (data?.hero_carousel_images ?? []) as CatalogStoredImage[],
  };
}
