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
  occasion?: string;
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
    occasion: doc.occasion || undefined,
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

const popularBouquetsQuery = `*[_type == "bouquet" && (!defined(status) || status == "approved")] | order(_createdAt desc) [0...$limit] {
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

/** Approved bouquets, newest first; for home "Popular" section */
export async function getPopularBouquetsFromSanity(limit: number): Promise<Bouquet[]> {
  try {
    const docs = await client.fetch<SanityBouquet[]>(popularBouquetsQuery, { limit });
    return (docs ?? []).map(mapToBouquet);
  } catch (err) {
    console.error('[Sanity] getPopularBouquetsFromSanity failed:', err);
    return [];
  }
}

export interface CatalogFilterParams {
  category?: string;
  colors?: string[];
  types?: string[];
  occasion?: string;
  min?: number;
  max?: number;
  sort?: 'newest' | 'price_asc' | 'price_desc';
}

type SanityBouquetWithCreated = SanityBouquet & { _createdAt?: string };

const filteredBouquetsQuery = `*[_type == "bouquet" && (!defined(status) || status == "approved")
  && (!defined($category) || $category == "" || category == $category)
  && (!defined($colors) || count($colors) == 0 || count((colors[])[@ in $colors]) > 0)
  && (!defined($types) || count($types) == 0 || count((flowerTypes[])[@ in $types]) > 0)
  && (!defined($occasion) || $occasion == "" || occasion == $occasion)
] {
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

function minPriceFromSizes(sizes: BouquetSize[]): number {
  if (!sizes?.length) return 0;
  return Math.min(...sizes.map((s) => s.price ?? Infinity));
}

/** Catalog with filters and sort; price range applied in JS */
export async function getBouquetsFilteredFromSanity(params: CatalogFilterParams): Promise<Bouquet[]> {
  try {
    const category = params.category && params.category !== 'all' ? params.category : undefined;
    const colors = params.colors?.length ? params.colors : undefined;
    const types = params.types?.length ? params.types : undefined;
    const occasion = params.occasion ? params.occasion : undefined;

    const docs = await client.fetch<SanityBouquetWithCreated[]>(filteredBouquetsQuery, {
      category: category ?? '',
      colors: colors ?? [],
      types: types ?? [],
      occasion: occasion ?? '',
    });

    let list = (docs ?? []).map(mapToBouquet);

    if (params.min != null && params.min > 0) {
      list = list.filter((b) => minPriceFromSizes(b.sizes) >= params.min!);
    }
    if (params.max != null && params.max > 0) {
      list = list.filter((b) => minPriceFromSizes(b.sizes) <= params.max!);
    }

    const sort = params.sort || 'newest';
    if (sort === 'newest') {
      const withCreated = (docs ?? []).map((d, i) => ({ doc: d, bouquet: list[i] }));
      withCreated.sort((a, b) => (b.doc._createdAt || '').localeCompare(a.doc._createdAt || ''));
      list = withCreated.map((x) => x.bouquet);
    } else if (sort === 'price_asc') {
      list = [...list].sort((a, b) => minPriceFromSizes(a.sizes) - minPriceFromSizes(b.sizes));
    } else if (sort === 'price_desc') {
      list = [...list].sort((a, b) => minPriceFromSizes(b.sizes) - minPriceFromSizes(a.sizes));
    }

    return list;
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
  };
}

export async function getPartnerById(partnerId: string): Promise<Partner | null> {
  try {
    const doc = await client.fetch<SanityPartner | null>(
      `*[_type == "partner" && _id == $id][0] { _id, shopName, contactName, phoneNumber, lineOrWhatsapp, shopAddress, city, status }`,
      { id: partnerId }
    );
    if (!doc) return null;
    return mapToPartner(doc);
  } catch (err) {
    console.error('[Sanity] getPartnerById failed:', err);
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
