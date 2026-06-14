import type { Bouquet, BouquetStatus, Partner, PartnerStatus } from '@/lib/bouquets';
import type { BouquetSellableOption } from '@/lib/bouquetOptions';
import type { PricingType } from '@/lib/catalog/pricing';
import type { DeliveryDestinationId } from '@/lib/delivery/markets';

export type { Bouquet, BouquetStatus, Partner, PartnerStatus, BouquetSellableOption };
export type { PricingType } from '@/lib/catalog/pricing';

/** Catalog product (non-flower) for display — matches BouquetCard-like shape */
export interface CatalogProduct {
  id: string;
  slug: string;
  nameEn: string;
  nameTh?: string;
  descriptionEn?: string;
  descriptionTh?: string;
  category: string;
  catalogKind?: 'product' | 'plushyToy' | 'balloon';
  sizeLabel?: string;
  pricingType?: PricingType;
  /** Sellable options derived from pricing (empty = use price only). */
  sizes?: BouquetSellableOption[];
  price: number;
  cost?: number;
  commissionPercent?: number;
  images: string[];
  imageAlts?: string[];
  excludedDeliveryDestinations?: DeliveryDestinationId[];
  preparationTime?: number;
  occasion?: string;
  isHit?: boolean;
  discountPercent?: number;
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

export type AdminCatalogIndexItem = {
  id: string;
  entityType: CatalogEntityType;
  nameEn: string;
  slug?: string;
  status: string;
  category?: string;
  imageUrl?: string;
  isPending: boolean;
  /** Unpublished admin draft exists (storefront still shows live version). */
  hasDraft?: boolean;
};

export type AdminCatalogIndex = {
  bouquets: AdminCatalogIndexItem[];
  products: AdminCatalogIndexItem[];
  pendingCount: number;
};

export interface AdminBouquetDetail {
  id: string;
  slug: string;
  nameEn: string;
  nameTh: string;
  descriptionEn: string;
  descriptionTh: string;
  compositionEn: string;
  compositionTh: string;
  status: BouquetStatus;
  featuredPopular: boolean;
  discountPercent?: number;
  pricingType: PricingType;
  pricing: CatalogBouquetPricing;
  sizes: BouquetSellableOption[];
  images: string[];
  imageAlts?: string[];
  editableImages?: AdminCatalogProductImage[];
  colors: string[];
  flowerTypes: string[];
  occasion?: string[];
  presentationFormats?: string[];
  deliveryOptions?: string[];
  excludedDeliveryDestinations?: DeliveryDestinationId[];
  partnerId?: string;
  partnerName?: string;
  hasDraft?: boolean;
  draftRevisionId?: string;
  draftUpdatedAt?: string;
}

export interface AdminProductDetail {
  id: string;
  slug?: string;
  nameEn: string;
  nameTh?: string;
  descriptionEn?: string;
  descriptionTh?: string;
  category: string;
  price: number;
  pricingType: PricingType;
  pricing: CatalogBouquetPricing;
  sizes: BouquetSellableOption[];
  discountPercent?: number;
  cost?: number;
  moderationStatus: string;
  commissionPercent?: number;
  images: string[];
  imageAlts?: string[];
  editableImages?: AdminCatalogProductImage[];
  preparationTime?: number;
  occasion?: string;
  excludedDeliveryDestinations?: DeliveryDestinationId[];
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
  /** Server-persisted draft (not yet on the public site). */
  hasDraft?: boolean;
  draftRevisionId?: string;
  draftUpdatedAt?: string;
}

export type AdminCatalogProductImage = {
  id: string;
  url: string;
  storagePath: string;
  sourceType: CatalogImageSourceType;
  altEn: string;
  altTh: string;
  isPrimary: boolean;
  sortOrder: number;
  /** Stored image format from catalog_product_images.metadata.format or storage path. */
  format?: 'webp' | 'png_master' | 'source';
  /** Fixed-bouquet variant scope from catalog_product_images.metadata.variant_key */
  variantKey?: string | null;
};

/** Stored image shape (Supabase Storage `catalog` bucket + metadata). */
export type CatalogStoredImage = {
  storage_path: string;
  public_url?: string;
  alt?: string;
  format?: 'webp' | 'png_master' | 'source';
  is_primary?: boolean;
  sort_order?: number;
};

export type CatalogEntityType = 'bouquet' | 'product';
export type CatalogRevisionSource = 'admin_manual' | 'admin_ai' | 'partner_edit' | 'import';
export type CatalogRevisionStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'needs_changes'
  | 'published'
  | 'archived';
export type CatalogImageSourceType = 'uploaded' | 'ai_generated' | 'migrated_from_sanity';
export type CatalogCollectionPlacement =
  | 'homepage_popular'
  | 'bouquet_add_ons'
  | 'bouquet_recommendations'
  | 'product_recommendations'
  | 'plushy_toys'
  | 'balloons'
  | 'collection_add_ons'
  | 'custom';
export type CatalogCollectionFallbackMode = 'automatic' | 'empty' | 'category' | 'popular';
export type CatalogAuditEntityType = CatalogEntityType | 'collection' | 'image' | 'partner';

export type CatalogSeoFields = {
  seo_title_en: string | null;
  seo_title_th: string | null;
  seo_description_en: string | null;
  seo_description_th: string | null;
  seo_keywords: string[];
  og_image_path: string | null;
};

export type CatalogProductRevisionRow = CatalogSeoFields & {
  id: string;
  entity_type: CatalogEntityType;
  entity_id: string | null;
  base_revision_id: string | null;
  source: CatalogRevisionSource;
  status: CatalogRevisionStatus;
  payload: Record<string, unknown>;
  moderation_note: string | null;
  rejection_reason: string | null;
  created_by: string | null;
  edited_by: string | null;
  approved_by: string | null;
  published_by: string | null;
  approved_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CatalogProductImageRow = {
  id: string;
  entity_type: CatalogEntityType;
  entity_id: string | null;
  revision_id: string | null;
  storage_path: string;
  public_url: string | null;
  source_type: CatalogImageSourceType;
  original_image_id: string | null;
  alt_en: string | null;
  alt_th: string | null;
  is_primary: boolean;
  sort_order: number;
  metadata: Record<string, unknown>;
  deleted_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CatalogCollectionRow = Omit<CatalogSeoFields, 'seo_keywords' | 'og_image_path'> & {
  id: string;
  slug: string;
  placement: CatalogCollectionPlacement;
  title_en: string;
  title_th: string;
  description_en: string;
  description_th: string;
  fallback_mode: CatalogCollectionFallbackMode;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CatalogCollectionItemRow = {
  id: string;
  collection_id: string;
  entity_type: CatalogEntityType;
  entity_id: string;
  sort_order: number;
  label_en: string | null;
  label_th: string | null;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type CatalogAuditEventRow = {
  id: string;
  entity_type: CatalogAuditEntityType | null;
  entity_id: string | null;
  revision_id: string | null;
  action: string;
  actor: string | null;
  before_summary: Record<string, unknown> | null;
  after_summary: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

/** Portrait on catalog_partners.portrait */
export type CatalogPortrait = CatalogStoredImage;

/**
 * Bouquet pricing JSONB — mirrors Sanity fields before mapping to sellable options.
 * @see supabase/migrations/20260526120000_catalog_tables.sql
 */
export type CatalogBouquetPricing = {
  /** Mirror for single_price products */
  price?: number;
  sizes?: Array<{
    key?: string;
    enabled?: boolean;
    label?: string;
    labelEn?: string;
    labelTh?: string;
    price?: number;
    description?: string;
    preparationTime?: number;
    availability?: boolean;
    legacyOptionId?: string;
  }>;
  stemOptions?: Array<{
    stemCount?: number;
    price?: number;
    labelEn?: string;
    labelTh?: string;
    preparationTime?: number;
    availability?: boolean;
  }>;
  /** @deprecated Migrated to stemOptions */
  singleStemOptions?: Array<{
    stemCount?: number;
    price?: number;
    labelEn?: string;
    labelTh?: string;
    preparationTime?: number;
    availability?: boolean;
  }>;
  /** @deprecated Migrated to sizes */
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
  /** @deprecated Report-only; not used in new admin */
  customTiers?: Array<{
    minPrice?: number;
    labelEn?: string;
    labelTh?: string;
    preparationTime?: number;
    availability?: boolean;
  }>;
};

export type CatalogPartnerRow = {
  id: string;
  legacy_sanity_id: string | null;
  shop_name: string;
  contact_name: string;
  phone_number: string;
  line_or_whatsapp: string | null;
  shop_address: string | null;
  shop_bio_en: string | null;
  shop_bio_th: string | null;
  portrait: CatalogPortrait | null;
  city: string;
  status: PartnerStatus;
  supabase_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CatalogBouquetRow = {
  id: string;
  legacy_sanity_id: string | null;
  partner_id: string | null;
  slug_en: string;
  slug_th: string | null;
  name_en: string;
  name_th: string;
  description_en: string;
  description_th: string;
  composition_en: string;
  composition_th: string;
  pricing_type: PricingType;
  pricing: CatalogBouquetPricing;
  status: BouquetStatus;
  featured_popular: boolean;
  discount_percent: number | null;
  delivery_options: string[];
  excluded_delivery_destinations: DeliveryDestinationId[];
  presentation_formats: string[];
  colors: string[];
  flower_types: string[];
  occasion: string[];
  images: CatalogStoredImage[];
  source: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
} & Pick<
  CatalogSeoFields,
  'seo_title_en' | 'seo_title_th' | 'seo_description_en' | 'seo_description_th'
>;

export type CatalogProductRow = {
  id: string;
  legacy_sanity_id: string | null;
  partner_id: string;
  slug_en: string;
  slug_th: string | null;
  name_en: string;
  name_th: string;
  description_en: string;
  description_th: string;
  category: string;
  price: number;
  pricing_type?: PricingType | null;
  pricing?: CatalogBouquetPricing;
  cost: number | null;
  commission_percent: number | null;
  moderation_status: 'submitted' | 'live' | 'needs_changes' | 'rejected';
  admin_note: string | null;
  discount_percent: number | null;
  excluded_delivery_destinations: DeliveryDestinationId[];
  images: CatalogStoredImage[];
  structured_attributes: { preparationTime?: number; occasion?: string; sizeLabel?: string };
  custom_attributes: Array<{ key?: string; value?: string }>;
  admin_overrides: {
    nameEn?: string;
    nameTh?: string;
    descriptionEn?: string;
    descriptionTh?: string;
  } | null;
  admin_change_summary: string | null;
  admin_last_edited_at: string | null;
  admin_last_edited_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CatalogSiteSettingsRow = {
  id: 'default';
  hero_image: CatalogStoredImage | null;
  hero_carousel_images: CatalogStoredImage[];
  updated_at: string;
};

/** Legacy Sanity id for the built-in partner used for admin-owned catalog products. */
export const CATALOG_SYSTEM_PARTNER_LEGACY_ID = '__lanna_bloom_catalog__';
