'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { convertToWebp, validateProductImage } from '@/lib/adminProductImages';
import {
  getCatalogBouquetByIdForAdmin,
  getCatalogProductByIdForAdmin,
  resolveCatalogBouquetId,
  resolveCatalogProductId,
} from '@/lib/catalogAdmin';
import {
  publishCatalogDraftRevision,
  productUsesDraftWorkflow,
  resolveCatalogDraftImageContext,
  saveCatalogProductDraft,
} from '@/lib/catalogDraft';
import {
  createCatalogProductImage,
  ensureCatalogProductImagesFromInline,
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
import { buildCatalogImageRecord, uploadBufferToCatalog } from '@/lib/catalog/storage';
import { revalidateCatalogCacheAfterSupabaseWrite } from '@/lib/catalogRouting';
import {
  deleteCatalogBouquet,
  deleteCatalogProduct,
  updateCatalogBouquetStatus,
  updateCatalogProductByAdmin,
  updateCatalogProductCommission,
  updateCatalogProductModerationStatus,
} from '@/lib/catalogWrite';
import { canChangeStatus } from '@/lib/adminRbac';
import { getSupabaseAdmin } from '@/lib/supabase/server';

async function resolveBouquetIdForWrite(bouquetId: string): Promise<string> {
  const resolved = await resolveCatalogBouquetId(bouquetId);
  if (!resolved) throw new Error('Bouquet not found');
  return resolved;
}

async function resolveProductIdForWrite(productId: string): Promise<string> {
  const resolved = await resolveCatalogProductId(productId);
  if (!resolved) throw new Error('Product not found');
  return resolved;
}

function revalidateProductAdminPaths(productId: string): void {
  revalidatePath('/admin/products');
  revalidatePath('/admin/products/moderation');
  revalidatePath(`/admin/products/edit/${productId}`);
  revalidatePath(`/admin/products/product/${productId}`);
}

async function revalidateProductCatalogPaths(writeId: string): Promise<void> {
  const product = await getCatalogProductByIdForAdmin(writeId);
  revalidatePath('/en/catalog', 'layout');
  revalidatePath('/th/catalog', 'layout');
  if (product?.slug) {
    revalidatePath(`/en/catalog/${product.slug}`);
    revalidatePath(`/th/catalog/${product.slug}`);
  }
  revalidateCatalogCacheAfterSupabaseWrite();
}

async function revalidateProductAdminAndCatalogPaths(productId: string, writeId: string): Promise<void> {
  revalidateProductAdminPaths(productId);
  await revalidateProductCatalogPaths(writeId);
}

function actorFromSessionUser(user: { email?: string | null }): string | null {
  return user.email?.trim() || null;
}

async function requireProductImageForWrite(
  productId: string,
  imageId: string
): Promise<{ writeId: string; revisionId: string | null; usesDraft: boolean }> {
  const writeId = await resolveProductIdForWrite(productId);
  const product = await getCatalogProductByIdForAdmin(writeId);
  if (!product) throw new Error('Product not found');
  const usesDraft = productUsesDraftWorkflow(product.moderationStatus);
  const { revisionId } = await resolveCatalogDraftImageContext({
    entityType: 'product',
    entityId: writeId,
    usesDraft,
    actor: null,
  });
  const images = revisionId
    ? await getCatalogProductImagesForRevision(revisionId)
    : await getCatalogProductImagesForEntity('product', writeId);
  if (!images.some((image) => image.id === imageId)) {
    throw new Error('Image not found for this product');
  }
  return { writeId, revisionId, usesDraft };
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

export async function updateProductByAdminAction(formData: FormData): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user) {
    return { error: 'Unauthorized - Session not found' };
  }
  if (!canChangeStatus((session.user as { role?: string }).role)) {
    return { error: 'Forbidden' };
  }
  const productId = String(formData.get('productId') || '').trim();
  if (!productId) return { error: 'Missing productId' };

  const input: Parameters<typeof updateCatalogProductByAdmin>[1] = {};

  if (formData.has('nameEn')) input.nameEn = String(formData.get('nameEn') ?? '');
  if (formData.has('nameTh')) input.nameTh = String(formData.get('nameTh') ?? '');
  if (formData.has('descriptionEn')) input.descriptionEn = String(formData.get('descriptionEn') ?? '');
  if (formData.has('descriptionTh')) input.descriptionTh = String(formData.get('descriptionTh') ?? '');

  const priceRaw = String(formData.get('price') ?? '').trim();
  if (priceRaw) {
    const price = Number(priceRaw);
    if (!Number.isNaN(price) && price >= 0) input.price = price;
  }

  const occasion = parseJsonArray<string>(String(formData.get('occasion') ?? ''));
  if (occasion) input.occasion = occasion;

  const excluded = parseJsonArray<DeliveryDestinationId>(
    String(formData.get('excludedDeliveryDestinations') ?? '')
  );
  if (excluded) input.excludedDeliveryDestinations = excluded;

  if (formData.get('useAdminOverrides') === 'true') {
    input.adminOverrides = {
      nameEn: (String(formData.get('nameEn') ?? '') || '').trim() || null,
      nameTh: (String(formData.get('nameTh') ?? '') || '').trim() || null,
      descriptionEn: (String(formData.get('descriptionEn') ?? '') || '').trim() || null,
      descriptionTh: (String(formData.get('descriptionTh') ?? '') || '').trim() || null,
    };
    input.adminChangeSummary =
      (String(formData.get('adminChangeSummary') ?? '') || '').trim() || null;
    input.adminLastEditedBy = ((session.user as { email?: string | null }).email ?? '').trim() || null;
  }

  try {
    const writeId = await resolveProductIdForWrite(productId);
    const product = await getCatalogProductByIdForAdmin(writeId);
    if (!product) return { error: 'Product not found' };

    const actor = actorFromSessionUser(session.user);

    if (productUsesDraftWorkflow(product.moderationStatus)) {
      await saveCatalogProductDraft({
        entityId: writeId,
        actor,
        payload: {
          ...(input.nameEn != null && { nameEn: input.nameEn }),
          ...(input.nameTh != null && { nameTh: input.nameTh }),
          ...(input.descriptionEn != null && { descriptionEn: input.descriptionEn }),
          ...(input.descriptionTh != null && { descriptionTh: input.descriptionTh }),
          ...(input.price != null && { price: input.price }),
          ...(input.occasion != null && { occasion: input.occasion }),
          ...(input.excludedDeliveryDestinations != null && {
            excludedDeliveryDestinations: input.excludedDeliveryDestinations,
          }),
        },
      });
      revalidateProductAdminPaths(productId);
      return {};
    }

    await updateCatalogProductByAdmin(writeId, input);
    await revalidateProductAdminAndCatalogPaths(productId, writeId);
    return {};
  } catch (err) {
    console.error('[Moderation] updateProductByAdmin failed:', err);
    return { error: err instanceof Error ? err.message : 'Failed' };
  }
}

