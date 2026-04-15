import { createClient } from 'next-sanity';
import imageUrlBuilder from '@sanity/image-url';
import type { Bouquet, BouquetSize, Partner, PartnerStatus, ProductKind, SizeKey } from './bouquets';
import {
  bouquetMatchesStemBucket,
  friendlyLegacyLabel,
  labelCustomTier,
  labelFixedVariant,
  labelSingleStemCount,
  minPriceFromOptions,
  type StemBucketKey,
} from './bouquetOptions';

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;

if (!projectId || !dataset) {
  throw new Error(
    'Missing Sanity env: set NEXT_PUBLIC_SANITY_PROJECT_ID and NEXT_PUBLIC_SANITY_DATASET in .env.local (see .env.example)'
  );
}

export const client = createClient({
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  useCdn: true,
});

/** Bypasses CDN for fresh data (e.g. commission after admin approval). Use for product catalog. */
const clientNoCdn = createClient({
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  useCdn: false,
});

const builder = imageUrlBuilder(client);

function urlFor(source: { _type?: string; asset?: { _ref?: string } } | undefined): string {
  if (!source?.asset?._ref) return '';
  return builder.image(source).width(600).url();
}

/** Hero image URL (600×750) for homepage. Returns empty string if not set in Sanity. */
export function urlForHeroImage(source: { _type?: string; asset?: { _ref?: string } } | undefined): string {
  if (!source?.asset?._ref) return '';
  return builder.image(source).width(600).height(750).fit('crop').url();
}

type SanityBouquet = {
  _id: string;
  slug?: { current?: string };
  nameEn?: string;
  nameTh?: string;
  descriptionEn?: string;
  descriptionTh?: string;
  compositionEn?: string;
  compositionTh?: string;
  category?: string;
  productKind?: string;
  singleStemOptions?: Array<{
    stemCount?: number;
    price?: number;
    labelEn?: string;
    labelTh?: string;
    preparationTime?: number;
    availability?: boolean;
  }>;
  fixedVariants?: Array<{
    variantKey?: string;
    nameEn?: string;
    nameTh?: string;
    price?: number;
    stemMin?: number;
    stemMax?: number;
    preparationTime?: number;
    availability?: boolean;
  }>;
  customTiers?: Array<{
    minPrice?: number;
    labelEn?: string;
    labelTh?: string;
    preparationTime?: number;
    availability?: boolean;
  }>;
  deliveryOptions?: string[];
  presentationFormats?: string[];
  colors?: string[];
  flowerTypes?: string[];
  occasion?: string | string[];
  partner?: { _ref?: string };
  /** Expanded from partner->shopName in catalog query */
  partnerName?: string;
  /** Expanded from partner doc on product page */
  partnerCity?: string;
  partnerShopBioEn?: string;
  partnerShopBioTh?: string;
  partnerPortrait?: { _type?: string; asset?: { _ref?: string } };
  status?: string;
  images?: Array<{ _type?: string; asset?: { _ref?: string } }>;
  sizes?: Array<{
    key?: string;
    label?: string;
    price?: number;
    description?: string;
    preparationTime?: number;
    availability?: boolean;
  }>;
};

function resolveProductKind(doc: SanityBouquet): ProductKind {
  const k = doc.productKind;
  if (k === 'single_stem_count' || k === 'fixed_bouquet' || k === 'customizable_bouquet') return k;
  return 'legacy';
}

function buildSellableOptionsFromDoc(doc: SanityBouquet): BouquetSize[] {
  const kind = resolveProductKind(doc);

  if (kind === 'single_stem_count' && doc.singleStemOptions?.length) {
    return doc.singleStemOptions.map((o, i) => {
      const stem = o.stemCount ?? 0;
      return {
        optionId: `stem_${stem}_${i}`,
        price: o.price ?? 0,
        label: labelSingleStemCount('en', stem, o.labelEn, o.labelTh),
        labelTh: labelSingleStemCount('th', stem, o.labelEn, o.labelTh),
        stemCount: stem,
        preparationTime: o.preparationTime,
        availability: o.availability ?? true,
      };
    });
  }

  if (kind === 'fixed_bouquet' && doc.fixedVariants?.length) {
    return doc.fixedVariants.map((v, i) => {
      const vk = v.variantKey ?? `v${i}`;
      return {
        optionId: `fixed_${vk}`,
        price: v.price ?? 0,
        label: labelFixedVariant('en', v.nameEn ?? '', v.nameTh ?? '', v.stemMin, v.stemMax),
        labelTh: labelFixedVariant('th', v.nameEn ?? '', v.nameTh ?? '', v.stemMin, v.stemMax),
        stemMin: v.stemMin,
        stemMax: v.stemMax,
        preparationTime: v.preparationTime,
        availability: v.availability ?? true,
      };
    });
  }

  if (kind === 'customizable_bouquet' && doc.customTiers?.length) {
    return doc.customTiers.map((t, i) => {
      const mp = t.minPrice ?? 0;
      return {
        optionId: `custom_${i}_${mp}`,
        price: mp,
        label: labelCustomTier('en', mp, t.labelEn, t.labelTh),
        labelTh: labelCustomTier('th', mp, t.labelEn, t.labelTh),
        preparationTime: t.preparationTime,
        availability: t.availability ?? true,
      };
    });
  }

  const rows = doc.sizes ?? [];
  if (!rows.length) {
    return [{ optionId: 'default', key: 'm', label: '—', price: 0, description: '' }];
  }
  return rows.map((s) => {
    const key = (s.key ?? 'm') as SizeKey;
    const friendly = friendlyLegacyLabel(s.label, s.description);
    return {
      optionId: `legacy_${key}`,
      key,
      price: s.price ?? 0,
      label: friendly,
      labelTh: friendly,
      description: s.description ?? '',
      preparationTime: s.preparationTime,
      availability: s.availability ?? true,
    };
  });
}

