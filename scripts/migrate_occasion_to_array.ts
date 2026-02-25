#!/usr/bin/env npx tsx
/**
 * Optional migration: convert bouquet.occasion from string to array.
 *
 * - Single string → [string]
 * - Existing array → unchanged (skipped)
 * - undefined/null → unchanged (skipped)
 *
 * Requires: NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, SANITY_API_WRITE_TOKEN
 *
 * Usage: npx tsx scripts/migrate_occasion_to_array.ts
 *
 * Safe to re-run: skips documents that already have array type.
 * Does NOT delete or overwrite existing data.
 */

import { config } from 'dotenv';
import { createClient } from '@sanity/client';

// Load .env.local so env vars are available when running via npx tsx
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
  const docs = await client.fetch<
    { _id: string; occasion: string | string[] | undefined }[]
  >(`*[_type == "bouquet"] { _id, occasion }`);

  let updated = 0;
  let skipped = 0;

  for (const doc of docs) {
    const o = doc.occasion;
    if (o === undefined || o === null) {
      skipped++;
      continue;
    }
    if (Array.isArray(o)) {
      skipped++;
      continue;
    }

    await client.patch(doc._id).set({ occasion: [o] }).commit();
    updated++;
    console.log(`Migrated ${doc._id}: "${o}" → ["${o}"]`);
  }

  console.log(`\nDone. Updated ${updated} documents, skipped ${skipped}.`);
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
