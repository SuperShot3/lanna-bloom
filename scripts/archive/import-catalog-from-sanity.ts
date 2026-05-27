#!/usr/bin/env npx tsx
/**
 * Phase 2: Import Sanity catalog → Supabase (catalog_* tables + `catalog` storage bucket).
 *
 * Required env (load from .env.local):
 *   NEXT_PUBLIC_SANITY_PROJECT_ID
 *   NEXT_PUBLIC_SANITY_DATASET
 *   SANITY_API_WRITE_TOKEN  — read access via authenticated client
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   npm run import-catalog
 *   npm run import-catalog -- --dry-run
 *
 * Idempotent: upserts rows by legacy_sanity_id; reuses existing UUIDs and skips image
 * re-upload when images JSONB is already populated (unless row is new).
 */
import { randomUUID } from 'crypto';
import path from 'node:path';
import { config } from 'dotenv';
import { createClient } from '@sanity/client';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import imageUrlBuilder from '@sanity/image-url';
import { bouquetPricingFromSanityDoc, slugFromName } from '../../lib/catalog/mappers';
import {
  normalizePricingJson,
  pricingPayloadForSave,
  resolvePricingType,
} from '../../lib/catalog/pricing';
import {
  buildCatalogImageRecord,
  CATALOG_BUCKET,
  type CatalogSupabaseClient,
  uploadBufferToCatalog,
} from '../../lib/catalog/storage';
import type { CatalogBouquetPricing, CatalogStoredImage } from '../../lib/catalog/types';
import { CATALOG_SYSTEM_PARTNER_LEGACY_ID } from '../../lib/catalog/types';
import { parseExcludedDeliveryDestinations } from '../../lib/bouquetDestinationAvailability';
import { normalizeCatalogDiscountPercent } from '../../lib/catalogDiscount';

config({ path: path.join(process.cwd(), '.env.local') });

const dryRun = process.argv.includes('--dry-run');

type SanityImage = {
  _key?: string;
  alt?: string;
  asset?: { _ref?: string };
  format?: string;
  isPrimary?: boolean;
};

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function log(msg: string) {
  // eslint-disable-next-line no-console
  console.log(dryRun ? `[dry-run] ${msg}` : msg);
}

function resolveSlug(slug: { current?: string } | string | undefined, fallbackId: string): string {
  if (typeof slug === 'string') return slug;
  const fromSlug = slug?.current?.trim();
  if (fromSlug) return fromSlug;
  const id = fallbackId.replace(/^drafts\./, '');
  return slugFromName(id) || id;
}

function isSanityDraftId(id: string): boolean {
  return id.startsWith('drafts.');
}

function resolveProductKind(raw: string | undefined): 'legacy' | 'single_stem_count' | 'fixed_bouquet' | 'customizable_bouquet' {
  if (
    raw === 'single_stem_count' ||
    raw === 'fixed_bouquet' ||
    raw === 'customizable_bouquet'
  ) {
    return raw;
  }
  return 'legacy';
}

function resolveBouquetStatus(raw: string | undefined): 'pending_review' | 'approved' | 'rejected' {
  if (raw === 'pending_review' || raw === 'rejected') return raw;
  return 'approved';
}

function resolvePartnerStatus(raw: string | undefined): 'pending_review' | 'approved' | 'disabled' {
  if (raw === 'approved' || raw === 'disabled') return raw;
  return 'pending_review';
}

function normalizeProductCategory(category: string | undefined): string {
  if (!category) return 'other';
  if (category === 'toys_plush') return 'plushy_toys';
  return category;
}

