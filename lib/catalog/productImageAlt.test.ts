/**
 * Run: npx tsx lib/catalog/productImageAlt.test.ts
 */
import assert from 'node:assert/strict';
import {
  buildProductImageAlt,
  catalogImageAltLocale,
  compositionFromCustomAttributes,
  isWeakProductImageAlt,
  localizedProductImageAlt,
  pickStoredImageAlt,
  PRODUCT_IMAGE_ALT_MAX_LENGTH,
  truncateProductImageAlt,
} from '@/lib/catalog/productImageAlt';

assert.equal(isWeakProductImageAlt(''), true);
assert.equal(isWeakProductImageAlt('   '), true);
assert.equal(isWeakProductImageAlt('Bouquet image'), true);
assert.equal(isWeakProductImageAlt('Product image'), true);
assert.equal(isWeakProductImageAlt('photo.jpg'), true);
assert.equal(isWeakProductImageAlt('IMG_1234.PNG'), true);
assert.equal(isWeakProductImageAlt('Sunset Glow Bouquet'), false);
assert.equal(isWeakProductImageAlt('ช่อกุหลาบแดง'), false);

const dedicated = buildProductImageAlt({
  altEn: 'Pink rose bouquet for a birthday in Chiang Mai',
  altTh: 'ช่อกุหลาบชมพูสำหรับวันเกิดในเชียงใหม่',
  nameEn: 'Sunset Glow',
  nameTh: 'ซันเซ็ตโกลว์',
  compositionEn: 'red roses, orange tulips',
  compositionTh: 'กุหลาบแดง, ทิวลิปส้ม',
});
assert.equal(dedicated.altEn, 'Pink rose bouquet for a birthday in Chiang Mai');
assert.equal(dedicated.altTh, 'ช่อกุหลาบชมพูสำหรับวันเกิดในเชียงใหม่');

const composed = buildProductImageAlt({
  nameEn: 'Sunset Glow Bouquet',
  nameTh: 'ช่อซันเซ็ตโกลว์',
  compositionEn: 'red roses, orange tulips, and eucalyptus',
  compositionTh: 'กุหลาบแดง, ทิวลิปส้ม, ยูคาลิปตัส',
});
assert.equal(
  composed.altEn,
  'Sunset Glow Bouquet with red roses, orange tulips, and eucalyptus'
);
assert.equal(
  composed.altTh,
  'ช่อซันเซ็ตโกลว์ ประกอบด้วย กุหลาบแดง, ทิวลิปส้ม, ยูคาลิปตัส'
);

const nameOnly = buildProductImageAlt({
  nameEn: 'Sunset Glow Bouquet',
  nameTh: 'ช่อซันเซ็ตโกลว์',
});
assert.equal(nameOnly.altEn, 'Sunset Glow Bouquet');
assert.equal(nameOnly.altTh, 'ช่อซันเซ็ตโกลว์');

const ignoresGeneric = buildProductImageAlt({
  altEn: 'Bouquet image',
  altTh: 'photo.webp',
  nameEn: 'Garden Rose',
  nameTh: 'กุหลาบสวน',
  compositionEn: 'cream roses',
  compositionTh: 'กุหลาบครีม',
});
assert.equal(ignoresGeneric.altEn, 'Garden Rose with cream roses');
assert.equal(ignoresGeneric.altTh, 'กุหลาบสวน ประกอบด้วย กุหลาบครีม');

const alreadyIncludesName = buildProductImageAlt({
  nameEn: 'Garden Rose',
  compositionEn: 'Garden Rose with peonies',
  nameTh: 'กุหลาบสวน',
  compositionTh: 'กุหลาบสวน ดอกโบตั๋น',
});
assert.equal(alreadyIncludesName.altEn, 'Garden Rose with peonies');
assert.equal(alreadyIncludesName.altTh, 'กุหลาบสวน ดอกโบตั๋น');

const longName = 'Elegant hand-tied bouquet of seasonal garden flowers '.repeat(4);
const truncated = truncateProductImageAlt(longName);
assert.ok(truncated.length <= PRODUCT_IMAGE_ALT_MAX_LENGTH);
assert.equal(truncated.includes('  '), false);

const capped = buildProductImageAlt({
  altEn: `${'pink roses and lily of the valley '.repeat(10)}extra`,
  nameEn: 'Skip',
});
assert.ok(capped.altEn.length <= PRODUCT_IMAGE_ALT_MAX_LENGTH);

assert.equal(
  localizedProductImageAlt(
    {
      altEn: 'English alt',
      altTh: 'ข้อความภาษาไทย',
    },
    'th'
  ),
  'ข้อความภาษาไทย'
);
assert.equal(catalogImageAltLocale('th'), 'th');
assert.equal(catalogImageAltLocale('en'), 'en');
assert.equal(catalogImageAltLocale('zh-hk'), 'en');
assert.equal(
  localizedProductImageAlt(
    {
      altEn: 'English alt',
      altTh: 'ข้อความภาษาไทย',
    },
    'en'
  ),
  'English alt'
);

const attrs = compositionFromCustomAttributes([
  { key: 'composition_en', value: 'teddy bear and balloon' },
  { key: 'composition_th', value: 'ตุ๊กตาหมีและลูกโป่ง' },
]);
assert.equal(attrs.compositionEn, 'teddy bear and balloon');
assert.equal(attrs.compositionTh, 'ตุ๊กตาหมีและลูกโป่ง');

const fallback = buildProductImageAlt({
  nameEn: 'Peony Dream',
  nameTh: 'พีโอนีดรีม',
  compositionEn: 'pink peonies',
  compositionTh: 'พีโอนีชมพู',
});
assert.equal(
  pickStoredImageAlt({ alt: '', alt_th: '' }, 'en', fallback),
  'Peony Dream with pink peonies'
);
assert.equal(
  pickStoredImageAlt({ alt: 'Bouquet image', alt_th: '' }, 'en', fallback),
  'Peony Dream with pink peonies'
);
assert.equal(
  pickStoredImageAlt(
    { alt: 'Peony bouquet on a wooden table', alt_th: 'ช่อพีโอนีบนโต๊ะไม้' },
    'th',
    fallback
  ),
  'ช่อพีโอนีบนโต๊ะไม้'
);
assert.equal(
  pickStoredImageAlt(
    { alt: 'Peony bouquet on a wooden table', alt_th: '' },
    'th',
    fallback
  ),
  'Peony bouquet on a wooden table'
);

console.log('productImageAlt.test.ts: all passed');
