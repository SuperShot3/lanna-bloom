/**
 * Server-only primitives for the manual-first Product CMS.
 *
 * These helpers intentionally work against the new draft/image/collection tables.
 * Publishing into catalog_bouquets/catalog_products is a later, explicit step.
 */
import 'server-only';

import { slugFromName } from '@/lib/catalog/mappers';
import { isStorefrontCatalogImage } from '@/lib/catalog/storefrontImages';
import { catalogPublicUrl } from '@/lib/catalog/storage';
import type {
  CatalogStoredImage,
  CatalogAuditEntityType,
  CatalogAuditEventRow,
  CatalogCollectionFallbackMode,
  CatalogCollectionItemRow,
  CatalogCollectionPlacement,
  CatalogCollectionRow,
  CatalogEntityType,
  CatalogImageSourceType,
  CatalogProductImageRow,
  CatalogProductRevisionRow,
  CatalogRevisionSource,
  CatalogRevisionStatus,
} from '@/lib/catalog/types';
import { getSupabaseAdmin } from '@/lib/supabase/server';

type JsonObject = Record<string, unknown>;

function requireSupabase() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return supabase;
}

function cleanText(value: string | null | undefined): string | null {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

function cleanTextArray(values: string[] | undefined): string[] {
  return (values ?? []).map((value) => value.trim()).filter(Boolean);
}

function imageRowToStoredImage(
  supabase: ReturnType<typeof requireSupabase>,
  row: CatalogProductImageRow
): CatalogStoredImage {
  const format = typeof row.metadata?.format === 'string' ? row.metadata.format : undefined;
  return {
    storage_path: row.storage_path,
    public_url: row.public_url?.trim() || catalogPublicUrl(supabase, row.storage_path),
    alt: row.alt_en ?? undefined,
    format: format === 'webp' || format === 'png_master' || format === 'source' ? format : undefined,
    is_primary: row.is_primary,
    sort_order: row.sort_order,
  };
}

export type CatalogRevisionSeoInput = {
  seoTitleEn?: string | null;
  seoTitleTh?: string | null;
  seoDescriptionEn?: string | null;
  seoDescriptionTh?: string | null;
  seoKeywords?: string[];
  ogImagePath?: string | null;
};

export type CreateCatalogRevisionInput = CatalogRevisionSeoInput & {
  entityType: CatalogEntityType;
  entityId?: string | null;
  baseRevisionId?: string | null;
  source?: CatalogRevisionSource;
  status?: Extract<CatalogRevisionStatus, 'draft' | 'pending_review'>;
  payload: JsonObject;
  moderationNote?: string | null;
  actor?: string | null;
};

export async function createCatalogRevision(
  input: CreateCatalogRevisionInput
): Promise<CatalogProductRevisionRow> {
  const supabase = requireSupabase();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('catalog_product_revisions')
    .insert({
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      base_revision_id: input.baseRevisionId ?? null,
      source: input.source ?? 'admin_manual',
      status: input.status ?? 'draft',
      payload: input.payload,
      seo_title_en: cleanText(input.seoTitleEn),
      seo_title_th: cleanText(input.seoTitleTh),
      seo_description_en: cleanText(input.seoDescriptionEn),
      seo_description_th: cleanText(input.seoDescriptionTh),
      seo_keywords: cleanTextArray(input.seoKeywords),
      og_image_path: cleanText(input.ogImagePath),
      moderation_note: cleanText(input.moderationNote),
      created_by: cleanText(input.actor),
      edited_by: cleanText(input.actor),
      updated_at: now,
    })
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to create catalog revision');
  return data as CatalogProductRevisionRow;
}

export type UpdateCatalogRevisionStatusInput = {
  revisionId: string;
  status: CatalogRevisionStatus;
  actor?: string | null;
  moderationNote?: string | null;
  rejectionReason?: string | null;
};

export async function updateCatalogRevisionStatus(
  input: UpdateCatalogRevisionStatusInput
): Promise<CatalogProductRevisionRow> {
  const supabase = requireSupabase();
  const now = new Date().toISOString();
  const approved = input.status === 'approved';
  const published = input.status === 'published';
  const { data, error } = await supabase
    .from('catalog_product_revisions')
    .update({
      status: input.status,
      edited_by: cleanText(input.actor),
      moderation_note: cleanText(input.moderationNote),
      rejection_reason: cleanText(input.rejectionReason),
      ...(approved && { approved_by: cleanText(input.actor), approved_at: now }),
      ...(published && { published_by: cleanText(input.actor), published_at: now }),
      updated_at: now,
    })
    .eq('id', input.revisionId)
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to update catalog revision');
  return data as CatalogProductRevisionRow;
}

export type CreateCatalogProductImageInput = {
  entityType: CatalogEntityType;
  entityId?: string | null;
  revisionId?: string | null;
  storagePath: string;
  publicUrl?: string | null;
  sourceType?: CatalogImageSourceType;
  originalImageId?: string | null;
  altEn?: string | null;
  altTh?: string | null;
  isPrimary?: boolean;
  sortOrder?: number;
  metadata?: JsonObject;
  actor?: string | null;
};

async function clearPrimaryImage(input: {
  entityType: CatalogEntityType;
  entityId?: string | null;
  revisionId?: string | null;
  actor?: string | null;
}): Promise<void> {
  const supabase = requireSupabase();
  let query = supabase
    .from('catalog_product_images')
    .update({
      is_primary: false,
      updated_by: cleanText(input.actor),
      updated_at: new Date().toISOString(),
    })
    .eq('entity_type', input.entityType)
    .is('deleted_at', null);

  if (input.revisionId) {
    query = query.eq('revision_id', input.revisionId);
  } else {
    query = query.is('revision_id', null).eq('entity_id', input.entityId ?? '');
  }

  const { error } = await query;
  if (error) throw new Error(`Failed to clear primary image: ${error.message}`);
}

export async function createCatalogProductImage(
  input: CreateCatalogProductImageInput
): Promise<CatalogProductImageRow> {
  const storagePath = input.storagePath.trim();
  if (!storagePath) throw new Error('Image storagePath is required');
  if (!input.entityId && !input.revisionId) {
    throw new Error('Image must belong to an entity or revision');
  }

  const supabase = requireSupabase();
  if (input.isPrimary) {
    await clearPrimaryImage(input);
  }

  const { data, error } = await supabase
    .from('catalog_product_images')
    .insert({
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      revision_id: input.revisionId ?? null,
      storage_path: storagePath,
      public_url: cleanText(input.publicUrl) ?? catalogPublicUrl(supabase, storagePath),
      source_type: input.sourceType ?? 'uploaded',
      original_image_id: input.originalImageId ?? null,
      alt_en: cleanText(input.altEn),
      alt_th: cleanText(input.altTh),
      is_primary: input.isPrimary === true,
      sort_order: input.sortOrder ?? 0,
      metadata: input.metadata ?? {},
      created_by: cleanText(input.actor),
      updated_by: cleanText(input.actor),
    })
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to create catalog image');
  return data as CatalogProductImageRow;
}

export function getCatalogImageVariantKey(row: CatalogProductImageRow): string | null {
  const key = row.metadata?.variant_key;
  return typeof key === 'string' && key.trim() ? key.trim() : null;
}

export function filterCatalogImagesByVariant(
  rows: CatalogProductImageRow[],
  variantKey?: string | null
): CatalogProductImageRow[] {
  if (variantKey) {
    return rows.filter((row) => getCatalogImageVariantKey(row) === variantKey);
  }
  return rows.filter((row) => !getCatalogImageVariantKey(row));
}

export async function getCatalogProductImagesForEntity(
  entityType: CatalogEntityType,
  entityId: string
): Promise<CatalogProductImageRow[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('catalog_product_images')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .is('revision_id', null)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as CatalogProductImageRow[];
}

export async function getCatalogProductImagesForRevision(
  revisionId: string
): Promise<CatalogProductImageRow[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('catalog_product_images')
    .select('*')
    .eq('revision_id', revisionId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as CatalogProductImageRow[];
}

export async function reorderCatalogProductImages(input: {
  entityType: CatalogEntityType;
  entityId?: string;
  revisionId?: string | null;
  orderedIds: string[];
  variantKey?: string | null;
  actor?: string | null;
}): Promise<CatalogProductImageRow[]> {
  const supabase = requireSupabase();
  if (!input.entityId && !input.revisionId) {
    throw new Error('reorderCatalogProductImages requires entityId or revisionId');
  }
  const allRows = input.revisionId
    ? await getCatalogProductImagesForRevision(input.revisionId)
    : await getCatalogProductImagesForEntity(input.entityType, input.entityId!);
  const scopeRows = filterCatalogImagesByVariant(allRows, input.variantKey);
  const scopeIds = new Set(scopeRows.map((row) => row.id));
  const ordered = input.orderedIds.filter((id) => scopeIds.has(id));
  if (ordered.length !== scopeRows.length) {
    throw new Error('Invalid image order for this variant scope');
  }

  const now = new Date().toISOString();
  // Update sort_order only — setting is_primary in parallel can briefly leave two
  // primaries live and violate catalog_product_images_one_primary_live_idx.
  const updates = await Promise.all(
    ordered.map((id, sortOrder) =>
      supabase
        .from('catalog_product_images')
        .update({
          sort_order: sortOrder,
          updated_by: cleanText(input.actor),
          updated_at: now,
        })
        .eq('id', id)
    )
  );
  const updateError = updates.find((result) => result.error)?.error;
  if (updateError) throw new Error(updateError.message);

  if (input.variantKey) {
    await clearPrimaryImage({
      entityType: input.entityType,
      entityId: input.entityId,
      revisionId: input.revisionId,
      actor: input.actor,
    });
  } else if (ordered[0]) {
    await setCatalogProductPrimaryImage(ordered[0], input.actor);
  }

  if (input.revisionId) {
    return getCatalogProductImagesForRevision(input.revisionId);
  }
  return getCatalogProductImagesForEntity(input.entityType, input.entityId!);
}

export async function ensureCatalogProductImagesFromInline(
  entityType: CatalogEntityType,
  entityId: string
): Promise<CatalogProductImageRow[]> {
  const existing = await getCatalogProductImagesForEntity(entityType, entityId);
  if (existing.length > 0) return existing;

  const supabase = requireSupabase();
  const table = entityType === 'bouquet' ? 'catalog_bouquets' : 'catalog_products';
  const { data: row, error } = await supabase
    .from(table)
    .select('images, created_at')
    .eq('id', entityId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const inlineImages = ((row?.images ?? []) as CatalogStoredImage[]).filter((image) =>
    image.storage_path?.trim()
  );
  if (!inlineImages.length) return [];

  const primaryIndex = Math.max(
    0,
    inlineImages.findIndex((image) => image.is_primary === true)
  );
  const now = new Date().toISOString();
  const rows = inlineImages.map((image, index) => ({
    entity_type: entityType,
    entity_id: entityId,
    revision_id: null,
    storage_path: image.storage_path.trim(),
    public_url: image.public_url ?? catalogPublicUrl(supabase, image.storage_path.trim()),
    source_type: 'migrated_from_sanity' as CatalogImageSourceType,
    alt_en: cleanText(image.alt),
    alt_th: null,
    is_primary: index === primaryIndex,
    sort_order: image.sort_order ?? index,
    metadata: {
      ...(image.format ? { format: image.format } : {}),
      backfilled_from: `${table}.images`,
    },
    created_at: row?.created_at ?? now,
    updated_at: now,
  }));

  const { error: insertError } = await supabase.from('catalog_product_images').insert(rows);
  if (insertError) throw new Error(insertError.message);
  return getCatalogProductImagesForEntity(entityType, entityId);
}

function mergeBouquetImagesForInlineSync(
  supabase: ReturnType<typeof requireSupabase>,
  rows: CatalogProductImageRow[],
  variantOrder: string[]
): CatalogStoredImage[] {
  const byVariant = new Map<string, CatalogProductImageRow[]>();
  const bouquetLevel: CatalogProductImageRow[] = [];

  for (const row of rows) {
    if (!isStorefrontCatalogImage({ storage_path: row.storage_path, metadata: row.metadata })) {
      continue;
    }
    const vk = getCatalogImageVariantKey(row);
    if (!vk) {
      bouquetLevel.push(row);
      continue;
    }
    const list = byVariant.get(vk) ?? [];
    list.push(row);
    byVariant.set(vk, list);
  }

  const ordered: CatalogProductImageRow[] = [];
  for (const vk of variantOrder) {
    const list = byVariant.get(vk);
    if (list?.length) ordered.push(...list);
  }
  for (const [vk, list] of Array.from(byVariant.entries())) {
    if (!variantOrder.includes(vk)) ordered.push(...list);
  }
  ordered.push(...bouquetLevel);

  return ordered.map((row, index) => ({
    ...imageRowToStoredImage(supabase, row),
    is_primary: index === 0,
    sort_order: index,
  }));
}

export async function syncCatalogProductInlineImagesFromNormalized(
  entityType: CatalogEntityType,
  entityId: string
): Promise<CatalogStoredImage[]> {
  const supabase = requireSupabase();
  const rows = await getCatalogProductImagesForEntity(entityType, entityId);
  let inlineImages: CatalogStoredImage[];

  const storefrontRows = rows.filter((row) =>
    isStorefrontCatalogImage({ storage_path: row.storage_path, metadata: row.metadata })
  );

  if (entityType === 'bouquet') {
    const mainRows = storefrontRows.filter((row) => !getCatalogImageVariantKey(row));
    inlineImages = mainRows.map((row, index) => ({
      ...imageRowToStoredImage(supabase, row),
      is_primary: index === 0,
      sort_order: index,
    }));
  } else {
    inlineImages = storefrontRows.map((row, index) => ({
      ...imageRowToStoredImage(supabase, row),
      is_primary: index === 0,
      sort_order: index,
    }));
  }

  const table = entityType === 'bouquet' ? 'catalog_bouquets' : 'catalog_products';
  const { error } = await supabase
    .from(table)
    .update({
      images: inlineImages,
      updated_at: new Date().toISOString(),
    })
    .eq('id', entityId);

  if (error) throw new Error(`Failed to sync ${entityType} images: ${error.message}`);
  return inlineImages;
}

export async function updateCatalogProductImageText(input: {
  imageId: string;
  altEn?: string | null;
  altTh?: string | null;
  actor?: string | null;
}): Promise<CatalogProductImageRow> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('catalog_product_images')
    .update({
      alt_en: cleanText(input.altEn),
      alt_th: cleanText(input.altTh),
      updated_by: cleanText(input.actor),
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.imageId)
    .is('deleted_at', null)
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to update catalog image');
  return data as CatalogProductImageRow;
}

export async function setCatalogProductPrimaryImage(
  imageId: string,
  actor?: string | null
): Promise<CatalogProductImageRow> {
  const supabase = requireSupabase();
  const { data: image, error: loadError } = await supabase
    .from('catalog_product_images')
    .select('*')
    .eq('id', imageId)
    .is('deleted_at', null)
    .single();

  if (loadError || !image) throw new Error(loadError?.message ?? 'Image not found');
  const row = image as CatalogProductImageRow;
  await clearPrimaryImage({
    entityType: row.entity_type,
    entityId: row.entity_id,
    revisionId: row.revision_id,
    actor,
  });

  const { data, error } = await supabase
    .from('catalog_product_images')
    .update({
      is_primary: true,
      updated_by: cleanText(actor),
      updated_at: new Date().toISOString(),
    })
    .eq('id', imageId)
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to set primary image');
  return data as CatalogProductImageRow;
}

export async function moveCatalogProductImage(input: {
  imageId: string;
  direction: 'up' | 'down';
  actor?: string | null;
}): Promise<CatalogProductImageRow[]> {
  const supabase = requireSupabase();
  const { data: image, error: loadError } = await supabase
    .from('catalog_product_images')
    .select('*')
    .eq('id', input.imageId)
    .is('deleted_at', null)
    .single();

  if (loadError || !image) throw new Error(loadError?.message ?? 'Image not found');
  const current = image as CatalogProductImageRow;
  if (!current.entity_id && !current.revision_id) {
    throw new Error('Image is not attached to an entity or draft');
  }

  const rows = current.revision_id
    ? await getCatalogProductImagesForRevision(current.revision_id)
    : await getCatalogProductImagesForEntity(current.entity_type, current.entity_id!);
  const index = rows.findIndex((row) => row.id === input.imageId);
  if (index < 0) throw new Error('Image not found');

  const nextIndex = input.direction === 'up' ? Math.max(0, index - 1) : Math.min(rows.length - 1, index + 1);
  if (nextIndex === index) return rows;

  const reordered = [...rows];
  const [moved] = reordered.splice(index, 1);
  reordered.splice(nextIndex, 0, moved);

  const updates = await Promise.all(
    reordered.map((row, sortOrder) =>
      supabase
        .from('catalog_product_images')
        .update({
          sort_order: sortOrder,
          updated_by: cleanText(input.actor),
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id)
    )
  );
  const updateError = updates.find((result) => result.error)?.error;
  if (updateError) throw new Error(updateError.message);

  if (current.revision_id) {
    return getCatalogProductImagesForRevision(current.revision_id);
  }
  return getCatalogProductImagesForEntity(current.entity_type, current.entity_id!);
}

export async function softDeleteCatalogProductImage(
  imageId: string,
  actor?: string | null
): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from('catalog_product_images')
    .update({
      deleted_at: new Date().toISOString(),
      updated_by: cleanText(actor),
      updated_at: new Date().toISOString(),
    })
    .eq('id', imageId);

  if (error) throw new Error(error.message);
}

export type UpsertCatalogCollectionInput = CatalogRevisionSeoInput & {
  id?: string;
  slug: string;
  placement?: CatalogCollectionPlacement;
  titleEn: string;
  titleTh?: string;
  descriptionEn?: string;
  descriptionTh?: string;
  fallbackMode?: CatalogCollectionFallbackMode;
  isActive?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  sortOrder?: number;
  actor?: string | null;
};

export async function upsertCatalogCollection(
  input: UpsertCatalogCollectionInput
): Promise<CatalogCollectionRow> {
  const supabase = requireSupabase();
  const slug = slugFromName(input.slug || input.titleEn);
  if (!slug) throw new Error('Collection slug is required');

  const { data, error } = await supabase
    .from('catalog_collections')
    .upsert(
      {
        ...(input.id && { id: input.id }),
        slug,
        placement: input.placement ?? 'custom',
        title_en: input.titleEn.trim(),
        title_th: input.titleTh?.trim() ?? '',
        description_en: input.descriptionEn?.trim() ?? '',
        description_th: input.descriptionTh?.trim() ?? '',
        seo_title_en: cleanText(input.seoTitleEn),
        seo_title_th: cleanText(input.seoTitleTh),
        seo_description_en: cleanText(input.seoDescriptionEn),
        seo_description_th: cleanText(input.seoDescriptionTh),
        fallback_mode: input.fallbackMode ?? 'automatic',
        is_active: input.isActive ?? true,
        starts_at: input.startsAt ?? null,
        ends_at: input.endsAt ?? null,
        sort_order: input.sortOrder ?? 0,
        updated_by: cleanText(input.actor),
        ...(!input.id && { created_by: cleanText(input.actor) }),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'slug' }
    )
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to upsert catalog collection');
  return data as CatalogCollectionRow;
}

export type UpsertCatalogCollectionItemInput = {
  collectionId: string;
  entityType: CatalogEntityType;
  entityId: string;
  sortOrder?: number;
  labelEn?: string | null;
  labelTh?: string | null;
  isActive?: boolean;
  metadata?: JsonObject;
};

export async function upsertCatalogCollectionItem(
  input: UpsertCatalogCollectionItemInput
): Promise<CatalogCollectionItemRow> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('catalog_collection_items')
    .upsert(
      {
        collection_id: input.collectionId,
        entity_type: input.entityType,
        entity_id: input.entityId,
        sort_order: input.sortOrder ?? 0,
        label_en: cleanText(input.labelEn),
        label_th: cleanText(input.labelTh),
        is_active: input.isActive ?? true,
        metadata: input.metadata ?? {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'collection_id,entity_type,entity_id' }
    )
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to upsert collection item');
  return data as CatalogCollectionItemRow;
}

export type CreateCatalogAuditEventInput = {
  entityType?: CatalogAuditEntityType | null;
  entityId?: string | null;
  revisionId?: string | null;
  action: string;
  actor?: string | null;
  beforeSummary?: JsonObject | null;
  afterSummary?: JsonObject | null;
  metadata?: JsonObject;
};

export async function createCatalogAuditEvent(
  input: CreateCatalogAuditEventInput
): Promise<CatalogAuditEventRow> {
  const action = input.action.trim();
  if (!action) throw new Error('Audit action is required');

  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('catalog_audit_events')
    .insert({
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      revision_id: input.revisionId ?? null,
      action,
      actor: cleanText(input.actor),
      before_summary: input.beforeSummary ?? null,
      after_summary: input.afterSummary ?? null,
      metadata: input.metadata ?? {},
    })
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to create catalog audit event');
  return data as CatalogAuditEventRow;
}