export async function publishProductDraftAction(
  productId: string,
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
    const writeId = await resolveProductIdForWrite(productId);
    const { entityId } = await publishCatalogDraftRevision({
      revisionId: cleanRevisionId,
      actor: actorFromSessionUser(session.user),
    });
    if (entityId !== writeId) return { error: 'Revision does not match this product' };
    revalidateProductAdminPaths(productId);
    await revalidateProductCatalogPaths(writeId);
    return {};
  } catch (err) {
    console.error('[Moderation] publishProductDraft failed:', err);
    return { error: err instanceof Error ? err.message : 'Failed to publish' };
  }
}

export async function reorderProductImagesAction(
  productId: string,
  orderedIds: string[]
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user) return { error: 'Unauthorized - Session not found' };
  if (!canChangeStatus((session.user as { role?: string }).role)) {
    return { error: 'Forbidden' };
  }

  try {
    const writeId = await resolveProductIdForWrite(productId);
    const product = await getCatalogProductByIdForAdmin(writeId);
    if (!product) return { error: 'Product not found' };
    const usesDraft = productUsesDraftWorkflow(product.moderationStatus);
    const { revisionId } = await resolveCatalogDraftImageContext({
      entityType: 'product',
      entityId: writeId,
      usesDraft,
      actor: actorFromSessionUser(session.user),
    });
    await reorderCatalogProductImages({
      entityType: 'product',
      entityId: revisionId ? undefined : writeId,
      revisionId,
      orderedIds,
      actor: actorFromSessionUser(session.user),
    });
    if (!revisionId) {
      await syncCatalogProductInlineImagesFromNormalized('product', writeId);
      await revalidateProductAdminAndCatalogPaths(productId, writeId);
    } else {
      revalidateProductAdminPaths(productId);
    }
    return {};
  } catch (err) {
    console.error('[Moderation] reorderProductImages failed:', err);
    return { error: err instanceof Error ? err.message : 'Failed to reorder images' };
  }
}

