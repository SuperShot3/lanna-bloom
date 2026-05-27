'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { convertToWebp, validateProductImage } from '@/lib/adminProductImages';
import {
  getCatalogBouquetByIdForAdmin,
  getCatalogBouquetDetailForAdmin,
  resolveCatalogBouquetId,
} from '@/lib/catalogAdmin';
import {
  bouquetUsesDraftWorkflow,
  publishCatalogDraftRevision,
  resolveCatalogDraftImageContext,
  saveCatalogBouquetDraft,
} from '@/lib/catalogDraft';
import {
  createCatalogProductImage,
  ensureCatalogProductImagesFromInline,
  filterCatalogImagesByVariant,
  getCatalogProductImagesForEntity,
  getCatalogProductImagesForRevision,
  moveCatalogProductImage,
  reorderCatalogProductImages,
  setCatalogProductPrimaryImage,
  softDeleteCatalogProductImage,
  syncCatalogProductInlineImagesFromNormalized,
  updateCatalogProductImageText,
} from '@/lib/catalogCms';
import type { DeliveryDestinationId } from '@/lib/delivery/markets';
import {
  pricingPayloadForSave,
  type CatalogSizePricingRow,
  type CatalogStemPricingRow,
  type PricingType,
} from '@/lib/catalog/pricing';
import { buildCatalogImageRecord, uploadBufferToCatalog } from '@/lib/catalog/storage';
import { revalidateCatalogCacheAfterSupabaseWrite } from '@/lib/catalogRouting';
import {
  deleteCatalogBouquet,
  updateCatalogBouquetByAdmin,
  updateCatalogBouquetStatus,
  type UpdateCatalogBouquetByAdminInput,
} from '@/lib/catalogWrite';
import { canChangeStatus } from '@/lib/adminRbac';
import { getSupabaseAdmin } from '@/lib/supabase/server';

async function resolveBouquetIdForWrite(bouquetId: string): Promise<string> {
  const resolved = await resolveCatalogBouquetId(bouquetId);
  if (!resolved) throw new Error('Bouquet not found');
  return resolved;
}

function actorFromSessionUser(user: { email?: string | null }): string | null {
  return user.email?.trim() || null;
}

function revalidateBouquetAdminPaths(bouquetId: string): void {
  revalidatePath('/admin/products');
  revalidatePath(`/admin/products/bouquet/${bouquetId}`);
  revalidatePath(`/admin/products/review/${bouquetId}`);
}

async function revalidateBouquetCatalogPaths(writeId: string): Promise<void> {
  const bouquet = await getCatalogBouquetByIdForAdmin(writeId);
  revalidatePath('/en/catalog', 'layout');
  revalidatePath('/th/catalog', 'layout');
  if (bouquet?.slug) {
    revalidatePath(`/en/catalog/${bouquet.slug}`);
    revalidatePath(`/th/catalog/${bouquet.slug}`);
  }
  revalidateCatalogCacheAfterSupabaseWrite();
}

async function revalidateBouquetAdminAndCatalogPaths(
  bouquetId: string,
  writeId: string
): Promise<void> {
  revalidateBouquetAdminPaths(bouquetId);
  await revalidateBouquetCatalogPaths(writeId);
}

async function requireBouquetImageForWrite(
  bouquetId: string,
  imageId: string
): Promise<{ writeId: string; revisionId: string | null }> {
  const writeId = await resolveBouquetIdForWrite(bouquetId);
  const bouquet = await getCatalogBouquetByIdForAdmin(writeId);
  if (!bouquet) throw new Error('Bouquet not found');
  const usesDraft = bouquetUsesDraftWorkflow(bouquet.status ?? 'pending_review');
  const { revisionId } = await resolveCatalogDraftImageContext({
    entityType: 'bouquet',
    entityId: writeId,
    usesDraft,
    actor: null,
  });
  const images = revisionId
    ? await getCatalogProductImagesForRevision(revisionId)
    : await getCatalogProductImagesForEntity('bouquet', writeId);
  if (!images.some((image) => image.id === imageId)) {
    throw new Error('Image not found for this bouquet');
  }
  return { writeId, revisionId };
}

function parseCommaList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseJsonArray<T>(value: string): T[] | undefined {
  if (!value.trim()) return undefined;
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : undefined;
  } catch {
    return undefined;
  }
}

