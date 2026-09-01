/**
 * Mapper-style image alt fallback: never use the long product description.
 * Run: npx tsx lib/catalog/mappers.imageAlt.test.ts
 */
import assert from 'node:assert/strict';
import {
  buildProductImageAlt,
  pickStoredImageAlt,
} from '@/lib/catalog/productImageAlt';

const longDescription =
  'An elegant hand-tied bouquet of seasonal garden flowers with a warm, romantic mood, designed as a thoughtful gift for someone special in Chiang Mai.';

const fallback = buildProductImageAlt({
  nameEn: 'Sunset Glow Bouquet',
  nameTh: 'ช่อซันเซ็ตโกลว์',
  compositionEn: 'red roses, orange tulips',
  compositionTh: 'กุหลาบแดง, ทิวลิปส้ม',
});

assert.equal(
  pickStoredImageAlt({ alt: '', alt_th: '' }, 'en', fallback),
  'Sunset Glow Bouquet with red roses, orange tulips'
);
assert.ok(!fallback.altEn.includes(longDescription));
assert.ok(fallback.altEn.length < longDescription.length);

assert.equal(
  pickStoredImageAlt({ alt: 'Bouquet image', alt_th: '' }, 'en', fallback),
  'Sunset Glow Bouquet with red roses, orange tulips'
);
assert.equal(
  pickStoredImageAlt({ alt: '', alt_th: '' }, 'th', fallback),
  'ช่อซันเซ็ตโกลว์ ประกอบด้วย กุหลาบแดง, ทิวลิปส้ม'
);

console.log('mappers.imageAlt.test.ts: all passed');
