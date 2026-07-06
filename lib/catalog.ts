/**

 * Supabase catalog read layer (storefront when CATALOG_READ_SOURCE=supabase).

 */

import 'server-only';



import type { Bouquet, Partner } from '@/lib/bouquets';

import { bouquetIsPottedOnly } from '@/lib/bouquetPresentationFormats';
import { bouquetIsAvailableForDestination } from '@/lib/bouquetDestinationAvailability';

import { PRODUCT_CATEGORIES, STOREFRONT_FLOWER_TYPES } from '@/lib/catalogCategories';

import {

  dedupeBouquetsById,

  filterBouquetsCatalogData,

  interleavePopularCatalogItems,

  mulberry32,

  orderPopularBouquetsWithFeaturedFirst,

  shuffleArraySeeded,

  sortCatalogProducts,

  getPopularShuffleSeed,

  type CatalogFilterParams,

  type PopularCatalogItem,

} from '@/lib/catalogListLogic';

import { loadBouquetVariantImages } from '@/lib/catalog/bouquetImages';
import { pickSimilarBouquets } from '@/lib/catalog/similarBouquets';

import {

  mapBouquetRowToBouquet,

  mapPartnerRowToPartner,

  mapProductRowToCatalogProduct,

} from '@/lib/catalog/mappers';

import { filterStorefrontCatalogStoredImages, isStorefrontCatalogImage } from '@/lib/catalog/storefrontImages';
import { storedImagePublicUrl } from '@/lib/catalog/storage';

import type {

  CatalogBouquetRow,

  CatalogPartnerRow,

  CatalogProductRow,

  CatalogSiteSettingsRow,

  CatalogStoredImage,

} from '@/lib/catalog/types';

import type { DeliveryDestinationId } from '@/lib/delivery/markets';

import type { CatalogProduct } from '@/lib/catalog/types';

import { cacheSupabaseCatalog } from '@/lib/catalogCache';

import {
  fetchAllSupabasePages,
  runSupabaseQueryWithRetry,
} from '@/lib/catalog/supabasePagination';

import { getSupabaseAdmin } from '@/lib/supabase/server';



export type {

  Bouquet,

  BouquetStatus,

  Partner,

  PartnerStatus,

  BouquetSellableOption,

  PricingType,

  CatalogProduct,

  CatalogStoredImage,

  CatalogPortrait,

  CatalogBouquetPricing,

  CatalogPartnerRow,

  CatalogBouquetRow,

  CatalogProductRow,

  CatalogSiteSettingsRow,

} from '@/lib/catalog/types';



export type { CatalogFilterParams, PopularCatalogItem } from '@/lib/catalogListLogic';



const HERO_IMAGE_FALLBACK = '/HeroImage/heroimage.webp';



/** Feature flag: public storefront reads from Supabase when set. */

export function isCatalogReadFromSupabase(): boolean {

  return process.env.CATALOG_READ_SOURCE !== 'sanity';

}



function requireSupabase() {

  const supabase = getSupabaseAdmin();

  if (!supabase) {

    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');

  }

  return supabase;

}



async function mapBouquetRowWithImages(

  supabase: ReturnType<typeof requireSupabase>,

  row: CatalogBouquetRow,

  partner: CatalogPartnerRow | null,

  localeSlug?: string

): Promise<Bouquet> {

  try {

    const { main, byVariantKey } = await loadBouquetVariantImages(supabase, row.id);

    return mapBouquetRowToBouquet(supabase, row, partner, localeSlug, {

      mainImages: main.urls.length > 0 ? main : undefined,

      variantImages: byVariantKey,

    });

  } catch (err) {

    console.error('[catalog] variant images load failed:', err);

    return mapBouquetRowToBouquet(supabase, row, partner, localeSlug);

  }

}