const PRICING_TYPES = new Set<PricingType>(['single_price', 'size_based', 'stem_count']);

export async function updateBouquetByAdminAction(formData: FormData): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user) return { error: 'Unauthorized - Session not found' };
  if (!canChangeStatus((session.user as { role?: string }).role)) {
    return { error: 'Forbidden' };
  }

  const bouquetId = String(formData.get('bouquetId') || '').trim();
  if (!bouquetId) return { error: 'Missing bouquetId' };

  const input: UpdateCatalogBouquetByAdminInput = {
    nameEn: String(formData.get('nameEn') ?? ''),
    nameTh: String(formData.get('nameTh') ?? ''),
    descriptionEn: String(formData.get('descriptionEn') ?? ''),
    descriptionTh: String(formData.get('descriptionTh') ?? ''),
    compositionEn: String(formData.get('compositionEn') ?? ''),
    compositionTh: String(formData.get('compositionTh') ?? ''),
    featuredPopular: formData.get('featuredPopular') === 'true',
    colors: parseCommaList(String(formData.get('colors') ?? '')),
    flowerTypes: parseCommaList(String(formData.get('flowerTypes') ?? '')),
    occasion: parseCommaList(String(formData.get('occasion') ?? '')),
    presentationFormats: parseCommaList(String(formData.get('presentationFormats') ?? '')),
    deliveryOptions: parseCommaList(String(formData.get('deliveryOptions') ?? '')),
  };

  const pricingTypeRaw = String(formData.get('pricingType') ?? '').trim() as PricingType;
  if (!PRICING_TYPES.has(pricingTypeRaw)) {
    return { error: 'Invalid pricing type' };
  }

  const singlePriceRaw = String(formData.get('singlePrice') ?? '').trim();
  const singlePrice = Number(singlePriceRaw);
  const sizeRows = parseJsonArray<CatalogSizePricingRow>(String(formData.get('sizeRows') ?? '')) ?? [];
  const stemOptions =
    parseJsonArray<CatalogStemPricingRow>(String(formData.get('stemOptions') ?? '')) ?? [];

  if (pricingTypeRaw === 'single_price') {
    if (!Number.isFinite(singlePrice) || singlePrice < 0) {
      return { error: 'Single price is required' };
    }
  } else if (pricingTypeRaw === 'size_based') {
    const enabled = sizeRows.filter((r) => r.enabled && (r.price ?? 0) >= 0);
    if (!enabled.length) {
      return { error: 'Enable at least one size with a price' };
    }
  } else if (pricingTypeRaw === 'stem_count') {
    if (!stemOptions.length || stemOptions.some((t) => !t.stemCount || t.stemCount < 1)) {
      return { error: 'Add at least one valid stem tier' };
    }
  }

  input.pricingType = pricingTypeRaw;
  input.pricing = pricingPayloadForSave(pricingTypeRaw, {
    singlePrice: Number.isFinite(singlePrice) ? singlePrice : undefined,
    sizes: sizeRows,
    stemOptions,
  });

  const excludedRaw = String(formData.get('excludedDeliveryDestinations') ?? '').trim();
  if (excludedRaw) {
    const excluded = parseJsonArray<DeliveryDestinationId>(excludedRaw);
    if (excluded) input.excludedDeliveryDestinations = excluded;
  }

  const discountRaw = String(formData.get('discountPercent') ?? '').trim();
  if (discountRaw === '') {
    input.discountPercent = null;
  } else {
    const discountPercent = Number(discountRaw);
    if (!Number.isNaN(discountPercent)) {
      input.discountPercent = discountPercent;
    }
  }

  try {
    const writeId = await resolveBouquetIdForWrite(bouquetId);
    const detail = await getCatalogBouquetDetailForAdmin(writeId);
    if (!detail) return { error: 'Bouquet not found' };

    const actor = actorFromSessionUser(session.user);

    if (bouquetUsesDraftWorkflow(detail.status)) {
      await saveCatalogBouquetDraft({
        entityId: writeId,
        actor,
        payload: {
          nameEn: input.nameEn,
          nameTh: input.nameTh,
          descriptionEn: input.descriptionEn,
          descriptionTh: input.descriptionTh,
          compositionEn: input.compositionEn,
          compositionTh: input.compositionTh,
          featuredPopular: input.featuredPopular,
          colors: input.colors,
          flowerTypes: input.flowerTypes,
          occasion: input.occasion,
          presentationFormats: input.presentationFormats,
          deliveryOptions: input.deliveryOptions,
          excludedDeliveryDestinations: input.excludedDeliveryDestinations,
          pricingType: input.pricingType,
          pricing: input.pricing as Record<string, unknown> | undefined,
          discountPercent: input.discountPercent,
        },
      });
      revalidateBouquetAdminPaths(bouquetId);
      return {};
    }

    await updateCatalogBouquetByAdmin(writeId, input);
    await revalidateBouquetAdminAndCatalogPaths(bouquetId, writeId);
    return {};
  } catch (err) {
    console.error('[Products] updateBouquetByAdmin failed:', err);
    return { error: err instanceof Error ? err.message : 'Failed' };
  }
}

