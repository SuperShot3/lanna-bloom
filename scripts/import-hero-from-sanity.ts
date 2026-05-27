#!/usr/bin/env npx tsx
/**
 * Import homepage hero + carousel from Sanity siteSettings → Supabase catalog_site_settings.
 *
 * Required env (.env.local):
 *   NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, SANITY_API_WRITE_TOKEN
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   npm run import-hero
 *   npm run import-hero:dry-run
 */
import path from 'node:path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { importHeroFromSanity } from '../lib/catalog/importHeroFromSanity';

config({ path: path.join(process.cwd(), '.env.local') });

const dryRun = process.argv.includes('--dry-run');

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function log(msg: string) {
  // eslint-disable-next-line no-console
  console.log(dryRun ? `[dry-run] ${msg}` : msg);
}

async function main() {
  log('Starting Sanity → Supabase hero import…');

  const supabaseUrl = requireEnv('SUPABASE_URL');
  const supabaseKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(supabaseUrl, supabaseKey);

  const result = await importHeroFromSanity(supabase, { dryRun });
  log(result.message);
  if (!result.imported) {
    process.exitCode = 1;
    return;
  }
  log('Done.');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
