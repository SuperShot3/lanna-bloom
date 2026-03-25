import 'server-only';

import { readFileSync } from 'fs';
import path from 'path';

export type CatalogItem = {
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

type CatalogIndex = {
  file: CatalogFile;
  byId: Map<string, CatalogItem>;
  bySlug: Map<string, CatalogItem>;
};

let cached: CatalogIndex | null = null;

function normalizeKey(v: string): string {
  return v.trim().toLowerCase();
}

function loadCatalogIndex(): CatalogIndex {
  if (cached) return cached;
  const p = path.join(process.cwd(), 'content', 'catalog', 'catalog.json');
  const raw = readFileSync(p, 'utf8');
  const file = JSON.parse(raw) as CatalogFile;

  const byId = new Map<string, CatalogItem>();
  const bySlug = new Map<string, CatalogItem>();
  for (const item of file.items ?? []) {
    if (item?.id) byId.set(normalizeKey(item.id), item);
    if (item?.slug) bySlug.set(normalizeKey(item.slug), item);
  }

  cached = { file, byId, bySlug };
  return cached;
}

/**
 * Lightweight catalog search for LINE agent tools (slug + names).
 */
export function searchCatalogItems(query: string, limit = 15): CatalogItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const { file } = loadCatalogIndex();
  const { items } = file;
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

export function getCatalogItemById(id: string): CatalogItem | undefined {
  if (!id) return undefined;
  return loadCatalogIndex().byId.get(normalizeKey(id));
}

export function getCatalogItemBySlug(slug: string): CatalogItem | undefined {
  if (!slug) return undefined;
  return loadCatalogIndex().bySlug.get(normalizeKey(slug));
}

export function validateCatalogItemRef(ref: { id?: string; slug?: string }):
  | { ok: true; item: CatalogItem }
  | { ok: false; message: string } {
  const id = typeof ref.id === 'string' ? ref.id.trim() : '';
  const slug = typeof ref.slug === 'string' ? ref.slug.trim() : '';

  if (!id && !slug) {
    return { ok: false, message: 'Missing catalog item reference (id/slug)' };
  }

  const item = id ? getCatalogItemById(id) : undefined;
  const itemBySlug = slug ? getCatalogItemBySlug(slug) : undefined;

  if (id && !item) {
    return { ok: false, message: `Unknown catalog item id: ${id}` };
  }
  if (slug && !itemBySlug) {
    return { ok: false, message: `Unknown catalog item slug: ${slug}` };
  }

  const resolved = item ?? itemBySlug;
  if (!resolved) {
    return { ok: false, message: 'Unknown catalog item' };
  }

  if (id && slug && normalizeKey(resolved.id) !== normalizeKey(id)) {
    return { ok: false, message: `Catalog mismatch: slug ${slug} does not match id ${id}` };
  }
  if (id && slug && normalizeKey(resolved.slug) !== normalizeKey(slug)) {
    return { ok: false, message: `Catalog mismatch: id ${id} does not match slug ${slug}` };
  }

  return { ok: true, item: resolved };
}
