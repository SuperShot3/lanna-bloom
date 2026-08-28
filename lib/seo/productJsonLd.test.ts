/**
 * Product JSON-LD tests — run with: npm run test:seo
 */
import assert from 'node:assert/strict';
import type { Bouquet } from '@/lib/bouquets';
import type { CatalogProduct } from '@/lib/catalog/types';
import { effectiveCatalogUnitPriceWithExpansion } from '@/lib/catalogDiscount';
import { computeFinalPrice } from '@/lib/partnerPricing';
import {
  buildBouquetProductJsonLd,
  buildCatalogProductJsonLd,
  defaultVisibleOption,
  isGoogleProductJsonLd,
  isMerchantListingEligible,
  isProductSnippetEligible,
  serializeJsonLd,
} from './productJsonLd';

const PAGE = 'https://lannabloom.shop/en/catalog/pink-lilies-bouquet';

const bouquet: Bouquet = {
  id: 'bq_pink_lilies',
  slug: 'pink-lilies-bouquet',
  nameEn: 'Pink Lilies Bouquet',
  nameTh: 'ช่อลิลลี่ชมพู',
  descriptionEn: 'Fresh pink lilies arranged with greenery.',
  descriptionTh: 'ลิลลี่ชมพูสด',
  compositionEn: 'Pink lilies',
  compositionTh: 'ลิลลี่ชมพู',
  images: ['https://cdn.example.com/pink-lilies.jpg'],
  discountPercent: 10,
  sizes: [
    { optionId: 'size_s', key: 's', label: 'S', price: 890, availability: true },
    { optionId: 'size_m', key: 'm', label: 'M', price: 1290, availability: true },
    { optionId: 'size_l', key: 'l', label: 'L', price: 1890, availability: false },
  ],
};

function expectedPrice(
  base: number,
  discount?: number,
  destination: 'CHIANG_MAI' | 'PHUKET' | 'KRABI' | 'BANGKOK' = 'CHIANG_MAI'
) {
  return effectiveCatalogUnitPriceWithExpansion(base, discount, destination);
}

function assertOneProductOneOffer(jsonLd: Record<string, unknown>) {
  assert.equal(jsonLd['@type'], 'Product');
  assert.ok(!('hasVariant' in jsonLd));
  assert.ok(!('productGroupID' in jsonLd));
  assert.notEqual(jsonLd['@type'], 'ProductGroup');
  const offer = jsonLd.offers as Record<string, unknown>;
  assert.equal(offer['@type'], 'Offer');
  assert.ok(!Array.isArray(jsonLd.offers));
  assert.ok(!Array.isArray(offer));
  assert.equal(isGoogleProductJsonLd(jsonLd), true);
}

{
  assert.equal(defaultVisibleOption(bouquet.sizes)?.optionId, 'size_s');
  assert.equal(defaultVisibleOption(bouquet.sizes)?.price, 890);
}

{
  const jsonLd = buildBouquetProductJsonLd(bouquet, 'en', PAGE);
  assert.ok(jsonLd);
  assertOneProductOneOffer(jsonLd);
  assert.equal(jsonLd.name, 'Pink Lilies Bouquet');
  assert.equal(jsonLd.url, PAGE);
  assert.equal(jsonLd.sku, 'bq_pink_lilies');
  assert.deepEqual(jsonLd.brand, { '@type': 'Brand', name: 'Lanna Bloom' });
  assert.deepEqual(jsonLd.image, ['https://cdn.example.com/pink-lilies.jpg']);

  const offer = jsonLd.offers as Record<string, unknown>;
  assert.equal(offer.priceCurrency, 'THB');
  assert.equal(offer.price, expectedPrice(890, 10));
  assert.equal(offer.availability, 'https://schema.org/InStock');
  assert.equal(offer.url, PAGE);
  assert.equal(offer.itemCondition, 'https://schema.org/NewCondition');
  assert.ok(!('shippingDetails' in offer));
  assert.ok(!JSON.stringify(jsonLd).includes('aggregateRating'));
  assert.ok(!JSON.stringify(jsonLd).includes('reviewCount'));
  assert.ok(!JSON.stringify(jsonLd).includes('ProductGroup'));
  assert.equal(isProductSnippetEligible(jsonLd), true);
  assert.equal(isMerchantListingEligible(jsonLd), true);
}

{
  const single: Bouquet = {
    ...bouquet,
    discountPercent: undefined,
    sizes: [{ optionId: 'size_m', key: 'm', label: 'M', price: 1290, availability: true }],
  };
  const jsonLd = buildBouquetProductJsonLd(single, 'en', PAGE);
  assert.ok(jsonLd);
  assertOneProductOneOffer(jsonLd);
  const offer = jsonLd.offers as Record<string, unknown>;
  assert.equal(offer.price, expectedPrice(1290));
  assert.deepEqual(offer.seller, {
    '@type': 'Organization',
    '@id': 'https://lannabloom.shop/#organization',
    name: 'Lanna Bloom',
  });
}