export async function uploadProductImageAction(formData: FormData): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user) {
    return { error: 'Unauthorized - Session not found' };
  }
  if (!canChangeStatus((session.user as { role?: string }).role)) {
    return { error: 'Forbidden' };
  }

  const productId = String(formData.get('productId') || '').trim();
  const file = formData.get('file');
  const altEn = String(formData.get('altEn') || '').trim();
  const altTh = String(formData.get('altTh') || '').trim();
  if (!productId) return { error: 'Missing productId' };
  if (!file || !(file instanceof File)) return { error: 'Image file is required' };

  try {
    const writeId = await resolveProductIdForWrite(productId);
    const product = await getCatalogProductByIdForAdmin(writeId);
    if (!product) return { error: 'Product not found' };
    const usesDraft = productUsesDraftWorkflow(product.moderationStatus);
    const actor = actorFromSessionUser(session.user);
    const { revisionId } = await resolveCatalogDraftImageContext({
      entityType: 'product',
      entityId: writeId,
      usesDraft,
      actor,
    });
    const existingImages = revisionId
      ? await getCatalogProductImagesForRevision(revisionId)
      : await ensureCatalogProductImagesFromInline('product', writeId);
    await validateProductImage(file);
    const webp = await convertToWebp(file);
    const supabase = getSupabaseAdmin();
    if (!supabase) return { error: 'Catalog writes are not configured' };

    const storagePath = `products/${writeId}/cms-${Date.now()}.webp`;
    const buffer = Buffer.from(await webp.arrayBuffer());
    await uploadBufferToCatalog(supabase, storagePath, buffer, 'image/webp');
    const record = buildCatalogImageRecord(supabase, storagePath, {
      format: 'webp',
      is_primary: existingImages.length === 0,
      alt: altEn || undefined,
      sort_order: existingImages.length,
    });

    await createCatalogProductImage({
      entityType: 'product',
      entityId: revisionId ? null : writeId,
      revisionId,
      storagePath: record.storage_path,
      publicUrl: record.public_url,
      sourceType: 'uploaded',
      altEn: altEn || 'Product image',
      altTh,
      isPrimary: existingImages.length === 0,
      sortOrder: existingImages.length,
      metadata: { format: 'webp' },
      actor,
    });
    if (revisionId) {
      revalidateProductAdminPaths(productId);
    } else {
      await syncCatalogProductInlineImagesFromNormalized('product', writeId);
      await revalidateProductAdminAndCatalogPaths(productId, writeId);
    }
    return {};
  } catch (err) {
    console.error('[Moderation] uploadProductImage failed:', err);
    return { error: err instanceof Error ? err.message : 'Failed to upload image' };
  }
}

export async function updateProductImageAltAction(formData: FormData): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user) {
    return { error: 'Unauthorized - Session not found' };
  }
  if (!canChangeStatus((session.user as { role?: string }).role)) {
    return { error: 'Forbidden' };
  }

  const productId = String(formData.get('productId') || '').trim();
  const imageId = String(formData.get('imageId') || '').trim();
  if (!productId || !imageId) return { error: 'Missing productId or imageId' };

  try {
    const { writeId, revisionId } = await requireProductImageForWrite(productId, imageId);
    await updateCatalogProductImageText({
      imageId,
      altEn: String(formData.get('altEn') || ''),
      altTh: String(formData.get('altTh') || ''),
      actor: actorFromSessionUser(session.user),
    });
    if (revisionId) {
      revalidateProductAdminPaths(productId);
    } else {
      await syncCatalogProductInlineImagesFromNormalized('product', writeId);
      await revalidateProductAdminAndCatalogPaths(productId, writeId);
    }
    return {};
  } catch (err) {
    console.error('[Moderation] updateProductImageAlt failed:', err);
    return { error: err instanceof Error ? err.message : 'Failed to update image alt text' };
  }
}

export async function setPrimaryProductImageAction(
  productId: string,
  imageId: string
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user) {
    return { error: 'Unauthorized - Session not found' };
  }
  if (!canChangeStatus((session.user as { role?: string }).role)) {
    return { error: 'Forbidden' };
  }

  try {
    const { writeId, revisionId } = await requireProductImageForWrite(productId, imageId);
    await setCatalogProductPrimaryImage(imageId, actorFromSessionUser(session.user));
    if (revisionId) {
      revalidateProductAdminPaths(productId);
    } else {
      await syncCatalogProductInlineImagesFromNormalized('product', writeId);
      await revalidateProductAdminAndCatalogPaths(productId, writeId);
    }
    return {};
  } catch (err) {
    console.error('[Moderation] setPrimaryProductImage failed:', err);
    return { error: err instanceof Error ? err.message : 'Failed to set primary image' };
  }
}

