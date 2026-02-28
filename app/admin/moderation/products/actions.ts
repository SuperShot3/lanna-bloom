'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import {
  updateBouquetStatus,
  updateProductModerationStatus,
  updateProductCommission,
  deleteProduct,
} from '@/lib/sanityWrite';
import { canChangeStatus } from '@/lib/adminRbac';

export async function approveBouquetAction(bouquetId: string): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user || !canChangeStatus((session.user as { role?: string }).role)) {
    return { error: 'Forbidden' };
  }
  try {
    await updateBouquetStatus(bouquetId, 'approved');
    revalidatePath('/admin/moderation/products');
    return {};
  } catch (err) {
    console.error('[Moderation] approveBouquet failed:', err);
    return { error: err instanceof Error ? err.message : 'Failed' };
  }
}

export async function rejectBouquetAction(bouquetId: string): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user || !canChangeStatus((session.user as { role?: string }).role)) {
    return { error: 'Forbidden' };
  }
  try {
    await updateBouquetStatus(bouquetId, 'rejected');
    revalidatePath('/admin/moderation/products');
    return {};
  } catch (err) {
    console.error('[Moderation] rejectBouquet failed:', err);
    return { error: err instanceof Error ? err.message : 'Failed' };
  }
}

export async function approveProductAction(
  productId: string,
  commissionPercent: number
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user || !canChangeStatus((session.user as { role?: string }).role)) {
    return { error: 'Forbidden' };
  }
  const pct = Number(commissionPercent);
  if (Number.isNaN(pct) || pct < 0 || pct > 100) {
    return { error: 'Commission must be 0–100%' };
  }
  try {
    await updateProductCommission(productId, pct);
    await updateProductModerationStatus(productId, 'live');
    revalidatePath('/admin/moderation/products');
    revalidatePath(`/admin/moderation/products/${productId}`);
    revalidatePath('/en/catalog', 'layout');
    revalidatePath('/th/catalog', 'layout');
    return {};
  } catch (err) {
    console.error('[Moderation] approveProduct failed:', err);
    return { error: err instanceof Error ? err.message : 'Failed' };
  }
}

export async function rejectProductAction(
  productId: string,
  adminNote?: string
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user || !canChangeStatus((session.user as { role?: string }).role)) {
    return { error: 'Forbidden' };
  }
  try {
    await updateProductModerationStatus(productId, 'rejected', adminNote);
    revalidatePath('/admin/moderation/products');
    revalidatePath(`/admin/moderation/products/${productId}`);
    return {};
  } catch (err) {
    console.error('[Moderation] rejectProduct failed:', err);
    return { error: err instanceof Error ? err.message : 'Failed' };
  }
}

export async function needsChangesProductAction(
  productId: string,
  adminNote: string
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user || !canChangeStatus((session.user as { role?: string }).role)) {
    return { error: 'Forbidden' };
  }
  if (!adminNote?.trim()) return { error: 'Admin note is required' };
  try {
    await updateProductModerationStatus(productId, 'needs_changes', adminNote);
    revalidatePath('/admin/moderation/products');
    revalidatePath(`/admin/moderation/products/${productId}`);
    return {};
  } catch (err) {
    console.error('[Moderation] needsChangesProduct failed:', err);
    return { error: err instanceof Error ? err.message : 'Failed' };
  }
}

export async function deleteProductAction(productId: string): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user || !canChangeStatus((session.user as { role?: string }).role)) {
    return { error: 'Forbidden' };
  }
  try {
    await deleteProduct(productId);
    revalidatePath('/admin/moderation/products');
    return {};
  } catch (err) {
    console.error('[Moderation] deleteProduct failed:', err);
    return { error: err instanceof Error ? err.message : 'Failed to delete product' };
  }
}
