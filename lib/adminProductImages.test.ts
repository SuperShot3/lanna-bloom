/**
 * MIME validation tests for admin product image uploads.
 * Run with: npx tsx lib/adminProductImages.test.ts
 */

import {
  extensionForMime,
  normalizeDeclaredImageMime,
  sniffImageMimeType,
  validateImageMimeFromBuffer,
} from './adminProductImageMime';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
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

console.log('adminProductImages.test.ts: all assertions passed');
