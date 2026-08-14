/**
 * Storefront catalog reads — Supabase only. No other catalog backend is supported.
 */
import 'server-only';

import {
  getBalloonByIdFromCatalog,
  getBalloonsFilteredFromCatalog,
  getBalloonBySlugFromCatalog,
  getBouquetByIdFromCatalog,
  getBouquetBySlugFromCatalog,
  getBouquetsCatalogDataFromCatalog,
  getBouquetsFilteredFromCatalog,
  getBouquetsFromCatalog,
  getBouquetSitemapEntriesFromCatalog,
  getSimilarBouquetsFromCatalog,
  getBouquetsFromCatalogPaginated,
  getHeroCarouselImagesFromCatalog,
  getHeroImageFromCatalog,
  type CatalogHeroCarouselSlide,
  getPlushyToyByIdFromCatalog,
  getPlushyToysFilteredFromCatalog,
  getPlushyToyBySlugFromCatalog,
  getPopularBouquetsFromCatalogPaginated,
  getPopularCatalogItemsFromCatalogPaginated,
  getHomeFlowerTypeSectionsFromCatalog,
  getHomeFlowerTypeTilesFromCatalog,
  getProductByIdFromCatalog,
  getProductBySlugFromCatalog,
  getProductsFilteredFromCatalog,
  isCatalogReadFromSupabase,
} from '@/lib/catalog';
import type { CatalogProduct } from '@/lib/catalog/types';
import type { CatalogFilterParams, PopularCatalogItem } from '@/lib/catalogListLogic';
import type { HomeFlowerTypeSection, HomeFlowerTypeTile } from '@/lib/catalog';
import type { Bouquet } from '@/lib/bouquets';
import type { BouquetSitemapEntry } from '@/lib/catalog';
import type { DeliveryDestinationId } from '@/lib/delivery/markets';
import { attachSoldCount, attachSoldCounts, getPaidSalesCountMap } from '@/lib/catalog/paidSalesCounts';
import { attachPublicSoldCount } from '@/lib/catalog/paidSalesCountsLogic';

function catalogReadNotConfigured(): never {
  throw new Error(
    'Catalog reads require Supabase — remove any non-default CATALOG_READ_SOURCE value from env.'
  );
}

export async function getCatalogBouquets(): Promise<Bouquet[]> {
  if (!isCatalogReadFromSupabase()) catalogReadNotConfigured();
  return attachSoldCounts(await getBouquetsFromCatalog());
}

export async function getCatalogBouquetSitemapEntries(): Promise<BouquetSitemapEntry[]> {
  if (!isCatalogReadFromSupabase()) catalogReadNotConfigured();
  return getBouquetSitemapEntriesFromCatalog();
}

export async function getCatalogSimilarBouquets(
  source: Bouquet,
  limit = 3
): Promise<Bouquet[]> {
  if (!isCatalogReadFromSupabase()) catalogReadNotConfigured();
  return attachSoldCounts(await getSimilarBouquetsFromCatalog(source, limit));
}

export async function getCatalogBouquetsPaginated(
  start: number,
  limit: number,
  catalogDestination: DeliveryDestinationId = 'CHIANG_MAI'
): Promise<Bouquet[]> {
  if (!isCatalogReadFromSupabase()) catalogReadNotConfigured();
  return attachSoldCounts(
    await getBouquetsFromCatalogPaginated(start, limit, catalogDestination)
  );
}

export async function getCatalogBouquetBySlug(slug: string): Promise<Bouquet | null> {
  if (!isCatalogReadFromSupabase()) catalogReadNotConfigured();
  return attachSoldCount(await getBouquetBySlugFromCatalog(slug));
}

export async function getCatalogBouquetById(bouquetId: string): Promise<Bouquet | null> {
  if (!isCatalogReadFromSupabase()) catalogReadNotConfigured();
  return attachSoldCount(await getBouquetByIdFromCatalog(bouquetId));
}

export async function getCatalogHeroImage(): Promise<string> {
  if (!isCatalogReadFromSupabase()) catalogReadNotConfigured();
  return getHeroImageFromCatalog();
}

export async function getCatalogHeroCarouselImages(): Promise<CatalogHeroCarouselSlide[]> {
  if (!isCatalogReadFromSupabase()) catalogReadNotConfigured();
  return getHeroCarouselImagesFromCatalog();
}

export async function getCatalogPopularBouquetsPaginated(
  start: number,
  limit: number,
  catalogDestination: DeliveryDestinationId = 'CHIANG_MAI'
): Promise<Bouquet[]> {
  if (!isCatalogReadFromSupabase()) catalogReadNotConfigured();
  return attachSoldCounts(
    await getPopularBouquetsFromCatalogPaginated(start, limit, catalogDestination)
  );
}

export async function getCatalogPopularBouquets(
  limit: number,
  catalogDestination: DeliveryDestinationId = 'CHIANG_MAI'
): Promise<Bouquet[]> {
  return getCatalogPopularBouquetsPaginated(0, limit, catalogDestination);
}

