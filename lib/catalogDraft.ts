/**
 * Server-only draft / publish workflow for live catalog entities.
 * Storefront reads catalog_bouquets / catalog_products (published). Admin edits
 * save to catalog_product_revisions until explicitly published.
 */
import 'server-only';

import {
  createCatalogAuditEvent,
  createCatalogRevision,
  getCatalogProductImagesForEntity,
  syncCatalogProductInlineImagesFromNormalized,
  updateCatalogRevisionStatus,
} from '@/lib/catalogCms';
import type { CatalogEntityType, CatalogProductRevisionRow } from '@/lib/catalog/types';
import {
  updateCatalogBouquetByAdmin,
  updateCatalogProductByAdmin,
  type UpdateCatalogBouquetByAdminInput,
  type UpdateCatalogProductByAdminInput,
} from '@/lib/catalogWrite';
import { getSupabaseAdmin } from '@/lib/supabase/server';

const ACTIVE_DRAFT_STATUSES = ['draft', 'needs_changes', 'pending_review', 'approved'] as const;

export type CatalogDraftSummary = {
  revisionId: string;
  status: string;
  updatedAt: string;
};

export type CatalogProductDraftPayload = {
  nameEn?: string;
  nameTh?: string;
  descriptionEn?: string;
  descriptionTh?: string;
  price?: number;
  occasion?: string[];
  excludedDeliveryDestinations?: string[];
};

export type CatalogBouquetDraftPayload = {
  nameEn?: string;
  nameTh?: string;
  descriptionEn?: string;
  descriptionTh?: string;
  compositionEn?: string;
  compositionTh?: string;
  featuredPopular?: boolean;
  colors?: string[];
  flowerTypes?: string[];
  occasion?: string[];
  presentationFormats?: string[];
  deliveryOptions?: string[];
  excludedDeliveryDestinations?: string[];
  pricingType?: string;
  pricing?: Record<string, unknown>;
  discountPercent?: number | null;
};

function requireSupabase() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return supabase;
}

export function productUsesDraftWorkflow(moderationStatus: string): boolean {
  return moderationStatus === 'live';
}

export function bouquetUsesDraftWorkflow(status: string): boolean {
  return status === 'approved';
}

export async function getActiveCatalogDraft(
  entityType: CatalogEntityType,
  entityId: string
): Promise<CatalogProductRevisionRow | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('catalog_product_revisions')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .in('status', [...ACTIVE_DRAFT_STATUSES])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as CatalogProductRevisionRow) ?? null;
}

export async function getCatalogDraftSummaries(
  entityType: CatalogEntityType,
  entityIds: string[]
): Promise<Map<string, CatalogDraftSummary>> {
  const map = new Map<string, CatalogDraftSummary>();
  if (!entityIds.length) return map;

  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('catalog_product_revisions')
    .select('id, entity_id, status, updated_at')
    .eq('entity_type', entityType)
    .in('entity_id', entityIds)
    .in('status', [...ACTIVE_DRAFT_STATUSES])
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    const entityId = row.entity_id as string | null;
    if (!entityId || map.has(entityId)) continue;
    map.set(entityId, {
      revisionId: row.id as string,
      status: row.status as string,
      updatedAt: row.updated_at as string,
    });
  }
  return map;
}

async function cloneLiveImagesToRevision(
  entityType: CatalogEntityType,
  entityId: string,
  revisionId: string,
  actor?: string | null
): Promise<void> {
  const supabase = requireSupabase();
  const liveImages = await getCatalogProductImagesForEntity(entityType, entityId);
  if (!liveImages.length) return;

  const { data: existing } = await supabase
    .from('catalog_product_images')
    .select('id')
    .eq('revision_id', revisionId)
    .is('deleted_at', null)
    .limit(1);

  if (existing?.length) return;

  const now = new Date().toISOString();
  const rows = liveImages.map((image) => ({
    entity_type: entityType,
    entity_id: null,
    revision_id: revisionId,
    storage_path: image.storage_path,
    public_url: image.public_url,
    source_type: image.source_type,
    original_image_id: image.id,
    alt_en: image.alt_en,
    alt_th: image.alt_th,
    is_primary: image.is_primary,
    sort_order: image.sort_order,
    metadata: image.metadata ?? {},
    created_by: actor ?? image.created_by,
    updated_by: actor ?? image.updated_by,
    created_at: now,
    updated_at: now,
  }));

  const { error } = await supabase.from('catalog_product_images').insert(rows);
  if (error) throw new Error(`Failed to clone images to draft: ${error.message}`);
}