async function downloadUrl(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed ${res.status}: ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

function contentTypeForPath(storagePath: string): string {
  if (storagePath.endsWith('.webp')) return 'image/webp';
  if (storagePath.endsWith('.png')) return 'image/png';
  return 'image/jpeg';
}

async function migrateSanityImages(
  supabase: CatalogSupabaseClient,
  entityFolder: string,
  entityId: string,
  images: SanityImage[] | undefined,
  fallbackAlt: string,
  existing: CatalogStoredImage[] | undefined
): Promise<CatalogStoredImage[]> {
  if (existing?.length && existing.every((i) => i.storage_path)) {
    return existing;
  }
  if (!images?.length) return [];

  const builder = imageUrlBuilder({ projectId, dataset });
  const out: CatalogStoredImage[] = [];

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    if (!img.asset?._ref) continue;
    const url = builder.image(img).width(1200).url();
    const ext = 'jpg';
    const storagePath = `${entityFolder}/${entityId}/${i}.${ext}`;
    const alt = img.alt?.trim() || fallbackAlt;

    if (!dryRun) {
      const buffer = await downloadUrl(url);
      await uploadBufferToCatalog(supabase, storagePath, buffer, contentTypeForPath(storagePath));
    }

    out.push(
      dryRun
        ? { storage_path: storagePath, alt, sort_order: i, is_primary: i === 0 }
        : buildCatalogImageRecord(supabase, storagePath, {
            alt,
            format: 'source',
            is_primary: img.isPrimary === true || i === 0,
            sort_order: i,
          })
    );
  }

  return out;
}

async function upsertSlugRegistry(
  supabase: CatalogSupabaseClient,
  entityType: 'bouquet' | 'product',
  entityId: string,
  slugEn: string,
  slugTh: string
) {
  if (dryRun) return;
  const { error } = await supabase.from('catalog_slug_registry').upsert(
    [
      { slug: slugEn, locale: 'en', entity_type: entityType, entity_id: entityId },
      { slug: slugTh, locale: 'th', entity_type: entityType, entity_id: entityId },
    ],
    { onConflict: 'slug,locale' }
  );
  if (error) throw new Error(`Slug registry: ${error.message}`);
}

async function upsertNormalizedCatalogImages(
  supabase: CatalogSupabaseClient,
  entityType: 'bouquet' | 'product',
  entityId: string,
  images: CatalogStoredImage[],
  backfilledFrom: 'catalog_bouquets.images' | 'catalog_products.images'
) {
  if (dryRun) return;

  const validImages = images.filter((image) => image.storage_path?.trim());
  if (!validImages.length) return;

  const primaryIndex = Math.max(
    0,
    validImages.findIndex((image) => image.is_primary === true)
  );

  const { error: clearPrimaryError } = await supabase
    .from('catalog_product_images')
    .update({ is_primary: false, updated_at: new Date().toISOString() })
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .is('revision_id', null)
    .is('deleted_at', null);
  if (clearPrimaryError) {
    throw new Error(`Normalized image primary reset ${entityType} ${entityId}: ${clearPrimaryError.message}`);
  }

  for (let i = 0; i < validImages.length; i++) {
    const image = validImages[i];
    const storagePath = image.storage_path.trim();
    const row = {
      entity_type: entityType,
      entity_id: entityId,
      revision_id: null,
      storage_path: storagePath,
      public_url: image.public_url ?? null,
      source_type: 'migrated_from_sanity',
      alt_en: image.alt?.trim() || null,
      alt_th: null,
      is_primary: i === primaryIndex,
      sort_order: image.sort_order ?? i,
      metadata: {
        ...(image.format ? { format: image.format } : {}),
        backfilled_from: backfilledFrom,
      },
      deleted_at: null,
      updated_at: new Date().toISOString(),
    };

    const { data: existing, error: findError } = await supabase
      .from('catalog_product_images')
      .select('id')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .is('revision_id', null)
      .eq('storage_path', storagePath)
      .limit(1)
      .maybeSingle();
    if (findError) {
      throw new Error(`Normalized image lookup ${entityType} ${entityId}: ${findError.message}`);
    }

    const write = existing?.id
      ? supabase.from('catalog_product_images').update(row).eq('id', existing.id)
      : supabase.from('catalog_product_images').insert(row);
    const { error } = await write;
    if (error) {
      throw new Error(`Normalized image upsert ${entityType} ${entityId}: ${error.message}`);
    }
  }
}