async function loadPartnersByIds(ids: string[]): Promise<Map<string, CatalogPartnerRow>> {

  const map = new Map<string, CatalogPartnerRow>();

  if (!ids.length) return map;

  const supabase = requireSupabase();

  const { data, error } = await supabase.from('catalog_partners').select('*').in('id', ids);

  if (error) throw new Error(error.message);

  for (const row of data ?? []) {

    map.set(row.id, row as CatalogPartnerRow);

  }

  return map;

}



async function mapBouquetRows(rows: CatalogBouquetRow[]): Promise<Bouquet[]> {

  const supabase = requireSupabase();

  const partnerIds = Array.from(

    new Set(rows.map((r) => r.partner_id).filter((id): id is string => Boolean(id)))

  );

  const partnerMap = await loadPartnersByIds(partnerIds);

  return rows.map((row) =>

    mapBouquetRowToBouquet(supabase, row, row.partner_id ? partnerMap.get(row.partner_id) : null)

  );

}



async function fetchApprovedBouquetRowsUncached(): Promise<CatalogBouquetRow[]> {

  const supabase = requireSupabase();

  const rows = await fetchAllSupabasePages(({ from, to }) =>

    supabase

      .from('catalog_bouquets')

      .select('*')

      .eq('status', 'approved')

      .order('name_en', { ascending: true })

      .range(from, to)

  );

  return rows as CatalogBouquetRow[];

}



const loadApprovedBouquetRows = cacheSupabaseCatalog(
  'approved-bouquet-rows',
  fetchApprovedBouquetRowsUncached
);



async function fetchApprovedBouquetRows(): Promise<CatalogBouquetRow[]> {

  return loadApprovedBouquetRows();

}



const loadApprovedBouquets = cacheSupabaseCatalog('approved-bouquets', async () => {

  const rows = await fetchApprovedBouquetRows();

  return mapBouquetRows(rows);

});



async function getApprovedBouquets(): Promise<Bouquet[]> {

  return loadApprovedBouquets();

}



async function fetchLiveProductRowsUncached(): Promise<CatalogProductRow[]> {

  const supabase = requireSupabase();

  const rows = await fetchAllSupabasePages(({ from, to }) =>

    supabase

      .from('catalog_products')

      .select('*')

      .eq('moderation_status', 'live')

      .order('created_at', { ascending: false })

      .range(from, to)

  );

  return rows as CatalogProductRow[];

}



const loadLiveProductRows = cacheSupabaseCatalog('live-product-rows', fetchLiveProductRowsUncached);



async function fetchLiveProductRows(): Promise<CatalogProductRow[]> {

  return loadLiveProductRows();

}



const loadLiveProducts = cacheSupabaseCatalog('live-products', async () => {

  const supabase = requireSupabase();

  const rows = await fetchLiveProductRows();

  return rows.map((row) => mapProductRowToCatalogProduct(supabase, row));

});



async function getLiveProducts(): Promise<CatalogProduct[]> {

  return loadLiveProducts();

}



function productCreatedAtMap(rows: CatalogProductRow[]): Map<string, string> {

  return new Map(rows.map((r) => [r.id, r.created_at ?? '']));

}



export async function getBouquetsFromCatalog(): Promise<Bouquet[]> {

  const bouquets = await getApprovedBouquets();

  return dedupeBouquetsById(bouquets).sort((a, b) =>

    (a.nameEn || '').localeCompare(b.nameEn || '', undefined, { sensitivity: 'base' })

  );

}



export async function getSimilarBouquetsFromCatalog(

  source: Bouquet,

  limit = 3

): Promise<Bouquet[]> {

  const all = await getBouquetsFromCatalog();

  return pickSimilarBouquets(source, all, limit);

}



export async function getBouquetsFromCatalogPaginated(

  start: number,

  limit: number,

  catalogDestination: DeliveryDestinationId = 'CHIANG_MAI'

): Promise<Bouquet[]> {

  const bouquets = dedupeBouquetsById(await getApprovedBouquets())

    .filter((b) => bouquetIsAvailableForDestination(b, catalogDestination))

    .sort((a, b) =>

      (a.nameEn || '').localeCompare(b.nameEn || '', undefined, { sensitivity: 'base' })

    );

  const safeStart = Math.max(0, start);

  return bouquets.slice(safeStart, safeStart + limit);

}



