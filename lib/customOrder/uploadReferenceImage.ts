import 'server-only';

const MAX_BYTES = 4 * 1024 * 1024;

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
  if (file.size > MAX_BYTES) return null;
  const safeName = file.name.replace(/[^\w.\-()]/g, '_').slice(0, 120) || 'image';
  const path = `custom-order-refs/${uploadKey}/${Date.now()}-${safeName}`;

  try {
    const { put } = await import('@vercel/blob');
    const blob = await put(path, file, {
      access: 'public',
      token,
      contentType: file.type || 'application/octet-stream',
    });
    return { url: blob.url };
  } catch (e) {
    console.error('[customOrder] Blob upload failed:', e);
    return null;
  }
}
