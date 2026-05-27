/**
 * One-time data migration: product_kind + pricing JSON → pricing_type + normalized pricing.
 * Run after applying supabase/migrations/20260527120000_catalog_pricing_type.sql
 *
 *   npx tsx scripts/migrate-catalog-pricing.ts
 *   npx tsx scripts/migrate-catalog-pricing.ts --dry-run
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import type { CatalogBouquetPricing } from '../lib/catalog/types';
import {
  normalizePricingJson,
  pricingPayloadForSave,
  resolvePricingType,
  type PricingType,
} from '../lib/catalog/pricing';

const dryRun = process.argv.includes('--dry-run');
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  const { data, error } = await supabase
    .from('catalog_bouquets')
    .select('id, slug_en, pricing_type, pricing');

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  let updated = 0;
  for (const row of data ?? []) {
    const pricing = (row.pricing ?? {}) as CatalogBouquetPricing;
    const pricingType: PricingType =
      row.pricing_type ?? resolvePricingType({ pricing });
    const normalized = normalizePricingJson(pricingType, pricing);
    const payload = pricingPayloadForSave(pricingType, {
      singlePrice: normalized.price,
      sizes: normalized.sizes,
      stemOptions: normalized.stemOptions,
    });

    if (dryRun) {
      console.log(`${row.slug_en}: → ${pricingType}`);
      continue;
    }

    const { error: upErr } = await supabase
      .from('catalog_bouquets')
      .update({
        pricing_type: pricingType,
        pricing: payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id);

    if (upErr) {
      console.error(`Failed ${row.slug_en}:`, upErr.message);
    } else {
      updated++;
    }
  }

  console.log(dryRun ? `Dry run: ${data?.length ?? 0} rows inspected` : `Updated ${updated} bouquets`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
