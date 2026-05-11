import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { convertToWebp, validateProductImage } from '@/lib/adminProductImages';
import { getBouquetById } from '@/lib/sanity';
import { appendBouquetImage, uploadAdminProductImage } from '@/lib/sanityWrite';

export const runtime = 'nodejs';

function filenameForBouquet(bouquetId: string): string {
  const safeId = bouquetId.replace(/[^a-z0-9_-]+/gi, '-').slice(0, 60) || 'bouquet';
  return `admin-review-${safeId}-${Date.now()}.webp`;
}

function isConfigurationError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('SANITY_API_WRITE_TOKEN');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bouquetId: string }> }
) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  const { bouquetId: rawBouquetId } = await params;
  const bouquetId = rawBouquetId?.trim();
  if (!bouquetId) {
    return NextResponse.json({ error: 'bouquetId required' }, { status: 400 });
  }

  const bouquet = await getBouquetById(bouquetId);
  if (!bouquet) {
    return NextResponse.json({ error: 'Bouquet not found' }, { status: 404 });
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.startsWith('multipart/form-data')) {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Failed to parse form data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'file field is required' }, { status: 400 });
  }

  const requestedAlt = typeof formData.get('alt') === 'string' ? String(formData.get('alt')).trim() : '';
  const alt = requestedAlt || bouquet.nameEn || 'Bouquet product image';

  try {
    await validateProductImage(file);
    const webp = await convertToWebp(file);
    const uploaded = await uploadAdminProductImage(webp, {
      alt,
      filename: filenameForBouquet(bouquetId),
    });

    await appendBouquetImage(bouquetId, {
      assetId: uploaded.assetId,
      alt,
      format: 'webp',
      isPrimary: false,
    });

    revalidatePath('/admin/moderation/products');
    revalidatePath(`/admin/products/review/${bouquetId}`);
    if (bouquet.status === 'approved') {
      revalidatePath('/en/catalog', 'layout');
      revalidatePath('/th/catalog', 'layout');
      revalidatePath(`/en/catalog/${bouquet.slug}`);
      revalidatePath(`/th/catalog/${bouquet.slug}`);
    }

    return NextResponse.json(
      {
        image: {
          assetId: uploaded.assetId,
          url: uploaded.url,
          alt,
          format: 'webp',
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (isConfigurationError(error)) {
      return NextResponse.json({ error: 'Sanity writes are not configured' }, { status: 503 });
    }

    const message = error instanceof Error ? error.message : 'Failed to upload image';
    const status = message.includes('too large') ? 413 : 400;
    console.error('[admin-products/review/images] error:', error);
    return NextResponse.json({ error: message }, { status });
  }
}