export async function publishBouquetDraftAction(
  bouquetId: string,
  revisionId: string
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user) return { error: 'Unauthorized - Session not found' };
  if (!canChangeStatus((session.user as { role?: string }).role)) {
    return { error: 'Forbidden' };
  }
  const cleanRevisionId = revisionId.trim();
  if (!cleanRevisionId) return { error: 'Missing revisionId' };

  try {
    const writeId = await resolveBouquetIdForWrite(bouquetId);
    const { entityId } = await publishCatalogDraftRevision({
      revisionId: cleanRevisionId,
      actor: actorFromSessionUser(session.user),
    });
    if (entityId !== writeId) return { error: 'Revision does not match this bouquet' };
    revalidateBouquetAdminPaths(bouquetId);
    await revalidateBouquetCatalogPaths(writeId);
    return {};
  } catch (err) {
    console.error('[Products] publishBouquetDraft failed:', err);
    return { error: err instanceof Error ? err.message : 'Failed to publish' };
  }
}

export async function uploadBouquetImageAction(formData: FormData): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user) return { error: 'Unauthorized - Session not found' };
  if (!canChangeStatus((session.user as { role?: string }).role)) {
    return { error: 'Forbidden' };
  }

  const bouquetId = String(formData.get('bouquetId') || '').trim();
  const file = formData.get('file');
  const altEn = String(formData.get('altEn') || '').trim();
  const altTh = String(formData.get('altTh') || '').trim();
  const variantKey = String(formData.get('variantKey') || '').trim() || null;
  if (!bouquetId) return { error: 'Missing bouquetId' };
  if (!file || !(file instanceof File)) return { error: 'Image file is required' };

  try {
    const writeId = await resolveBouquetIdForWrite(bouquetId);
    const bouquet = await getCatalogBouquetByIdForAdmin(writeId);
    if (!bouquet) return { error: 'Bouquet not found' };
    const usesDraft = bouquetUsesDraftWorkflow(bouquet.status ?? 'pending_review');
    const actor = actorFromSessionUser(session.user);
    const { revisionId } = await resolveCatalogDraftImageContext({
      entityType: 'bouquet',
      entityId: writeId,
      usesDraft,
      actor,
    });
    const allImages = revisionId
      ? await getCatalogProductImagesForRevision(revisionId)
      : await ensureCatalogProductImagesFromInline('bouquet', writeId);
    const existingImages = filterCatalogImagesByVariant(allImages, variantKey);
    await validateProductImage(file);
    const webp = await convertToWebp(file);
    const supabase = getSupabaseAdmin();
    if (!supabase) return { error: 'Catalog writes are not configured' };

    const storagePath = `bouquets/${writeId}/cms-${Date.now()}.webp`;
    const buffer = Buffer.from(await webp.arrayBuffer());
    await uploadBufferToCatalog(supabase, storagePath, buffer, 'image/webp');
    const record = buildCatalogImageRecord(supabase, storagePath, {
      format: 'webp',
      is_primary: existingImages.length === 0,
      alt: altEn || undefined,
      sort_order: existingImages.length,
    });

    await createCatalogProductImage({
      entityType: 'bouquet',
      entityId: revisionId ? null : writeId,
      revisionId,
      storagePath: record.storage_path,
      publicUrl: record.public_url,
      sourceType: 'uploaded',
      altEn: altEn || 'Bouquet image',
      altTh,
      isPrimary: !variantKey && existingImages.length === 0,
      sortOrder: existingImages.length,
      metadata: {
        format: 'webp',
        ...(variantKey ? { variant_key: variantKey } : {}),
      },
      actor,
    });
    if (revisionId) {
      revalidateBouquetAdminPaths(bouquetId);
    } else {
      await syncCatalogProductInlineImagesFromNormalized('bouquet', writeId);
      await revalidateBouquetAdminAndCatalogPaths(bouquetId, writeId);
    }
    return {};
  } catch (err) {
    console.error('[Products] uploadBouquetImage failed:', err);
    return { error: err instanceof Error ? err.message : 'Failed to upload image' };
  }
}