async function findByLegacyId<T extends { id: string }>(
  supabase: CatalogSupabaseClient,
  table: string,
  legacyId: string
): Promise<(T & { images?: CatalogStoredImage[] }) | null> {
  const { data } = await supabase.from(table).select('*').eq('legacy_sanity_id', legacyId).maybeSingle();
  if (!data) return null;
  return data as T & { images?: CatalogStoredImage[] };
}

/** Sanity may retain auth user IDs that no longer exist; FK would block import. */
async function resolveSupabaseUserId(
  supabase: CatalogSupabaseClient,
  raw: string | undefined
): Promise<string | null> {
  const id = raw?.trim();
  if (!id) return null;
  const { data, error } = await supabase.auth.admin.getUserById(id);
  if (error || !data.user) {
    log(`Partner auth user ${id} not found — storing null`);
    return null;
  }
  return id;
}

const projectId = requireEnv('NEXT_PUBLIC_SANITY_PROJECT_ID');
const dataset = requireEnv('NEXT_PUBLIC_SANITY_DATASET');
const sanityToken = requireEnv('SANITY_API_WRITE_TOKEN');
const supabaseUrl = requireEnv('SUPABASE_URL');
const supabaseKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

const sanity = createClient({
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  token: sanityToken,
  useCdn: false,
});

const supabase: CatalogSupabaseClient = createSupabaseClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

/** Avoid catalog_* slug_en unique violations (draft vs published, duplicate Sanity docs). */
async function ensureUniqueSlugEn(
  table: 'catalog_bouquets' | 'catalog_products',
  slugEn: string,
  rowId: string,
  usedInRun: Set<string>
): Promise<string> {
  const base = slugEn.trim() || rowId.slice(0, 8);
  let candidate = base;
  let suffix = 2;
  for (;;) {
    if (usedInRun.has(candidate)) {
      candidate = `${base}-${suffix++}`;
      continue;
    }
    const { data } = await supabase.from(table).select('id').eq('slug_en', candidate).maybeSingle();
    if (!data || data.id === rowId) {
      usedInRun.add(candidate);
      return candidate;
    }
    candidate = `${base}-${suffix++}`;
  }
}

const DRAFT_FILTER = `!(_id in path("drafts.**"))`;

const PARTNERS_QUERY = `*[_type == "partner" && ${DRAFT_FILTER}] {
  _id, shopName, contactName, phoneNumber, lineOrWhatsapp, shopAddress,
  shopBioEn, shopBioTh, portrait, city, status, supabaseUserId
}`;

const BOUQUETS_QUERY = `*[_type == "bouquet" && ${DRAFT_FILTER}] {
  _id, slug, nameEn, nameTh, descriptionEn, descriptionTh, compositionEn, compositionTh,
  productKind, singleStemOptions, fixedVariants, customTiers, sizes,
  deliveryOptions, excludedDeliveryDestinations, presentationFormats,
  colors, flowerTypes, occasion, featuredPopular, discountPercent, images,
  status, partner, source, createdBy, approvedBy, approvedAt
}`;

const PRODUCTS_QUERY = `*[_type == "product" && ${DRAFT_FILTER}] {
  _id, slug, nameEn, nameTh, descriptionEn, descriptionTh, category, price, cost,
  commissionPercent, moderationStatus, adminNote, discountPercent,
  excludedDeliveryDestinations, images, structuredAttributes, customAttributes,
  adminOverrides, adminChangeSummary, adminLastEditedAt, adminLastEditedBy, partner
}`;

const PLUSHY_QUERY = `*[_type == "plushyToy" && ${DRAFT_FILTER}] {
  _id, slug, nameEn, nameTh, descriptionEn, descriptionTh, price, discountPercent, sizeLabel, images
}`;

const BALLOONS_QUERY = `*[_type == "balloon" && ${DRAFT_FILTER}] {
  _id, slug, nameEn, nameTh, descriptionEn, descriptionTh, price, discountPercent, sizeLabel, images
}`;

const SITE_SETTINGS_QUERY = `*[_type == "siteSettings"][0] { heroImage, heroCarouselImages }`;