export async function getBouquetBySlugFromCatalog(

  slug: string,

  locale: 'en' | 'th' = 'en'

): Promise<Bouquet | null> {

  const supabase = requireSupabase();

  const col = locale === 'th' ? 'slug_th' : 'slug_en';

  let { data, error } = await supabase

    .from('catalog_bouquets')

    .select('*')

    .eq(col, slug)

    .eq('status', 'approved')

    .maybeSingle();



  if (error) throw new Error(error.message);

  if (!data && locale === 'en') {

    const alt = await supabase

      .from('catalog_bouquets')

      .select('*')

      .eq('slug_th', slug)

      .eq('status', 'approved')

      .maybeSingle();

    data = alt.data;

    if (alt.error) throw new Error(alt.error.message);

  }

  if (!data) return null;



  const row = data as CatalogBouquetRow;

  let partner: CatalogPartnerRow | null = null;

  if (row.partner_id) {

    const { data: p } = await supabase

      .from('catalog_partners')

      .select('*')

      .eq('id', row.partner_id)

      .maybeSingle();

    partner = (p as CatalogPartnerRow) ?? null;

  }

  return mapBouquetRowWithImages(supabase, row, partner, slug);

}



export async function getBouquetByLegacySanityId(legacyId: string): Promise<Bouquet | null> {

  const supabase = requireSupabase();

  const { data, error } = await supabase

    .from('catalog_bouquets')

    .select('*')

    .eq('legacy_sanity_id', legacyId)

    .maybeSingle();



  if (error) throw new Error(error.message);

  if (!data) return null;

  const row = data as CatalogBouquetRow;

  let partner: CatalogPartnerRow | null = null;

  if (row.partner_id) {

    const { data: p } = await supabase

      .from('catalog_partners')

      .select('*')

      .eq('id', row.partner_id)

      .maybeSingle();

    partner = (p as CatalogPartnerRow) ?? null;

  }

  return mapBouquetRowWithImages(supabase, row, partner);

}



export async function getBouquetByIdFromCatalog(bouquetId: string): Promise<Bouquet | null> {

  const supabase = requireSupabase();

  const { data, error } = await supabase

    .from('catalog_bouquets')

    .select('*')

    .eq('id', bouquetId)

    .maybeSingle();



  if (error) throw new Error(error.message);

  if (!data) return getBouquetByLegacySanityId(bouquetId);

  const row = data as CatalogBouquetRow;



  let partner: CatalogPartnerRow | null = null;

  if (row.partner_id) {

    const { data: p } = await supabase

      .from('catalog_partners')

      .select('*')

      .eq('id', row.partner_id)

      .maybeSingle();

    partner = (p as CatalogPartnerRow) ?? null;

  }

  return mapBouquetRowWithImages(supabase, row, partner);

}



export async function getBouquetsCatalogDataFromCatalog(

  params: CatalogFilterParams

): Promise<{ bouquets: Bouquet[]; allBouquets: Bouquet[] }> {

  const all = dedupeBouquetsById(await getApprovedBouquets());

  return filterBouquetsCatalogData(all, params);

}



export async function getBouquetsFilteredFromCatalog(params: CatalogFilterParams): Promise<Bouquet[]> {

  const { bouquets } = await getBouquetsCatalogDataFromCatalog(params);

  return bouquets;

}



async function getOrderedPopularBouquetsFromCatalog(): Promise<Bouquet[]> {

  const bouquets = (await getApprovedBouquets()).filter(
    (b) =>
      b.featuredPopular === true &&
      bouquetIsAvailableForDestination(b, 'CHIANG_MAI')
  );

  return orderPopularBouquetsWithFeaturedFirst(bouquets);

}



