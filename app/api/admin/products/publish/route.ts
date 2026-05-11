import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import {
  createAdminReviewBouquet,
  createAdminReviewProduct,
  type SanityWriteImageInput,
} from '@/lib/sanityWrite';
import { PRODUCT_CATEGORIES, type ProductCategory } from '@/lib/catalogCategories';

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

function parseImages(value: unknown): SanityWriteImageInput[] {
  if (!Array.isArray(value)) return [];
  return value.reduce<SanityWriteImageInput[]>((images, item) => {
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

  if (!nameEn) {
    return NextResponse.json({ error: 'English product name is required' }, { status: 400 });
  }
  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ error: 'Product price is required and must be greater than 0' }, { status: 400 });
  }
  if (!itemCategory) {
    return NextResponse.json({ error: 'Invalid item category' }, { status: 400 });
  }
  if (!images.some((image) => image.isPrimary)) {
    return NextResponse.json({ error: 'A primary WebP image is required before saving for review' }, { status: 400 });
  }

  try {
    if (itemCategory !== 'flowers') {
      const colors = stringArrayField(b, 'colors');
      const visibleItems = stringArrayField(b, 'flowerTypes');
      const customAttributes = [
        customAttribute('composition_en', stringField(b, 'compositionEn')),
        customAttribute('composition_th', stringField(b, 'compositionTh')),
        listAttribute('color_tags', colors),
        listAttribute('visible_items', visibleItems),
      ].filter((attribute): attribute is { key: string; value: string } => Boolean(attribute));

      const result = await createAdminReviewProduct({
        nameEn,
        nameTh: stringField(b, 'nameTh'),
        slug: stringField(b, 'slug') || undefined,
        descriptionEn: stringField(b, 'descriptionEn'),
        descriptionTh: stringField(b, 'descriptionTh'),
        category: itemCategory,
        price,
        images,
        occasion: stringArrayField(b, 'occasion'),
        customAttributes,
        createdBy: session.user.email ?? 'unknown',
        createdAt: new Date().toISOString(),
      });

      revalidatePath('/admin/moderation/products');
      revalidatePath(`/admin/moderation/products/${result.id}`);

      return NextResponse.json({
        status: 'pending_review',
        id: result.id,
        slug: result.slug,
        reviewUrl: `/admin/moderation/products/${result.id}`,
      });
    }

    const result = await createAdminReviewBouquet({
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
      featuredPopular: b.featuredPopular === true,
      createdBy: session.user.email ?? 'unknown',
      createdAt: new Date().toISOString(),
    });

    revalidatePath('/admin/moderation/products');
    revalidatePath(`/admin/products/review/${result.id}`);

    return NextResponse.json({
      status: 'pending_review',
      id: result.id,
      slug: result.slug,
      reviewUrl: `/admin/products/review/${result.id}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save product for review';
    const status = message.includes('SANITY_API_WRITE_TOKEN') ? 503 : 500;
    console.error('[admin-products/publish] error:', error);
    return NextResponse.json({ error: message }, { status });
  }
}
