'use server';

import { redirect } from 'next/navigation';
import {
  createBouquet,
  createProduct,
  uploadImageToSanity,
  type BouquetSizeInput,
} from '@/lib/sanityWrite';
import { getPartnerBySupabaseUserId } from '@/lib/sanity';
import { getPartnerSession } from '@/lib/supabase/partnerAuthServer';
import { isValidLocale } from '@/lib/i18n';
import type { SizeKey } from '@/lib/bouquets';

function isRedirectError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'digest' in err &&
    typeof (err as { digest?: string }).digest === 'string' &&
    (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')
  );
}

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

  const session = await getPartnerSession();
  if (!session) return { error: 'Not authenticated' };

  const partner = await getPartnerBySupabaseUserId(session.user.id);
  if (!partner) return { error: 'Partner not found' };

  const nameEn = (formData.get('nameEn') as string)?.trim();
  if (!nameEn) return { error: 'Name (EN) is required' };

  const imageAssetIds = await getImageAssetIds(formData);
  if (imageAssetIds.length === 0) return { error: 'At least one image is required (1–3)' };

  const sizes = parseSizes(formData);
  if (sizes.length === 0) return { error: 'At least one size is required' };

  const colorsRaw = formData.get('colors') as string | null;
  const colors = colorsRaw ? colorsRaw.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
  const flowerTypesRaw = formData.get('flowerTypes') as string | null;
  const flowerTypes = flowerTypesRaw
    ? flowerTypesRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : undefined;
  const occasionRaw = formData.getAll('occasion') as string[];
  const occasion = occasionRaw?.map((s) => s.trim()).filter(Boolean) || undefined;

  try {
    await createBouquet({
      partnerId: partner.id,
      nameEn,
      nameTh: (formData.get('nameTh') as string)?.trim(),
      descriptionEn: (formData.get('descriptionEn') as string)?.trim(),
      descriptionTh: (formData.get('descriptionTh') as string)?.trim(),
      compositionEn: (formData.get('compositionEn') as string)?.trim(),
      compositionTh: (formData.get('compositionTh') as string)?.trim(),
      category: (formData.get('category') as string) || 'mixed',
      colors,
      flowerTypes,
      occasion,
      imageAssetIds,
      sizes,
    });
    redirect(`/${lang}/partner/products/new?success=bouquet`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error('[Partner] createBouquet failed:', err);
    return { error: err instanceof Error ? err.message : 'Failed to save bouquet' };
  }
}

export async function createProductAction(formData: FormData) {
  const lang = formData.get('lang') as string;
  if (!isValidLocale(lang)) return { error: 'Invalid locale' };

  const session = await getPartnerSession();
  if (!session) return { error: 'Not authenticated' };

  const partner = await getPartnerBySupabaseUserId(session.user.id);
  if (!partner) return { error: 'Partner not found' };

  const nameEn = (formData.get('nameEn') as string)?.trim();
  if (!nameEn) return { error: 'Name (EN) is required' };

  const category = formData.get('category') as string;
  const validCategories = ['balloons', 'gifts', 'money_flowers', 'handmade_floral'];
  if (!validCategories.includes(category)) return { error: 'Invalid category' };

  const price = Number(formData.get('price'));
  if (isNaN(price) || price < 0) return { error: 'Valid price is required' };

  const imageAssetIds = await getImageAssetIds(formData);
  if (imageAssetIds.length === 0) return { error: 'At least one image is required (1–3)' };

  const preparationTime = formData.get('preparationTime') as string | null;
  const occasion = (formData.get('occasion') as string)?.trim();

  try {
    await createProduct({
      partnerId: partner.id,
      nameEn,
      nameTh: (formData.get('nameTh') as string)?.trim(),
      descriptionEn: (formData.get('descriptionEn') as string)?.trim(),
      descriptionTh: (formData.get('descriptionTh') as string)?.trim(),
      category: category as 'balloons' | 'gifts' | 'money_flowers' | 'handmade_floral',
      price,
      imageAssetIds,
      preparationTime: preparationTime ? Number(preparationTime) : undefined,
      occasion: occasion || undefined,
    });
    redirect(`/${lang}/partner/products/new?success=product`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error('[Partner] createProduct failed:', err);
    return { error: err instanceof Error ? err.message : 'Failed to save product' };
  }
}
