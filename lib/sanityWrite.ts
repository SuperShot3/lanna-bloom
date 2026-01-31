/**
 * Sanity write client and mutations. Use only on server (Server Actions / API routes).
 * Requires SANITY_API_WRITE_TOKEN in .env.local with create/update permissions.
 */
import { createClient } from 'next-sanity';
import type { BouquetSize, SizeKey } from './bouquets';

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
const token = process.env.SANITY_API_WRITE_TOKEN;

function getWriteClient() {
  if (!projectId || !dataset) {
    throw new Error('Missing NEXT_PUBLIC_SANITY_PROJECT_ID or NEXT_PUBLIC_SANITY_DATASET');
  }
  if (!token) {
    throw new Error('Missing SANITY_API_WRITE_TOKEN — required for partner registration and bouquet uploads');
  }
  return createClient({
    projectId,
    dataset,
    apiVersion: '2024-01-01',
    useCdn: false,
    token,
  });
}

export interface CreatePartnerInput {
  shopName: string;
  contactName: string;
  phoneNumber: string;
  lineOrWhatsapp?: string;
  shopAddress?: string;
  city?: string;
}

/** Create a partner document; status is set to pending_review. Returns _id. */
export async function createPartner(input: CreatePartnerInput): Promise<string> {
  const client = getWriteClient();
  const doc = await client.create({
    _type: 'partner',
    shopName: input.shopName.trim(),
    contactName: input.contactName.trim(),
    phoneNumber: input.phoneNumber.trim(),
    ...(input.lineOrWhatsapp && { lineOrWhatsapp: input.lineOrWhatsapp.trim() }),
    ...(input.shopAddress && { shopAddress: input.shopAddress.trim() }),
    city: (input.city || 'Chiang Mai').trim(),
    status: 'pending_review',
  });
  return doc._id;
}

/** Upload image file to Sanity; returns asset document _id to use as image ref. */
export async function uploadImageToSanity(file: File): Promise<string> {
  const client = getWriteClient();
  const buffer = Buffer.from(await file.arrayBuffer());
  const asset = await client.assets.upload('image', buffer, {
    filename: file.name || 'image.jpg',
  });
  return asset._id;
}

export interface BouquetSizeInput {
  key: SizeKey;
  label: string;
  price: number;
  description: string;
  preparationTime?: number;
  availability?: boolean;
}

export interface CreateBouquetInput {
  partnerId: string;
  nameEn: string;
  nameTh?: string;
  descriptionEn?: string;
  descriptionTh?: string;
  compositionEn?: string;
  compositionTh?: string;
  category: string;
  imageAssetIds: string[]; // 1–3 asset _ids from uploadImageToSanity
  sizes: BouquetSizeInput[];
}

/** Generate slug from nameEn. */
function slugFromName(nameEn: string): string {
  return nameEn
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'bouquet';
}

/** Create a partner bouquet; status = pending_review. Returns _id. */
export async function createBouquet(input: CreateBouquetInput): Promise<string> {
  const client = getWriteClient();
  const baseSlug = slugFromName(input.nameEn);
  const slug = await ensureUniqueSlug(client, baseSlug);

  const images = input.imageAssetIds.slice(0, 3).map((_id) => ({
    _type: 'image' as const,
    asset: { _type: 'reference' as const, _ref: _id },
  }));

  const doc = await client.create({
    _type: 'bouquet',
    slug: { _type: 'slug', current: slug },
    nameEn: input.nameEn.trim(),
    nameTh: (input.nameTh || '').trim(),
    descriptionEn: (input.descriptionEn || '').trim(),
    descriptionTh: (input.descriptionTh || '').trim(),
    compositionEn: (input.compositionEn || '').trim(),
    compositionTh: (input.compositionTh || '').trim(),
    category: input.category || 'mixed',
    partner: { _type: 'reference', _ref: input.partnerId },
    status: 'pending_review',
    images,
    sizes: input.sizes.map((s) => ({
      _key: s.key,
      key: s.key,
      label: s.label,
      price: Number(s.price),
      description: s.description,
      preparationTime: s.preparationTime != null ? Number(s.preparationTime) : undefined,
      availability: s.availability ?? true,
    })),
  });
  return doc._id;
}

export interface UpdateBouquetInput {
  nameEn: string;
  nameTh?: string;
  descriptionEn?: string;
  descriptionTh?: string;
  compositionEn?: string;
  compositionTh?: string;
  category: string;
  imageAssetIds: string[];
  sizes: BouquetSizeInput[];
}

/** Update a bouquet (partner only); sets status to pending_review. */
export async function updateBouquet(bouquetId: string, input: UpdateBouquetInput): Promise<void> {
  const client = getWriteClient();
  const images = input.imageAssetIds.slice(0, 3).map((_id) => ({
    _type: 'image' as const,
    asset: { _type: 'reference' as const, _ref: _id },
  }));

  await client
    .patch(bouquetId)
    .set({
      nameEn: input.nameEn.trim(),
      nameTh: (input.nameTh || '').trim(),
      descriptionEn: (input.descriptionEn || '').trim(),
      descriptionTh: (input.descriptionTh || '').trim(),
      compositionEn: (input.compositionEn || '').trim(),
      compositionTh: (input.compositionTh || '').trim(),
      category: input.category || 'mixed',
      status: 'pending_review',
      images,
      sizes: input.sizes.map((s) => ({
        _key: s.key,
        key: s.key,
        label: s.label,
        price: Number(s.price),
        description: s.description,
        preparationTime: s.preparationTime != null ? Number(s.preparationTime) : undefined,
        availability: s.availability ?? true,
      })),
    })
    .commit();
}

/** Ensure slug is unique by appending -1, -2, ... if needed. */
async function ensureUniqueSlug(client: ReturnType<typeof createClient>, base: string): Promise<string> {
  const existing = await client.fetch<number>(
    `count(*[_type == "bouquet" && slug.current == $slug])`,
    { slug: base }
  );
  if (existing === 0) return base;
  let n = 1;
  while (true) {
    const candidate = `${base}-${n}`;
    const count = await client.fetch<number>(
      `count(*[_type == "bouquet" && slug.current == $slug])`,
      { slug: candidate }
    );
    if (count === 0) return candidate;
    n++;
  }
}
