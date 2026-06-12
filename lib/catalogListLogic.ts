/**
 * Shared catalog list/filter/popular ordering (Sanity + Supabase storefront reads).
 */
import type { Bouquet } from '@/lib/bouquets';
import {
  bouquetMatchesStemBucket,
  minPriceFromOptions,
  type StemBucketKey,
} from '@/lib/bouquetOptions';
import { bouquetIsAvailableForDestination } from '@/lib/bouquetDestinationAvailability';
import type { DeliveryDestinationId } from '@/lib/delivery/markets';
import type { CatalogProduct } from '@/lib/catalog/types';

export interface CatalogFilterParams {
  topCategory?: string;
  category?: string;
  colors?: string[];
  types?: string[];
  occasion?: string;
  min?: number;
  max?: number;
  sort?: 'newest' | 'price_asc' | 'price_desc';
  delivery?: string[];
  formats?: string[];
  stemBucket?: StemBucketKey;
  catalogDeliveryDestination?: DeliveryDestinationId;
}

export type PopularCatalogItem =
  | { itemType: 'bouquet'; item: Bouquet }
  | { itemType: 'product'; item: CatalogProduct };

export function dedupeBouquetsById(bouquets: Bouquet[]): Bouquet[] {
  const seen = new Set<string>();
  const out: Bouquet[] = [];
  for (const b of bouquets) {
    if (seen.has(b.id)) continue;
    seen.add(b.id);
    out.push(b);
  }
  return out;
}

export function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getPopularShuffleSeed(): number {
  const d = new Date();
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}

