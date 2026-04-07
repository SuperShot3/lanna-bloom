import fs from 'node:fs';
import path from 'node:path';
import { createClient } from 'next-sanity';
import dotenv from 'dotenv';

type CatalogItem = {
  type: 'bouquet' | 'product' | 'plushyToy';
  id: string;
  slug: string;
  nameEn: string;
  nameTh?: string;
  category?: string;
  urlEn: string;
  urlTh: string;
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function toItemUrl(baseUrl: string, lang: 'en' | 'th', slug: string): string {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  return `${cleanBase}/${lang}/catalog/${slug}`;
}

async function main() {
  dotenv.config({ path: path.join(process.cwd(), '.env.local') });

  const projectId = requireEnv('NEXT_PUBLIC_SANITY_PROJECT_ID');
  const dataset = requireEnv('NEXT_PUBLIC_SANITY_DATASET');
  const baseUrl = (process.env.CATALOG_BASE_URL || 'https://lannabloom.shop').replace(/\/+$/, '');

  const client = createClient({
    projectId,
    dataset,
    apiVersion: '2024-01-01',
    useCdn: true,
  });

  const bouquetsQuery = `*[_type == "bouquet" && (!defined(status) || status == "approved")] | order(nameEn asc) {
    _id,
    "slug": coalesce(slug.current, _id),
    nameEn,
    nameTh,
    category
  }`;

  const productsQuery = `*[_type == "product" && moderationStatus == "live"] | order(nameEn asc) {
    _id,
    "slug": coalesce(slug.current, _id),
    nameEn,
    nameTh,
    category
  }`;

  const plushyQuery = `*[_type == "plushyToy"] | order(nameEn asc) {
    _id,
    "slug": coalesce(slug.current, _id),
    nameEn,
    nameTh
  }`;

  const [bouquets, products, plushyToys] = await Promise.all([
    client.fetch<Array<{ _id: string; slug: string; nameEn?: string; nameTh?: string; category?: string }>>(bouquetsQuery),
    client.fetch<Array<{ _id: string; slug: string; nameEn?: string; nameTh?: string; category?: string }>>(productsQuery),
    client.fetch<Array<{ _id: string; slug: string; nameEn?: string; nameTh?: string }>>(plushyQuery),
  ]);

  const items: CatalogItem[] = [
    ...(bouquets ?? []).map((b) => ({
      type: 'bouquet' as const,
      id: b._id,
      slug: b.slug,
      nameEn: b.nameEn ?? '',
      nameTh: b.nameTh,
      category: b.category,
      urlEn: toItemUrl(baseUrl, 'en', b.slug),
      urlTh: toItemUrl(baseUrl, 'th', b.slug),
    })),
    ...(products ?? []).map((p) => ({
      type: 'product' as const,
      id: p._id,
      slug: p.slug,
      nameEn: p.nameEn ?? '',
      nameTh: p.nameTh,
      category: p.category,
      urlEn: toItemUrl(baseUrl, 'en', p.slug),
      urlTh: toItemUrl(baseUrl, 'th', p.slug),
    })),
    ...(plushyToys ?? []).map((p) => ({
      type: 'plushyToy' as const,
      id: p._id,
      slug: p.slug,
      nameEn: p.nameEn ?? '',
      nameTh: p.nameTh,
      category: 'plushy_toys',
      urlEn: toItemUrl(baseUrl, 'en', p.slug),
      urlTh: toItemUrl(baseUrl, 'th', p.slug),
    })),
  ].filter((x) => x.slug && x.nameEn);

  const out = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    sanity: { projectId, dataset },
    counts: {
      total: items.length,
      bouquets: items.filter((i) => i.type === 'bouquet').length,
      products: items.filter((i) => i.type === 'product').length,
      plushyToys: items.filter((i) => i.type === 'plushyToy').length,
    },
    items,
  };

  const outDir = path.join(process.cwd(), 'content', 'catalog');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'catalog.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n', 'utf8');

  // eslint-disable-next-line no-console
  console.log(`[export-catalog] Wrote ${items.length} items to ${outPath}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[export-catalog] Failed:', err);
  process.exitCode = 1;
});