export async function moveProductImageAction(
  productId: string,
  imageId: string,
  direction: 'up' | 'down'
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user) {
    return { error: 'Unauthorized - Session not found' };
  }
  if (!canChangeStatus((session.user as { role?: string }).role)) {
    return { error: 'Forbidden' };
  }

  try {
    const { writeId, revisionId } = await requireProductImageForWrite(productId, imageId);
    await moveCatalogProductImage({
      imageId,
      direction,
      actor: actorFromSessionUser(session.user),
    });
    if (revisionId) {
      revalidateProductAdminPaths(productId);
    } else {
      await syncCatalogProductInlineImagesFromNormalized('product', writeId);
      await revalidateProductAdminAndCatalogPaths(productId, writeId);
    }
    return {};
  } catch (err) {
    console.error('[Moderation] moveProductImage failed:', err);
    return { error: err instanceof Error ? err.message : 'Failed to reorder image' };
  }
}

export async function deleteProductImageAction(
  productId: string,
  imageId: string
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user) {
    return { error: 'Unauthorized - Session not found' };
  }
  if (!canChangeStatus((session.user as { role?: string }).role)) {
    return { error: 'Forbidden' };
  }

  try {
    const { writeId, revisionId } = await requireProductImageForWrite(productId, imageId);
    const actor = actorFromSessionUser(session.user);
    await softDeleteCatalogProductImage(imageId, actor);
    if (revisionId) {
      const remaining = await getCatalogProductImagesForRevision(revisionId);
      if (remaining.length > 0 && !remaining.some((image) => image.is_primary)) {
        await setCatalogProductPrimaryImage(remaining[0].id, actor);
      }
      revalidateProductAdminPaths(productId);
    } else {
      const remaining = await syncCatalogProductInlineImagesFromNormalized('product', writeId);
      if (remaining.length > 0 && !remaining.some((image) => image.is_primary)) {
        const first = (await getCatalogProductImagesForEntity('product', writeId))[0];
        if (first) {
          await setCatalogProductPrimaryImage(first.id, actor);
          await syncCatalogProductInlineImagesFromNormalized('product', writeId);
        }
      }
      await revalidateProductAdminAndCatalogPaths(productId, writeId);
    }
    return {};
  } catch (err) {
    console.error('[Moderation] deleteProductImage failed:', err);
    return { error: err instanceof Error ? err.message : 'Failed to delete image' };
  }
}

export async function approveBouquetAction(bouquetId: string): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user) {
    return { error: 'Unauthorized - Session not found' };
  }
  if (!canChangeStatus((session.user as { role?: string }).role)) {
    return { error: 'Forbidden' };
  }
  try {
    const writeId = await resolveBouquetIdForWrite(bouquetId);
    const bouquet = await getCatalogBouquetByIdForAdmin(writeId);

    await updateCatalogBouquetStatus(writeId, 'approved', {
      approvedBy: (session.user as { email?: string | null }).email ?? undefined,
      approvedAt: new Date().toISOString(),
    });
    revalidatePath('/admin/products');
    revalidatePath('/admin/products/moderation');
    revalidatePath(`/admin/products/review/${bouquetId}`);
    revalidatePath(`/admin/products/bouquet/${bouquetId}`);
    revalidatePath('/en/catalog', 'layout');
    revalidatePath('/th/catalog', 'layout');
    if (bouquet?.slug) {
      revalidatePath(`/en/catalog/${bouquet.slug}`);
      revalidatePath(`/th/catalog/${bouquet.slug}`);
    }
    revalidateCatalogCacheAfterSupabaseWrite();
    return {};
  } catch (err) {
    console.error('[Moderation] approveBouquet failed:', err);
    return { error: err instanceof Error ? err.message : 'Failed' };
  }
}