export async function getOrCreateActiveCatalogDraft(input: {
  entityType: CatalogEntityType;
  entityId: string;
  actor?: string | null;
  seedPayload?: Record<string, unknown>;
}): Promise<CatalogProductRevisionRow> {
  const existing = await getActiveCatalogDraft(input.entityType, input.entityId);
  if (existing) return existing;

  const revision = await createCatalogRevision({
    entityType: input.entityType,
    entityId: input.entityId,
    status: 'draft',
    payload: input.seedPayload ?? {},
    actor: input.actor,
  });

  await cloneLiveImagesToRevision(input.entityType, input.entityId, revision.id, input.actor);
  return revision;
}

export async function saveCatalogProductDraft(input: {
  entityId: string;
  payload: CatalogProductDraftPayload;
  actor?: string | null;
}): Promise<CatalogProductRevisionRow> {
  const revision = await getOrCreateActiveCatalogDraft({
    entityType: 'product',
    entityId: input.entityId,
    actor: input.actor,
    seedPayload: {},
  });

  const supabase = requireSupabase();
  const merged = {
    ...(revision.payload ?? {}),
    ...input.payload,
  };
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('catalog_product_revisions')
    .update({
      payload: merged,
      status: 'draft',
      edited_by: input.actor?.trim() || revision.edited_by,
      updated_at: now,
    })
    .eq('id', revision.id)
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to save product draft');

  await createCatalogAuditEvent({
    entityType: 'product',
    entityId: input.entityId,
    revisionId: revision.id,
    action: 'draft_saved',
    actor: input.actor,
    afterSummary: merged,
  });

  return data as CatalogProductRevisionRow;
}

export async function saveCatalogBouquetDraft(input: {
  entityId: string;
  payload: CatalogBouquetDraftPayload;
  actor?: string | null;
}): Promise<CatalogProductRevisionRow> {
  const revision = await getOrCreateActiveCatalogDraft({
    entityType: 'bouquet',
    entityId: input.entityId,
    actor: input.actor,
    seedPayload: {},
  });

  const supabase = requireSupabase();
  const merged = {
    ...(revision.payload ?? {}),
    ...input.payload,
  };
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('catalog_product_revisions')
    .update({
      payload: merged,
      status: 'draft',
      edited_by: input.actor?.trim() || revision.edited_by,
      updated_at: now,
    })
    .eq('id', revision.id)
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to save bouquet draft');

  await createCatalogAuditEvent({
    entityType: 'bouquet',
    entityId: input.entityId,
    revisionId: revision.id,
    action: 'draft_saved',
    actor: input.actor,
    afterSummary: merged,
  });

  return data as CatalogProductRevisionRow;
}

async function promoteRevisionImagesToLive(
  entityType: CatalogEntityType,
  entityId: string,
  revisionId: string,
  actor?: string | null
): Promise<void> {
  const supabase = requireSupabase();
  const now = new Date().toISOString();

  const { error: softDeleteError } = await supabase
    .from('catalog_product_images')
    .update({
      deleted_at: now,
      updated_by: actor?.trim() || null,
      updated_at: now,
    })
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .is('revision_id', null)
    .is('deleted_at', null);

  if (softDeleteError) throw new Error(softDeleteError.message);

  const { data: draftImages, error: loadError } = await supabase
    .from('catalog_product_images')
    .select('*')
    .eq('revision_id', revisionId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true });

  if (loadError) throw new Error(loadError.message);
  if (!draftImages?.length) return;

  const rows = draftImages.map((image) => ({
    entity_type: entityType,
    entity_id: entityId,
    revision_id: null,
    storage_path: image.storage_path,
    public_url: image.public_url,
    source_type: image.source_type,
    original_image_id: image.original_image_id,
    alt_en: image.alt_en,
    alt_th: image.alt_th,
    is_primary: image.is_primary,
    sort_order: image.sort_order,
    metadata: image.metadata ?? {},
    created_by: actor ?? image.created_by,
    updated_by: actor ?? image.updated_by,
    created_at: now,
    updated_at: now,
  }));

  const { error: insertError } = await supabase.from('catalog_product_images').insert(rows);
  if (insertError) throw new Error(insertError.message);

  await syncCatalogProductInlineImagesFromNormalized(entityType, entityId);
}

