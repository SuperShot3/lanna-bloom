/**
 * Storefront catalog reads — Supabase by default (CATALOG_READ_SOURCE=sanity for rollback).
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
  getBouquetsFromCatalogPaginated,
  getHeroCarouselImagesFromCatalog,
  getHeroImageFromCatalog,
  getPlushyToyByIdFromCatalog,
  getPlushyToysFilteredFromCatalog,
  getPlushyToyBySlugFromCatalog,
  getPopularBouquetsFromCatalogPaginated,
  getPopularCatalogItemsFromCatalogPaginated,
  getProductByIdFromCatalog,
  getProductBySlugFromCatalog,
  getProductsFilteredFromCatalog,
  isCatalogReadFromSupabase,
} from '@/lib/catalog';
import type { CatalogProduct } from '@/lib/catalog/types';
import type { CatalogFilterParams, PopularCatalogItem } from '@/lib/catalogListLogic';
import type { Bouquet } from '@/lib/bouquets';
import type { DeliveryDestinationId } from '@/lib/delivery/markets';

function catalogReadNotConfigured(): never {
  throw new Error(
    'CATALOG_READ_SOURCE=sanity is no longer supported — catalog reads use Supabase. ' +
      'Run npm run import-catalog and remove CATALOG_READ_SOURCE=sanity from env.'
  );
}

export async function getCatalogBouquets(): Promise<Bouquet[]> {
  if (!isCatalogReadFromSupabase()) catalogReadNotConfigured();
  return getBouquetsFromCatalog();
}

export async function getCatalogBouquetsPaginated(
  start: number,
  limit: number,
  catalogDestination: DeliveryDestinationId = 'CHIANG_MAI'
): Promise<Bouquet[]> {
  if (!isCatalogReadFromSupabase()) catalogReadNotConfigured();
  return getBouquetsFromCatalogPaginated(start, limit, catalogDestination);
}

export async function getCatalogBouquetBySlug(slug: string): Promise<Bouquet | null> {
  if (!isCatalogReadFromSupabase()) catalogReadNotConfigured();
  return getBouquetBySlugFromCatalog(slug);
}

export async function getCatalogBouquetById(bouquetId: string): Promise<Bouquet | null> {
  if (!isCatalogReadFromSupabase()) catalogReadNotConfigured();
  return getBouquetByIdFromCatalog(bouquetId);
}

export async function getCatalogHeroImage(): Promise<string> {
  if (!isCatalogReadFromSupabase()) catalogReadNotConfigured();
  return getHeroImageFromCatalog();
}

export async function getCatalogHeroCarouselImages(): Promise<string[]> {
  if (!isCatalogReadFromSupabase()) catalogReadNotConfigured();
  return getHeroCarouselImagesFromCatalog();
}

export async function getCatalogPopularBouquetsPaginated(
  start: number,
  limit: number
): Promise<Bouquet[]> {
  if (!isCatalogReadFromSupabase()) catalogReadNotConfigured();
  return getPopularBouquetsFromCatalogPaginated(start, limit);
}

export async function getCatalogPopularBouquets(limit: number): Promise<Bouquet[]> {
  return getCatalogPopularBouquetsPaginated(0, limit);
}

export async function getCatalogPopularItemsPaginated(
  start: number,
  limit: number,
  catalogDeliveryDestination: DeliveryDestinationId = 'CHIANG_MAI'
): Promise<PopularCatalogItem[]> {
  if (!isCatalogReadFromSupabase()) catalogReadNotConfigured();
  void catalogDeliveryDestination;
  return getPopularCatalogItemsFromCatalogPaginated(start, limit);
}

export async function getCatalogBouquetsFiltered(params: CatalogFilterParams): Promise<Bouquet[]> {
  if (!isCatalogReadFromSupabase()) catalogReadNotConfigured();
  return getBouquetsFilteredFromCatalog(params);
}

export async function getCatalogBouquetsCatalogData(params: CatalogFilterParams): Promise<{
  bouquets: Bouquet[];
  allBouquets: Bouquet[];
}> {
  if (!isCatalogReadFromSupabase()) catalogReadNotConfigured();
  return getBouquetsCatalogDataFromCatalog(params);
}

export async function getCatalogProductsFiltered(params: {
  categoryKey: string;
  sort?: 'newest' | 'price_asc' | 'price_desc';
  catalogDeliveryDestination?: DeliveryDestinationId;
}): Promise<CatalogProduct[]> {
  if (!isCatalogReadFromSupabase()) catalogReadNotConfigured();
  return getProductsFilteredFromCatalog(params);
}

export async function getCatalogProductBySlug(slug: string): Promise<CatalogProduct | null> {
  if (!isCatalogReadFromSupabase()) catalogReadNotConfigured();
  return getProductBySlugFromCatalog(slug);
}

export async function getCatalogPlushyToysFiltered(params: {
  sort?: 'newest' | 'price_asc' | 'price_desc';
}): Promise<CatalogProduct[]> {
  if (!isCatalogReadFromSupabase()) catalogReadNotConfigured();
  return getPlushyToysFilteredFromCatalog(params);
}

export async function getCatalogPlushyToyBySlug(slug: string): Promise<CatalogProduct | null> {
  if (!isCatalogReadFromSupabase()) catalogReadNotConfigured();
  return getPlushyToyBySlugFromCatalog(slug);
}

export async function getCatalogPlushyToyById(id: string) {
  if (!isCatalogReadFromSupabase()) catalogReadNotConfigured();
  return getPlushyToyByIdFromCatalog(id);
}

export async function getCatalogBalloonsFiltered(params: {
  sort?: 'newest' | 'price_asc' | 'price_desc';
}): Promise<CatalogProduct[]> {
  if (!isCatalogReadFromSupabase()) catalogReadNotConfigured();
  return getBalloonsFilteredFromCatalog(params);
}

export async function getCatalogBalloonBySlug(slug: string): Promise<CatalogProduct | null> {
  if (!isCatalogReadFromSupabase()) catalogReadNotConfigured();
  return getBalloonBySlugFromCatalog(slug);
}

export async function getCatalogBalloonById(id: string) {
  if (!isCatalogReadFromSupabase()) catalogReadNotConfigured();
  return getBalloonByIdFromCatalog(id);
}

export async function getCatalogProductById(productId: string) {
  if (!isCatalogReadFromSupabase()) catalogReadNotConfigured();
  return getProductByIdFromCatalog(productId);
}
