/**
 * MIME validation and WebP conversion tests for admin product image uploads.
 * Run with: npx tsx lib/adminProductImages.test.ts
 */

import sharp from 'sharp';
import {
  extensionForMime,
  normalizeDeclaredImageMime,
  sniffImageMimeType,
  validateImageMimeFromBuffer,
} from './adminProductImageMime';
import { convertToWebp, PRODUCT_IMAGE_SIZE } from './adminProductImageProcessing';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

async function assertDimensions(file: File, expectedWidth: number, expectedHeight: number, msg: string) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const meta = await sharp(buffer).metadata();
  assert(meta.width === expectedWidth, `${msg}: expected width ${expectedWidth}, got ${meta.width}`);
  assert(meta.height === expectedHeight, `${msg}: expected height ${expectedHeight}, got ${meta.height}`);
}

// Minimal 1x1 PNG
const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

// Minimal JPEG (1x1)
const JPEG_BYTES = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
  'base64'
);

assert(sniffImageMimeType(PNG_BYTES) === 'image/png', 'PNG bytes sniff as image/png');
assert(sniffImageMimeType(JPEG_BYTES) === 'image/jpeg', 'JPEG bytes sniff as image/jpeg');
assert(normalizeDeclaredImageMime('image/jpg') === 'image/jpeg', 'image/jpg normalizes to image/jpeg');
assert(normalizeDeclaredImageMime('image/x-png') === 'image/png', 'image/x-png normalizes to image/png');
assert(
  normalizeDeclaredImageMime('', 'photo.png') === 'image/png',
  'empty type infers PNG from filename'
);
assert(extensionForMime('image/jpeg') === 'jpg', 'jpeg maps to jpg extension');

const emptyTypePng = validateImageMimeFromBuffer(PNG_BYTES, '', 'desktop-photo.png');
assert(emptyTypePng.mime === 'image/png', 'empty type + valid PNG bytes is accepted');

const aliasJpeg = validateImageMimeFromBuffer(JPEG_BYTES, 'image/jpg', 'camera.jpg');
assert(aliasJpeg.mime === 'image/jpeg', 'image/jpg alias with JPEG bytes is accepted');

let mismatchThrown = false;
try {
  validateImageMimeFromBuffer(JPEG_BYTES, 'image/png', 'wrong.png');
} catch (error) {
  mismatchThrown = error instanceof Error && error.message.includes('do not match');
}
assert(mismatchThrown, 'JPEG bytes with declared image/png is rejected');

async function testWebpPreservesAspectRatio() {
  const portraitWidth = 800;
  const portraitHeight = 1200;
  const portraitBuffer = await sharp({
    create: {
      width: portraitWidth,
      height: portraitHeight,
      channels: 3,
      background: { r: 120, g: 80, b: 200 },
    },
  })
    .jpeg()
    .toBuffer();

  const portraitFile = new File([new Uint8Array(portraitBuffer)], 'portrait.jpg', {
    type: 'image/jpeg',
  });
  const webp = await convertToWebp(portraitFile);
  assert(webp.type === 'image/webp', 'convertToWebp returns image/webp');
  await assertDimensions(
    webp,
    portraitWidth,
    portraitHeight,
    'portrait image should keep original dimensions'
  );
}

async function testWebpDownscalesLongestEdge() {
  const sourceWidth = 4000;
  const sourceHeight = 3000;
  const sourceBuffer = await sharp({
    create: {
      width: sourceWidth,
      height: sourceHeight,
      channels: 3,
      background: { r: 40, g: 160, b: 90 },
    },
  })
    .jpeg()
    .toBuffer();

  const sourceFile = new File([new Uint8Array(sourceBuffer)], 'landscape.jpg', {
    type: 'image/jpeg',
  });
  const webp = await convertToWebp(sourceFile);
  const expectedWidth = PRODUCT_IMAGE_SIZE;
  const expectedHeight = Math.round((sourceHeight / sourceWidth) * PRODUCT_IMAGE_SIZE);
  await assertDimensions(
    webp,
    expectedWidth,
    expectedHeight,
    'landscape image should downscale proportionally'
  );
}

async function runTests() {
  await testWebpPreservesAspectRatio();
  await testWebpDownscalesLongestEdge();
  console.log('adminProductImages.test.ts: all assertions passed');
}

void runTests().catch((error) => {
  console.error(error);
  process.exit(1);
});