export async function getPopularBouquetsFromCatalogPaginated(

  start: number,

  limit: number

): Promise<Bouquet[]> {

  const ordered = await getOrderedPopularBouquetsFromCatalog();

  const safeStart = Math.max(0, start);

  return ordered.slice(safeStart, safeStart + limit);

}



export type HomeFlowerTypeSection = {

  type: string;

  bouquets: Bouquet[];

  totalCount: number;

  /** All items in this section are potted-only (heading omits "Bouquets"). */
  pottedOnly: boolean;

};



const HOME_FLOWER_TYPE_SECTION_LIMIT = 6;



export async function getHomeFlowerTypeSectionsFromCatalog(): Promise<HomeFlowerTypeSection[]> {

  const ordered = await getOrderedPopularBouquetsFromCatalog();

  return STOREFRONT_FLOWER_TYPES.map((type) => {

    const all = ordered.filter((b) => b.flowerTypes?.includes(type));

    return {

      type,

      bouquets: all.slice(0, HOME_FLOWER_TYPE_SECTION_LIMIT),

      totalCount: all.length,

      pottedOnly: all.length > 0 && all.every(bouquetIsPottedOnly),

    };

  }).filter((section) => section.bouquets.length > 0);

}



const loadPopularCatalogItemsFull = cacheSupabaseCatalog('popular-catalog-items-full', async () => {

  const productCategoryKeys = PRODUCT_CATEGORIES.filter(

    (category) => category !== 'plushy_toys' && category !== 'balloons'

  );

  const supabase = requireSupabase();

  const productRows = await fetchLiveProductRows();

  const createdAtById = productCreatedAtMap(productRows);

  const allProducts = productRows.map((row) => mapProductRowToCatalogProduct(supabase, row));



  const bouquets = await getOrderedPopularBouquetsFromCatalog();

  const plushyToys = sortCatalogProducts(

    allProducts.filter((p) => p.category === 'plushy_toys'),

    'newest',

    createdAtById

  );

  const balloons = sortCatalogProducts(

    allProducts.filter((p) => p.category === 'balloons'),

    'newest',

    createdAtById

  );

  const productGroups = productCategoryKeys.map((categoryKey) =>

    sortCatalogProducts(

      allProducts.filter(

        (p) =>

          p.category === categoryKey &&

          bouquetIsAvailableForDestination(p, 'CHIANG_MAI')

      ),

      'newest',

      createdAtById

    )

  );



  const rng = mulberry32(getPopularShuffleSeed() + 17);

  const flowerItems: PopularCatalogItem[] = bouquets.map((item) => ({

    itemType: 'bouquet' as const,

    item,

  }));

  const productItems: PopularCatalogItem[] = [

    ...plushyToys.map((item) => ({ itemType: 'product' as const, item })),

    ...balloons.map((item) => ({ itemType: 'product' as const, item })),

    ...productGroups.flat().map((item) => ({ itemType: 'product' as const, item })),

  ];

  return [

    ...flowerItems,

    ...interleavePopularCatalogItems(shuffleArraySeeded(productItems, rng)),

  ];

});



export async function getPopularCatalogItemsFromCatalogPaginated(

  start: number,

  limit: number

): Promise<PopularCatalogItem[]> {

  const mixed = await loadPopularCatalogItemsFull();

  const safeStart = Math.max(0, start);

  return mixed.slice(safeStart, safeStart + limit);

}



export async function getProductsFromCatalog(): Promise<CatalogProduct[]> {

  return getLiveProducts();

}



