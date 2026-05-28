import 'server-only';

import sharp from 'sharp';
import type { CatalogStoredImage } from '@/lib/catalog/types';
import { uploadCatalogProductImages } from '@/lib/catalogWrite';

export const PRODUCT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const PRODUCT_IMAGE_SIZE = 1200;

export const ALLOWED_PRODUCT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type AllowedProductImageType = (typeof ALLOWED_PRODUCT_IMAGE_TYPES)[number];

export type ValidatedProductImage = {
  file: File;
  buffer: Buffer;
  mime: AllowedProductImageType;
  ext: 'jpg' | 'png' | 'webp';
};

export type ProductImageVariantUpload = {
  assetId: string;
  url?: string;
  format: 'webp' | 'png_master';
  isPrimary: boolean;
  alt?: string;
};

function isAllowedProductImageType(type: string): type is AllowedProductImageType {
  return ALLOWED_PRODUCT_IMAGE_TYPES.includes(type as AllowedProductImageType);
}

function extensionForMime(mime: AllowedProductImageType): ValidatedProductImage['ext'] {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

function fileFromBuffer(buffer: Buffer, name: string, type: string): File {
  return new File([new Uint8Array(buffer)], name, { type });
}

function sniffImageMimeType(buffer: Buffer): AllowedProductImageType | null {
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

export async function validateProductImage(file: File): Promise<ValidatedProductImage> {
  if (!file || file.size === 0) {
    throw new Error('Image file is required');
  }
  if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
    throw new Error('Image is too large. Maximum size is 10MB.');
  }
  if (!isAllowedProductImageType(file.type)) {
    throw new Error('Image type must be JPEG, PNG, or WebP.');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffImageMimeType(buffer);
  if (sniffed !== file.type) {
    throw new Error('Image contents do not match the declared file type.');
  }

  return {
    file,
    buffer,
    mime: sniffed,
    ext: extensionForMime(sniffed),
  };
}

export async function resizeToSquare(file: File, size = PRODUCT_IMAGE_SIZE): Promise<File> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const output = await sharp(buffer, { limitInputPixels: 40_000_000 })
    .rotate()
    .resize(size, size, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
      withoutEnlargement: false,
    })
    .png({ compressionLevel: 9 })
    .toBuffer();

  return fileFromBuffer(output, 'product-square.png', 'image/png');
}

export async function stripImageMetadata(file: File): Promise<File> {
  return resizeToSquare(file);
}

export async function convertToWebp(file: File, size = PRODUCT_IMAGE_SIZE): Promise<File> {
  const square = await resizeToSquare(file, size);
  const buffer = Buffer.from(await square.arrayBuffer());
  const output = await sharp(buffer)
    .webp({ quality: 90, effort: 5 })
    .toBuffer();

  return fileFromBuffer(output, 'product-primary.webp', 'image/webp');
}

export async function createPngMaster(file: File, size = PRODUCT_IMAGE_SIZE): Promise<File> {
  const square = await resizeToSquare(file, size);
  const buffer = Buffer.from(await square.arrayBuffer());
  const output = await sharp(buffer)
    .png({ compressionLevel: 9 })
    .toBuffer();

  return fileFromBuffer(output, 'product-master.png', 'image/png');
}

export async function fileToDataUrl(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString('base64')}`;
}

/** Upload WebP + PNG master to Supabase Storage `catalog` bucket. */
export async function uploadProductImageVariants(input: {
  webp: File;
  pngMaster: File;
  alt?: string;
}): Promise<ProductImageVariantUpload[]> {
  const stored = await uploadCatalogProductImages({
    webp: input.webp,
    pngMaster: input.pngMaster,
    alt: input.alt,
  });
  return stored.map((image) => ({
    assetId: image.storage_path,
    url: image.public_url,
    format: image.format === 'png_master' ? 'png_master' : 'webp',
    isPrimary: image.is_primary === true,
    alt: image.alt,
  }));
}

export type PreparedCatalogImageUpload = {
  webp: CatalogStoredImage;
  pngMaster: CatalogStoredImage;
};

/**
 * Validate, convert, and upload WebP + PNG master variants (same pipeline as
 * `/api/admin/products/prepare-image`). Returns both storage records; callers
 * attach only the WebP row to the product gallery.
 */
export async function prepareCatalogImageUpload(input: {
  file: File;
  alt?: string;
  prefix: string;
}): Promise<PreparedCatalogImageUpload> {
  await validateProductImage(input.file);
  const [webp, pngMaster] = await Promise.all([convertToWebp(input.file), createPngMaster(input.file)]);
  const variants = await uploadCatalogProductImages({
    webp,
    pngMaster,
    alt: input.alt,
    prefix: input.prefix,
  });
  const webpRecord = variants.find((variant) => variant.format === 'webp');
  const pngRecord = variants.find((variant) => variant.format === 'png_master');
  if (!webpRecord || !pngRecord) {
    throw new Error('Failed to prepare image variants');
  }
  return { webp: webpRecord, pngMaster: pngRecord };
}