export function shuffleArraySeeded<T>(arr: T[], random: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function buildInterleavedPopularBouquets(bouquets: Bouquet[]): Bouquet[] {
  if (bouquets.length === 0) return [];

  const bouquetsWithPrice = bouquets.map((b) => ({
    bouquet: b,
    minPrice: minPriceFromOptions(b.sizes),
  }));

  bouquetsWithPrice.sort((a, b) => a.minPrice - b.minPrice);

  const n = bouquetsWithPrice.length;
  const nCheap = Math.ceil(n / 3);
  const nMid = Math.ceil((n - nCheap) / 2);

  const cheap = bouquetsWithPrice.slice(0, nCheap);
  const middle = bouquetsWithPrice.slice(nCheap, nCheap + nMid);
  const expensive = bouquetsWithPrice.slice(nCheap + nMid).reverse();

  const interleaved: Bouquet[] = [];
  const maxLength = Math.max(expensive.length, middle.length, cheap.length);

  for (let i = 0; i < maxLength; i++) {
    if (i < expensive.length) interleaved.push(expensive[i].bouquet);
    if (i < cheap.length) interleaved.push(cheap[i].bouquet);
    if (i < middle.length) interleaved.push(middle[i].bouquet);
  }

  return dedupeBouquetsById(interleaved);
}

export function orderPopularBouquetsWithFeaturedFirst(bouquets: Bouquet[]): Bouquet[] {
  if (bouquets.length === 0) return [];
  const pinned = bouquets
    .filter((b) => b.featuredPopular)
    .sort((a, b) => (a.nameEn || '').localeCompare(b.nameEn || '', undefined, { sensitivity: 'base' }));
  const pinnedIds = new Set(pinned.map((p) => p.id));
  const rest = bouquets.filter((b) => !pinnedIds.has(b.id));
  const interleaved = buildInterleavedPopularBouquets(rest);
  const rng = mulberry32(getPopularShuffleSeed());
  const shuffledRest = shuffleArraySeeded([...interleaved], rng);
  return [...pinned, ...shuffledRest];
}

export function matchesFilters(bouquet: Bouquet, params: CatalogFilterParams): boolean {
  if (params.colors?.length) {
    const bColors = bouquet.colors ?? [];
    if (!params.colors.some((c) => bColors.includes(c))) return false;
  }
  if (params.types?.length) {
    const bTypes = bouquet.flowerTypes ?? [];
    if (!params.types.some((t) => bTypes.includes(t))) return false;
  }
  if (params.occasion) {
    const bOccasions = bouquet.occasion ?? [];
    if (!bOccasions.includes(params.occasion)) return false;
  }
  if (params.delivery?.length) {
    const bDel = bouquet.deliveryOptions ?? [];
    if (!params.delivery.some((d) => bDel.includes(d))) return false;
  }
  if (params.formats?.length) {
    const bFmt = bouquet.presentationFormats ?? [];
    if (!params.formats.some((f) => bFmt.includes(f))) return false;
  }
  if (params.stemBucket && !bouquetMatchesStemBucket(bouquet.sizes, params.stemBucket)) {
    return false;
  }
  if (params.min != null && params.min > 0) {
    if (minPriceFromOptions(bouquet.sizes) < params.min) return false;
  }
  if (params.max != null && params.max > 0) {
    if (minPriceFromOptions(bouquet.sizes) > params.max) return false;
  }
  return true;
}

export function filterBouquetsCatalogData(
  allBouquets: Bouquet[],
  params: CatalogFilterParams
): { bouquets: Bouquet[]; allBouquets: Bouquet[] } {
  let scoped = allBouquets;
  const dest = params.catalogDeliveryDestination;
  if (dest) {
    scoped = scoped.filter((b) => bouquetIsAvailableForDestination(b, dest));
  }
  const unfilteredForFacets = scoped;
  let filtered = scoped.filter((b) => matchesFilters(b, params));

  const sort = params.sort || 'newest';
  if (sort === 'newest') {
    const interleaved = buildInterleavedPopularBouquets(filtered);
    const rng = mulberry32(getPopularShuffleSeed());
    return {
      bouquets: shuffleArraySeeded([...interleaved], rng),
      allBouquets: unfilteredForFacets,
    };
  }
  if (sort === 'price_asc') {
    filtered = [...filtered].sort((a, b) => minPriceFromOptions(a.sizes) - minPriceFromOptions(b.sizes));
  } else if (sort === 'price_desc') {
    filtered = [...filtered].sort((a, b) => minPriceFromOptions(b.sizes) - minPriceFromOptions(a.sizes));
  }
  return { bouquets: dedupeBouquetsById(filtered), allBouquets: unfilteredForFacets };
}

export function getPopularCatalogCategory(item: PopularCatalogItem): string {
  if (item.itemType === 'bouquet') return 'flowers';
  if (item.item.catalogKind === 'plushyToy' || item.item.category === 'plushy_toys') return 'plushy_toys';
  if (item.item.catalogKind === 'balloon' || item.item.category === 'balloons') return 'balloons';
  return item.item.category || 'other';
}

export function interleavePopularCatalogItems(items: PopularCatalogItem[]): PopularCatalogItem[] {
  const categoryOrder = ['plushy_toys', 'balloons', 'gifts', 'money_flowers', 'handmade_floral'];
  const groups = new Map<string, PopularCatalogItem[]>();

  for (const item of items) {
    const key = getPopularCatalogCategory(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  const order = [
    ...categoryOrder.filter((key) => groups.has(key)),
    ...Array.from(groups.keys()).filter((key) => !categoryOrder.includes(key)).sort(),
  ];
  const interleaved: PopularCatalogItem[] = [];
  let added = true;

  while (added) {
    added = false;
    for (const key of order) {
      const next = groups.get(key)?.shift();
      if (!next) continue;
      interleaved.push(next);
      added = true;
    }
  }

  return interleaved;
}

export function sortCatalogProducts(
  products: CatalogProduct[],
  sort: 'newest' | 'price_asc' | 'price_desc',
  createdAtById: Map<string, string>
): CatalogProduct[] {
  const withMeta = products.map((p) => ({
    product: p,
    partnerCost: p.cost ?? p.price,
    createdAt: createdAtById.get(p.id) ?? '',
  }));
  if (sort === 'price_asc') {
    withMeta.sort((a, b) => a.partnerCost - b.partnerCost);
  } else if (sort === 'price_desc') {
    withMeta.sort((a, b) => b.partnerCost - a.partnerCost);
  } else {
    withMeta.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  return withMeta.map((row) => row.product);
}
