/**
 * Pure unit tests for size-aware line-item image resolution.
 * Run: npx tsx lib/catalog/resolveLineItemImage.test.ts
 */
import assert from 'node:assert/strict';
import type { Bouquet } from '@/lib/bouquets';
import type { BouquetSellableOption } from '@/lib/bouquetOptions';
import { stemVariantKey, type PricingType } from '@/lib/catalog/pricing';
import {
  isUsableLineItemImageUrl,
  resolveBouquetLineItemImageUrl,
  resolveProductLikeLineItemImageUrl,
} from '@/lib/catalog/lineItemImageResolve';

type VariantImageSet = { urls: string[]; alts: string[] };

const IMG_4 = 'https://xxx.supabase.co/storage/v1/object/public/catalog/4-orchids.webp';
const IMG_YELLOW = 'https://xxx.supabase.co/storage/v1/object/public/catalog/yellow.webp';
const IMG_PINK = 'https://xxx.supabase.co/storage/v1/object/public/catalog/pink.webp';

/** Mirror of attachVariantImagesToSellableOptions (avoids server-only import in tests). */
function attachVariantImagesToSellableOptions(
  sizes: BouquetSellableOption[],
  pricingType: PricingType,
  byVariantKey: Map<string, VariantImageSet>
): BouquetSellableOption[] {
  if (!byVariantKey.size) return sizes;

  return sizes.map((opt) => {
    const candidates: string[] = [];
    if (pricingType === 'size_based') {
      const optionId = opt.optionId?.trim() ?? '';
      if (optionId.toLowerCase().startsWith('fixed_')) {
        candidates.push(optionId.slice('fixed_'.length));
      }
      if (opt.key) candidates.push(opt.key);
    } else if (pricingType === 'stem_count' && opt.stemCount != null) {
      candidates.push(stemVariantKey(opt.stemCount));
    }

    let set: VariantImageSet | undefined;
    for (const vk of candidates) {
      if (!vk) continue;
      const hit = byVariantKey.get(vk);
      if (hit?.urls.length) {
        set = hit;
        break;
      }
    }
    if (!set?.urls.length) return opt;
    return { ...opt, imageUrls: set.urls, imageAlts: set.alts };
  });
}

function bouquetFixture(): Bouquet {
  return {
    id: 'b1',
    slug: 'orchids',
    nameEn: 'Orchids',
    nameTh: 'กล้วยไม้',
    descriptionEn: '',
    descriptionTh: '',
    images: [IMG_4, IMG_YELLOW, IMG_PINK],
    imageAlts: ['4', 'yellow', 'pink'],
    sizes: [
      { optionId: 'fixed_four', key: 's', label: '4 Orchids', price: 1000 },
      { optionId: 'fixed_yellow', key: 'm', label: 'Yellow Orchids', price: 1200 },
      { optionId: 'fixed_pink', key: 'l', label: 'Pink Orchids', price: 1200 },
    ],
    status: 'live',
    featuredPopular: false,
    colors: [],
    flowerTypes: [],
    pricingType: 'size_based',
  } as Bouquet;
}

assert.equal(isUsableLineItemImageUrl(IMG_YELLOW), true);
assert.equal(isUsableLineItemImageUrl('data:image/svg+xml,No%20image'), false);
assert.equal(isUsableLineItemImageUrl('https://cdn.sanity.io/images/x.jpg'), false);

const bouquet = bouquetFixture();

assert.equal(
  resolveBouquetLineItemImageUrl(bouquet, 'fixed_yellow', IMG_4),
  IMG_YELLOW,
  'size index mapping must beat wrong snapshot'
);

assert.equal(
  resolveBouquetLineItemImageUrl(bouquet, 'Yellow Orchids', undefined),
  IMG_YELLOW,
  'label-based size resolution'
);

assert.equal(resolveBouquetLineItemImageUrl(bouquet, 'fixed_four', undefined), IMG_4);

const withVariant: Bouquet = {
  ...bouquet,
  sizes: bouquet.sizes.map((s) =>
    s.optionId === 'fixed_yellow' ? { ...s, imageUrls: [IMG_YELLOW] } : s
  ),
};
assert.equal(resolveBouquetLineItemImageUrl(withVariant, 'fixed_yellow', IMG_4), IMG_YELLOW);

assert.equal(resolveProductLikeLineItemImageUrl(IMG_4, IMG_YELLOW), IMG_YELLOW);
assert.equal(resolveProductLikeLineItemImageUrl(IMG_4, undefined), IMG_4);

const attached = attachVariantImagesToSellableOptions(
  bouquet.sizes,
  'size_based',
  new Map([
    ['yellow', { urls: [IMG_YELLOW], alts: ['y'] }],
    ['four', { urls: [IMG_4], alts: ['4'] }],
  ])
);
assert.deepEqual(attached.find((s) => s.optionId === 'fixed_yellow')?.imageUrls, [IMG_YELLOW]);
assert.deepEqual(attached.find((s) => s.optionId === 'fixed_four')?.imageUrls, [IMG_4]);
assert.equal(
  resolveBouquetLineItemImageUrl({ ...bouquet, sizes: attached }, 'fixed_yellow', IMG_4),
  IMG_YELLOW
);

console.log('resolveLineItemImage.test.ts: all passed');