type SanityPartnerDoc = {
  _id: string;
  shopName?: string;
  contactName?: string;
  phoneNumber?: string;
  lineOrWhatsapp?: string;
  shopAddress?: string;
  shopBioEn?: string;
  shopBioTh?: string;
  portrait?: SanityImage;
  city?: string;
  status?: string;
  supabaseUserId?: string;
};

type SanityBouquetDoc = {
  _id: string;
  slug?: { current?: string };
  nameEn?: string;
  nameTh?: string;
  descriptionEn?: string;
  descriptionTh?: string;
  compositionEn?: string;
  compositionTh?: string;
  productKind?: string;
  singleStemOptions?: CatalogBouquetPricing['singleStemOptions'];
  fixedVariants?: CatalogBouquetPricing['fixedVariants'];
  customTiers?: CatalogBouquetPricing['customTiers'];
  sizes?: CatalogBouquetPricing['sizes'];
  deliveryOptions?: string[];
  excludedDeliveryDestinations?: string[];
  presentationFormats?: string[];
  colors?: string[];
  flowerTypes?: string[];
  occasion?: string | string[];
  featuredPopular?: boolean;
  discountPercent?: number;
  images?: SanityImage[];
  status?: string;
  partner?: { _ref?: string };
  source?: string;
  createdBy?: string;
  approvedBy?: string;
  approvedAt?: string;
};

type SanityProductDoc = {
  _id: string;
  slug?: { current?: string };
  nameEn?: string;
  nameTh?: string;
  descriptionEn?: string;
  descriptionTh?: string;
  category?: string;
  price?: number;
  cost?: number | null;
  commissionPercent?: number | null;
  moderationStatus?: string;
  adminNote?: string | null;
  discountPercent?: number;
  excludedDeliveryDestinations?: string[];
  images?: SanityImage[];
  structuredAttributes?: { preparationTime?: number; occasion?: string };
  customAttributes?: Array<{ key?: string; value?: string }>;
  adminOverrides?: Record<string, string | undefined> | null;
  adminChangeSummary?: string | null;
  adminLastEditedAt?: string | null;
  adminLastEditedBy?: string | null;
  partner?: { _ref?: string };
};

type SanityPlushyBalloonDoc = SanityProductDoc & {
  sizeLabel?: string;
};

async function ensureSystemPartner(): Promise<string> {
  const existing = await findByLegacyId<{ id: string }>(
    supabase,
    'catalog_partners',
    CATALOG_SYSTEM_PARTNER_LEGACY_ID
  );
  if (existing) return existing.id;

  const id = randomUUID();
  log(`Creating system catalog partner (${CATALOG_SYSTEM_PARTNER_LEGACY_ID})`);
  if (!dryRun) {
    const { error } = await supabase.from('catalog_partners').insert({
      id,
      legacy_sanity_id: CATALOG_SYSTEM_PARTNER_LEGACY_ID,
      shop_name: 'Lanna Bloom',
      contact_name: 'Catalog',
      phone_number: '0000000000',
      city: 'Chiang Mai',
      status: 'approved',
    });
    if (error) throw new Error(`System partner: ${error.message}`);
  }
  return id;
}

