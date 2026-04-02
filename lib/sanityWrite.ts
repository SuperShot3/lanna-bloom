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
  /** Set when creating partner from admin approval; links to Supabase auth user */
  supabaseUserId?: string;
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
    status: input.supabaseUserId ? 'approved' : 'pending_review',
    ...(input.supabaseUserId && { supabaseUserId: input.supabaseUserId.trim() }),
  });
  return doc._id;
}

export interface UpdatePartnerProfileInput {
  phoneNumber: string;
  lineOrWhatsapp?: string;
  shopAddress?: string;
  city?: string;
  shopBioEn?: string;
  shopBioTh?: string;
}

/** Update partner profile fields (partner portal). */
export async function updatePartnerProfile(partnerId: string, input: UpdatePartnerProfileInput): Promise<void> {
  const client = getWriteClient();
  await client
    .patch(partnerId)
    .set({
      phoneNumber: input.phoneNumber.trim(),
      ...(input.lineOrWhatsapp != null && { lineOrWhatsapp: input.lineOrWhatsapp.trim() || null }),
      ...(input.shopAddress != null && { shopAddress: input.shopAddress.trim() || null }),
      ...(input.city != null && { city: input.city.trim() || 'Chiang Mai' }),
      ...(input.shopBioEn != null && { shopBioEn: input.shopBioEn.trim() || null }),
      ...(input.shopBioTh != null && { shopBioTh: input.shopBioTh.trim() || null }),
    })
    .commit();
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
  colors?: string[];
  flowerTypes?: string[];
  occasion?: string[];
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
    productKind: 'legacy',
    slug: { _type: 'slug', current: slug },
    nameEn: input.nameEn.trim(),
    nameTh: (input.nameTh || '').trim(),
    descriptionEn: (input.descriptionEn || '').trim(),
    descriptionTh: (input.descriptionTh || '').trim(),
    compositionEn: (input.compositionEn || '').trim(),
    compositionTh: (input.compositionTh || '').trim(),
    category: input.category || 'mixed',
    ...(input.colors?.length ? { colors: input.colors } : {}),
    ...(input.flowerTypes?.length ? { flowerTypes: input.flowerTypes } : {}),
    ...(input.occasion?.length ? { occasion: input.occasion } : {}),
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
  colors?: string[];
  flowerTypes?: string[];
  occasion?: string[];
  imageAssetIds: string[];
  sizes: BouquetSizeInput[];
}

/** Update bouquet status (admin moderation): approved | pending_review | rejected */
export async function updateBouquetStatus(
  bouquetId: string,
  status: 'approved' | 'pending_review' | 'rejected'
): Promise<void> {
  const client = getWriteClient();
  await client.patch(bouquetId).set({ status }).commit();
}

export interface UpdateProductInput {
  nameEn: string;
  nameTh?: string;
  descriptionEn?: string;
  descriptionTh?: string;
  category: string;
  price: number;
  imageAssetIds: string[];
  preparationTime?: number;
  occasion?: string;
}

/** Update a product (partner only); sets moderationStatus to submitted for re-approval. */
export async function updateProduct(productId: string, input: UpdateProductInput): Promise<void> {
  const client = getWriteClient();
  const images = input.imageAssetIds.slice(0, 5).map((_id) => ({
    _type: 'image' as const,
    asset: { _type: 'reference' as const, _ref: _id },
  }));

  await client
    .patch(productId)
    .set({
      nameEn: input.nameEn.trim(),
      nameTh: (input.nameTh || '').trim(),
      descriptionEn: (input.descriptionEn || '').trim(),
      descriptionTh: (input.descriptionTh || '').trim(),
      category: input.category,
      price: Number(input.price),
      moderationStatus: 'submitted',
      images,
      ...((input.preparationTime != null || input.occasion) && {
        structuredAttributes: {
          ...(input.preparationTime != null && { preparationTime: input.preparationTime }),
          ...(input.occasion && { occasion: input.occasion }),
        },
      }),
    })
    .commit();
}

/** Update product moderationStatus (admin): live | needs_changes | rejected */
export async function updateProductModerationStatus(
  productId: string,
  moderationStatus: 'live' | 'needs_changes' | 'rejected',
  adminNote?: string
): Promise<void> {
  const client = getWriteClient();
  const patch = client.patch(productId).set({
    moderationStatus,
    ...(adminNote != null && { adminNote }),
  });
  await patch.commit();
}