{
  const th = buildBouquetProductJsonLd(
    bouquet,
    'th',
    'https://lannabloom.shop/th/catalog/pink-lilies-bouquet'
  );
  assert.ok(th);
  assertOneProductOneOffer(th);
  assert.equal(th.name, 'ช่อลิลลี่ชมพู');
  assert.equal(th.url, 'https://lannabloom.shop/th/catalog/pink-lilies-bouquet');
  assert.equal((th.offers as Record<string, unknown>).price, expectedPrice(890, 10));
}

{
  const gift: CatalogProduct = {
    id: 'gift_set',
    slug: 'spa-gift-set',
    nameEn: 'Spa Gift Set',
    descriptionEn: 'A relaxing spa set.',
    category: 'gifts',
    price: 790,
    images: ['https://cdn.example.com/spa.jpg'],
    sizes: [
      { optionId: 'small', label: 'Small', price: 790, availability: true },
      { optionId: 'large', label: 'Large', price: 1290, availability: true },
    ],
  };
  const jsonLd = buildCatalogProductJsonLd(
    gift,
    'en',
    'https://lannabloom.shop/en/catalog/spa-gift-set'
  );
  assert.ok(jsonLd);
  assertOneProductOneOffer(jsonLd);
  assert.equal((jsonLd.offers as Record<string, unknown>).price, expectedPrice(790));
  assert.equal(jsonLd.sku, 'gift_set');
}

{
  const toy: CatalogProduct = {
    id: 'prod_bear',
    slug: 'teddy-bear',
    nameEn: 'Teddy Bear',
    category: 'plushy_toys',
    catalogKind: 'plushyToy',
    price: 400,
    cost: 400,
    commissionPercent: 25,
    images: ['https://cdn.example.com/bear.jpg'],
  };
  const jsonLd = buildCatalogProductJsonLd(
    toy,
    'en',
    'https://lannabloom.shop/en/catalog/teddy-bear'
  );
  assert.ok(jsonLd);
  assertOneProductOneOffer(jsonLd);
  assert.equal(
    (jsonLd.offers as Record<string, unknown>).price,
    expectedPrice(computeFinalPrice(400, 25))
  );
}

{
  const marketPage = 'https://lannabloom.shop/en/catalog/phuket/pink-lilies-bouquet';
  const jsonLd = buildBouquetProductJsonLd(bouquet, 'en', marketPage, {
    destinationId: 'PHUKET',
  });
  assert.ok(jsonLd);
  assertOneProductOneOffer(jsonLd);
  assert.equal(
    (jsonLd.offers as Record<string, unknown>).price,
    expectedPrice(890, 10, 'PHUKET')
  );
}

{
  const marketPage = 'https://lannabloom.shop/en/catalog/krabi/pink-lilies-bouquet';
  const jsonLd = buildBouquetProductJsonLd(bouquet, 'en', marketPage, {
    destinationId: 'KRABI',
  });
  assert.ok(jsonLd);
  assertOneProductOneOffer(jsonLd);
  assert.equal(
    (jsonLd.offers as Record<string, unknown>).price,
    expectedPrice(890, 10, 'KRABI')
  );
}

{
  const marketPage = 'https://lannabloom.shop/en/catalog/bangkok/pink-lilies-bouquet';
  const jsonLd = buildBouquetProductJsonLd(bouquet, 'en', marketPage, {
    destinationId: 'BANGKOK',
  });
  assert.ok(jsonLd);
  assertOneProductOneOffer(jsonLd);
  assert.equal(
    (jsonLd.offers as Record<string, unknown>).price,
    expectedPrice(890, 10, 'BANGKOK')
  );
}

{
  const empty: Bouquet = {
    ...bouquet,
    sizes: [{ optionId: 'size_s', key: 's', label: 'S', price: 0, availability: true }],
  };
  assert.equal(buildBouquetProductJsonLd(empty, 'en', PAGE), null);
}

{
  const withScript: Bouquet = {
    ...bouquet,
    discountPercent: undefined,
    descriptionEn: 'Fresh lilies </script><script>alert(1)</script>',
    sizes: [{ optionId: 'size_m', key: 'm', label: 'M', price: 1290, availability: true }],
  };
  const jsonLd = buildBouquetProductJsonLd(withScript, 'en', PAGE);
  assert.ok(jsonLd);
  const raw = serializeJsonLd(jsonLd);
  assert.ok(!raw.includes('</script>'));
  assert.ok(raw.includes('\\u003c'));
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  assertOneProductOneOffer(parsed);
}

{
  const group = {
    '@type': 'ProductGroup',
    name: 'Nope',
    hasVariant: [],
  };
  assert.equal(isGoogleProductJsonLd(group), false);
  assert.equal(isProductSnippetEligible(group), false);
  assert.equal(isMerchantListingEligible(group), false);
}

{
  const arrayOffers = {
    '@type': 'Product',
    name: 'Nope',
    image: ['https://cdn.example.com/x.jpg'],
    offers: [{ '@type': 'Offer', price: 1, priceCurrency: 'THB' }],
  };
  assert.equal(isGoogleProductJsonLd(arrayOffers), false);
}

console.log('productJsonLd.test.ts: all assertions passed');
