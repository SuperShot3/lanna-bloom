import { createClient } from 'next-sanity';
import imageUrlBuilder from '@sanity/image-url';
import type { Bouquet, BouquetSize } from './bouquets';

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET!;

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
  images?: Array<{ _type?: string; asset?: { _ref?: string } }>;
  sizes?: Array<{ key?: string; label?: string; price?: number; description?: string }>;
};

function mapToBouquet(doc: SanityBouquet): Bouquet {
  const slug = doc.slug?.current ?? doc._id;
  const sizes: BouquetSize[] = (doc.sizes ?? []).map((s) => ({
    key: (s.key ?? 'm') as BouquetSize['key'],
    label: s.label ?? 'M',
    price: s.price ?? 0,
    description: s.description ?? '',
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
    images: imageUrls.length ? imageUrls : [placeholder],
    sizes: sizes.length ? sizes : [{ key: 'm', label: 'M', price: 0, description: '' }],
  };
}

const bouquetsQuery = `*[_type == "bouquet"] | order(nameEn asc) {
  _id,
  slug,
  nameEn,
  nameTh,
  descriptionEn,
  descriptionTh,
  compositionEn,
  compositionTh,
  category,
  images,
  sizes
}`;

const bouquetBySlugQuery = `*[_type == "bouquet" && slug.current == $slug][0] {
  _id,
  slug,
  nameEn,
  nameTh,
  descriptionEn,
  descriptionTh,
  compositionEn,
  compositionTh,
  category,
  images,
  sizes
}`;

export async function getBouquetsFromSanity(): Promise<Bouquet[]> {
  const docs = await client.fetch<SanityBouquet[]>(bouquetsQuery);
  return docs.map(mapToBouquet);
}

export async function getBouquetBySlugFromSanity(slug: string): Promise<Bouquet | null> {
  const doc = await client.fetch<SanityBouquet | null>(bouquetBySlugQuery, { slug });
  if (!doc) return null;
  return mapToBouquet(doc);
}

export async function getBouquetsByCategoryFromSanity(category: string): Promise<Bouquet[]> {
  const all = await getBouquetsFromSanity();
  if (!category || category === 'all') return all;
  return all.filter((b) => b.category === category);
}