export async function updateBouquetImageAltAction(formData: FormData): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user) return { error: 'Unauthorized - Session not found' };
  if (!canChangeStatus((session.user as { role?: string }).role)) {
    return { error: 'Forbidden' };
  }

  const bouquetId = String(formData.get('bouquetId') || '').trim();
  const imageId = String(formData.get('imageId') || '').trim();
  if (!bouquetId || !imageId) return { error: 'Missing bouquetId or imageId' };

  try {
    const { writeId, revisionId } = await requireBouquetImageForWrite(bouquetId, imageId);
    await updateCatalogProductImageText({
      imageId,
      altEn: String(formData.get('altEn') || ''),
      altTh: String(formData.get('altTh') || ''),
      actor: actorFromSessionUser(session.user),
    });
    if (revisionId) {
      revalidateBouquetAdminPaths(bouquetId);
    } else {
      await syncCatalogProductInlineImagesFromNormalized('bouquet', writeId);
      await revalidateBouquetAdminAndCatalogPaths(bouquetId, writeId);
    }
    return {};
  } catch (err) {
    console.error('[Products] updateBouquetImageAlt failed:', err);
    return { error: err instanceof Error ? err.message : 'Failed to update image alt text' };
  }
}

export async function setPrimaryBouquetImageAction(
  bouquetId: string,
  imageId: string
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user) return { error: 'Unauthorized - Session not found' };
  if (!canChangeStatus((session.user as { role?: string }).role)) {
    return { error: 'Forbidden' };
  }

  try {
    const { writeId, revisionId } = await requireBouquetImageForWrite(bouquetId, imageId);
    await setCatalogProductPrimaryImage(imageId, actorFromSessionUser(session.user));
    if (revisionId) {
      revalidateBouquetAdminPaths(bouquetId);
    } else {
      await syncCatalogProductInlineImagesFromNormalized('bouquet', writeId);
      await revalidateBouquetAdminAndCatalogPaths(bouquetId, writeId);
    }
    return {};
  } catch (err) {
    console.error('[Products] setPrimaryBouquetImage failed:', err);
    return { error: err instanceof Error ? err.message : 'Failed to set primary image' };
  }
}

export async function reorderBouquetImagesAction(
  bouquetId: string,
  orderedIds: string[],
  variantKey?: string | null
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user) return { error: 'Unauthorized - Session not found' };
  if (!canChangeStatus((session.user as { role?: string }).role)) {
    return { error: 'Forbidden' };
  }

  try {
    const writeId = await resolveBouquetIdForWrite(bouquetId);
    const bouquet = await getCatalogBouquetByIdForAdmin(writeId);
    if (!bouquet) return { error: 'Bouquet not found' };
    const usesDraft = bouquetUsesDraftWorkflow(bouquet.status ?? 'pending_review');
    const { revisionId } = await resolveCatalogDraftImageContext({
      entityType: 'bouquet',
      entityId: writeId,
      usesDraft,
      actor: actorFromSessionUser(session.user),
    });
    await reorderCatalogProductImages({
      entityType: 'bouquet',
      entityId: revisionId ? undefined : writeId,
      revisionId,
      orderedIds,
      variantKey: variantKey ?? null,
      actor: actorFromSessionUser(session.user),
    });
    if (revisionId) {
      revalidateBouquetAdminPaths(bouquetId);
    } else {
      await syncCatalogProductInlineImagesFromNormalized('bouquet', writeId);
      await revalidateBouquetAdminAndCatalogPaths(bouquetId, writeId);
    }
    return {};
  } catch (err) {
    console.error('[Products] reorderBouquetImages failed:', err);
    return { error: err instanceof Error ? err.message : 'Failed to reorder images' };
  }
}

