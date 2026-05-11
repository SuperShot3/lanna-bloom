/**
 * Caps for admin receipt/proof photo uploads. Client compresses toward these; API enforces.
 */

/** ~Telegram-from-iPhone ballpark; keeps Supabase usage low while staying readable. */
export const MAX_RECEIPT_UPLOAD_BYTES = 150 * 1024; // 150 KB

/**
 * Receipt/proof photos are downscaled so the long edge never exceeds this, even when the raw
 * file is already under {@link MAX_RECEIPT_UPLOAD_BYTES} (keeps thumbnails and OCR-friendly scale consistent).
 */
export const RECEIPT_IMAGE_MAX_LONG_EDGE = 1280;

export const MAX_RECEIPT_UPLOAD_LABEL = '150 KB';

/** Admin expense rows keep up to three supporting receipt/proof images. */
export const MAX_RECEIPT_IMAGES_PER_EXPENSE = 3;

/** Same as receipts: accounting proof photos (JPEG/PNG/WebP/HEIC). */
export const MAX_PROOF_IMAGE_BYTES = MAX_RECEIPT_UPLOAD_BYTES;

/** Bank statements / multi-page scans (not recompressed client-side). */
export const MAX_PROOF_PDF_BYTES = 5 * 1024 * 1024; // 5 MB

export const MAX_PROOF_PDF_LABEL = '5 MB';

/** Human-readable max for API / UI errors when the limit is sub-megabyte. */
export function formatMaxFileErrorLabel(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    const mb = bytes / (1024 * 1024);
    return Number.isInteger(mb) ? `${mb} MB` : `${mb.toFixed(1)} MB`;
  }
  const kb = Math.round(bytes / 1024);
  return `${kb} KB`;
}
