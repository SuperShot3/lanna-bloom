'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { convertToWebp, validateProductImage } from '@/lib/adminProductImages';
import { getCatalogSiteSettingsRowForAdmin } from '@/lib/catalogAdmin';
import { importHeroFromSanity } from '@/lib/catalog/importHeroFromSanity';
import { revalidateCatalogCacheAfterSupabaseWrite } from '@/lib/catalogRouting';
import { buildCatalogImageRecord, uploadBufferToCatalog } from '@/lib/catalog/storage';
import type { CatalogStoredImage } from '@/lib/catalog/types';
import { upsertCatalogSiteSettings } from '@/lib/catalogWrite';
import { canChangeStatus } from '@/lib/adminRbac';
import { getSupabaseAdmin } from '@/lib/supabase/server';

type ActionResult = { error?: string; message?: string };

async function requireHeroEditor(): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user) return { error: 'Unauthorized' };
  if (!canChangeStatus((session.user as { role?: string }).role)) {
    return { error: 'Forbidden' };
  }
  return {};
}

function revalidateHeroPaths(): void {
  revalidateCatalogCacheAfterSupabaseWrite();
  revalidatePath('/admin/products/hero');
  revalidatePath('/en');
  revalidatePath('/th');
}

async function uploadHeroWebp(
  file: File,
  storagePath: string,
  alt: string,
  sortOrder: number
): Promise<CatalogStoredImage> {
  await validateProductImage(file);
  const webp = await convertToWebp(file);
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Catalog writes are not configured');

  const buffer = Buffer.from(await webp.arrayBuffer());
  await uploadBufferToCatalog(supabase, storagePath, buffer, 'image/webp');
  return buildCatalogImageRecord(supabase, storagePath, {
    format: 'webp',
    is_primary: true,
    alt,
    sort_order: sortOrder,
  });
}

function normalizeCarouselOrder(images: CatalogStoredImage[]): CatalogStoredImage[] {
  return images
    .filter((img) => img.storage_path)
    .map((img, index) => ({ ...img, sort_order: index }));
}

export async function importHeroFromSanityAction(): Promise<ActionResult> {
  const gate = await requireHeroEditor();
  if (gate.error) return gate;

  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return { error: 'Catalog writes are not configured' };

    const result = await importHeroFromSanity(supabase);
    if (!result.imported) return { error: result.message };

    revalidateHeroPaths();
    return { message: result.message };
  } catch (err) {
    console.error('[Hero] importHeroFromSanity failed:', err);
    return { error: err instanceof Error ? err.message : 'Import failed' };
  }
}

export async function uploadMainHeroImageAction(formData: FormData): Promise<ActionResult> {
  const gate = await requireHeroEditor();
  if (gate.error) return gate;

  const file = formData.get('file');
  const alt = String(formData.get('alt') || 'Homepage hero').trim() || 'Homepage hero';
  if (!file || !(file instanceof File)) return { error: 'Image file is required' };

  try {
    const storagePath = `site-settings/default/hero-${Date.now()}.webp`;
    const heroImage = await uploadHeroWebp(file, storagePath, alt, 0);
    await upsertCatalogSiteSettings({ heroImage });
    revalidateHeroPaths();
    return { message: 'Main hero image saved.' };
  } catch (err) {
    console.error('[Hero] uploadMainHeroImage failed:', err);
    return { error: err instanceof Error ? err.message : 'Upload failed' };
  }
}

export async function removeMainHeroImageAction(): Promise<ActionResult> {
  const gate = await requireHeroEditor();
  if (gate.error) return gate;

  try {
    await upsertCatalogSiteSettings({ heroImage: null });
    revalidateHeroPaths();
    return { message: 'Main hero image removed.' };
  } catch (err) {
    console.error('[Hero] removeMainHeroImage failed:', err);
    return { error: err instanceof Error ? err.message : 'Remove failed' };
  }
}

export async function uploadCarouselHeroImageAction(formData: FormData): Promise<ActionResult> {
  const gate = await requireHeroEditor();
  if (gate.error) return gate;

  const file = formData.get('file');
  const alt = String(formData.get('alt') || 'Hero carousel').trim() || 'Hero carousel';
  if (!file || !(file instanceof File)) return { error: 'Image file is required' };

  try {
    const { heroCarouselImages } = await getCatalogSiteSettingsRowForAdmin();
    const storagePath = `site-settings/default-carousel/${Date.now()}.webp`;
    const record = await uploadHeroWebp(file, storagePath, alt, heroCarouselImages.length);
    const next = normalizeCarouselOrder([...heroCarouselImages, record]);
    await upsertCatalogSiteSettings({ heroCarouselImages: next });
    revalidateHeroPaths();
    return { message: 'Carousel image added.' };
  } catch (err) {
    console.error('[Hero] uploadCarouselHeroImage failed:', err);
    return { error: err instanceof Error ? err.message : 'Upload failed' };
  }
}

export async function removeCarouselHeroImageAction(storagePath: string): Promise<ActionResult> {
  const gate = await requireHeroEditor();
  if (gate.error) return gate;

  const key = storagePath.trim();
  if (!key) return { error: 'Missing image' };

  try {
    const { heroCarouselImages } = await getCatalogSiteSettingsRowForAdmin();
    const next = normalizeCarouselOrder(
      heroCarouselImages.filter((img) => img.storage_path !== key)
    );
    await upsertCatalogSiteSettings({ heroCarouselImages: next });
    revalidateHeroPaths();
    return { message: 'Carousel image removed.' };
  } catch (err) {
    console.error('[Hero] removeCarouselHeroImage failed:', err);
    return { error: err instanceof Error ? err.message : 'Remove failed' };
  }
}

export async function reorderCarouselHeroImagesAction(
  orderedStoragePaths: string[]
): Promise<ActionResult> {
  const gate = await requireHeroEditor();
  if (gate.error) return gate;

  try {
    const { heroCarouselImages } = await getCatalogSiteSettingsRowForAdmin();
    const byPath = new Map(heroCarouselImages.map((img) => [img.storage_path, img]));
    const next = orderedStoragePaths
      .map((path) => byPath.get(path))
      .filter((img): img is CatalogStoredImage => Boolean(img));
    await upsertCatalogSiteSettings({ heroCarouselImages: normalizeCarouselOrder(next) });
    revalidateHeroPaths();
    return { message: 'Carousel order saved.' };
  } catch (err) {
    console.error('[Hero] reorderCarouselHeroImages failed:', err);
    return { error: err instanceof Error ? err.message : 'Reorder failed' };
  }
}

export async function updateCarouselHeroAltAction(
  storagePath: string,
  alt: string
): Promise<ActionResult> {
  const gate = await requireHeroEditor();
  if (gate.error) return gate;

  const key = storagePath.trim();
  if (!key) return { error: 'Missing image' };

  try {
    const { heroCarouselImages } = await getCatalogSiteSettingsRowForAdmin();
    const next = heroCarouselImages.map((img) =>
      img.storage_path === key ? { ...img, alt: alt.trim() || img.alt } : img
    );
    await upsertCatalogSiteSettings({ heroCarouselImages: next });
    revalidateHeroPaths();
    return { message: 'Alt text saved.' };
  } catch (err) {
    console.error('[Hero] updateCarouselHeroAlt failed:', err);
    return { error: err instanceof Error ? err.message : 'Save failed' };
  }
}