export async function moveBouquetImageAction(
  bouquetId: string,
  imageId: string,
  direction: 'up' | 'down'
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user) return { error: 'Unauthorized - Session not found' };
  if (!canChangeStatus((session.user as { role?: string }).role)) {
    return { error: 'Forbidden' };
  }

  try {
    const { writeId, revisionId } = await requireBouquetImageForWrite(bouquetId, imageId);
    await moveCatalogProductImage({
      imageId,
      direction,
      actor: actorFromSessionUser(session.user),
    });
    if (revisionId) {
      revalidateBouquetAdminPaths(bouquetId);
    } else {
      await syncCatalogProductInlineImagesFromNormalized('bouquet', writeId);
      await revalidateBouquetAdminAndCatalogPaths(bouquetId, writeId);
    }
    return {};
  } catch (err) {
    console.error('[Products] moveBouquetImage failed:', err);
    return { error: err instanceof Error ? err.message : 'Failed to reorder image' };
  }
}

export async function deleteBouquetImageAction(
  bouquetId: string,
  imageId: string
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user) return { error: 'Unauthorized - Session not found' };
  if (!canChangeStatus((session.user as { role?: string }).role)) {
    return { error: 'Forbidden' };
  }

  try {
    const { writeId, revisionId } = await requireBouquetImageForWrite(bouquetId, imageId);
    const actor = actorFromSessionUser(session.user);
    await softDeleteCatalogProductImage(imageId, actor);
    if (revisionId) {
      const remaining = await getCatalogProductImagesForRevision(revisionId);
      if (remaining.length > 0 && !remaining.some((image) => image.is_primary)) {
        await setCatalogProductPrimaryImage(remaining[0].id, actor);
      }
      revalidateBouquetAdminPaths(bouquetId);
    } else {
      const remaining = await syncCatalogProductInlineImagesFromNormalized('bouquet', writeId);
      if (remaining.length > 0 && !remaining.some((image) => image.is_primary)) {
        const first = (await getCatalogProductImagesForEntity('bouquet', writeId))[0];
        if (first) {
          await setCatalogProductPrimaryImage(first.id, actor);
          await syncCatalogProductInlineImagesFromNormalized('bouquet', writeId);
        }
      }
      await revalidateBouquetAdminAndCatalogPaths(bouquetId, writeId);
    }
    return {};
  } catch (err) {
    console.error('[Products] deleteBouquetImage failed:', err);
    return { error: err instanceof Error ? err.message : 'Failed to delete image' };
  }
}

export async function approveBouquetFromStudioAction(
  bouquetId: string
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user) return { error: 'Unauthorized - Session not found' };
  if (!canChangeStatus((session.user as { role?: string }).role)) {
    return { error: 'Forbidden' };
  }

  try {
    const writeId = await resolveBouquetIdForWrite(bouquetId);
    await updateCatalogBouquetStatus(writeId, 'approved', {
      approvedBy: (session.user as { email?: string | null }).email ?? undefined,
      approvedAt: new Date().toISOString(),
    });
    await revalidateBouquetAdminAndCatalogPaths(bouquetId, writeId);
    return {};
  } catch (err) {
    console.error('[Products] approveBouquet failed:', err);
    return { error: err instanceof Error ? err.message : 'Failed' };
  }
}

export async function deleteBouquetFromStudioAction(
  bouquetId: string
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user) return { error: 'Unauthorized - Session not found' };
  if (!canChangeStatus((session.user as { role?: string }).role)) {
    return { error: 'Forbidden' };
  }

  try {
    const writeId = await resolveBouquetIdForWrite(bouquetId);
    const bouquet = await getCatalogBouquetByIdForAdmin(writeId);
    await deleteCatalogBouquet(writeId);
    revalidatePath('/admin/products');
    revalidatePath(`/admin/products/bouquet/${bouquetId}`);
    revalidatePath(`/admin/products/review/${bouquetId}`);
    revalidatePath('/en/catalog', 'layout');
    revalidatePath('/th/catalog', 'layout');
    if (bouquet?.slug) {
      revalidatePath(`/en/catalog/${bouquet.slug}`);
      revalidatePath(`/th/catalog/${bouquet.slug}`);
    }
    revalidateCatalogCacheAfterSupabaseWrite();
    return {};
  } catch (err) {
    console.error('[Products] deleteBouquet failed:', err);
    return { error: err instanceof Error ? err.message : 'Failed to delete bouquet' };
  }
}
