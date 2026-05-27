import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import {
  isSupabaseCatalogConfigError,
  revalidateCatalogCacheAfterSupabaseWrite,
} from '@/lib/catalogRouting';
import {
  createAdminReviewBouquetInCatalog,
  createAdminReviewProductInCatalog,
  type CatalogWriteImageInput,
} from '@/lib/catalogWrite';
import { PRODUCT_CATEGORIES, type ProductCategory } from '@/lib/catalogCategories';
import { parseExcludedDeliveryDestinations } from '@/lib/bouquetDestinationAvailability';

export const runtime = 'nodejs';

function stringField(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  return typeof value === 'string' ? value.trim() : '';
}

function stringArrayField(body: Record<string, unknown>, key: string): string[] {
  const value = body[key];
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? '').trim()).filter(Boolean);
}

function parseImages(value: unknown): CatalogWriteImageInput[] {
  if (!Array.isArray(value)) return [];
  return value.reduce<CatalogWriteImageInput[]>((images, item) => {
    if (!item || typeof item !== 'object') return images;
    const row = item as Record<string, unknown>;
    const assetId = typeof row.assetId === 'string' ? row.assetId.trim() : '';
    if (!assetId) return images;
    const format =
      row.format === 'webp' || row.format === 'png_master' || row.format === 'source'
        ? row.format
        : undefined;
    images.push({
      assetId,
      alt: typeof row.alt === 'string' ? row.alt.trim() : undefined,
      format,
      isPrimary: row.isPrimary === true,
    });
    return images;
  }, []);
}

function parseItemCategory(body: Record<string, unknown>): 'flowers' | ProductCategory | null {
  const value = stringField(body, 'itemCategory') || 'flowers';
  if (value === 'flowers') return 'flowers';
  if (PRODUCT_CATEGORIES.includes(value as ProductCategory)) return value as ProductCategory;
  return null;
}

function customAttribute(key: string, value: string): { key: string; value: string } | null {
  const cleanValue = value.trim();
  return cleanValue ? { key, value: cleanValue } : null;
}

function listAttribute(key: string, values: string[]): { key: string; value: string } | null {
  return customAttribute(key, values.join(', '));
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;
  const { session } = authResult;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Body must be an object' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const nameEn = stringField(b, 'nameEn');
  const itemCategory = parseItemCategory(b);
  const priceRaw = b.price;
  const price = typeof priceRaw === 'number' ? priceRaw : Number(String(priceRaw ?? ''));
  const images = parseImages(b.images);
  const excludedDeliveryDestinations = parseExcludedDeliveryDestinations(b.excludedDeliveryDestinations);

  if (!nameEn) {
    return NextResponse.json({ error: 'English product name is required' }, { status: 400 });
  }
  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ error: 'Product price is required and must be greater than 0' }, { status: 400 });
  }
  if (!itemCategory) {
    return NextResponse.json({ error: 'Invalid item category' }, { status: 400 });
  }
  if (!images.some((image) => image.isPrimary && image.format === 'webp')) {
    return NextResponse.json({ error: 'A primary WebP image is required before saving for review' }, { status: 400 });
  }

  try {
    const createdBy = session.user.email ?? 'unknown';
    const createdAt = new Date().toISOString();

    if (itemCategory !== 'flowers') {
      const colors = stringArrayField(b, 'colors');
      const visibleItems = stringArrayField(b, 'flowerTypes');
      const customAttributes = [
        customAttribute('composition_en', stringField(b, 'compositionEn')),
        customAttribute('composition_th', stringField(b, 'compositionTh')),
        listAttribute('color_tags', colors),
        listAttribute('visible_items', visibleItems),
      ].filter((attribute): attribute is { key: string; value: string } => Boolean(attribute));

      const result = await createAdminReviewProductInCatalog({
        nameEn,
        nameTh: stringField(b, 'nameTh'),
        slug: stringField(b, 'slug') || undefined,
        descriptionEn: stringField(b, 'descriptionEn'),
        descriptionTh: stringField(b, 'descriptionTh'),
        category: itemCategory,
        price,
        images,
        occasion: stringArrayField(b, 'occasion'),
        excludedDeliveryDestinations,
        customAttributes,
        createdBy,
        createdAt,
      });

      revalidatePath('/admin/products');
      revalidatePath('/admin/products/moderation');
      revalidatePath(`/admin/products/edit/${result.id}`);
      revalidatePath(`/admin/products/product/${result.id}`);
      revalidateCatalogCacheAfterSupabaseWrite();

      return NextResponse.json({
        status: 'pending_review',
        id: result.id,
        slug: result.slug,
        reviewUrl: `/admin/products/product/${result.id}`,
      });
    }

    const result = await createAdminReviewBouquetInCatalog({
      nameEn,
      nameTh: stringField(b, 'nameTh'),
      slug: stringField(b, 'slug') || undefined,
      descriptionEn: stringField(b, 'descriptionEn'),
      descriptionTh: stringField(b, 'descriptionTh'),
      compositionEn: stringField(b, 'compositionEn'),
      compositionTh: stringField(b, 'compositionTh'),
      price,
      images,
      colors: stringArrayField(b, 'colors'),
      flowerTypes: stringArrayField(b, 'flowerTypes'),
      occasion: stringArrayField(b, 'occasion'),
      presentationFormats: stringArrayField(b, 'presentationFormats'),
      deliveryOptions: stringArrayField(b, 'deliveryOptions'),
      excludedDeliveryDestinations,
      featuredPopular: b.featuredPopular === true,
      createdBy,
      createdAt,
    });

    revalidatePath('/admin/products');
    revalidatePath('/admin/products/moderation');
    revalidatePath(`/admin/products/review/${result.id}`);
    revalidatePath(`/admin/products/bouquet/${result.id}`);
    revalidateCatalogCacheAfterSupabaseWrite();

    return NextResponse.json({
      status: 'pending_review',
      id: result.id,
      slug: result.slug,
      reviewUrl: `/admin/products/bouquet/${result.id}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save product for review';
    const status = isSupabaseCatalogConfigError(message) ? 503 : 500;
    console.error('[admin-products/publish] error:', error);
    return NextResponse.json({ error: message }, { status });
  }
}