/** Set commission (admin) before approving. Required for deploy to website. */
export async function updateProductCommission(
  productId: string,
  commissionPercent: number
): Promise<void> {
  const client = getWriteClient();
  const pct = Math.max(0, Math.min(500, Number(commissionPercent)));
  await client.patch(productId).set({ commissionPercent: pct }).commit();
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
      ...(input.colors?.length ? { colors: input.colors } : {}),
      ...(input.flowerTypes?.length ? { flowerTypes: input.flowerTypes } : {}),
      ...(input.occasion?.length ? { occasion: input.occasion } : { occasion: [] }),
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

export interface CreateProductInput {
  partnerId: string;
  nameEn: string;
  nameTh?: string;
  descriptionEn?: string;
  descriptionTh?: string;
  category: string;
  price: number;
  imageAssetIds: string[];
  preparationTime?: number;
  occasion?: string;
  customAttributes?: Array<{ key: string; value: string }>;
}

export interface UpdateProductByAdminInput {
  adminOverrides?: {
    nameEn?: string | null;
    nameTh?: string | null;
    descriptionEn?: string | null;
    descriptionTh?: string | null;
  };
  adminChangeSummary?: string | null;
  adminLastEditedBy?: string | null;
}

/** Update product admin overrides (admin moderation). Does not change moderationStatus or commission. */
export async function updateProductByAdmin(
  productId: string,
  input: UpdateProductByAdminInput
): Promise<void> {
  const client = getWriteClient();
  await client
    .patch(productId)
    .set({
      ...(input.adminOverrides != null && { adminOverrides: input.adminOverrides }),
      ...(input.adminChangeSummary != null && { adminChangeSummary: input.adminChangeSummary }),
      ...(input.adminLastEditedBy != null && { adminLastEditedBy: input.adminLastEditedBy }),
      adminLastEditedAt: new Date().toISOString(),
    })
    .commit();
}

/** Create a partner product (non-flower); moderationStatus = submitted. Returns _id. */
export async function createProduct(input: CreateProductInput): Promise<string> {
  const client = getWriteClient();
  const baseSlug = (input.nameEn || 'product')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'product';
  const slug = await ensureUniqueProductSlug(client, baseSlug);

  const images = input.imageAssetIds.slice(0, 5).map((_id) => ({
    _type: 'image' as const,
    asset: { _type: 'reference' as const, _ref: _id },
  }));

  const doc = await client.create({
    _type: 'product',
    slug: { _type: 'slug', current: slug },
    nameEn: input.nameEn.trim(),
    nameTh: (input.nameTh || '').trim(),
    descriptionEn: (input.descriptionEn || '').trim(),
    descriptionTh: (input.descriptionTh || '').trim(),
    category: input.category,
    price: Number(input.price),
    partner: { _type: 'reference', _ref: input.partnerId },
    moderationStatus: 'submitted',
    images,
    ...((input.preparationTime != null || input.occasion) && {
      structuredAttributes: {
        ...(input.preparationTime != null && { preparationTime: input.preparationTime }),
        ...(input.occasion && { occasion: input.occasion }),
      },
    }),
    ...(input.customAttributes?.length && {
      customAttributes: input.customAttributes.map((a) => ({
        _type: 'object',
        key: a.key,
        value: a.value,
      })),
    }),
  });
  return doc._id;
}

/** Delete a product document. Caller must verify ownership. */
export async function deleteProduct(productId: string): Promise<void> {
  const client = getWriteClient();
  await client.delete(productId);
}

async function ensureUniqueProductSlug(
  client: ReturnType<typeof createClient>,
  base: string
): Promise<string> {
  const existing = await client.fetch<number>(
    `count(*[_type == "product" && slug.current == $slug])`,
    { slug: base }
  );
  if (existing === 0) return base;
  let n = 1;
  while (true) {
    const candidate = `${base}-${n}`;
    const count = await client.fetch<number>(
      `count(*[_type == "product" && slug.current == $slug])`,
      { slug: candidate }
    );
    if (count === 0) return candidate;
    n++;
  }
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
