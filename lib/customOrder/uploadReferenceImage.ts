import 'server-only';

export const CUSTOM_ORDER_REFERENCE_IMAGE_MAX_BYTES = 4 * 1024 * 1024;
export const CUSTOM_ORDER_REFERENCE_IMAGE_RETENTION_DAYS = 30;
export const ALLOWED_CUSTOM_ORDER_REFERENCE_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

type AllowedReferenceImageType = (typeof ALLOWED_CUSTOM_ORDER_REFERENCE_IMAGE_TYPES)[number];

function isAllowedReferenceImageType(type: string): type is AllowedReferenceImageType {
  return ALLOWED_CUSTOM_ORDER_REFERENCE_IMAGE_TYPES.includes(type as AllowedReferenceImageType);
}

async function sniffImageMimeType(file: File): Promise<AllowedReferenceImageType | null> {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return 'image/gif';
  }
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
}

export async function getValidCustomOrderReferenceImageContentType(
  file: File
): Promise<AllowedReferenceImageType | null> {
  if (!isAllowedReferenceImageType(file.type)) return null;

  const sniffedType = await sniffImageMimeType(file);
  return sniffedType === file.type ? sniffedType : null;
}

/**
 * Upload a reference image for a custom order to Vercel Blob.
 * Returns public URL, or null if BLOB_READ_WRITE_TOKEN is not set / upload fails.
 */
export async function uploadCustomOrderReferenceImage(
  file: File,
  uploadKey: string
): Promise<{ url: string } | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token || file.size === 0) return null;
  if (file.size > CUSTOM_ORDER_REFERENCE_IMAGE_MAX_BYTES) return null;
  const contentType = await getValidCustomOrderReferenceImageContentType(file);
  if (!contentType) return null;

  const safeName = file.name.replace(/[^\w.\-()]/g, '_').slice(0, 120) || 'image';
  const yyyyMm = new Date().toISOString().slice(0, 7);
  const path = `custom-order-refs/${yyyyMm}/${uploadKey}/${Date.now()}-${safeName}`;

  try {
    const { put } = await import('@vercel/blob');
    const blob = await put(path, file, {
      access: 'public',
      token,
      contentType,
    });
    return { url: blob.url };
  } catch (e) {
    console.error('[customOrder] Blob upload failed:', e);
    return null;
  }
}

export async function deleteCustomOrderReferenceImagesOlderThan(
  cutoff: Date
): Promise<{ scanned: number; deleted: number }> {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) return { scanned: 0, deleted: 0 };

  const { del, list } = await import('@vercel/blob');
  let cursor: string | undefined;
  let scanned = 0;
  let deleted = 0;

  do {
    const result = await list({ prefix: 'custom-order-refs/', limit: 1000, cursor, token });
    scanned += result.blobs.length;

    const expiredUrls = result.blobs
      .filter((blob) => blob.uploadedAt.getTime() < cutoff.getTime())
      .map((blob) => blob.url);

    if (expiredUrls.length > 0) {
      await del(expiredUrls, { token });
      deleted += expiredUrls.length;
    }

    cursor = result.cursor;
  } while (cursor);

  return { scanned, deleted };
}