export async function deleteBouquetAction(bouquetId: string): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user) {
    return { error: 'Unauthorized - Session not found' };
  }
  if (!canChangeStatus((session.user as { role?: string }).role)) {
    return { error: 'Forbidden' };
  }
  try {
    const writeId = await resolveBouquetIdForWrite(bouquetId);
    const bouquet = await getCatalogBouquetByIdForAdmin(writeId);
    await deleteCatalogBouquet(writeId);
    revalidatePath('/admin/products');
    revalidatePath('/admin/products/moderation');
    revalidatePath(`/admin/products/review/${bouquetId}`);
    revalidatePath(`/admin/products/bouquet/${bouquetId}`);
    revalidatePath('/en/catalog', 'layout');
    revalidatePath('/th/catalog', 'layout');
    if (bouquet?.slug) {
      revalidatePath(`/en/catalog/${bouquet.slug}`);
      revalidatePath(`/th/catalog/${bouquet.slug}`);
    }
    revalidateCatalogCacheAfterSupabaseWrite();
    return {};
  } catch (err) {
    console.error('[Moderation] deleteBouquet failed:', err);
    return { error: err instanceof Error ? err.message : 'Failed to delete bouquet' };
  }
}

export async function approveProductAction(
  productId: string,
  commissionPercent: number
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user) {
    return { error: 'Unauthorized - Session not found' };
  }
  if (!canChangeStatus((session.user as { role?: string }).role)) {
    return { error: 'Forbidden' };
  }
  const pct = Number(commissionPercent);
  if (Number.isNaN(pct) || pct < 0 || pct > 500) {
    return { error: 'Commission must be 0–500%' };
  }
  try {
    const writeId = await resolveProductIdForWrite(productId);
    await updateCatalogProductCommission(writeId, pct);
    await updateCatalogProductModerationStatus(writeId, 'live');
    await revalidateProductAdminAndCatalogPaths(productId, writeId);
    return {};
  } catch (err) {
    console.error('[Moderation] approveProduct failed:', err);
    return { error: err instanceof Error ? err.message : 'Failed' };
  }
}

export async function needsChangesProductAction(
  productId: string,
  adminNote: string
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user) {
    return { error: 'Unauthorized - Session not found' };
  }
  if (!canChangeStatus((session.user as { role?: string }).role)) {
    return { error: 'Forbidden' };
  }
  if (!adminNote?.trim()) return { error: 'Admin note is required' };
  try {
    const writeId = await resolveProductIdForWrite(productId);
    await updateCatalogProductModerationStatus(writeId, 'needs_changes', adminNote);
    revalidatePath('/admin/products');
    revalidatePath('/admin/products/moderation');
    revalidatePath(`/admin/products/edit/${productId}`);
    revalidatePath(`/admin/products/product/${productId}`);
    return {};
  } catch (err) {
    console.error('[Moderation] needsChangesProduct failed:', err);
    return { error: err instanceof Error ? err.message : 'Failed' };
  }
}

export async function updateCommissionAction(
  productId: string,
  commissionPercent: number
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user) {
    return { error: 'Unauthorized - Session not found' };
  }
  if (!canChangeStatus((session.user as { role?: string }).role)) {
    return { error: 'Forbidden' };
  }
  const pct = Number(commissionPercent);
  if (Number.isNaN(pct) || pct < 0 || pct > 500) {
    return { error: 'Commission must be 0–500%' };
  }
  try {
    const writeId = await resolveProductIdForWrite(productId);
    await updateCatalogProductCommission(writeId, pct);
    await revalidateProductAdminAndCatalogPaths(productId, writeId);
    return {};
  } catch (err) {
    console.error('[Moderation] updateCommission failed:', err);
    return { error: err instanceof Error ? err.message : 'Failed' };
  }
}

export async function deleteProductAction(productId: string): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user) {
    return { error: 'Unauthorized - Session not found' };
  }
  if (!canChangeStatus((session.user as { role?: string }).role)) {
    return { error: 'Forbidden' };
  }
  try {
    const writeId = await resolveProductIdForWrite(productId);
    const product = await getCatalogProductByIdForAdmin(writeId);
    await deleteCatalogProduct(writeId);
    revalidatePath('/admin/products');
    revalidatePath('/admin/products/moderation');
    revalidatePath(`/admin/products/edit/${productId}`);
    revalidatePath(`/admin/products/product/${productId}`);
    revalidatePath('/en/catalog', 'layout');
    revalidatePath('/th/catalog', 'layout');
    if (product?.slug) {
      revalidatePath(`/en/catalog/${product.slug}`);
      revalidatePath(`/th/catalog/${product.slug}`);
    }
    revalidateCatalogCacheAfterSupabaseWrite();
    return {};
  } catch (err) {
    console.error('[Moderation] deleteProduct failed:', err);
    return { error: err instanceof Error ? err.message : 'Failed to delete product' };
  }
}