export async function getProductsFilteredFromCatalog(params: {

  categoryKey: string;

  sort?: 'newest' | 'price_asc' | 'price_desc';

  catalogDeliveryDestination?: DeliveryDestinationId;

}): Promise<CatalogProduct[]> {

  const { categoryKey, sort = 'newest', catalogDeliveryDestination } = params;

  const supabase = requireSupabase();

  const rows = await fetchLiveProductRows();

  const createdAtById = productCreatedAtMap(rows);

  const mapped = rows

    .filter((r) => r.category === categoryKey)

    .map((row) => mapProductRowToCatalogProduct(supabase, row))

    .filter((p) =>

      catalogDeliveryDestination

        ? bouquetIsAvailableForDestination(p, catalogDeliveryDestination)

        : true

    );

  return sortCatalogProducts(mapped, sort, createdAtById);

}



async function fetchLiveProductRowBySlug(

  slug: string,

  locale: 'en' | 'th' = 'en',

  category?: string

): Promise<CatalogProductRow | null> {

  const supabase = requireSupabase();

  const col = locale === 'th' ? 'slug_th' : 'slug_en';

  const { data, error } = await runSupabaseQueryWithRetry(() => {

    let query = supabase

      .from('catalog_products')

      .select('*')

      .eq(col, slug)

      .eq('moderation_status', 'live');

    if (category) query = query.eq('category', category);

    return query.maybeSingle();

  });

  if (error) throw new Error(error.message);

  return (data as CatalogProductRow) ?? null;

}



export async function getProductBySlugFromCatalog(

  slug: string,

  locale: 'en' | 'th' = 'en'

): Promise<CatalogProduct | null> {

  const supabase = requireSupabase();

  const row = await fetchLiveProductRowBySlug(slug, locale);

  if (row) return mapProductRowToCatalogProduct(supabase, row, slug);



  const products = await getLiveProducts();

  return products.find((p) => p.slug === slug) ?? null;

}



export async function getPlushyToysFilteredFromCatalog(params: {

  sort?: 'newest' | 'price_asc' | 'price_desc';

}): Promise<CatalogProduct[]> {

  return getProductsFilteredFromCatalog({

    categoryKey: 'plushy_toys',

    sort: params.sort ?? 'newest',

  });

}



export async function getBalloonsFilteredFromCatalog(params: {

  sort?: 'newest' | 'price_asc' | 'price_desc';

}): Promise<CatalogProduct[]> {

  return getProductsFilteredFromCatalog({

    categoryKey: 'balloons',

    sort: params.sort ?? 'newest',

  });

}



export async function getPlushyToyBySlugFromCatalog(slug: string): Promise<CatalogProduct | null> {

  const supabase = requireSupabase();

  const row = await fetchLiveProductRowBySlug(slug, 'en', 'plushy_toys');

  if (!row) return null;

  return mapProductRowToCatalogProduct(supabase, row, slug);

}



export async function getBalloonBySlugFromCatalog(slug: string): Promise<CatalogProduct | null> {

  const supabase = requireSupabase();

  const row = await fetchLiveProductRowBySlug(slug, 'en', 'balloons');

  if (!row) return null;

  return mapProductRowToCatalogProduct(supabase, row, slug);

}



type StripeProductPricing = {

  id: string;

  nameEn: string;

  nameTh?: string;

  price: number;

  discountPercent?: number;

  sizeLabel?: string;

  imageUrl?: string;

};



async function fetchProductRowById(productId: string): Promise<CatalogProductRow | null> {

  const supabase = requireSupabase();

  const { data, error } = await supabase

    .from('catalog_products')

    .select('*')

    .eq('id', productId)

    .maybeSingle();

  if (error) throw new Error(error.message);

  if (data) return data as CatalogProductRow;



  const { data: legacy, error: legacyErr } = await supabase

    .from('catalog_products')

    .select('*')

    .eq('legacy_sanity_id', productId)

    .maybeSingle();

  if (legacyErr) throw new Error(legacyErr.message);

  return (legacy as CatalogProductRow) ?? null;

}



function mapRowToStripeProductPricing(

  supabase: ReturnType<typeof requireSupabase>,

  row: CatalogProductRow

): StripeProductPricing {

  const product = mapProductRowToCatalogProduct(supabase, row);

  return {

    id: product.id,

    nameEn: product.nameEn,

    nameTh: product.nameTh,

    price: product.price,

    discountPercent: product.discountPercent,

    sizeLabel: product.sizeLabel,

    imageUrl: product.images[0],

  };

}



