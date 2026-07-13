import sharp from 'sharp';

export const PRODUCT_IMAGE_SIZE = 2400;

type OptimizedOutputFormat = 'webp' | 'png';

function fileFromBuffer(buffer: Buffer, name: string, type: string): File {
  return new File([new Uint8Array(buffer)], name, { type });
}

/** Resize for catalog display: preserve aspect ratio, cap longest edge, no padding. */
export async function prepareOptimizedImageBuffer(
  file: File,
  format: OptimizedOutputFormat,
  size = PRODUCT_IMAGE_SIZE
): Promise<Buffer> {
  const buffer = Buffer.from(await file.arrayBuffer());
  let pipeline = sharp(buffer, { limitInputPixels: 40_000_000 }).rotate();
  const meta = await pipeline.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  if (width > size || height > size) {
    pipeline = pipeline.resize(size, size, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  if (format === 'webp') {
    return pipeline.webp({ quality: 90, effort: 5 }).toBuffer();
  }
  return pipeline.png({ compressionLevel: 9 }).toBuffer();
}

export async function convertToWebp(file: File, size = PRODUCT_IMAGE_SIZE): Promise<File> {
  const webpBuffer = await prepareOptimizedImageBuffer(file, 'webp', size);
  return fileFromBuffer(webpBuffer, 'product-primary.webp', 'image/webp');
}

export async function createPngMaster(file: File, size = PRODUCT_IMAGE_SIZE): Promise<File> {
  const output = await prepareOptimizedImageBuffer(file, 'png', size);
  return fileFromBuffer(output, 'product-master.png', 'image/png');
}
