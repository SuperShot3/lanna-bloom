/**
 * Shared-cart Open Graph copy (product + cart text, never Chiang Mai).
 * Run: npx tsx lib/cart/sharedCartShareMetadata.test.ts
 */
import assert from 'node:assert/strict';
import type { CartItem } from '@/contexts/CartContext';
import {
  buildCartPageMetadata,
  buildSharedCartShareCopy,
  cartLineDisplayName,
  sharedCartOgImage,
} from './sharedCartShareMetadata';
import { DEFAULT_SHARE_IMAGE_PATH } from '@/lib/seo/shareMetadata';

const emptyAddOns = {
  cardType: null,
  cardMessage: '',
  wrappingPreference: null,
  paperColor: null,
  productAddOns: {},
} as CartItem['addOns'];

function item(partial: Partial<CartItem> & Pick<CartItem, 'bouquetId' | 'nameEn'>): CartItem {
  return {
    slug: partial.slug ?? 'rose',
    nameTh: partial.nameTh ?? partial.nameEn,
    size: partial.size ?? {
      optionId: 'std',
      key: 'm',
      label: 'Standard',
      price: 990,
      availability: true,
    },
    addOns: emptyAddOns,
    itemType: 'bouquet',
    quantity: 1,
    ...partial,
  };
}

{
  const roses = item({
    bouquetId: 'b1',
    nameEn: 'Pink roses',
    nameTh: 'กุหลาบชมพู',
    imageUrl: 'https://cdn.example.com/roses.webp',
  });
  assert.equal(cartLineDisplayName(roses, 'en'), 'Pink roses');
  assert.equal(cartLineDisplayName(roses, 'th'), 'กุหลาบชมพู');

  const one = buildSharedCartShareCopy([roses], 'en');
  assert.ok(one.title.includes('Pink roses'));
  assert.ok(one.title.includes('Your cart'));
  assert.ok(!/Chiang Mai|เชียงใหม่/i.test(one.title + one.description));
  assert.ok(/shared cart/i.test(one.description));

  const two = buildSharedCartShareCopy(
    [roses, item({ bouquetId: 'b2', nameEn: 'Lilies' })],
    'en'
  );
  assert.ok(two.title.includes('+ 1 more'));
  assert.ok(two.description.includes('1 more'));

  const th = buildSharedCartShareCopy([roses], 'th');
  assert.ok(th.title.includes('กุหลาบชมพู'));
  assert.ok(!/Chiang Mai|เชียงใหม่/i.test(th.title + th.description));
}

{
  const og = sharedCartOgImage([
    item({
      bouquetId: 'b1',
      nameEn: 'Roses',
      imageUrl: 'data:image/svg+xml,x',
    }),
    item({
      bouquetId: 'b2',
      nameEn: 'Lilies',
      imageUrl: 'https://cdn.example.com/lilies.webp',
    }),
  ]);
  assert.equal(og?.url, 'https://cdn.example.com/lilies.webp');
}

{
  const roses = item({
    bouquetId: 'b1',
    nameEn: 'Pink roses',
    imageUrl: 'https://cdn.example.com/roses.webp',
  });
  const meta = buildCartPageMetadata({
    lang: 'en',
    shareToken: 'abc_share_token_1',
    items: [roses],
  });
  const ogImages = meta.openGraph?.images;
  const first = Array.isArray(ogImages) ? ogImages[0] : ogImages;
  const url =
    typeof first === 'string'
      ? first
      : first && typeof first === 'object' && 'url' in first
        ? String(first.url)
        : '';
  assert.ok(url.includes('cdn.example.com/roses.webp'), url);
  assert.ok(!url.includes(DEFAULT_SHARE_IMAGE_PATH));
  assert.ok(String(meta.title).includes('Pink roses'));
  assert.ok(!/Chiang Mai|เชียงใหม่/i.test(String(meta.title) + String(meta.description)));
  assert.ok(String(meta.openGraph?.url).includes('share=abc_share_token_1'));
}

{
  const meta = buildCartPageMetadata({
    lang: 'en',
    shareToken: null,
    items: null,
  });
  const ogImages = meta.openGraph?.images;
  const serialized = JSON.stringify(ogImages ?? []);
  assert.ok(!serialized.includes(DEFAULT_SHARE_IMAGE_PATH));
  assert.ok(!/Chiang Mai|เชียงใหม่/i.test(String(meta.title) + String(meta.description)));
  assert.ok(String(meta.title).includes('Your cart'));
}

console.log('sharedCartShareMetadata.test.ts: all assertions passed');