export async function getCatalogPopularItemsPaginated(
  start: number,
  limit: number,
  catalogDeliveryDestination: DeliveryDestinationId = 'CHIANG_MAI'
): Promise<PopularCatalogItem[]> {
  if (!isCatalogReadFromSupabase()) catalogReadNotConfigured();
  void catalogDeliveryDestination;
  const items = await getPopularCatalogItemsFromCatalogPaginated(start, limit);
  const counts = await getPaidSalesCountMap();
  return items.map((entry) =>
    entry.itemType === 'bouquet'
      ? { itemType: 'bouquet' as const, item: attachPublicSoldCount(entry.item, counts) }
      : { itemType: 'product' as const, item: attachPublicSoldCount(entry.item, counts) }
  );
}

export async function getCatalogHomeFlowerTypeSections(
  catalogDestination: DeliveryDestinationId = 'CHIANG_MAI'
): Promise<HomeFlowerTypeSection[]> {
  if (!isCatalogReadFromSupabase()) catalogReadNotConfigured();
  const sections = await getHomeFlowerTypeSectionsFromCatalog(catalogDestination);
  const counts = await getPaidSalesCountMap();
  return sections.map((section) => ({
    ...section,
    bouquets: section.bouquets.map((bouquet) => attachPublicSoldCount(bouquet, counts)),
  }));
}

export async function getCatalogHomeFlowerTypeTiles(
  catalogDestination: DeliveryDestinationId = 'CHIANG_MAI'
): Promise<HomeFlowerTypeTile[]> {
  if (!isCatalogReadFromSupabase()) catalogReadNotConfigured();
  return getHomeFlowerTypeTilesFromCatalog(catalogDestination);
}

export async function getCatalogBouquetsFiltered(params: CatalogFilterParams): Promise<Bouquet[]> {
  if (!isCatalogReadFromSupabase()) catalogReadNotConfigured();
  return attachSoldCounts(await getBouquetsFilteredFromCatalog(params));
}

export async function getCatalogBouquetsCatalogData(params: CatalogFilterParams): Promise<{
  bouquets: Bouquet[];
  allBouquets: Bouquet[];
}> {
  if (!isCatalogReadFromSupabase()) catalogReadNotConfigured();
  const data = await getBouquetsCatalogDataFromCatalog(params);
  const counts = await getPaidSalesCountMap();
  return {
    bouquets: data.bouquets.map((bouquet) => attachPublicSoldCount(bouquet, counts)),
    allBouquets: data.allBouquets.map((bouquet) => attachPublicSoldCount(bouquet, counts)),
  };
}

export async function getCatalogProductsFiltered(params: {
  categoryKey: string;
  sort?: 'newest' | 'price_asc' | 'price_desc';
  catalogDeliveryDestination?: DeliveryDestinationId;
}): Promise<CatalogProduct[]> {
  if (!isCatalogReadFromSupabase()) catalogReadNotConfigured();
  return attachSoldCounts(await getProductsFilteredFromCatalog(params));
}

export async function getCatalogProductBySlug(slug: string): Promise<CatalogProduct | null> {
  if (!isCatalogReadFromSupabase()) catalogReadNotConfigured();
  return attachSoldCount(await getProductBySlugFromCatalog(slug));
}

export async function getCatalogPlushyToysFiltered(params: {
  sort?: 'newest' | 'price_asc' | 'price_desc';
}): Promise<CatalogProduct[]> {
  if (!isCatalogReadFromSupabase()) catalogReadNotConfigured();
  return attachSoldCounts(await getPlushyToysFilteredFromCatalog(params));
}

export async function getCatalogPlushyToyBySlug(slug: string): Promise<CatalogProduct | null> {
  if (!isCatalogReadFromSupabase()) catalogReadNotConfigured();
  return attachSoldCount(await getPlushyToyBySlugFromCatalog(slug));
}

export async function getCatalogPlushyToyById(id: string) {
  if (!isCatalogReadFromSupabase()) catalogReadNotConfigured();
  return getPlushyToyByIdFromCatalog(id);
}

export async function getCatalogBalloonsFiltered(params: {
  sort?: 'newest' | 'price_asc' | 'price_desc';
}): Promise<CatalogProduct[]> {
  if (!isCatalogReadFromSupabase()) catalogReadNotConfigured();
  return attachSoldCounts(await getBalloonsFilteredFromCatalog(params));
}

export async function getCatalogBalloonBySlug(slug: string): Promise<CatalogProduct | null> {
  if (!isCatalogReadFromSupabase()) catalogReadNotConfigured();
  return attachSoldCount(await getBalloonBySlugFromCatalog(slug));
}

export async function getCatalogBalloonById(id: string) {
  if (!isCatalogReadFromSupabase()) catalogReadNotConfigured();
  return getBalloonByIdFromCatalog(id);
}

export async function getCatalogProductById(productId: string) {
  if (!isCatalogReadFromSupabase()) catalogReadNotConfigured();
  return getProductByIdFromCatalog(productId);
}
