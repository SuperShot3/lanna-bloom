'use server';

import { redirect } from 'next/navigation';

/** Next.js redirect() throws an error with digest starting with NEXT_REDIRECT; rethrow so redirect works. */
function isRedirectError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'digest' in err && typeof (err as { digest?: string }).digest === 'string' && (err as { digest: string }).digest.startsWith('NEXT_REDIRECT');
}
import {
  createBouquet,
  updateBouquet,
  uploadImageToSanity,
  type BouquetSizeInput,
} from '@/lib/sanityWrite';
import { getBouquetById, getBouquetImageRefs } from '@/lib/sanity';
import { getPartnerById } from '@/lib/sanity';
import { isValidLocale } from '@/lib/i18n';
import type { SizeKey } from '@/lib/bouquets';

const CATEGORIES = ['roses', 'mixed', 'mono', 'inBox', 'romantic', 'birthday', 'sympathy'] as const;
const SIZE_KEYS: SizeKey[] = ['s', 'm', 'l', 'xl'];

function parseSizes(formData: FormData): BouquetSizeInput[] {
  const sizes: BouquetSizeInput[] = [];
  const raw = formData.get('sizes') as string;
  if (!raw) return sizes;
  try {
    const arr = JSON.parse(raw) as Array<{
      key: string;
      label: string;
      price: number;
      description: string;
      preparationTime?: number;
      availability?: boolean;
    }>;
    for (const s of arr) {
      if (!SIZE_KEYS.includes(s.key as SizeKey)) continue;
      sizes.push({
        key: s.key as SizeKey,
        label: String(s.label || s.key.toUpperCase()),
        price: Number(s.price) || 0,
        description: String(s.description ?? ''),
        preparationTime: s.preparationTime != null ? Number(s.preparationTime) : undefined,
        availability: s.availability ?? true,
      });
    }
  } catch {
    // ignore
  }
  return sizes;
}

async function getImageAssetIds(formData: FormData): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 1; i <= 3; i++) {
    const file = formData.get(`image${i}`) as File | null;
    if (file && file.size > 0) {
      const id = await uploadImageToSanity(file);
      ids.push(id);
    }
  }
  return ids;
}

export async function createBouquetAction(formData: FormData) {
  const lang = formData.get('lang') as string;
  if (!isValidLocale(lang)) return { error: 'Invalid locale' };
  const partnerId = formData.get('partnerId') as string;
  if (!partnerId) return { error: 'Missing partner' };

  const partner = await getPartnerById(partnerId);
  if (!partner || partner.status !== 'approved') {
    return { error: 'Partner not found or not approved' };
  }

  const nameEn = (formData.get('nameEn') as string)?.trim();
  if (!nameEn) return { error: 'Name (EN) is required' };

  const imageAssetIds = await getImageAssetIds(formData);
  if (imageAssetIds.length === 0) return { error: 'At least one image is required (1–3)' };

  const sizes = parseSizes(formData);
  if (sizes.length === 0) return { error: 'At least one size is required' };

  try {
    const bouquetId = await createBouquet({
      partnerId,
      nameEn,
      nameTh: (formData.get('nameTh') as string)?.trim(),
      descriptionEn: (formData.get('descriptionEn') as string)?.trim(),
      descriptionTh: (formData.get('descriptionTh') as string)?.trim(),
      compositionEn: (formData.get('compositionEn') as string)?.trim(),
      compositionTh: (formData.get('compositionTh') as string)?.trim(),
      category: (formData.get('category') as string) || 'mixed',
      imageAssetIds,
      sizes,
    });
    redirect(`/${lang}/partner/dashboard/${partnerId}`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error('[Partner] createBouquet failed:', err);
    return { error: err instanceof Error ? err.message : 'Failed to save bouquet' };
  }
}

export async function updateBouquetAction(formData: FormData) {
  const lang = formData.get('lang') as string;
  if (!isValidLocale(lang)) return { error: 'Invalid locale' };
  const partnerId = formData.get('partnerId') as string;
  const bouquetId = formData.get('bouquetId') as string;
  if (!partnerId || !bouquetId) return { error: 'Missing partner or bouquet' };

  const partner = await getPartnerById(partnerId);
  if (!partner || partner.status !== 'approved') {
    return { error: 'Partner not found or not approved' };
  }

  const existing = await getBouquetById(bouquetId);
  if (!existing || existing.partnerId !== partnerId) {
    return { error: 'Bouquet not found or access denied' };
  }

  const nameEn = (formData.get('nameEn') as string)?.trim();
  if (!nameEn) return { error: 'Name (EN) is required' };

  let imageAssetIds = await getImageAssetIds(formData);
  if (imageAssetIds.length === 0) {
    imageAssetIds = await getBouquetImageRefs(bouquetId);
  }
  if (imageAssetIds.length === 0) return { error: 'At least one image is required (1–3)' };

  const sizes = parseSizes(formData);
  if (sizes.length === 0) return { error: 'At least one size is required' };

  try {
    await updateBouquet(bouquetId, {
      nameEn,
      nameTh: (formData.get('nameTh') as string)?.trim(),
      descriptionEn: (formData.get('descriptionEn') as string)?.trim(),
      descriptionTh: (formData.get('descriptionTh') as string)?.trim(),
      compositionEn: (formData.get('compositionEn') as string)?.trim(),
      compositionTh: (formData.get('compositionTh') as string)?.trim(),
      category: (formData.get('category') as string) || 'mixed',
      imageAssetIds,
      sizes,
    });
    redirect(`/${lang}/partner/dashboard/${partnerId}`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error('[Partner] updateBouquet failed:', err);
    return { error: err instanceof Error ? err.message : 'Failed to save bouquet' };
  }
}
