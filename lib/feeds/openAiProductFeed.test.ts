/**
 * OpenAI product feed tests — run with: npm run test:feeds
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Bouquet } from '@/lib/bouquets';
import type { CatalogProduct } from '@/lib/catalog/types';
import { applyCatalogDiscountThb } from '@/lib/catalogDiscount';
import { compactFeedId, formatFeedPrice } from '@/lib/feeds/googleMerchantFeed';
import {
  buildOpenAiProductFeed,
  FEED_DELIVERY_NOTE,
  OPENAI_FEED_HEADERS,
} from '@/lib/feeds/openAiProductFeed';

function parseCsv(csv: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < csv.length; i += 1) {
    const ch = csv[i]!;
    if (ch === '"') {
      if (inQuotes && csv[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === '\n' && !inQuotes) {
      lines.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  if (current) lines.push(current);

  const headers = (lines[0] ?? '').split(',');
  const rows = lines.slice(1).map((line) => {
    const values: string[] = [];
    let field = '';
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i]!;
      if (ch === '"') {
        if (quoted && line[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = !quoted;
        }
        continue;
      }
      if (ch === ',' && !quoted) {
        values.push(field);
        field = '';
        continue;
      }
      field += ch;
    }
    values.push(field);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? '';
    });
    return row;
  });
  return { headers, rows };
}

function fixtureBouquet(overrides: Partial<Bouquet> = {}): Bouquet {
  return {
    id: 'bq_pink_lilies',
    slug: 'pink-lilies-bouquet',
    productCode: 'LB-001',
    nameEn: 'Pink Lilies Bouquet',
    nameTh: 'ช่อลิลลี่ชมพู',
    descriptionEn: 'Fresh pink lilies arranged with greenery.',
    descriptionTh: 'ลิลลี่ชมพูสด',
    compositionEn: 'Pink lilies, eucalyptus',
    compositionTh: 'ลิลลี่ชมพู ยูคาลิปตัส',
    images: ['https://cdn.example.com/pink-lilies.jpg', 'https://cdn.example.com/pink-lilies-2.jpg'],
    sizes: [
      { optionId: 'size_s', key: 's', label: 'S', price: 890, availability: true },
      { optionId: 'size_m', key: 'm', label: 'M', price: 1290, availability: true },
      { optionId: 'size_l', key: 'l', label: 'L', price: 1890, availability: false },
    ],
    ...overrides,
  };
}

function fixtureProduct(overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    id: 'prod_bear',
    slug: 'teddy-bear',
    productCode: 'LB-010',
    nameEn: 'Teddy Bear',
    descriptionEn: 'Soft plush teddy bear.',
    category: 'plushy_toys',
    catalogKind: 'plushyToy',
    price: 590,
    images: ['https://cdn.example.com/bear.jpg'],
    ...overrides,
  };
}

const CITY_TITLE_PATTERN = /Chiang Mai|Phuket|Pattaya|Bangkok|Krabi|Samui|Hua Hin/i;

{
  const { csv, rowCount, skipped } = buildOpenAiProductFeed({
    bouquets: [fixtureBouquet()],
    products: [],
  });
  const { headers, rows } = parseCsv(csv);

  assert.deepEqual(headers, [...OPENAI_FEED_HEADERS]);
  assert.equal(rowCount, 3);
  assert.equal(skipped.length, 0);
  assert.equal(rows.length, 3);

  assert.equal(rows[0]!.item_group_id, 'pink-lilies-bouquet');
  assert.equal(rows[0]!.item_group_title, 'Pink Lilies Bouquet');
  assert.equal(rows[0]!.title, 'Pink Lilies Bouquet — S');
  assert.equal(rows[1]!.title, 'Pink Lilies Bouquet — M');
  assert.equal(rows[2]!.title, 'Pink Lilies Bouquet — L');
  assert.equal(rows[0]!.id, compactFeedId('bq_pink_lilies_size_s'));
  assert.equal(rows[0]!.price, formatFeedPrice(890));
  assert.equal(rows[1]!.price, formatFeedPrice(1290));
  assert.equal(rows[2]!.availability, 'out_of_stock');
  assert.equal(rows[0]!.availability, 'in_stock');
  assert.equal(rows[0]!.mpn, 'LB-001');
  assert.equal(rows[0]!.identifier_exists, 'yes');
  assert.equal(rows[0]!.is_eligible_search, 'true');
  assert.equal(rows[0]!.is_eligible_checkout, 'false');
  assert.equal(rows[0]!.target_countries, 'TH');
  assert.equal(rows[0]!.store_country, 'TH');
  assert.equal(rows[0]!.brand, 'Lanna Bloom');
  assert.equal(rows[0]!.seller_name, 'Lanna Bloom');
  assert.equal(rows[0]!.link, 'https://lannabloom.shop/en/catalog/pink-lilies-bouquet');
  assert.equal(rows[0]!.image_link, 'https://cdn.example.com/pink-lilies.jpg');
  assert.equal(rows[0]!.additional_image_link, 'https://cdn.example.com/pink-lilies-2.jpg');
  assert.ok(rows[0]!.description.includes('Fresh pink lilies'));
  assert.ok(rows[0]!.description.includes(FEED_DELIVERY_NOTE));
  assert.equal(rows[0]!.shipping, undefined);
  assert.ok(!('shipping' in rows[0]!));
  for (const row of rows) {
    assert.ok(!CITY_TITLE_PATTERN.test(row.title));
  }
}

{
  const excluded = fixtureBouquet({
    id: 'bq_phuket_only',
    slug: 'tropical-orchids',
    nameEn: 'Tropical Orchids',
    excludedDeliveryDestinations: ['CHIANG_MAI'],
    sizes: [{ optionId: 'size_m', key: 'm', label: 'M', price: 1500, availability: true }],
  });
  const { rows } = parseCsv(
    buildOpenAiProductFeed({ bouquets: [excluded], products: [] }).csv
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.title, 'Tropical Orchids — M');
  assert.equal(rows[0]!.item_group_id, '');
  assert.ok(!rows[0]!.title.includes('Chiang Mai'));
  assert.ok(!rows[0]!.description.includes('Chiang Mai'));
}

{
  const discounted = fixtureBouquet({
    discountPercent: 10,
    sizes: [{ optionId: 'size_m', key: 'm', label: 'M', price: 1000, availability: true }],
  });
  const { rows } = parseCsv(
    buildOpenAiProductFeed({ bouquets: [discounted], products: [] }).csv
  );
  assert.equal(rows[0]!.price, formatFeedPrice(1000));
  assert.equal(rows[0]!.sale_price, formatFeedPrice(applyCatalogDiscountThb(1000, 10)));
  assert.equal(rows[0]!.sale_price, formatFeedPrice(900));
}

{
  const gift = fixtureProduct({
    id: 'gift_set',
    slug: 'spa-gift-set',
    nameEn: 'Spa Gift Set',
    category: 'gifts',
    catalogKind: 'product',
    price: 790,
    sizes: [
      { optionId: 'small', label: 'Small', price: 790, availability: true },
      { optionId: 'large', label: 'Large', price: 1290, availability: true },
    ],
  });
  const { rows } = parseCsv(
    buildOpenAiProductFeed({ bouquets: [], products: [gift] }).csv
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[0]!.item_group_id, 'spa-gift-set');
  assert.equal(rows[0]!.title, 'Spa Gift Set — Small');
  assert.equal(rows[1]!.title, 'Spa Gift Set — Large');
  assert.equal(rows[0]!.price, formatFeedPrice(790));
  assert.equal(rows[1]!.price, formatFeedPrice(1290));
  assert.equal(rows[0]!.mpn, 'LB-010');
  assert.equal(rows[0]!.identifier_exists, 'yes');
  assert.equal(rows[0]!.is_eligible_checkout, 'false');
}

{
  const toy = fixtureProduct();
  const { rows } = parseCsv(
    buildOpenAiProductFeed({ bouquets: [], products: [toy] }).csv
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.title, 'Teddy Bear');
  assert.equal(rows[0]!.item_group_id, '');
  assert.equal(rows[0]!.price, formatFeedPrice(590));
  assert.equal(rows[0]!.sale_price, '');
  assert.equal(rows[0]!.link, 'https://lannabloom.shop/en/catalog/teddy-bear');
}

{
  const missingImage = fixtureBouquet({
    id: 'bq_no_img',
    images: ['data:image/svg+xml,placeholder'],
  });
  const { csv, skipped } = buildOpenAiProductFeed({
    bouquets: [missingImage],
    products: [],
  });
  const { rows } = parseCsv(csv);
  assert.equal(rows.length, 0);
  assert.equal(skipped[0]!.reason, 'missing_image');
}

{
  const src = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), 'openAiProductFeed.ts'),
    'utf8'
  );
  assert.ok(
    !src.includes('CHIANG_MAI'),
    'OpenAI feed must not skip or label products as Chiang Mai-only'
  );
  assert.ok(!src.includes('bouquetIsAvailableForDestination'));
  assert.ok(!src.includes("from '@/lib/delivery/markets'"));
  assert.ok(!src.includes("from '@/lib/provinces"));
  assert.ok(!src.includes('FEED_SHIPPING'));
  assert.ok(!/Chiang Mai|Phuket|Pattaya/.test(src));
}

{
  const robots = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../../app/robots.ts'),
    'utf8'
  );
  assert.ok(robots.includes("allow: '/'"));
}

console.log('openAiProductFeed.test.ts: all assertions passed');
