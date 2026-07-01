import 'server-only';

import sharp from 'sharp';
import type { CatalogStoredImage } from '@/lib/catalog/types';
import {
  type AllowedProductImageType,
  normalizeDeclaredImageMime,
  sniffImageMimeType,
  validateImageMimeFromBuffer,
} from '@/lib/adminProductImageMime';
import {
  buildCatalogImageRecord,
  uploadBufferToCatalog,
  type CatalogSupabaseClient,
} from '@/lib/catalog/storage';
import { uploadCatalogProductImages } from '@/lib/catalogWrite';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export const PRODUCT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const PRODUCT_IMAGE_SIZE = 2400;
export const PRODUCT_IMAGE_SOURCE_MAX_SIZE = 2400;

export { ALLOWED_PRODUCT_IMAGE_TYPES } from '@/lib/adminProductImageMime';
export type { AllowedProductImageType } from '@/lib/adminProductImageMime';

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

export type PreparedCatalogSourceUpload = {
  source: CatalogStoredImage;
};

function requireSupabase(): CatalogSupabaseClient {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return supabase;
}

function fileFromBuffer(buffer: Buffer, name: string, type: string): File {
  return new File([new Uint8Array(buffer)], name, { type });
}

export async function validateProductImage(file: File): Promise<ValidatedProductImage> {
  if (!file || file.size === 0) {
    throw new Error('Image file is required');
  }
  if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
    throw new Error('Image is too large. Maximum size is 10MB.');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { mime, ext } = validateImageMimeFromBuffer(buffer, file.type, file.name);

  return {
    file,
    buffer,
    mime,
    ext,
  };
}

async function resizeSourceBufferIfNeeded(
  buffer: Buffer,
  mime: AllowedProductImageType,
  maxSize = PRODUCT_IMAGE_SOURCE_MAX_SIZE
): Promise<Buffer> {
  const image = sharp(buffer, { limitInputPixels: 40_000_000 }).rotate();
  const meta = await image.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (width <= maxSize && height <= maxSize) {
    return buffer;
  }

  const pipeline = image.resize(maxSize, maxSize, {
    fit: 'inside',
    withoutEnlargement: true,
  });
  if (mime === 'image/jpeg') return pipeline.jpeg({ quality: 92 }).toBuffer();
  if (mime === 'image/webp') return pipeline.webp({ quality: 92 }).toBuffer();
  return pipeline.png({ compressionLevel: 9 }).toBuffer();
}

/** Validate and prepare a source file (max 2400px edge, original format preserved). */
export async function storeSourceImage(file: File): Promise<ValidatedProductImage & { file: File }> {
  const validated = await validateProductImage(file);
  const outputBuffer = await resizeSourceBufferIfNeeded(validated.buffer, validated.mime);
  const outputName = `source.${validated.ext}`;
  const outputFile = fileFromBuffer(outputBuffer, outputName, validated.mime);
  return {
    ...validated,
    file: outputFile,
    buffer: outputBuffer,
  };
}

export async function resizeToSquare(file: File, size = PRODUCT_IMAGE_SIZE): Promise<File> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const output = await sharp(buffer, { limitInputPixels: 40_000_000 })
    .rotate()
    .resize(size, size, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
      withoutEnlargement: true,
    })
    .png({ compressionLevel: 9 })
    .toBuffer();

  return fileFromBuffer(output, 'product-square.png', 'image/png');
}

async function prepareSquarePngBuffer(file: File, size = PRODUCT_IMAGE_SIZE): Promise<Buffer> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const pipeline = sharp(buffer, { limitInputPixels: 40_000_000 }).rotate();
  const meta = await pipeline.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const maxEdge = Math.max(width, height);
  const aspectRatio = width && height ? width / height : 0;
  const isSquareish = aspectRatio >= 0.98 && aspectRatio <= 1.02;

  if (isSquareish) {
    if (maxEdge <= size) {
      return pipeline.png({ compressionLevel: 9 }).toBuffer();
    }
    return pipeline
      .resize(size, size, { fit: 'inside', withoutEnlargement: true })
      .png({ compressionLevel: 9 })
      .toBuffer();
  }

  return sharp(buffer, { limitInputPixels: 40_000_000 })
    .rotate()
    .resize(size, size, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
      withoutEnlargement: true,
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

export async function stripImageMetadata(file: File): Promise<File> {
  return resizeToSquare(file);
}

export async function convertToWebp(file: File, size = PRODUCT_IMAGE_SIZE): Promise<File> {
  const output = await prepareSquarePngBuffer(file, size);
  const webpBuffer = await sharp(output).webp({ quality: 90, effort: 5 }).toBuffer();

  return fileFromBuffer(webpBuffer, 'product-primary.webp', 'image/webp');
}

export async function createPngMaster(file: File, size = PRODUCT_IMAGE_SIZE): Promise<File> {
  const output = await prepareSquarePngBuffer(file, size);
  return fileFromBuffer(output, 'product-master.png', 'image/png');
}

export async function convertSourceToWebpVariants(
  file: File,
  size = PRODUCT_IMAGE_SIZE
): Promise<{ webp: File; pngMaster: File }> {
  await validateProductImage(file);
  const [webp, pngMaster] = await Promise.all([convertToWebp(file, size), createPngMaster(file, size)]);
  return { webp, pngMaster };
}

export async function fileToDataUrl(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString('base64')}`;
}

export async function downloadCatalogImageAsFile(storagePath: string): Promise<File> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.storage.from('catalog').download(storagePath);
  if (error || !data) {
    throw new Error('Failed to download source image');
  }
  const buffer = Buffer.from(await data.arrayBuffer());
  const sniffed = sniffImageMimeType(buffer);
  const mime = sniffed ?? normalizeDeclaredImageMime('', storagePath) ?? 'application/octet-stream';
  const name = storagePath.split('/').pop() ?? 'source';
  return fileFromBuffer(buffer, name, mime);
}

/** Upload WebP + PNG master to Supabase Storage `catalog` bucket. */
export async function uploadProductImageVariants(input: {
  webp: File;
  pngMaster: File;
  alt?: string;
  prefix?: string;
}): Promise<ProductImageVariantUpload[]> {
  const stored = await uploadCatalogProductImages({
    webp: input.webp,
    pngMaster: input.pngMaster,
    alt: input.alt,
    prefix: input.prefix,
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

/** Upload a validated source image without WebP conversion. */
export async function prepareCatalogSourceUpload(input: {
  file: File;
  alt?: string;
  prefix: string;
}): Promise<PreparedCatalogSourceUpload> {
  const stored = await storeSourceImage(input.file);
  const supabase = requireSupabase();
  const storagePath = `${input.prefix}/source.${stored.ext}`;
  await uploadBufferToCatalog(supabase, storagePath, stored.buffer, stored.mime);
  const source = buildCatalogImageRecord(supabase, storagePath, {
    format: 'source',
    is_primary: false,
    alt: input.alt,
    sort_order: 0,
  });
  return { source };
}

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

/** Generate and upload WebP + PNG master from an existing catalog storage path. */
export async function convertCatalogSourceToWebp(input: {
  sourceStoragePath: string;
  alt?: string;
  prefix: string;
}): Promise<PreparedCatalogImageUpload> {
  const sourceFile = await downloadCatalogImageAsFile(input.sourceStoragePath);
  const { webp, pngMaster } = await convertSourceToWebpVariants(sourceFile);
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
