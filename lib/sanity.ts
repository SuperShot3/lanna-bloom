/**
 * Legacy catalog read facade — all reads route through Supabase via catalogReads.
 * Kept for stable import paths during Sanity→Supabase migration cleanup.
 */
import 'server-only';

export type { CatalogProduct, ModerationProduct, AdminProductDetail } from '@/lib/catalog/types';
export type { CatalogFilterParams, PopularCatalogItem } from '@/lib/catalogListLogic';

export {
  getCatalogBouquets as getBouquetsFromSanity,
  getCatalogSimilarBouquets as getSimilarBouquetsForBouquet,
  getCatalogBouquetsPaginated as getBouquetsFromSanityPaginated,
  getCatalogBouquetBySlug as getBouquetBySlugFromSanity,
  getCatalogBouquetById as getBouquetById,
  getCatalogHeroImage as getHeroImageFromSanity,
  getCatalogHeroCarouselImages as getHeroCarouselImagesFromSanity,
  getCatalogPopularBouquetsPaginated as getPopularBouquetsFromSanityPaginated,
  getCatalogPopularBouquets as getPopularBouquetsFromSanity,
  getCatalogPopularItemsPaginated as getPopularCatalogItemsFromSanityPaginated,
  getCatalogBouquetsFiltered as getBouquetsFilteredFromSanity,
  getCatalogBouquetsCatalogData as getBouquetsCatalogData,
  getCatalogProductsFiltered as getProductsFilteredFromSanity,
  getCatalogProductBySlug as getProductBySlugFromSanity,
  getCatalogPlushyToysFiltered as getPlushyToysFilteredFromSanity,
  getCatalogPlushyToyBySlug as getPlushyToyBySlugFromSanity,
  getCatalogPlushyToyById as getPlushyToyById,
  getCatalogBalloonsFiltered as getBalloonsFilteredFromSanity,
  getCatalogBalloonBySlug as getBalloonBySlugFromSanity,
  getCatalogBalloonById as getBalloonById,
  getCatalogProductById as getProductById,
} from '@/lib/catalogReads';

export {
  getPendingBouquetsFromCatalog as getPendingBouquets,
  getPendingProductsFromCatalog as getPendingProducts,
  getAllProductsFromCatalog as getAllProducts,
  getCatalogProductByIdForAdmin as getProductByIdForAdmin,
  getCatalogBouquetByIdForAdmin,
} from '@/lib/catalogAdmin';
