/**
 * Product JSON-LD tests — run with: npm run test:seo
 */
import assert from 'node:assert/strict';
import type { Bouquet } from '@/lib/bouquets';
import type { CatalogProduct } from '@/lib/catalog/types';
import { applyCatalogDiscountThb } from '@/lib/catalogDiscount';
import {
  buildBouquetProductJsonLd,
  buildCatalogProductJsonLd,
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

{
  const jsonLd = buildBouquetProductJsonLd(bouquet, 'en', PAGE);
  assert.equal(jsonLd['@type'], 'Product');
  assert.equal(jsonLd.name, 'Pink Lilies Bouquet');
  assert.deepEqual(jsonLd.brand, { '@type': 'Brand', name: 'Lanna Bloom' });
  assert.deepEqual(jsonLd.areaServed, { '@type': 'Country', name: 'Thailand' });
  assert.ok(!JSON.stringify(jsonLd.areaServed).includes('Chiang Mai'));

  const offers = jsonLd.offers as Record<string, unknown>[];
  assert.ok(Array.isArray(offers));
  assert.equal(offers.length, 3);
  assert.equal(offers[0]!['@type'], 'Offer');
  assert.equal(offers[0]!.priceCurrency, 'THB');
  assert.equal(offers[0]!.price, applyCatalogDiscountThb(890, 10));
  assert.equal(offers[1]!.price, applyCatalogDiscountThb(1290, 10));
  assert.equal(offers[0]!.availability, 'https://schema.org/InStock');
  assert.equal(offers[2]!.availability, 'https://schema.org/OutOfStock');
  assert.equal(offers[0]!.url, PAGE);
  assert.equal(offers[0]!.sku, 'bq_pink_lilies_size_s');
  assert.ok(!('shippingDetails' in offers[0]!));
}

{
  const single: Bouquet = {
    ...bouquet,
    discountPercent: undefined,
    sizes: [{ optionId: 'size_m', key: 'm', label: 'M', price: 1290, availability: true }],
  };
  const jsonLd = buildBouquetProductJsonLd(single, 'en', PAGE);
  const offer = jsonLd.offers as Record<string, unknown>;
  assert.equal(offer['@type'], 'Offer');
  assert.ok(!Array.isArray(offer));
  assert.equal(offer.price, 1290);
  assert.equal(offer.availability, 'https://schema.org/InStock');
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
  assert.equal(jsonLd['@type'], 'Product');
  assert.deepEqual(jsonLd.areaServed, { '@type': 'Country', name: 'Thailand' });
  const offers = jsonLd.offers as Record<string, unknown>[];
  assert.equal(offers.length, 2);
  assert.equal(offers[0]!.price, 790);
  assert.equal(offers[1]!.sku, 'gift_set_large');
}

{
  const toy: CatalogProduct = {
    id: 'prod_bear',
    slug: 'teddy-bear',
    nameEn: 'Teddy Bear',
    category: 'plushy_toys',
    catalogKind: 'plushyToy',
    price: 590,
    images: ['https://cdn.example.com/bear.jpg'],
  };
  const jsonLd = buildCatalogProductJsonLd(
    toy,
    'en',
    'https://lannabloom.shop/en/catalog/teddy-bear'
  );
  const offer = jsonLd.offers as Record<string, unknown>;
  assert.equal(offer['@type'], 'Offer');
  assert.equal(offer.price, 590);
  assert.equal(offer.sku, 'prod_bear_default');
}

console.log('productJsonLd.test.ts: all assertions passed');