function mapToBouquet(doc: SanityBouquet): Bouquet {
  const slug = doc.slug?.current ?? doc._id;
  const sizes = buildSellableOptionsFromDoc(doc);
  const imageUrls = (doc.images ?? []).map((img) => urlFor(img)).filter(Boolean);
  const placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"%3E%3Crect fill="%23f9f5f0" width="600" height="600"/%3E%3Ctext fill="%236b6560" font-family="sans-serif" font-size="24" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3ENo image%3C/text%3E%3C/svg%3E';

  return {
    id: doc._id,
    slug,
    nameEn: doc.nameEn ?? '',
    nameTh: doc.nameTh ?? '',
    descriptionEn: doc.descriptionEn ?? '',
    descriptionTh: doc.descriptionTh ?? '',
    compositionEn: doc.compositionEn ?? '',
    compositionTh: doc.compositionTh ?? '',
    category: doc.category ?? 'mixed',
    productKind: resolveProductKind(doc),
    colors: Array.isArray(doc.colors) ? doc.colors : [],
    flowerTypes: Array.isArray(doc.flowerTypes) ? doc.flowerTypes : [],
    deliveryOptions: Array.isArray(doc.deliveryOptions) ? doc.deliveryOptions : undefined,
    presentationFormats: Array.isArray(doc.presentationFormats) ? doc.presentationFormats : undefined,
    occasion: (() => {
      const o = doc.occasion;
      if (!o) return undefined;
      return Array.isArray(o) ? o.filter(Boolean) : o ? [o] : undefined;
    })(),
    images: imageUrls.length ? imageUrls : [placeholder],
    sizes,
    partnerId: doc.partner?._ref,
    partnerName: doc.partnerName ?? undefined,
    partnerCity: doc.partnerCity ?? undefined,
    partnerShopBioEn: doc.partnerShopBioEn ?? undefined,
    partnerShopBioTh: doc.partnerShopBioTh ?? undefined,
    partnerPortraitUrl: doc.partnerPortrait ? urlFor(doc.partnerPortrait) : undefined,
    status: doc.status === 'pending_review' || doc.status === 'approved' ? doc.status : undefined,
  };
}

/** Public catalog: only approved bouquets; missing status = approved (backward compat) */
const bouquetsQuery = `*[_type == "bouquet" && (!defined(status) || status == "approved")] | order(nameEn asc) {
  _id,
  slug,
  nameEn,
  nameTh,
  descriptionEn,
  descriptionTh,
  compositionEn,
  compositionTh,
  category,
  productKind,
  singleStemOptions,
  fixedVariants,
  customTiers,
  deliveryOptions,
  presentationFormats,
  colors,
  flowerTypes,
  occasion,
  images,
  sizes
}`;

/** Public product page: only if approved (or no status) */
const bouquetBySlugQuery = `*[_type == "bouquet" && slug.current == $slug && (!defined(status) || status == "approved")][0] {
  _id,
  slug,
  nameEn,
  nameTh,
  descriptionEn,
  descriptionTh,
  compositionEn,
  compositionTh,
  category,
  productKind,
  singleStemOptions,
  fixedVariants,
  customTiers,
  deliveryOptions,
  presentationFormats,
  colors,
  flowerTypes,
  occasion,
  partner,
  "partnerName": partner->shopName,
  "partnerCity": partner->city,
  "partnerShopBioEn": partner->shopBioEn,
  "partnerShopBioTh": partner->shopBioTh,
  "partnerPortrait": partner->portrait,
  images,
  sizes
}`;

export async function getBouquetsFromSanity(): Promise<Bouquet[]> {
  try {
    const docs = await client.fetch<SanityBouquet[]>(bouquetsQuery);
    return (docs ?? []).map(mapToBouquet);
  } catch (err) {
    console.error('[Sanity] getBouquetsFromSanity failed:', err);
    return [];
  }
}

const bouquetsPaginatedQuery = `*[_type == "bouquet" && (!defined(status) || status == "approved")] | order(nameEn asc) [$start...$end] {
  _id,
  slug,
  nameEn,
  nameTh,
  descriptionEn,
  descriptionTh,
  compositionEn,
  compositionTh,
  category,
  productKind,
  singleStemOptions,
  fixedVariants,
  customTiers,
  deliveryOptions,
  presentationFormats,
  colors,
  flowerTypes,
  occasion,
  images,
  sizes
}`;

/** Full catalog paginated (same order as getBouquetsFromSanity). For home "Show more" and API. */
export async function getBouquetsFromSanityPaginated(start: number, limit: number): Promise<Bouquet[]> {
  try {
    const end = start + limit;
    const docs = await client.fetch<SanityBouquet[]>(bouquetsPaginatedQuery, { start, end });
    return (docs ?? []).map(mapToBouquet);
  } catch (err) {
    console.error('[Sanity] getBouquetsFromSanityPaginated failed:', err);
    return [];
  }
}

export async function getBouquetBySlugFromSanity(slug: string): Promise<Bouquet | null> {
  try {
    const doc = await client.fetch<SanityBouquet | null>(bouquetBySlugQuery, { slug });
    if (!doc) return null;
    return mapToBouquet(doc);
  } catch (err) {
    console.error('[Sanity] getBouquetBySlugFromSanity failed:', err);
    return null;
  }
}

export async function getBouquetsByCategoryFromSanity(category: string): Promise<Bouquet[]> {
  const all = await getBouquetsFromSanity();
  if (!category || category === 'all') return all;
  return all.filter((b) => b.category === category);
}

const popularBouquetsQuery = `*[_type == "bouquet" && (!defined(status) || status == "approved")] {
  _id,
  slug,
  nameEn,
  nameTh,
  descriptionEn,
  descriptionTh,
  compositionEn,
  compositionTh,
  category,
  productKind,
  singleStemOptions,
  fixedVariants,
  customTiers,
  deliveryOptions,
  presentationFormats,
  colors,
  flowerTypes,
  occasion,
  images,
  sizes
}`;

/** Deterministic PRNG (0..1) for stable daily popular order + pagination */
function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getPopularShuffleSeed(): number {
  const d = new Date();
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}

