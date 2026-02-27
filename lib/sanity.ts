import { createClient } from 'next-sanity';
import imageUrlBuilder from '@sanity/image-url';
import type { Bouquet, BouquetSize, Partner, PartnerStatus } from './bouquets';

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

const builder = imageUrlBuilder(client);

function urlFor(source: { _type?: string; asset?: { _ref?: string } } | undefined): string {
  if (!source?.asset?._ref) return '';
  return builder.image(source).width(600).url();
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
  colors?: string[];
  flowerTypes?: string[];
  occasion?: string | string[];
  partner?: { _ref?: string };
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

function mapToBouquet(doc: SanityBouquet): Bouquet {
  const slug = doc.slug?.current ?? doc._id;
  const sizes: BouquetSize[] = (doc.sizes ?? []).map((s) => ({
    key: (s.key ?? 'm') as BouquetSize['key'],
    label: s.label ?? 'M',
    price: s.price ?? 0,
    description: s.description ?? '',
    preparationTime: s.preparationTime,
    availability: s.availability ?? true,
  }));
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
    colors: Array.isArray(doc.colors) ? doc.colors : [],
    flowerTypes: Array.isArray(doc.flowerTypes) ? doc.flowerTypes : [],
    occasion: (() => {
      const o = doc.occasion;
      if (!o) return undefined;
      return Array.isArray(o) ? o.filter(Boolean) : o ? [o] : undefined;
    })(),
    images: imageUrls.length ? imageUrls : [placeholder],
    sizes: sizes.length ? sizes : [{ key: 'm', label: 'M', price: 0, description: '' }],
    partnerId: doc.partner?._ref,
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
  colors,
  flowerTypes,
  occasion,
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
  colors,
  flowerTypes,
  occasion,
  images,
  sizes
}`;

/** Fisher-Yates shuffle; mutates array in place */
function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Approved bouquets with variety pricing (expensive, cheap, middle) interleaved, then shuffled; for home "Popular" section. Order varies on each page generation. */
export async function getPopularBouquetsFromSanity(limit: number): Promise<Bouquet[]> {
  try {
    const docs = await client.fetch<SanityBouquet[]>(popularBouquetsQuery);
    const bouquets = (docs ?? []).map(mapToBouquet);
    
    if (bouquets.length === 0) return [];
    
    // Calculate min price for each bouquet
    const bouquetsWithPrice = bouquets.map((b) => ({
      bouquet: b,
      minPrice: minPriceFromSizes(b.sizes),
    }));
    
    // Sort by price (ascending)
    bouquetsWithPrice.sort((a, b) => a.minPrice - b.minPrice);
    
    // Divide into three groups: expensive (top third), middle (middle third), cheap (bottom third)
    const total = bouquetsWithPrice.length;
    const thirdSize = Math.ceil(total / 3);
    
    const expensive = bouquetsWithPrice.slice(-thirdSize).reverse(); // Most expensive first
    const middle = bouquetsWithPrice.slice(thirdSize, total - thirdSize);
    const cheap = bouquetsWithPrice.slice(0, thirdSize);
    
    // Interleave: expensive, cheap, middle, expensive, cheap, middle...
    const interleaved: Bouquet[] = [];
    const maxLength = Math.max(expensive.length, middle.length, cheap.length);
    
    for (let i = 0; i < maxLength; i++) {
      if (i < expensive.length) interleaved.push(expensive[i].bouquet);
      if (i < cheap.length) interleaved.push(cheap[i].bouquet);
      if (i < middle.length) interleaved.push(middle[i].bouquet);
    }
    
    // Shuffle so different items appear first on each site update
    return shuffleArray(interleaved).slice(0, limit);
  } catch (err) {
    console.error('[Sanity] getPopularBouquetsFromSanity failed:', err);
    return [];
  }
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
  price: number;
  images: string[];
}

type SanityBouquetWithCreated = SanityBouquet & { _createdAt?: string };

function minPriceFromSizes(sizes: BouquetSize[]): number {
  if (!sizes?.length) return 0;
  return Math.min(...sizes.map((s) => s.price ?? Infinity));
}

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
  colors,
  flowerTypes,
  occasion,
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
  if (params.min != null && params.min > 0) {
    if (minPriceFromSizes(bouquet.sizes) < params.min) return false;
  }
  if (params.max != null && params.max > 0) {
    if (minPriceFromSizes(bouquet.sizes) > params.max) return false;
  }
  return true;
}

/** Catalog with filters and sort; fetches all then filters in JS for reliable behavior */
export async function getBouquetsFilteredFromSanity(params: CatalogFilterParams): Promise<Bouquet[]> {
  try {
    const docs = await client.fetch<SanityBouquetWithCreated[]>(catalogAllQuery);
    const mapped = (docs ?? []).map((d) => ({ doc: d, bouquet: mapToBouquet(d) }));
    let filtered = mapped.filter(({ bouquet }) => matchesFilters(bouquet, params));

    const sort = params.sort || 'newest';
    if (sort === 'newest') {
      filtered.sort((a, b) => (b.doc._createdAt || '').localeCompare(a.doc._createdAt || ''));
    } else if (sort === 'price_asc') {
      filtered.sort((a, b) => minPriceFromSizes(a.bouquet.sizes) - minPriceFromSizes(b.bouquet.sizes));
    } else if (sort === 'price_desc') {
      filtered.sort((a, b) => minPriceFromSizes(b.bouquet.sizes) - minPriceFromSizes(a.bouquet.sizes));
    }

    return filtered.map((x) => x.bouquet);
  } catch (err) {
    console.error('[Sanity] getBouquetsFilteredFromSanity failed:', err);
    return [];
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
    city: doc.city ?? 'Chiang Mai',
    status: (doc.status as PartnerStatus) ?? 'pending_review',
    supabaseUserId: doc.supabaseUserId,
  };
}

export async function getPartnerById(partnerId: string): Promise<Partner | null> {
  try {
    const doc = await client.fetch<SanityPartner | null>(
      `*[_type == "partner" && _id == $id][0] { _id, shopName, contactName, phoneNumber, lineOrWhatsapp, shopAddress, city, status, supabaseUserId }`,
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
      `*[_type == "partner" && supabaseUserId == $uid][0] { _id, shopName, contactName, phoneNumber, lineOrWhatsapp, shopAddress, city, status, supabaseUserId }`,
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
        _id, slug, nameEn, nameTh, descriptionEn, descriptionTh, compositionEn, compositionTh, category, colors, flowerTypes, occasion, partner, status, images, sizes
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
        _id, slug, nameEn, nameTh, descriptionEn, descriptionTh, compositionEn, compositionTh, category, colors, flowerTypes, occasion, partner, status, images, sizes
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
        _id, slug, nameEn, nameTh, descriptionEn, descriptionTh, compositionEn, compositionTh, category, colors, flowerTypes, occasion, partner, status, images, sizes
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
      }>
    >(
      `*[_type == "product" && references($partnerId)] | order(_createdAt desc) {
        _id, nameEn, nameTh, category, price, moderationStatus, images
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

/** Live products for catalog — categoryKey must match product.category in Sanity */
export async function getProductsFilteredFromSanity(params: {
  categoryKey: string;
  sort?: 'newest' | 'price_asc' | 'price_desc';
}): Promise<CatalogProduct[]> {
  const { categoryKey, sort = 'newest' } = params;
  try {
    const docs = await client.fetch<
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
        images?: Array<{ _type?: string; asset?: { _ref?: string } }>;
      }>
    >(
      `*[_type == "product" && moderationStatus == "live" && category == $categoryKey] | order(_createdAt desc) {
        _id, _createdAt, slug, nameEn, nameTh, descriptionEn, descriptionTh, category, price, images
      }`,
      { categoryKey }
    );
    const mapped = (docs ?? []).map((d) => {
      const slug = d.slug?.current ?? d._id;
      const imageUrls = (d.images ?? []).map((img) => urlFor(img)).filter(Boolean);
      const placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"%3E%3Crect fill="%23f9f5f0" width="600" height="600"/%3E%3Ctext fill="%236b6560" font-family="sans-serif" font-size="24" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3ENo image%3C/text%3E%3C/svg%3E';
      return {
        id: d._id,
        slug,
        nameEn: d.nameEn ?? '',
        nameTh: d.nameTh,
        descriptionEn: d.descriptionEn,
        descriptionTh: d.descriptionTh,
        category: d.category ?? '',
        price: d.price ?? 0,
        images: imageUrls.length ? imageUrls : [placeholder],
        _createdAt: d._createdAt,
      };
    });
    if (sort === 'price_asc') {
      mapped.sort((a, b) => a.price - b.price);
    } else if (sort === 'price_desc') {
      mapped.sort((a, b) => b.price - a.price);
    } else {
      mapped.sort((a, b) => (b._createdAt || '').localeCompare(a._createdAt || ''));
    }
    return mapped.map(({ _createdAt, ...p }) => p);
  } catch (err) {
    console.error('[Sanity] getProductsFilteredFromSanity failed:', err);
    return [];
  }
}

/** Get product by slug (for product detail page) */
export async function getProductBySlugFromSanity(slug: string): Promise<CatalogProduct | null> {
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
          images?: Array<{ _type?: string; asset?: { _ref?: string } }>;
        }
      | null
    >(
      `*[_type == "product" && slug.current == $slug && moderationStatus == "live"][0] {
        _id, slug, nameEn, nameTh, descriptionEn, descriptionTh, category, price, images
      }`,
      { slug }
    );
    if (!doc) return null;
    const slugVal = doc.slug?.current ?? doc._id;
    const imageUrls = (doc.images ?? []).map((img) => urlFor(img)).filter(Boolean);
    const placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"%3E%3Crect fill="%23f9f5f0" width="600" height="600"/%3E%3Ctext fill="%236b6560" font-family="sans-serif" font-size="24" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3ENo image%3C/text%3E%3C/svg%3E';
    return {
      id: doc._id,
      slug: slugVal,
      nameEn: doc.nameEn ?? '',
      nameTh: doc.nameTh,
      descriptionEn: doc.descriptionEn,
      descriptionTh: doc.descriptionTh,
      category: doc.category ?? '',
      price: doc.price ?? 0,
      images: imageUrls.length ? imageUrls : [placeholder],
    };
  } catch (err) {
    console.error('[Sanity] getProductBySlugFromSanity failed:', err);
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
