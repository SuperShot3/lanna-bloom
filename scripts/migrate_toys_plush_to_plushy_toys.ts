#!/usr/bin/env npx tsx
/**
 * One-time migration: convert product.category from "toys_plush" → "plushy_toys".
 *
 * Requires: NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, SANITY_API_WRITE_TOKEN
 *
 * Usage:
 * - npx tsx scripts/migrate_toys_plush_to_plushy_toys.ts
 *
 * Safe to re-run: it only updates documents still using "toys_plush".
 */
import { config } from 'dotenv';
import { createClient } from '@sanity/client';

config({ path: '.env.local' });

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
const token = process.env.SANITY_API_WRITE_TOKEN;

if (!projectId || !dataset || !token) {
  console.error(
    'Set NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, and SANITY_API_WRITE_TOKEN in .env.local'
  );
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  token,
  useCdn: false,
});

async function migrate() {
  const docs = await client.fetch<Array<{ _id: string; category?: string }>>(
    `*[_type == "product" && category == "toys_plush"] { _id, category }`
  );

  if (!docs.length) {
    console.log('No products found with category "toys_plush". Nothing to migrate.');
    return;
  }

  let updated = 0;
  for (const doc of docs) {
    await client.patch(doc._id).set({ category: 'plushy_toys' }).commit();
    updated++;
    console.log(`Updated ${doc._id}: toys_plush → plushy_toys`);
  }

  console.log(`\nDone. Updated ${updated} products.`);
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});

