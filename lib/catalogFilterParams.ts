import type { CatalogFilterParams } from '@/lib/sanity';
import type { StemBucketKey } from '@/lib/bouquetOptions';
import { PRODUCT_CATEGORIES } from '@/lib/catalogCategories';

const STEM_BUCKETS: StemBucketKey[] = ['small', 'medium', 'large', 'grand'];

export function parseCatalogSearchParams(
  searchParams: Record<string, string | string[] | undefined>
): CatalogFilterParams {
  const topCategoryRaw = typeof searchParams.topCategory === 'string' ? searchParams.topCategory : undefined;
  const topCategory =
    topCategoryRaw === 'flowers' ||
    (topCategoryRaw && PRODUCT_CATEGORIES.includes(topCategoryRaw as (typeof PRODUCT_CATEGORIES)[number]))
      ? topCategoryRaw
      : undefined;
  const categoryRaw = typeof searchParams.category === 'string' ? searchParams.category : undefined;
  const colorsRaw = typeof searchParams.colors === 'string' ? searchParams.colors : undefined;
  const colors = colorsRaw ? colorsRaw.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
  const typesRaw = typeof searchParams.types === 'string' ? searchParams.types : undefined;
  const types = typesRaw ? typesRaw.split(',').map((s) => s.trim()).filter(Boolean) : [];
  const occasionRaw = typeof searchParams.occasion === 'string' ? searchParams.occasion : undefined;
  let occasion = occasionRaw;
  const minRaw = typeof searchParams.min === 'string' ? searchParams.min : undefined;
  const min = minRaw ? parseInt(minRaw, 10) : undefined;
  const maxRaw = typeof searchParams.max === 'string' ? searchParams.max : undefined;
  const max = maxRaw ? parseInt(maxRaw, 10) : undefined;
  const sort = typeof searchParams.sort === 'string' ? (searchParams.sort as CatalogFilterParams['sort']) : undefined;

  const deliveryRaw = typeof searchParams.delivery === 'string' ? searchParams.delivery : undefined;
  const delivery = deliveryRaw
    ? deliveryRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : undefined;
  const formatsRaw = typeof searchParams.formats === 'string' ? searchParams.formats : undefined;
  const formats = formatsRaw
    ? formatsRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  const stemRaw = typeof searchParams.stemBucket === 'string' ? searchParams.stemBucket : undefined;
  const stemBucket =
    stemRaw && STEM_BUCKETS.includes(stemRaw as StemBucketKey) ? (stemRaw as StemBucketKey) : undefined;

  // Legacy category mapping for bouquet backward compatibility
  let category = categoryRaw;
  if (categoryRaw && (topCategory === 'flowers' || !topCategory)) {
    if (categoryRaw === 'roses' && !types.includes('rose')) types.push('rose');
    if (categoryRaw === 'mixed' && !types.includes('mixed')) types.push('mixed');
    if (categoryRaw === 'inBox' && !formats.includes('box')) formats.push('box');
    if (categoryRaw === 'romantic' && !occasion) occasion = 'romantic';
    if (categoryRaw === 'birthday' && !occasion) occasion = 'birthday';
    if (categoryRaw === 'sympathy' && !occasion) occasion = 'sympathy';
    
    // Unset category so we don't pass it down for flowers 
    // unless it's "all" or we decide to strip it completely. 
    // We strip it completely for flowers to rely on the new filters.
    category = undefined; 
  }

  return {
    topCategory: topCategory || undefined,
    category: category || undefined,
    colors: colors?.length ? colors : undefined,
    types: types.length ? types : undefined,
    occasion: occasion || undefined,
    min: min != null && !isNaN(min) ? min : undefined,
    max: max != null && !isNaN(max) ? max : undefined,
    sort: sort && ['newest', 'price_asc', 'price_desc'].includes(sort) ? sort : undefined,
    delivery: delivery?.length ? delivery : undefined,
    formats: formats.length ? formats : undefined,
    stemBucket,
  };
}

export function buildCatalogSearchString(params: CatalogFilterParams): string {
  const sp = new URLSearchParams();
  if (params.topCategory && params.topCategory !== 'flowers') sp.set('topCategory', params.topCategory);
  if (params.category && params.category !== 'all') sp.set('category', params.category);
  if (params.colors?.length) sp.set('colors', params.colors.join(','));
  if (params.types?.length) sp.set('types', params.types.join(','));
  if (params.occasion) sp.set('occasion', params.occasion);
  if (params.min != null && params.min > 0) sp.set('min', String(params.min));
  if (params.max != null && params.max > 0) sp.set('max', String(params.max));
  if (params.sort && params.sort !== 'newest') sp.set('sort', params.sort);
  if (params.delivery?.length) sp.set('delivery', params.delivery.join(','));
  if (params.formats?.length) sp.set('formats', params.formats.join(','));
  if (params.stemBucket) sp.set('stemBucket', params.stemBucket);
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export function countActiveCatalogFilters(params: CatalogFilterParams): number {
  let n = 0;
  if (params.topCategory && params.topCategory !== 'flowers') n++;
  if (params.category && params.category !== 'all') n++;
  if (params.colors?.length) n++;
  if (params.types?.length) n++;
  if (params.occasion) n++;
  // Min/max price are excluded — shoppers adjust price only in the price field, not as "active chips".
  if (params.sort && params.sort !== 'newest') n++;
  if (params.delivery?.length) n++;
  if (params.formats?.length) n++;
  if (params.stemBucket) n++;
  return n;
}

/** True when any URL filter narrows the catalog, including min/max price (price is excluded from chip count / badge). */
export function catalogHasAnyNarrowingFilters(params: CatalogFilterParams): boolean {
  if (countActiveCatalogFilters(params) > 0) return true;
  if (params.min != null && params.min > 0) return true;
  if (params.max != null && params.max > 0) return true;
  return false;
}

/** Counts filters that narrow within a tab — excludes `topCategory` so “Balloons” alone is not treated as an extra filter. */
export function countActiveCatalogFiltersExcludingTopCategory(params: CatalogFilterParams): number {
  let n = 0;
  if (params.category && params.category !== 'all') n++;
  if (params.colors?.length) n++;
  if (params.types?.length) n++;
  if (params.occasion) n++;
  if (params.sort && params.sort !== 'newest') n++;
  if (params.delivery?.length) n++;
  if (params.formats?.length) n++;
  if (params.stemBucket) n++;
  return n;
}

/** True when filters narrow beyond the main category tab (e.g. sort/price on Balloons). */
export function catalogHasNarrowingFiltersBeyondTopCategory(params: CatalogFilterParams): boolean {
  if (countActiveCatalogFiltersExcludingTopCategory(params) > 0) return true;
  if (params.min != null && params.min > 0) return true;
  if (params.max != null && params.max > 0) return true;
  return false;
}