function parseProductDraftPayload(payload: Record<string, unknown>): UpdateCatalogProductByAdminInput {
  const input: UpdateCatalogProductByAdminInput = {};
  if (typeof payload.nameEn === 'string') input.nameEn = payload.nameEn;
  if (typeof payload.nameTh === 'string') input.nameTh = payload.nameTh;
  if (typeof payload.descriptionEn === 'string') input.descriptionEn = payload.descriptionEn;
  if (typeof payload.descriptionTh === 'string') input.descriptionTh = payload.descriptionTh;
  if (typeof payload.price === 'number' && Number.isFinite(payload.price)) {
    input.price = payload.price;
  }
  if (Array.isArray(payload.occasion)) {
    input.occasion = payload.occasion.map((v) => String(v)).filter(Boolean);
  }
  if (Array.isArray(payload.excludedDeliveryDestinations)) {
    input.excludedDeliveryDestinations = payload.excludedDeliveryDestinations as UpdateCatalogProductByAdminInput['excludedDeliveryDestinations'];
  }
  return input;
}

function parseBouquetDraftPayload(payload: Record<string, unknown>): UpdateCatalogBouquetByAdminInput {
  const input: UpdateCatalogBouquetByAdminInput = {};
  if (typeof payload.nameEn === 'string') input.nameEn = payload.nameEn;
  if (typeof payload.nameTh === 'string') input.nameTh = payload.nameTh;
  if (typeof payload.descriptionEn === 'string') input.descriptionEn = payload.descriptionEn;
  if (typeof payload.descriptionTh === 'string') input.descriptionTh = payload.descriptionTh;
  if (typeof payload.compositionEn === 'string') input.compositionEn = payload.compositionEn;
  if (typeof payload.compositionTh === 'string') input.compositionTh = payload.compositionTh;
  if (typeof payload.featuredPopular === 'boolean') input.featuredPopular = payload.featuredPopular;
  if (Array.isArray(payload.colors)) input.colors = payload.colors.map((v) => String(v)).filter(Boolean);
  if (Array.isArray(payload.flowerTypes)) {
    input.flowerTypes = payload.flowerTypes.map((v) => String(v)).filter(Boolean);
  }
  if (Array.isArray(payload.occasion)) {
    input.occasion = payload.occasion.map((v) => String(v)).filter(Boolean);
  }
  if (Array.isArray(payload.presentationFormats)) {
    input.presentationFormats = payload.presentationFormats.map((v) => String(v)).filter(Boolean);
  }
  if (Array.isArray(payload.deliveryOptions)) {
    input.deliveryOptions = payload.deliveryOptions.map((v) => String(v)).filter(Boolean);
  }
  if (Array.isArray(payload.excludedDeliveryDestinations)) {
    input.excludedDeliveryDestinations = payload.excludedDeliveryDestinations as UpdateCatalogBouquetByAdminInput['excludedDeliveryDestinations'];
  }
  if (typeof payload.pricingType === 'string') {
    input.pricingType = payload.pricingType as UpdateCatalogBouquetByAdminInput['pricingType'];
  }
  if (payload.pricing && typeof payload.pricing === 'object') {
    input.pricing = payload.pricing as UpdateCatalogBouquetByAdminInput['pricing'];
  }
  if (payload.discountPercent === null || typeof payload.discountPercent === 'number') {
    input.discountPercent = payload.discountPercent;
  }
  return input;
}

export async function publishCatalogDraftRevision(input: {
  revisionId: string;
  actor?: string | null;
}): Promise<{ entityType: CatalogEntityType; entityId: string }> {
  const supabase = requireSupabase();
  const { data: revision, error } = await supabase
    .from('catalog_product_revisions')
    .select('*')
    .eq('id', input.revisionId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!revision) throw new Error('Draft revision not found');

  const row = revision as CatalogProductRevisionRow;
  if (!row.entity_id) throw new Error('Cannot publish a revision without an entity');
  if (!ACTIVE_DRAFT_STATUSES.includes(row.status as (typeof ACTIVE_DRAFT_STATUSES)[number])) {
    throw new Error('This revision is not in a publishable draft state');
  }

  const entityType = row.entity_type;
  const entityId = row.entity_id;
  const payload = (row.payload ?? {}) as Record<string, unknown>;

  if (entityType === 'product') {
    await updateCatalogProductByAdmin(entityId, parseProductDraftPayload(payload));
  } else {
    await updateCatalogBouquetByAdmin(entityId, parseBouquetDraftPayload(payload));
  }

  await promoteRevisionImagesToLive(entityType, entityId, row.id, input.actor);
  await updateCatalogRevisionStatus({
    revisionId: row.id,
    status: 'published',
    actor: input.actor,
  });

  await createCatalogAuditEvent({
    entityType,
    entityId,
    revisionId: row.id,
    action: 'draft_published',
    actor: input.actor,
    afterSummary: payload,
  });

  return { entityType, entityId };
}

