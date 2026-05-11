import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { createApprovedAdminBouquet, type SanityWriteImageInput } from '@/lib/sanityWrite';

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
  const priceRaw = b.price;
  const price = typeof priceRaw === 'number' ? priceRaw : Number(String(priceRaw ?? ''));
  const images = parseImages(b.images);

  if (!nameEn) {
    return NextResponse.json({ error: 'English product name is required' }, { status: 400 });
  }
  if (!Number.isFinite(price) || price < 0) {
    return NextResponse.json({ error: 'price must be a non-negative number' }, { status: 400 });
  }
  if (!images.some((image) => image.isPrimary)) {
    return NextResponse.json({ error: 'A primary WebP image is required before publish' }, { status: 400 });
  }

  try {
    const result = await createApprovedAdminBouquet({
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
      approvedBy: session.user.email ?? 'unknown',
      approvedAt: new Date().toISOString(),
    });

    revalidatePath('/en/catalog', 'layout');
    revalidatePath('/th/catalog', 'layout');
    revalidatePath(`/en/catalog/${result.slug}`);
    revalidatePath(`/th/catalog/${result.slug}`);

    return NextResponse.json({
      status: 'published',
      id: result.id,
      slug: result.slug,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to publish product';
    const status = message.includes('SANITY_API_WRITE_TOKEN') ? 503 : 500;
    console.error('[admin-products/publish] error:', error);
    return NextResponse.json({ error: message }, { status });
  }
}