function shuffleArraySeeded<T>(arr: T[], random: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Stable dedupe by bouquet id (safety net if interleave or CMS ever repeats an id). */
function dedupeBouquetsById(bouquets: Bouquet[]): Bouquet[] {
  const seen = new Set<string>();
  const out: Bouquet[] = [];
  for (const b of bouquets) {
    if (seen.has(b.id)) continue;
    seen.add(b.id);
    out.push(b);
  }
  return out;
}

/**
 * Price-tier interleaving (same as previous popular logic, before shuffle).
 * Buckets must be disjoint: the old split used slice(0, thirdSize) and slice(-thirdSize),
 * which both select the same item when total === 1, duplicating that card in the grid.
 */
function buildInterleavedPopularBouquets(bouquets: Bouquet[]): Bouquet[] {
  if (bouquets.length === 0) return [];

  const bouquetsWithPrice = bouquets.map((b) => ({
    bouquet: b,
    minPrice: minPriceFromOptions(b.sizes),
  }));

  bouquetsWithPrice.sort((a, b) => a.minPrice - b.minPrice);

  const n = bouquetsWithPrice.length;
  const nCheap = Math.ceil(n / 3);
  const nMid = Math.ceil((n - nCheap) / 2);
  const nExp = n - nCheap - nMid;

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

const HERO_IMAGE_FALLBACK = '/HeroImage/heroimage.webp';

/** Hero image URL for homepage. Editable in Sanity Studio → Site Settings. */
export async function getHeroImageFromSanity(): Promise<string> {
  try {
    const doc = await client.fetch<{ heroImage?: { _type?: string; asset?: { _ref?: string } } } | null>(
      `*[_type == "siteSettings"][0] { heroImage }`
    );
    const url = doc?.heroImage ? urlForHeroImage(doc.heroImage) : '';
    return url || HERO_IMAGE_FALLBACK;
  } catch (err) {
    console.error('[Sanity] getHeroImageFromSanity failed:', err);
    return HERO_IMAGE_FALLBACK;
  }
}

/** Hero carousel image URLs for homepage swipe carousel. Editable in Sanity Studio → Site Settings → Hero Carousel Images. */
export async function getHeroCarouselImagesFromSanity(): Promise<string[]> {
  try {
    const doc = await client.fetch<{
      heroCarouselImages?: Array<{ _type?: string; asset?: { _ref?: string } }>;
    } | null>(
      `*[_type == "siteSettings"][0] { heroCarouselImages }`
    );
    if (!doc?.heroCarouselImages?.length) return [];
    return doc.heroCarouselImages
      .map((img) => (img?.asset?._ref ? builder.image(img).width(800).height(1000).fit('crop').url() : ''))
      .filter(Boolean);
  } catch (err) {
    console.error('[Sanity] getHeroCarouselImagesFromSanity failed:', err);
    return [];
  }
}


/**
 * Home "Popular" + /api/bouquets: price-tier interleave, then daily seeded shuffle (not nameEn order,
 * so names starting with digits are not stuck first). Same seed all day so pagination matches SSR.
 */
export async function getPopularBouquetsFromSanityPaginated(
  start: number,
  limit: number
): Promise<Bouquet[]> {
  try {
    const docs = await client.fetch<SanityBouquet[]>(popularBouquetsQuery);
    const bouquets = (docs ?? []).map(mapToBouquet);
    if (bouquets.length === 0) return [];

    const interleaved = buildInterleavedPopularBouquets(bouquets);
    const rng = mulberry32(getPopularShuffleSeed());
    const shuffled = shuffleArraySeeded([...interleaved], rng);
    const safeStart = Math.max(0, start);
    return shuffled.slice(safeStart, safeStart + limit);
  } catch (err) {
    console.error('[Sanity] getPopularBouquetsFromSanityPaginated failed:', err);
    return [];
  }
}

/** First N popular bouquets (guides, etc.). Order matches home popular for the same day. */
export async function getPopularBouquetsFromSanity(limit: number): Promise<Bouquet[]> {
  return getPopularBouquetsFromSanityPaginated(0, limit);
}

export interface CatalogFilterParams {
  /** Top-level category: flowers (bouquets) or product category (balloons, gifts, etc.) */
  topCategory?: string;
  /** Bouquet subcategory — only when topCategory === 'flowers' */
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
}

/** Catalog product (non-flower) for display — matches BouquetCard-like shape */
export interface CatalogProduct {
  id: string;
  slug: string;
  nameEn: string;
  nameTh?: string;
  descriptionEn?: string;
  descriptionTh?: string;
  category: string;
  /** Sanity source: partner `product` vs standalone `plushyToy` document. */
  catalogKind?: 'product' | 'plushyToy';
  /** Single-size label (plushy toys). Optional for non-plushy products. */
  sizeLabel?: string;
  /** Partner cost (what we pay partner). For display use computeFinalPrice(cost ?? price, commissionPercent). */
  price: number;
  /** Partner cost from Sanity; use cost ?? price for effective partner cost. */
  cost?: number;
  /** Admin sets before approving. Null/0 = own item, no markup. */
  commissionPercent?: number;
  images: string[];
  /** Prep time in minutes (from structuredAttributes) */
  preparationTime?: number;
  /** Occasion (from structuredAttributes) */
  occasion?: string;
  /** When true, show a “HIT” badge on the catalog card (optional CMS field later). */
  isHit?: boolean;
}

type SanityBouquetWithCreated = SanityBouquet & { _createdAt?: string };

/** Single parameter-free query; all filtering done in JS for reliability */
const catalogAllQuery = `*[_type == "bouquet" && (!defined(status) || status == "approved")] {
  _id,
  _createdAt,
  slug,
  nameEn,
  nameTh,
  descriptionEn,
  descriptionTh,
  compositionEn,
  compositionTh,
  category,
  productKind,
  singleStemOptions,
  fixedVariants,
  customTiers,
  deliveryOptions,
  presentationFormats,
  colors,
  flowerTypes,
  occasion,
  partner,
  "partnerName": partner->shopName,
  images,
  sizes
}`;

function matchesFilters(bouquet: Bouquet, params: CatalogFilterParams): boolean {
  if (params.category && params.category !== 'all' && bouquet.category !== params.category) {
    return false;
  }
  if (params.colors?.length) {
    const bColors = bouquet.colors ?? [];
    const hasMatch = params.colors.some((c) => bColors.includes(c));
    if (!hasMatch) return false;
  }
  if (params.types?.length) {
    const bTypes = bouquet.flowerTypes ?? [];
    const hasMatch = params.types.some((t) => bTypes.includes(t));
    if (!hasMatch) return false;
  }
  if (params.occasion) {
    const bOccasions = bouquet.occasion ?? [];
    if (!bOccasions.includes(params.occasion)) return false;
  }
  if (params.delivery?.length) {
    const bDel = bouquet.deliveryOptions ?? [];
    const ok = params.delivery.some((d) => bDel.includes(d));
    if (!ok) return false;
  }
  if (params.formats?.length) {
    const bFmt = bouquet.presentationFormats ?? [];
    const ok = params.formats.some((f) => bFmt.includes(f));
    if (!ok) return false;
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

/** Catalog with filters and sort; fetches all then filters in JS for reliable behavior */
async function fetchBouquetsCatalogFiltered(params: CatalogFilterParams): Promise<{
  bouquets: Bouquet[];
  allBouquets: Bouquet[];
}> {
  const docs = await client.fetch<SanityBouquetWithCreated[]>(catalogAllQuery);
  const allBouquets = dedupeBouquetsById((docs ?? []).map((d) => mapToBouquet(d)));
  let filtered = allBouquets.filter((b) => matchesFilters(b, params));

  const sort = params.sort || 'newest';
  if (sort === 'newest') {
    const interleaved = buildInterleavedPopularBouquets(filtered);
    const rng = mulberry32(getPopularShuffleSeed());
    return {
      bouquets: shuffleArraySeeded([...interleaved], rng),
      allBouquets,
    };
  }
  if (sort === 'price_asc') {
    filtered = [...filtered].sort((a, b) => minPriceFromOptions(a.sizes) - minPriceFromOptions(b.sizes));
  } else if (sort === 'price_desc') {
    filtered = [...filtered].sort((a, b) => minPriceFromOptions(b.sizes) - minPriceFromOptions(a.sizes));
  }
  return { bouquets: dedupeBouquetsById(filtered), allBouquets };
}

export async function getBouquetsFilteredFromSanity(params: CatalogFilterParams): Promise<Bouquet[]> {
  try {
    const { bouquets } = await fetchBouquetsCatalogFiltered(params);
    return bouquets;
  } catch (err) {
    console.error('[Sanity] getBouquetsFilteredFromSanity failed:', err);
    return [];
  }
}

/** Same fetch as catalog list; includes unfiltered list for facet counts */
export async function getBouquetsCatalogData(params: CatalogFilterParams): Promise<{
  bouquets: Bouquet[];
  allBouquets: Bouquet[];
}> {
  try {
    return await fetchBouquetsCatalogFiltered(params);
  } catch (err) {
    console.error('[Sanity] getBouquetsCatalogData failed:', err);
    return { bouquets: [], allBouquets: [] };
  }
}

// —— Partner (read) ——
type SanityPartner = {
  _id: string;
  shopName?: string;
  contactName?: string;
  phoneNumber?: string;
  lineOrWhatsapp?: string;
  shopAddress?: string;
  shopBioEn?: string;
  shopBioTh?: string;
  portrait?: { _type?: string; asset?: { _ref?: string } };
  city?: string;
  status?: string;
  supabaseUserId?: string;
};

function mapToPartner(doc: SanityPartner): Partner {
  return {
    id: doc._id,
    shopName: doc.shopName ?? '',
    contactName: doc.contactName ?? '',
    phoneNumber: doc.phoneNumber ?? '',
    lineOrWhatsapp: doc.lineOrWhatsapp,
    shopAddress: doc.shopAddress,
    shopBioEn: doc.shopBioEn ?? undefined,
    shopBioTh: doc.shopBioTh ?? undefined,
    portraitUrl: doc.portrait ? urlFor(doc.portrait) : undefined,
    city: doc.city ?? 'Chiang Mai',
    status: (doc.status as PartnerStatus) ?? 'pending_review',
    supabaseUserId: doc.supabaseUserId,
  };
}

export async function getPartnerById(partnerId: string): Promise<Partner | null> {
  try {
    const doc = await client.fetch<SanityPartner | null>(
      `*[_type == "partner" && _id == $id][0] { _id, shopName, contactName, phoneNumber, lineOrWhatsapp, shopAddress, shopBioEn, shopBioTh, portrait, city, status, supabaseUserId }`,
      { id: partnerId }
    );
    if (!doc) return null;
    return mapToPartner(doc);
  } catch (err) {
    console.error('[Sanity] getPartnerById failed:', err);
    return null;
  }
}

/** Resolve partner by Supabase auth user ID (for partner dashboard after login) */
export async function getPartnerBySupabaseUserId(supabaseUserId: string): Promise<Partner | null> {
  try {
    const doc = await client.fetch<SanityPartner | null>(
      `*[_type == "partner" && supabaseUserId == $uid][0] { _id, shopName, contactName, phoneNumber, lineOrWhatsapp, shopAddress, shopBioEn, shopBioTh, portrait, city, status, supabaseUserId }`,
      { uid: supabaseUserId }
    );
    if (!doc) return null;
    return mapToPartner(doc);
  } catch (err) {
    console.error('[Sanity] getPartnerBySupabaseUserId failed:', err);
    return null;
  }
}

/** All bouquets for a partner (any status) — for partner dashboard */
export async function getBouquetsByPartnerId(partnerId: string): Promise<Bouquet[]> {
  try {
    const docs = await client.fetch<SanityBouquet[]>(
      `*[_type == "bouquet" && references($partnerId)] | order(nameEn asc) {
        _id, slug, nameEn, nameTh, descriptionEn, descriptionTh, compositionEn, compositionTh, category,
        productKind, singleStemOptions, fixedVariants, customTiers, deliveryOptions, presentationFormats,
        colors, flowerTypes, occasion, partner, status, images, sizes
      }`,
      { partnerId }
    );
    return (docs ?? []).map(mapToBouquet);
  } catch (err) {
    console.error('[Sanity] getBouquetsByPartnerId failed:', err);
    return [];
  }
}

/** Single bouquet by ID (for partner edit) — no approval filter */
export async function getBouquetById(bouquetId: string): Promise<Bouquet | null> {
  try {
    const doc = await client.fetch<SanityBouquet | null>(
      `*[_type == "bouquet" && _id == $id][0] {
        _id, slug, nameEn, nameTh, descriptionEn, descriptionTh, compositionEn, compositionTh, category,
        productKind, singleStemOptions, fixedVariants, customTiers, deliveryOptions, presentationFormats,
        colors, flowerTypes, occasion, partner, status, images, sizes
      }`,
      { id: bouquetId }
    );
    if (!doc) return null;
    return mapToBouquet(doc);
  } catch (err) {
    console.error('[Sanity] getBouquetById failed:', err);
    return null;
  }
}

/** Bouquets pending review (for admin moderation) */
export async function getPendingBouquets(): Promise<Bouquet[]> {
  try {
    const docs = await client.fetch<SanityBouquet[]>(
      `*[_type == "bouquet" && status == "pending_review"] | order(_createdAt desc) {
        _id, slug, nameEn, nameTh, descriptionEn, descriptionTh, compositionEn, compositionTh, category,
        productKind, singleStemOptions, fixedVariants, customTiers, deliveryOptions, presentationFormats,
        colors, flowerTypes, occasion, partner, status, images, sizes
      }`
    );
    return (docs ?? []).map(mapToBouquet);
  } catch (err) {
    console.error('[Sanity] getPendingBouquets failed:', err);
    return [];
  }
}

export interface ModerationProduct {
  id: string;
  nameEn: string;
  nameTh?: string;
  category: string;
  price: number;
  partnerId?: string;
  moderationStatus: string;
  imageUrl?: string;
}

export interface PartnerProduct {
  id: string;
  nameEn: string;
  nameTh?: string;
  category: string;
  price: number;
  moderationStatus: 'submitted' | 'live' | 'needs_changes';
  imageUrl?: string;
  adminOverrides?: {
    nameEn?: string;
    nameTh?: string;
    descriptionEn?: string;
    descriptionTh?: string;
  };
  adminChangeSummary?: string;
  adminLastEditedAt?: string;
}

/** All products (non-flower) for a partner — for partner dashboard */
export async function getProductsByPartnerId(partnerId: string): Promise<PartnerProduct[]> {
  try {
    const docs = await client.fetch<
      Array<{
        _id: string;
        nameEn?: string;
        nameTh?: string;
        category?: string;
        price?: number;
        moderationStatus?: string;
        images?: Array<{ _type?: string; asset?: { _ref?: string } }>;
        adminOverrides?: {
          nameEn?: string;
          nameTh?: string;
          descriptionEn?: string;
          descriptionTh?: string;
        };
        adminChangeSummary?: string;
        adminLastEditedAt?: string;
      }>
    >(
      `*[_type == "product" && references($partnerId)] | order(_createdAt desc) {
        _id, nameEn, nameTh, category, price, moderationStatus, images,
        adminOverrides, adminChangeSummary, adminLastEditedAt
      }`,
      { partnerId }
    );
    return (docs ?? []).map((d) => ({
      id: d._id,
      nameEn: d.nameEn ?? '',
      nameTh: d.nameTh,
      category: d.category ?? '',
      price: d.price ?? 0,
      moderationStatus: (d.moderationStatus as 'submitted' | 'live' | 'needs_changes') ?? 'submitted',
      imageUrl: d.images?.[0] ? urlFor(d.images[0]) : undefined,
      adminOverrides: d.adminOverrides,
      adminChangeSummary: d.adminChangeSummary,
      adminLastEditedAt: d.adminLastEditedAt,
    }));
  } catch (err) {
    console.error('[Sanity] getProductsByPartnerId failed:', err);
    return [];
  }
}

/** Pending count (bouquets pending_review + products submitted) for partner nav badge */
export async function getPendingCountByPartnerId(partnerId: string): Promise<number> {
  try {
    const [bouquetCount, productCount] = await Promise.all([
      client.fetch<number>(
        `count(*[_type == "bouquet" && references($partnerId) && status == "pending_review"])`,
        { partnerId }
      ),
      client.fetch<number>(
        `count(*[_type == "product" && references($partnerId) && moderationStatus == "submitted"])`,
        { partnerId }
      ),
    ]);
    return (bouquetCount ?? 0) + (productCount ?? 0);
  } catch (err) {
    console.error('[Sanity] getPendingCountByPartnerId failed:', err);
    return 0;
  }
}

/** Products pending moderation (moderationStatus=submitted) */
export async function getPendingProducts(): Promise<ModerationProduct[]> {
  try {
    const docs = await client.fetch<
      Array<{
        _id: string;
        nameEn?: string;
        nameTh?: string;
        category?: string;
        price?: number;
        partner?: { _ref?: string };
        moderationStatus?: string;
        images?: Array<{ _type?: string; asset?: { _ref?: string } }>;
      }>
    >(
      `*[_type == "product" && moderationStatus == "submitted"] | order(_createdAt desc) {
        _id, nameEn, nameTh, category, price, partner, moderationStatus, images
      }`
    );
    return (docs ?? []).map((d) => ({
      id: d._id,
      nameEn: d.nameEn ?? '',
      nameTh: d.nameTh,
      category: d.category ?? '',
      price: d.price ?? 0,
      partnerId: d.partner?._ref,
      moderationStatus: d.moderationStatus ?? 'submitted',
      imageUrl: d.images?.[0] ? urlFor(d.images[0]) : undefined,
    }));
  } catch (err) {
    console.error('[Sanity] getPendingProducts failed:', err);
    return [];
  }
}

/** All partner products (for admin) — any moderationStatus. */
export async function getAllProducts(): Promise<
  Array<ModerationProduct & { slug?: string }>
> {
  try {
    const docs = await client.fetch<
      Array<{
        _id: string;
        slug?: { current?: string };
        nameEn?: string;
        nameTh?: string;
        category?: string;
        price?: number;
        partner?: { _ref?: string };
        moderationStatus?: string;
        images?: Array<{ _type?: string; asset?: { _ref?: string } }>;
      }>
    >(
      `*[_type == "product"] | order(_createdAt desc) {
        _id, slug, nameEn, nameTh, category, price, partner, moderationStatus, images
      }`
    );
    return (docs ?? []).map((d) => ({
      id: d._id,
      nameEn: d.nameEn ?? '',
      nameTh: d.nameTh,
      category: d.category ?? '',
      price: d.price ?? 0,
      partnerId: d.partner?._ref,
      moderationStatus: d.moderationStatus ?? 'submitted',
      imageUrl: d.images?.[0] ? urlFor(d.images[0]) : undefined,
      slug: d.slug?.current,
    }));
  } catch (err) {
    console.error('[Sanity] getAllProducts failed:', err);
    return [];
  }
}

/** Live products for catalog — categoryKey must match product.category in Sanity */
export async function getProductsFilteredFromSanity(params: {
  categoryKey: string;
  sort?: 'newest' | 'price_asc' | 'price_desc';
}): Promise<CatalogProduct[]> {
  const { categoryKey, sort = 'newest' } = params;
  try {
    const docs = await clientNoCdn.fetch<
      Array<{
        _id: string;
        _createdAt?: string;
        slug?: { current?: string };
        nameEn?: string;
        nameTh?: string;
        descriptionEn?: string;
        descriptionTh?: string;
        category?: string;
        price?: number;
        cost?: number;
        commissionPercent?: number;
        images?: Array<{ _type?: string; asset?: { _ref?: string } }>;
      }>
    >(
      `*[_type == "product" && moderationStatus == "live" && category == $categoryKey] | order(_createdAt desc) {
        _id, _createdAt, slug,
        "nameEn": coalesce(adminOverrides.nameEn, nameEn),
        "nameTh": coalesce(adminOverrides.nameTh, nameTh),
        "descriptionEn": coalesce(adminOverrides.descriptionEn, descriptionEn),
        "descriptionTh": coalesce(adminOverrides.descriptionTh, descriptionTh),
        category, price, cost, commissionPercent, images
      }`,
      { categoryKey }
    );
    const mapped = (docs ?? []).map((d) => {
      const slug = d.slug?.current ?? d._id;
      const imageUrls = (d.images ?? []).map((img) => urlFor(img)).filter(Boolean);
      const placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"%3E%3Crect fill="%23f9f5f0" width="600" height="600"/%3E%3Ctext fill="%236b6560" font-family="sans-serif" font-size="24" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3ENo image%3C/text%3E%3C/svg%3E';
      const partnerCost = d.cost ?? d.price ?? 0;
      return {
        id: d._id,
        slug,
        nameEn: d.nameEn ?? '',
        nameTh: d.nameTh,
        descriptionEn: d.descriptionEn,
        descriptionTh: d.descriptionTh,
        category: d.category ?? '',
        catalogKind: 'product' as const,
        price: d.price ?? 0,
        cost: d.cost,
        commissionPercent: d.commissionPercent,
        images: imageUrls.length ? imageUrls : [placeholder],
        _createdAt: d._createdAt,
        _partnerCost: partnerCost,
      };
    });
    if (sort === 'price_asc') {
      mapped.sort((a, b) => (a._partnerCost ?? a.price) - (b._partnerCost ?? b.price));
    } else if (sort === 'price_desc') {
      mapped.sort((a, b) => (b._partnerCost ?? b.price) - (a._partnerCost ?? a.price));
    } else {
      mapped.sort((a, b) => (b._createdAt || '').localeCompare(a._createdAt || ''));
    }
    return mapped.map(({ _createdAt, _partnerCost, ...p }) => p);
  } catch (err) {
    console.error('[Sanity] getProductsFilteredFromSanity failed:', err);
    return [];
  }
}

/** Get product by slug (for product detail page) */
export async function getProductBySlugFromSanity(slug: string): Promise<CatalogProduct | null> {
  try {
    const doc = await clientNoCdn.fetch<
      | {
          _id: string;
          slug?: { current?: string };
          nameEn?: string;
          nameTh?: string;
          descriptionEn?: string;
          descriptionTh?: string;
          category?: string;
          price?: number;
          cost?: number;
          commissionPercent?: number;
          images?: Array<{ _type?: string; asset?: { _ref?: string } }>;
          structuredAttributes?: { preparationTime?: number; occasion?: string };
        }
      | null
    >(
      `*[_type == "product" && slug.current == $slug && moderationStatus == "live"][0] {
        _id, slug,
        "nameEn": coalesce(adminOverrides.nameEn, nameEn),
        "nameTh": coalesce(adminOverrides.nameTh, nameTh),
        "descriptionEn": coalesce(adminOverrides.descriptionEn, descriptionEn),
        "descriptionTh": coalesce(adminOverrides.descriptionTh, descriptionTh),
        category, price, cost, commissionPercent, images,
        "structuredAttributes": structuredAttributes
      }`,
      { slug }
    );
    if (!doc) return null;
    const slugVal = doc.slug?.current ?? doc._id;
    const imageUrls = (doc.images ?? []).map((img) => urlFor(img)).filter(Boolean);
    const placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"%3E%3Crect fill="%23f9f5f0" width="600" height="600"/%3E%3Ctext fill="%236b6560" font-family="sans-serif" font-size="24" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3ENo image%3C/text%3E%3C/svg%3E';
    const attrs = doc.structuredAttributes;
    return {
      id: doc._id,
      slug: slugVal,
      nameEn: doc.nameEn ?? '',
      nameTh: doc.nameTh,
      descriptionEn: doc.descriptionEn,
      descriptionTh: doc.descriptionTh,
      category: doc.category ?? '',
      catalogKind: 'product',
      price: doc.price ?? 0,
      cost: doc.cost,
      commissionPercent: doc.commissionPercent,
      images: imageUrls.length ? imageUrls : [placeholder],
      preparationTime: attrs?.preparationTime,
      occasion: attrs?.occasion,
    };
  } catch (err) {
    console.error('[Sanity] getProductBySlugFromSanity failed:', err);
    return null;
  }
}

const plushyToyPlaceholder =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"%3E%3Crect fill="%23f9f5f0" width="600" height="600"/%3E%3Ctext fill="%236b6560" font-family="sans-serif" font-size="24" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3ENo image%3C/text%3E%3C/svg%3E';

/** Live plushy toys (standalone `plushyToy` documents — not `product`). */
export async function getPlushyToysFilteredFromSanity(params: {
  sort?: 'newest' | 'price_asc' | 'price_desc';
}): Promise<CatalogProduct[]> {
  const { sort = 'newest' } = params;
  try {
    const docs = await clientNoCdn.fetch<
      Array<{
        _id: string;
        _createdAt?: string;
        slug?: { current?: string };
        nameEn?: string;
        nameTh?: string;
        descriptionEn?: string;
        descriptionTh?: string;
        price?: number;
        sizeLabel?: string;
        images?: Array<{ _type?: string; asset?: { _ref?: string } }>;
      }>
    >(
      `*[_type == "plushyToy"] | order(_createdAt desc) {
        _id, _createdAt, slug, nameEn, nameTh, descriptionEn, descriptionTh, price, sizeLabel, images
      }`
    );
    const mapped = (docs ?? []).map((d) => {
      const slug = d.slug?.current ?? d._id;
      const imageUrls = (d.images ?? []).map((img) => urlFor(img)).filter(Boolean);
      const price = d.price ?? 0;
      return {
        id: d._id,
        slug,
        nameEn: d.nameEn ?? '',
        nameTh: d.nameTh,
        descriptionEn: d.descriptionEn,
        descriptionTh: d.descriptionTh,
        category: 'plushy_toys',
        catalogKind: 'plushyToy' as const,
        sizeLabel: d.sizeLabel,
        price,
        images: imageUrls.length ? imageUrls : [plushyToyPlaceholder],
        _createdAt: d._createdAt,
        _partnerCost: price,
      };
    });
    if (sort === 'price_asc') {
      mapped.sort((a, b) => a._partnerCost! - b._partnerCost!);
    } else if (sort === 'price_desc') {
      mapped.sort((a, b) => b._partnerCost! - a._partnerCost!);
    } else {
      mapped.sort((a, b) => (b._createdAt || '').localeCompare(a._createdAt || ''));
    }
    return mapped.map(({ _createdAt, _partnerCost, ...p }) => p);
  } catch (err) {
    console.error('[Sanity] getPlushyToysFilteredFromSanity failed:', err);
    return [];
  }
}

/** Plushy toy by slug (detail page). */
export async function getPlushyToyBySlugFromSanity(slug: string): Promise<CatalogProduct | null> {
  try {
    const doc = await clientNoCdn.fetch<
      | {
          _id: string;
          slug?: { current?: string };
          nameEn?: string;
          nameTh?: string;
          descriptionEn?: string;
          descriptionTh?: string;
          price?: number;
          sizeLabel?: string;
          images?: Array<{ _type?: string; asset?: { _ref?: string } }>;
        }
      | null
    >(
      `*[_type == "plushyToy" && slug.current == $slug][0] {
        _id, slug, nameEn, nameTh, descriptionEn, descriptionTh, price, sizeLabel, images
      }`,
      { slug }
    );
    if (!doc) return null;
    const slugVal = doc.slug?.current ?? doc._id;
    const imageUrls = (doc.images ?? []).map((img) => urlFor(img)).filter(Boolean);
    return {
      id: doc._id,
      slug: slugVal,
      nameEn: doc.nameEn ?? '',
      nameTh: doc.nameTh,
      descriptionEn: doc.descriptionEn,
      descriptionTh: doc.descriptionTh,
      category: 'plushy_toys',
      catalogKind: 'plushyToy',
      sizeLabel: doc.sizeLabel,
      price: doc.price ?? 0,
      images: imageUrls.length ? imageUrls : [plushyToyPlaceholder],
    };
  } catch (err) {
    console.error('[Sanity] getPlushyToyBySlugFromSanity failed:', err);
    return null;
  }
}

/** Plushy toy by id (Stripe / server pricing). */
export async function getPlushyToyById(id: string): Promise<{
  id: string;
  nameEn: string;
  nameTh?: string;
  price: number;
  sizeLabel?: string;
  imageUrl?: string;
} | null> {
  try {
    const doc = await clientNoCdn.fetch<
      | {
          _id: string;
          nameEn?: string;
          nameTh?: string;
          price?: number;
          sizeLabel?: string;
          images?: Array<{ _type?: string; asset?: { _ref?: string } }>;
        }
      | null
    >(`*[_type == "plushyToy" && _id == $id][0] { _id, nameEn, nameTh, price, sizeLabel, images }`, { id });
    if (!doc) return null;
    return {
      id: doc._id,
      nameEn: doc.nameEn ?? '',
      nameTh: doc.nameTh,
      price: doc.price ?? 0,
      sizeLabel: doc.sizeLabel,
      imageUrl: doc.images?.[0] ? urlFor(doc.images[0]) : undefined,
    };
  } catch (err) {
    console.error('[Sanity] getPlushyToyById failed:', err);
    return null;
  }
}

/** Get existing image asset refs for a bouquet (for edit: keep existing images when no new uploads). */
export async function getBouquetImageRefs(bouquetId: string): Promise<string[]> {
  try {
    const refs = await client.fetch<string[]>(
      `*[_type == "bouquet" && _id == $id][0].images[].asset._ref`,
      { id: bouquetId }
    );
    return Array.isArray(refs) ? refs.filter(Boolean) : [];
  } catch {
    return [];
  }
}

/** Single product by ID (for partner edit, stripe pricing) — no moderation filter */
export async function getProductById(productId: string): Promise<{
  id: string;
  nameEn: string;
  nameTh?: string;
  descriptionEn?: string;
  descriptionTh?: string;
  category: string;
  price: number;
  cost?: number;
  commissionPercent?: number;
  moderationStatus: string;
  imageUrl?: string;
  imageRefs: string[];
  preparationTime?: number;
  occasion?: string;
  partnerId?: string;
  adminOverrides?: {
    nameEn?: string;
    nameTh?: string;
    descriptionEn?: string;
    descriptionTh?: string;
  };
  adminChangeSummary?: string;
  adminLastEditedAt?: string;
} | null> {
  try {
    const doc = await clientNoCdn.fetch<
      | {
          _id: string;
          nameEn?: string;
          nameTh?: string;
          descriptionEn?: string;
          descriptionTh?: string;
          category?: string;
          price?: number;
          cost?: number;
          commissionPercent?: number;
          moderationStatus?: string;
          images?: Array<{ _type?: string; asset?: { _ref?: string } }>;
          structuredAttributes?: { preparationTime?: number; occasion?: string };
          partner?: { _ref?: string };
          adminOverrides?: {
            nameEn?: string;
            nameTh?: string;
            descriptionEn?: string;
            descriptionTh?: string;
          };
          adminChangeSummary?: string;
          adminLastEditedAt?: string;
        }
      | null
    >(
      `*[_type == "product" && _id == $id][0] {
        _id, nameEn, nameTh, descriptionEn, descriptionTh, category, price, cost, commissionPercent, moderationStatus, images, structuredAttributes, partner,
        adminOverrides, adminChangeSummary, adminLastEditedAt
      }`,
      { id: productId }
    );
    if (!doc) return null;
    const imageRefs = (doc.images ?? [])
      .map((img) => img.asset?._ref)
      .filter((r): r is string => !!r);
    return {
      id: doc._id,
      nameEn: doc.nameEn ?? '',
      nameTh: doc.nameTh,
      descriptionEn: doc.descriptionEn,
      descriptionTh: doc.descriptionTh,
      category: doc.category ?? '',
      price: doc.price ?? 0,
      cost: doc.cost,
      commissionPercent: doc.commissionPercent,
      moderationStatus: doc.moderationStatus ?? 'submitted',
      imageUrl: doc.images?.[0] ? urlFor(doc.images[0]) : undefined,
      imageRefs,
      preparationTime: doc.structuredAttributes?.preparationTime,
      occasion: doc.structuredAttributes?.occasion,
      partnerId: doc.partner?._ref,
      adminOverrides: doc.adminOverrides,
      adminChangeSummary: doc.adminChangeSummary,
      adminLastEditedAt: doc.adminLastEditedAt,
    };
  } catch (err) {
    console.error('[Sanity] getProductById failed:', err);
    return null;
  }
}

/** Full product for admin moderation — all images, descriptions, attributes, commission. */
export interface AdminProductDetail {
  id: string;
  slug?: string;
  nameEn: string;
  nameTh?: string;
  descriptionEn?: string;
  descriptionTh?: string;
  category: string;
  price: number;
  cost?: number;
  moderationStatus: string;
  commissionPercent?: number;
  images: string[];
  preparationTime?: number;
  occasion?: string;
  customAttributes: Array<{ key: string; value: string }>;
  partnerId?: string;
  adminOverrides?: {
    nameEn?: string;
    nameTh?: string;
    descriptionEn?: string;
    descriptionTh?: string;
  };
  adminChangeSummary?: string;
  adminLastEditedAt?: string;
  adminLastEditedBy?: string;
}

export async function getProductByIdForAdmin(productId: string): Promise<AdminProductDetail | null> {
  try {
    const doc = await client.fetch<
      | {
          _id: string;
          slug?: { current?: string };
          nameEn?: string;
          nameTh?: string;
          descriptionEn?: string;
          descriptionTh?: string;
          category?: string;
          price?: number;
          cost?: number;
          moderationStatus?: string;
          commissionPercent?: number;
          images?: Array<{ _type?: string; asset?: { _ref?: string } }>;
          structuredAttributes?: { preparationTime?: number; occasion?: string };
          customAttributes?: Array<{ key?: string; value?: string }>;
          partner?: { _ref?: string };
          adminOverrides?: {
            nameEn?: string;
            nameTh?: string;
            descriptionEn?: string;
            descriptionTh?: string;
          };
          adminChangeSummary?: string;
          adminLastEditedAt?: string;
          adminLastEditedBy?: string;
        }
      | null
    >(
      `*[_type == "product" && _id == $id][0] {
        _id, slug, nameEn, nameTh, descriptionEn, descriptionTh, category, price, cost, moderationStatus, commissionPercent,
        images, structuredAttributes, customAttributes, partner,
        adminOverrides, adminChangeSummary, adminLastEditedAt, adminLastEditedBy
      }`,
      { id: productId }
    );
    if (!doc) return null;
    const imageUrls = (doc.images ?? []).map((img) => urlFor(img)).filter(Boolean);
    const placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"%3E%3Crect fill="%23f9f5f0" width="600" height="600"/%3E%3Ctext fill="%236b6560" font-family="sans-serif" font-size="24" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3ENo image%3C/text%3E%3C/svg%3E';
    return {
      id: doc._id,
      slug: doc.slug?.current,
      nameEn: doc.nameEn ?? '',
      nameTh: doc.nameTh,
      descriptionEn: doc.descriptionEn,
      descriptionTh: doc.descriptionTh,
      category: doc.category ?? '',
      price: doc.price ?? 0,
      cost: doc.cost,
      moderationStatus: doc.moderationStatus ?? 'submitted',
      commissionPercent: doc.commissionPercent,
      images: imageUrls.length ? imageUrls : [placeholder],
      preparationTime: doc.structuredAttributes?.preparationTime,
      occasion: doc.structuredAttributes?.occasion,
      customAttributes: (doc.customAttributes ?? []).map((a) => ({
        key: a.key ?? '',
        value: a.value ?? '',
      })).filter((a) => a.key || a.value),
      partnerId: doc.partner?._ref,
      adminOverrides: doc.adminOverrides,
      adminChangeSummary: doc.adminChangeSummary,
      adminLastEditedAt: doc.adminLastEditedAt,
      adminLastEditedBy: doc.adminLastEditedBy,
    };
  } catch (err) {
    console.error('[Sanity] getProductByIdForAdmin failed:', err);
    return null;
  }
}

/** Get existing image asset refs for a product (for edit: keep existing images when no new uploads). */
export async function getProductImageRefs(productId: string): Promise<string[]> {
  try {
    const refs = await client.fetch<string[]>(
      `*[_type == "product" && _id == $id][0].images[].asset._ref`,
      { id: productId }
    );
    return Array.isArray(refs) ? refs.filter(Boolean) : [];
  } catch {
    return [];
  }
}