async function main() {
  log(`Starting Sanity → Supabase catalog import${dryRun ? ' (dry-run)' : ''}…`);

  const [
    partners,
    bouquets,
    products,
    plushyToys,
    balloons,
    siteSettings,
  ] = await Promise.all([
    sanity.fetch<SanityPartnerDoc[]>(PARTNERS_QUERY),
    sanity.fetch<SanityBouquetDoc[]>(BOUQUETS_QUERY),
    sanity.fetch<SanityProductDoc[]>(PRODUCTS_QUERY),
    sanity.fetch<SanityPlushyBalloonDoc[]>(PLUSHY_QUERY),
    sanity.fetch<SanityPlushyBalloonDoc[]>(BALLOONS_QUERY),
    sanity.fetch<{ heroImage?: SanityImage; heroCarouselImages?: SanityImage[] } | null>(
      SITE_SETTINGS_QUERY
    ),
  ]);

  const partnerIdBySanity = new Map<string, string>();
  let partnersImported = 0;

  for (const p of partners ?? []) {
    const existing = await findByLegacyId<{ id: string; portrait?: CatalogStoredImage }>(
      supabase,
      'catalog_partners',
      p._id
    );
    const id = existing?.id ?? randomUUID();

    const portrait = await migrateSanityImages(
      supabase,
      'partners',
      id,
      p.portrait ? [p.portrait] : [],
      p.shopName || '',
      existing?.portrait ? [existing.portrait] : undefined
    );

    const row = {
      id,
      legacy_sanity_id: p._id,
      shop_name: (p.shopName || '').trim() || 'Partner',
      contact_name: (p.contactName || '').trim() || 'Contact',
      phone_number: (p.phoneNumber || '').trim() || '0000000000',
      line_or_whatsapp: p.lineOrWhatsapp?.trim() || null,
      shop_address: p.shopAddress?.trim() || null,
      shop_bio_en: p.shopBioEn?.trim() || null,
      shop_bio_th: p.shopBioTh?.trim() || null,
      portrait: portrait[0] ?? null,
      city: (p.city || 'Chiang Mai').trim(),
      status: resolvePartnerStatus(p.status),
      supabase_user_id: await resolveSupabaseUserId(supabase, p.supabaseUserId),
      updated_at: new Date().toISOString(),
    };

    log(`Partner: ${row.shop_name} (${p._id})`);
    if (!dryRun) {
      const { error } = await supabase.from('catalog_partners').upsert(row, {
        onConflict: 'legacy_sanity_id',
      });
      if (error) throw new Error(`Partner ${p._id}: ${error.message}`);
    }
    partnerIdBySanity.set(p._id, id);
    partnersImported++;
  }

  const systemPartnerId = await ensureSystemPartner();
  partnerIdBySanity.set(CATALOG_SYSTEM_PARTNER_LEGACY_ID, systemPartnerId);

  let bouquetsImported = 0;
  const bouquetSlugsUsed = new Set<string>();
  for (const b of bouquets ?? []) {
    if (isSanityDraftId(b._id)) {
      log(`Skip draft bouquet: ${b._id}`);
      continue;
    }
    const existing = await findByLegacyId<{ id: string; images?: CatalogStoredImage[] }>(
      supabase,
      'catalog_bouquets',
      b._id
    );
    const id = existing?.id ?? randomUUID();
    let slugEn = await ensureUniqueSlugEn(
      'catalog_bouquets',
      resolveSlug(b.slug, b._id),
      id,
      bouquetSlugsUsed
    );
    if (slugEn !== resolveSlug(b.slug, b._id)) {
      log(`Bouquet slug adjusted for ${b._id}: → ${slugEn}`);
    }
    const slugTh = slugEn;
    const partnerSanityRef = b.partner?._ref;
    const partnerId = partnerSanityRef ? partnerIdBySanity.get(partnerSanityRef) ?? null : null;

    const images = await migrateSanityImages(
      supabase,
      'bouquets',
      id,
      b.images,
      b.descriptionEn || b.nameEn || '',
      existing?.images
    );

    const rawPricing: CatalogBouquetPricing = bouquetPricingFromSanityDoc(b);
    const pricingType = resolvePricingType({
      product_kind: resolveProductKind(b.productKind),
      pricing: rawPricing,
    });
    const normalized = normalizePricingJson(pricingType, rawPricing);
    const pricing = pricingPayloadForSave(pricingType, {
      singlePrice: normalized.price,
      sizes: normalized.sizes,
      stemOptions: normalized.stemOptions,
    });
    const row = {
      id,
      legacy_sanity_id: b._id,
      partner_id: partnerId,
      slug_en: slugEn,
      slug_th: slugTh,
      name_en: (b.nameEn || '').trim() || slugEn,
      name_th: (b.nameTh || '').trim(),
      description_en: (b.descriptionEn || '').trim(),
      description_th: (b.descriptionTh || '').trim(),
      composition_en: (b.compositionEn || '').trim(),
      composition_th: (b.compositionTh || '').trim(),
      pricing_type: pricingType,
      pricing,
      status: resolveBouquetStatus(b.status),
      featured_popular: b.featuredPopular === true,
      discount_percent: normalizeCatalogDiscountPercent(b.discountPercent) ?? null,
      delivery_options: b.deliveryOptions ?? [],
      excluded_delivery_destinations: parseExcludedDeliveryDestinations(
        b.excludedDeliveryDestinations
      ),
      presentation_formats: b.presentationFormats ?? [],
      colors: b.colors ?? [],
      flower_types: b.flowerTypes ?? [],
      occasion: Array.isArray(b.occasion) ? b.occasion : b.occasion ? [b.occasion] : [],
      images,
      source: b.source ?? null,
      created_by: b.createdBy ?? null,
      approved_by: b.approvedBy ?? null,
      approved_at: b.approvedAt ?? null,
      updated_at: new Date().toISOString(),
    };

    log(`Bouquet: ${row.name_en} (${slugEn})`);
    if (!dryRun) {
      const { error } = await supabase.from('catalog_bouquets').upsert(row, {
        onConflict: 'legacy_sanity_id',
      });
      if (error) throw new Error(`Bouquet ${b._id}: ${error.message}`);
      await upsertSlugRegistry(supabase, 'bouquet', id, slugEn, slugTh);
      await upsertNormalizedCatalogImages(
        supabase,
        'bouquet',
        id,
        images,
        'catalog_bouquets.images'
      );
    }
    bouquetsImported++;
  }

  const productSlugsUsed = new Set<string>();

  async function importProductLike(
    doc: {
      _id: string;
      slug?: { current?: string };
      nameEn?: string;
      nameTh?: string;
      descriptionEn?: string;
      descriptionTh?: string;
      category: string;
      price?: number;
      cost?: number | null;
      commissionPercent?: number | null;
      moderationStatus?: string;
      adminNote?: string | null;
      discountPercent?: number;
      excludedDeliveryDestinations?: string[];
      images?: SanityImage[];
      structuredAttributes?: { preparationTime?: number; occasion?: string; sizeLabel?: string };
      customAttributes?: Array<{ key?: string; value?: string }>;
      adminOverrides?: Record<string, string | undefined> | null;
      adminChangeSummary?: string | null;
      adminLastEditedAt?: string | null;
      adminLastEditedBy?: string | null;
      partner?: { _ref?: string };
      sizeLabel?: string;
    },
    label: string
  ) {
    if (isSanityDraftId(doc._id)) {
      log(`Skip draft ${label}: ${doc._id}`);
      return 0;
    }
    const existing = await findByLegacyId<{ id: string; images?: CatalogStoredImage[] }>(
      supabase,
      'catalog_products',
      doc._id
    );
    const id = existing?.id ?? randomUUID();
    const slugEn = await ensureUniqueSlugEn(
      'catalog_products',
      resolveSlug(doc.slug, doc._id),
      id,
      productSlugsUsed
    );
    const slugTh = slugEn;
    const partnerId =
      (doc.partner?._ref && partnerIdBySanity.get(doc.partner._ref)) || systemPartnerId;

    const images = await migrateSanityImages(
      supabase,
      'products',
      id,
      doc.images,
      doc.descriptionEn || doc.nameEn || '',
      existing?.images
    );

    const structured = {
      ...(doc.structuredAttributes ?? {}),
      ...(doc.sizeLabel ? { sizeLabel: doc.sizeLabel } : {}),
    };

    const row = {
      id,
      legacy_sanity_id: doc._id,
      partner_id: partnerId,
      slug_en: slugEn,
      slug_th: slugTh,
      name_en: (doc.nameEn || '').trim() || slugEn,
      name_th: (doc.nameTh || '').trim(),
      description_en: (doc.descriptionEn || '').trim(),
      description_th: (doc.descriptionTh || '').trim(),
      category: normalizeProductCategory(doc.category),
      price: Number(doc.price ?? 0),
      cost: doc.cost != null ? Number(doc.cost) : null,
      commission_percent: doc.commissionPercent != null ? Number(doc.commissionPercent) : null,
      moderation_status:
        doc.moderationStatus === 'live' ||
        doc.moderationStatus === 'needs_changes' ||
        doc.moderationStatus === 'rejected'
          ? doc.moderationStatus
          : 'submitted',
      admin_note: doc.adminNote ?? null,
      discount_percent: normalizeCatalogDiscountPercent(doc.discountPercent) ?? null,
      excluded_delivery_destinations: parseExcludedDeliveryDestinations(
        doc.excludedDeliveryDestinations
      ),
      images,
      structured_attributes: structured,
      custom_attributes: doc.customAttributes ?? [],
      admin_overrides: doc.adminOverrides ?? null,
      admin_change_summary: doc.adminChangeSummary ?? null,
      admin_last_edited_at: doc.adminLastEditedAt ?? null,
      admin_last_edited_by: doc.adminLastEditedBy ?? null,
      updated_at: new Date().toISOString(),
    };

    log(`${label}: ${row.name_en} (${slugEn})`);
    if (!dryRun) {
      const { error } = await supabase.from('catalog_products').upsert(row, {
        onConflict: 'legacy_sanity_id',
      });
      if (error) throw new Error(`${label} ${doc._id}: ${error.message}`);
      await upsertSlugRegistry(supabase, 'product', id, slugEn, slugTh);
      await upsertNormalizedCatalogImages(
        supabase,
        'product',
        id,
        images,
        'catalog_products.images'
      );
    }
    return 1;
  }

  let productsImported = 0;
  for (const p of products ?? []) {
    productsImported += await importProductLike(
      { ...p, category: normalizeProductCategory(p.category) },
      'Product'
    );
  }

  for (const p of plushyToys ?? []) {
    productsImported += await importProductLike(
      {
        ...p,
        category: 'plushy_toys',
        moderationStatus: 'live',
        price: p.price,
      },
      'Plushy'
    );
  }

  for (const p of balloons ?? []) {
    productsImported += await importProductLike(
      {
        ...p,
        category: 'balloons',
        moderationStatus: 'live',
        price: p.price,
      },
      'Balloon'
    );
  }

  if (siteSettings) {
    const { data: existingSettings } = await supabase
      .from('catalog_site_settings')
      .select('hero_image, hero_carousel_images')
      .eq('id', 'default')
      .maybeSingle();

    const existingHero = existingSettings?.hero_image as CatalogStoredImage | null;
    const existingCarousel = (existingSettings?.hero_carousel_images ??
      []) as CatalogStoredImage[];

    const heroImages = siteSettings.heroImage
      ? await migrateSanityImages(
          supabase,
          'site-settings',
          'default',
          [siteSettings.heroImage],
          'Hero',
          existingHero?.storage_path ? [existingHero] : undefined
        )
      : [];
    const carouselImages = await migrateSanityImages(
      supabase,
      'site-settings',
      'default-carousel',
      siteSettings.heroCarouselImages,
      'Hero carousel',
      existingCarousel.length ? existingCarousel : undefined
    );

    log('Site settings: hero + carousel');
    if (!dryRun) {
      const { error } = await supabase.from('catalog_site_settings').upsert({
        id: 'default',
        hero_image: heroImages[0] ?? existingHero ?? null,
        hero_carousel_images: carouselImages.length ? carouselImages : existingCarousel,
        updated_at: new Date().toISOString(),
      });
      if (error) throw new Error(`Site settings: ${error.message}`);
    }
  }

  log('');
  log('Import complete.');
  log(`  Partners:  ${partnersImported}`);
  log(`  Bouquets:  ${bouquetsImported}`);
  log(`  Products:  ${productsImported} (incl. plushy + balloons)`);
  log(`  Bucket:    ${CATALOG_BUCKET}`);
  if (dryRun) log('  (no writes performed)');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[import-catalog] Failed:', err);
  process.exit(1);
});