export async function resolveCatalogDraftImageContext(input: {
  entityType: CatalogEntityType;
  entityId: string;
  usesDraft: boolean;
  actor?: string | null;
}): Promise<{ revisionId: string | null; writeEntityId: string }> {
  if (!input.usesDraft) {
    return { revisionId: null, writeEntityId: input.entityId };
  }
  const draft = await getOrCreateActiveCatalogDraft({
    entityType: input.entityType,
    entityId: input.entityId,
    actor: input.actor,
  });
  return { revisionId: draft.id, writeEntityId: input.entityId };
}

export function applyProductDraftToDetail<T extends Record<string, unknown>>(
  published: T,
  draft: CatalogProductRevisionRow | null
): T & { hasDraft: boolean; draftRevisionId?: string; draftUpdatedAt?: string } {
  if (!draft?.payload || typeof draft.payload !== 'object') {
    return { ...published, hasDraft: false };
  }
  const p = draft.payload as CatalogProductDraftPayload;
  return {
    ...published,
    hasDraft: true,
    draftRevisionId: draft.id,
    draftUpdatedAt: draft.updated_at,
    ...(typeof p.nameEn === 'string' && { nameEn: p.nameEn }),
    ...(typeof p.nameTh === 'string' && { nameTh: p.nameTh }),
    ...(typeof p.descriptionEn === 'string' && { descriptionEn: p.descriptionEn }),
    ...(typeof p.descriptionTh === 'string' && { descriptionTh: p.descriptionTh }),
    ...(typeof p.price === 'number' && { price: p.price }),
    ...(Array.isArray(p.occasion) && { occasion: p.occasion.join(', ') }),
    ...(Array.isArray(p.excludedDeliveryDestinations) && {
      excludedDeliveryDestinations: p.excludedDeliveryDestinations,
    }),
  };
}

export function applyBouquetDraftToDetail<T extends Record<string, unknown>>(
  published: T,
  draft: CatalogProductRevisionRow | null
): T & { hasDraft: boolean; draftRevisionId?: string; draftUpdatedAt?: string } {
  if (!draft?.payload || typeof draft.payload !== 'object') {
    return { ...published, hasDraft: false };
  }
  const p = draft.payload as CatalogBouquetDraftPayload;
  return {
    ...published,
    hasDraft: true,
    draftRevisionId: draft.id,
    draftUpdatedAt: draft.updated_at,
    ...(typeof p.nameEn === 'string' && { nameEn: p.nameEn }),
    ...(typeof p.nameTh === 'string' && { nameTh: p.nameTh }),
    ...(typeof p.descriptionEn === 'string' && { descriptionEn: p.descriptionEn }),
    ...(typeof p.descriptionTh === 'string' && { descriptionTh: p.descriptionTh }),
    ...(typeof p.compositionEn === 'string' && { compositionEn: p.compositionEn }),
    ...(typeof p.compositionTh === 'string' && { compositionTh: p.compositionTh }),
    ...(typeof p.featuredPopular === 'boolean' && { featuredPopular: p.featuredPopular }),
    ...(Array.isArray(p.colors) && { colors: p.colors }),
    ...(Array.isArray(p.flowerTypes) && { flowerTypes: p.flowerTypes }),
    ...(Array.isArray(p.occasion) && { occasion: p.occasion }),
    ...(Array.isArray(p.presentationFormats) && { presentationFormats: p.presentationFormats }),
    ...(Array.isArray(p.deliveryOptions) && { deliveryOptions: p.deliveryOptions }),
    ...(Array.isArray(p.excludedDeliveryDestinations) && {
      excludedDeliveryDestinations: p.excludedDeliveryDestinations,
    }),
    ...(typeof p.pricingType === 'string' && { pricingType: p.pricingType }),
    ...(p.pricing && typeof p.pricing === 'object' && { pricing: p.pricing }),
    ...(p.discountPercent === null || typeof p.discountPercent === 'number'
      ? { discountPercent: p.discountPercent }
      : {}),
  };
}
