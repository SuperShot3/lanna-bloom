/**
 * Read-only audit of catalog_bouquets pricing / product_kind before pricing_type migration.
 * Run: npx tsx scripts/catalog-audit-pricing-kinds.ts
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import type { CatalogBouquetPricing } from '../lib/catalog/types';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, key);

type Row = {
  id: string;
  slug_en: string;
  pricing_type: string;
  pricing: CatalogBouquetPricing;
};

async function main() {
  const { data, error } = await supabase
    .from('catalog_bouquets')
    .select('id, slug_en, pricing_type, pricing');

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  const rows = (data ?? []) as Row[];
  const byKind: Record<string, number> = {};
  const byPricingType: Record<string, number> = {};
  const customizable: Row[] = [];
  const fixedBouquet: Row[] = [];
  const emptySizes: Row[] = [];

  for (const row of rows) {
    const pt = row.pricing_type ?? '(null)';
    byPricingType[pt] = (byPricingType[pt] ?? 0) + 1;

    const pricing = row.pricing ?? {};
    if ((pricing.customTiers?.length ?? 0) > 0) {
      customizable.push(row);
    }
    if ((pricing.fixedVariants?.length ?? 0) > 0) {
      fixedBouquet.push(row);
    }
    const activeSizes = (pricing.sizes ?? []).filter(
      (s) => s.enabled !== false && ((s.price ?? 0) > 0 || s.availability !== false)
    );
    if (row.pricing_type === 'single_price' && activeSizes.length === 0 && !pricing.price) {
      emptySizes.push(row);
    }
  }

  console.log('\n=== catalog_bouquets pricing audit ===\n');
  console.log('Total bouquets:', rows.length);
  console.log('\nBy pricing_type:');
  console.table(byPricingType);

  if (customizable.length) {
    console.log(`\n⚠ customizable_bouquet / customTiers (${customizable.length}) — review manually:`);
    customizable.slice(0, 20).forEach((r) => console.log(`  - ${r.slug_en} (${r.id})`));
    if (customizable.length > 20) console.log(`  ... and ${customizable.length - 20} more`);
  }

  if (fixedBouquet.length) {
    console.log(`\nfixed_bouquet / fixedVariants (${fixedBouquet.length}) — will map to size_based`);
  }

  if (emptySizes.length) {
    console.log(`\nlegacy with no active sizes (${emptySizes.length}):`);
    emptySizes.slice(0, 10).forEach((r) => console.log(`  - ${r.slug_en}`));
  }

  console.log('\nDone.\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
