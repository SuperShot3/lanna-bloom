export const ALLOWED_PRODUCT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type AllowedProductImageType = (typeof ALLOWED_PRODUCT_IMAGE_TYPES)[number];

export type ProductImageExt = 'jpg' | 'png' | 'webp';

function isAllowedProductImageType(type: string): type is AllowedProductImageType {
  return ALLOWED_PRODUCT_IMAGE_TYPES.includes(type as AllowedProductImageType);
}

function inferMimeFromFilename(filename: string): AllowedProductImageType | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return null;
}

/** Normalize browser-reported MIME types and infer from filename when needed. */
export function normalizeDeclaredImageMime(
  type: string,
  filename?: string
): AllowedProductImageType | null {
  const trimmed = type.trim().toLowerCase();
  if (trimmed === 'image/jpg' || trimmed === 'image/pjpeg') return 'image/jpeg';
  if (trimmed === 'image/x-png') return 'image/png';
  if (isAllowedProductImageType(trimmed)) return trimmed;
  if (!trimmed || trimmed === 'application/octet-stream') {
    return filename ? inferMimeFromFilename(filename) : null;
  }
  return null;
}

export function extensionForMime(mime: AllowedProductImageType): ProductImageExt {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

export function sniffImageMimeType(buffer: Buffer): AllowedProductImageType | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

export function validateImageMimeFromBuffer(
  buffer: Buffer,
  declaredType: string,
  filename?: string
): { mime: AllowedProductImageType; ext: ProductImageExt } {
  const sniffed = sniffImageMimeType(buffer);
  if (!sniffed) {
    throw new Error('Unrecognized image format. Use JPEG, PNG, or WebP.');
  }

  const declared = normalizeDeclaredImageMime(declaredType, filename);
  if (declared && declared !== sniffed) {
    throw new Error('Image contents do not match the declared file type.');
  }

  return {
    mime: sniffed,
    ext: extensionForMime(sniffed),
  };
}