export async function getProductByIdFromCatalog(productId: string): Promise<{

  id: string;

  nameEn: string;

  nameTh?: string;

  descriptionEn?: string;

  descriptionTh?: string;

  category: string;

  price: number;

  cost?: number;

  commissionPercent?: number;

  discountPercent?: number;

  moderationStatus: string;

  imageUrl?: string;

  imageRefs: string[];

  preparationTime?: number;

  occasion?: string;

  excludedDeliveryDestinations?: DeliveryDestinationId[];

  partnerId?: string;

} | null> {

  const row = await fetchProductRowById(productId);

  if (!row) return null;

  const supabase = requireSupabase();

  const product = mapProductRowToCatalogProduct(supabase, row);

  return {

    id: product.id,

    nameEn: product.nameEn,

    nameTh: product.nameTh,

    descriptionEn: product.descriptionEn,

    descriptionTh: product.descriptionTh,

    category: product.category,

    price: product.price,

    cost: product.cost,

    commissionPercent: product.commissionPercent,

    discountPercent: product.discountPercent,

    moderationStatus: row.moderation_status,

    imageUrl: product.images[0],

    imageRefs: (row.images ?? []).map((img) => img.storage_path).filter(Boolean),

    preparationTime: product.preparationTime,

    occasion: product.occasion,

    excludedDeliveryDestinations: product.excludedDeliveryDestinations,

    partnerId: row.partner_id,

  };

}



export async function getPlushyToyByIdFromCatalog(id: string): Promise<StripeProductPricing | null> {

  const row = await fetchProductRowById(id);

  if (!row || row.category !== 'plushy_toys') return null;

  return mapRowToStripeProductPricing(requireSupabase(), row);

}



export async function getBalloonByIdFromCatalog(id: string): Promise<StripeProductPricing | null> {

  const row = await fetchProductRowById(id);

  if (!row || row.category !== 'balloons') return null;

  return mapRowToStripeProductPricing(requireSupabase(), row);

}



export async function getPartnerFromCatalog(partnerId: string): Promise<Partner | null> {

  const supabase = requireSupabase();

  const { data, error } = await supabase

    .from('catalog_partners')

    .select('*')

    .eq('id', partnerId)

    .maybeSingle();



  if (error) throw new Error(error.message);

  if (!data) return null;

  return mapPartnerRowToPartner(supabase, data as CatalogPartnerRow);

}



async function fetchHeroImageUncached(): Promise<string> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('catalog_site_settings')
    .select('hero_image')
    .eq('id', 'default')
    .maybeSingle();
  if (error) throw new Error(error.message);
  const hero = data?.hero_image as CatalogStoredImage | null;
  if (hero?.storage_path && isStorefrontCatalogImage(hero)) {
    return storedImagePublicUrl(supabase, hero);
  }
  return HERO_IMAGE_FALLBACK;
}

const loadHeroImage = cacheSupabaseCatalog('hero-image', fetchHeroImageUncached);

export async function getHeroImageFromCatalog(): Promise<string> {
  return loadHeroImage();
}

const loadHeroCarousel = cacheSupabaseCatalog('hero-carousel', async () => {

  const supabase = requireSupabase();

  const { data, error } = await supabase

    .from('catalog_site_settings')

    .select('hero_carousel_images')

    .eq('id', 'default')

    .maybeSingle();



  if (error) throw new Error(error.message);

  const images = filterStorefrontCatalogStoredImages(
    (data?.hero_carousel_images ?? []) as CatalogStoredImage[]
  );

  return images
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((img) => storedImagePublicUrl(supabase, img));

});



export async function getHeroCarouselImagesFromCatalog(): Promise<string[]> {
  return loadHeroCarousel();
}

