import 'server-only';

import { readFileSync } from 'fs';
import path from 'path';

type CatalogItem = {
  type: string;
  id: string;
  slug: string;
  nameEn: string;
  nameTh: string;
  category?: string;
};

type CatalogFile = {
  items: CatalogItem[];
};

let cached: CatalogFile | null = null;

function loadCatalog(): CatalogFile {
  if (cached) return cached;
  const p = path.join(process.cwd(), 'content', 'catalog', 'catalog.json');
  const raw = readFileSync(p, 'utf8');
  cached = JSON.parse(raw) as CatalogFile;
  return cached;
}

/**
 * Lightweight catalog search for LINE agent tools (slug + names).
 */
export function searchCatalogItems(query: string, limit = 15): CatalogItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const { items } = loadCatalog();
  const scored: { item: CatalogItem; score: number }[] = [];

  for (const item of items) {
    const hay = `${item.slug} ${item.nameEn} ${item.nameTh} ${item.category ?? ''}`.toLowerCase();
    if (hay.includes(q)) {
      let score = hay.indexOf(q);
      if (item.slug.toLowerCase() === q) score = -100;
      scored.push({ item, score });
    }
  }

  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, limit).map((s) => s.item);
}
