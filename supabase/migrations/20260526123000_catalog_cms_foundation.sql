-- Product CMS foundation: revisions, normalized images, collections, and audit.
-- Additive only. Storefront reads continue to use catalog_bouquets/catalog_products as
-- the published read model until the unified CMS is fully wired.

-- =============================================================================
-- 1. Draft / review / publish revisions
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.catalog_product_revisions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type           text NOT NULL CHECK (entity_type IN ('bouquet', 'product')),
  entity_id             uuid,
  base_revision_id      uuid REFERENCES public.catalog_product_revisions(id) ON DELETE SET NULL,
  source                text NOT NULL DEFAULT 'admin_manual'
    CHECK (source IN ('admin_manual', 'admin_ai', 'partner_edit', 'import')),
  status                text NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft', 'pending_review', 'approved', 'rejected', 'needs_changes',
      'published', 'archived'
    )),
  payload               jsonb NOT NULL DEFAULT '{}'::jsonb,
  seo_title_en          text,
  seo_title_th          text,
  seo_description_en    text,
  seo_description_th    text,
  seo_keywords          text[] NOT NULL DEFAULT '{}',
  og_image_path         text,
  moderation_note       text,
  rejection_reason      text,
  created_by            text,
  edited_by             text,
  approved_by           text,
  published_by          text,
  approved_at           timestamptz,
  published_at          timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_product_revisions_existing_entity_check
    CHECK (entity_id IS NOT NULL OR status IN ('draft', 'pending_review', 'rejected', 'needs_changes', 'archived'))
);

CREATE INDEX IF NOT EXISTS catalog_product_revisions_entity_idx
  ON public.catalog_product_revisions (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS catalog_product_revisions_status_idx
  ON public.catalog_product_revisions (status, updated_at DESC);

CREATE INDEX IF NOT EXISTS catalog_product_revisions_source_idx
  ON public.catalog_product_revisions (source);

-- =============================================================================
-- 2. Normalized product images
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.catalog_product_images (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type           text NOT NULL CHECK (entity_type IN ('bouquet', 'product')),
  entity_id             uuid,
  revision_id           uuid REFERENCES public.catalog_product_revisions(id) ON DELETE SET NULL,
  storage_path          text NOT NULL CHECK (length(btrim(storage_path)) > 0),
  public_url            text,
  source_type           text NOT NULL DEFAULT 'uploaded'
    CHECK (source_type IN ('uploaded', 'ai_generated', 'migrated_from_sanity')),
  original_image_id     uuid REFERENCES public.catalog_product_images(id) ON DELETE SET NULL,
  alt_en                text,
  alt_th                text,
  is_primary            boolean NOT NULL DEFAULT false,
  sort_order            integer NOT NULL DEFAULT 0,
  metadata              jsonb NOT NULL DEFAULT '{}'::jsonb,
  deleted_at            timestamptz,
  created_by            text,
  updated_by            text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_product_images_entity_or_revision_check
    CHECK (entity_id IS NOT NULL OR revision_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS catalog_product_images_entity_idx
  ON public.catalog_product_images (entity_type, entity_id, sort_order)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS catalog_product_images_revision_idx
  ON public.catalog_product_images (revision_id, sort_order)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS catalog_product_images_storage_path_idx
  ON public.catalog_product_images (storage_path);

CREATE UNIQUE INDEX IF NOT EXISTS catalog_product_images_one_primary_live_idx
  ON public.catalog_product_images (entity_type, entity_id)
  WHERE revision_id IS NULL AND deleted_at IS NULL AND is_primary = true;

CREATE UNIQUE INDEX IF NOT EXISTS catalog_product_images_one_primary_revision_idx
  ON public.catalog_product_images (revision_id)
  WHERE revision_id IS NOT NULL AND deleted_at IS NULL AND is_primary = true;

-- Backfill current inline image metadata into the normalized table for admin use.
INSERT INTO public.catalog_product_images (
  entity_type,
  entity_id,
  storage_path,
  public_url,
  source_type,
  alt_en,
  is_primary,
  sort_order,
  metadata,
  created_at,
  updated_at
)
SELECT
  'bouquet',
  image_row.entity_id,
  image_row.storage_path,
  image_row.public_url,
  'migrated_from_sanity',
  image_row.alt,
  image_row.primary_rank = 1,
  image_row.sort_order,
  image_row.metadata,
  image_row.source_created_at,
  now()
FROM (
  SELECT
    bouquet.id AS entity_id,
    bouquet.created_at AS source_created_at,
    image.value->>'storage_path' AS storage_path,
    image.value->>'public_url' AS public_url,
    image.value->>'alt' AS alt,
    COALESCE((image.value->>'sort_order')::integer, image.ordinality - 1) AS sort_order,
    jsonb_strip_nulls(jsonb_build_object(
      'format', image.value->>'format',
      'backfilled_from', 'catalog_bouquets.images'
    )) AS metadata,
    row_number() OVER (
      PARTITION BY bouquet.id
      ORDER BY
        CASE WHEN COALESCE((image.value->>'is_primary')::boolean, false) THEN 0 ELSE 1 END,
        COALESCE((image.value->>'sort_order')::integer, image.ordinality - 1),
        image.ordinality
    ) AS primary_rank
  FROM public.catalog_bouquets AS bouquet
  CROSS JOIN LATERAL jsonb_array_elements(bouquet.images) WITH ORDINALITY AS image(value, ordinality)
  WHERE COALESCE(image.value->>'storage_path', '') <> ''
) AS image_row
WHERE image_row.storage_path <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.catalog_product_images existing
    WHERE existing.entity_type = 'bouquet'
      AND existing.entity_id = image_row.entity_id
      AND existing.revision_id IS NULL
      AND existing.storage_path = image_row.storage_path
  );

INSERT INTO public.catalog_product_images (
  entity_type,
  entity_id,
  storage_path,
  public_url,
  source_type,
  alt_en,
  is_primary,
  sort_order,
  metadata,
  created_at,
  updated_at
)
SELECT
  'product',
  image_row.entity_id,
  image_row.storage_path,
  image_row.public_url,
  'migrated_from_sanity',
  image_row.alt,
  image_row.primary_rank = 1,
  image_row.sort_order,
  image_row.metadata,
  image_row.source_created_at,
  now()
FROM (
  SELECT
    product.id AS entity_id,
    product.created_at AS source_created_at,
    image.value->>'storage_path' AS storage_path,
    image.value->>'public_url' AS public_url,
    image.value->>'alt' AS alt,
    COALESCE((image.value->>'sort_order')::integer, image.ordinality - 1) AS sort_order,
    jsonb_strip_nulls(jsonb_build_object(
      'format', image.value->>'format',
      'backfilled_from', 'catalog_products.images'
    )) AS metadata,
    row_number() OVER (
      PARTITION BY product.id
      ORDER BY
        CASE WHEN COALESCE((image.value->>'is_primary')::boolean, false) THEN 0 ELSE 1 END,
        COALESCE((image.value->>'sort_order')::integer, image.ordinality - 1),
        image.ordinality
    ) AS primary_rank
  FROM public.catalog_products AS product
  CROSS JOIN LATERAL jsonb_array_elements(product.images) WITH ORDINALITY AS image(value, ordinality)
  WHERE COALESCE(image.value->>'storage_path', '') <> ''
) AS image_row
WHERE image_row.storage_path <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.catalog_product_images existing
    WHERE existing.entity_type = 'product'
      AND existing.entity_id = image_row.entity_id
      AND existing.revision_id IS NULL
      AND existing.storage_path = image_row.storage_path
  );

-- =============================================================================
-- 3. Merchandising collections and placements
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.catalog_collections (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  text NOT NULL UNIQUE,
  placement             text NOT NULL DEFAULT 'custom'
    CHECK (placement IN (
      'homepage_popular', 'bouquet_add_ons', 'bouquet_recommendations',
      'product_recommendations', 'plushy_toys', 'balloons',
      'collection_add_ons', 'custom'
    )),
  title_en              text NOT NULL,
  title_th              text NOT NULL DEFAULT '',
  description_en        text NOT NULL DEFAULT '',
  description_th        text NOT NULL DEFAULT '',
  seo_title_en          text,
  seo_title_th          text,
  seo_description_en    text,
  seo_description_th    text,
  fallback_mode         text NOT NULL DEFAULT 'automatic'
    CHECK (fallback_mode IN ('automatic', 'empty', 'category', 'popular')),
  is_active             boolean NOT NULL DEFAULT true,
  starts_at             timestamptz,
  ends_at               timestamptz,
  sort_order            integer NOT NULL DEFAULT 0,
  created_by            text,
  updated_by            text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_collections_slug_not_blank CHECK (length(btrim(slug)) > 0),
  CONSTRAINT catalog_collections_schedule_check CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS catalog_collections_placement_idx
  ON public.catalog_collections (placement, is_active, sort_order);

CREATE INDEX IF NOT EXISTS catalog_collections_active_window_idx
  ON public.catalog_collections (is_active, starts_at, ends_at);

CREATE TABLE IF NOT EXISTS public.catalog_collection_items (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id         uuid NOT NULL REFERENCES public.catalog_collections(id) ON DELETE CASCADE,
  entity_type           text NOT NULL CHECK (entity_type IN ('bouquet', 'product')),
  entity_id             uuid NOT NULL,
  sort_order            integer NOT NULL DEFAULT 0,
  label_en              text,
  label_th              text,
  is_active             boolean NOT NULL DEFAULT true,
  metadata              jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_collection_items_unique_entity
    UNIQUE (collection_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS catalog_collection_items_collection_idx
  ON public.catalog_collection_items (collection_id, is_active, sort_order);

CREATE INDEX IF NOT EXISTS catalog_collection_items_entity_idx
  ON public.catalog_collection_items (entity_type, entity_id);

-- =============================================================================
-- 4. Audit events
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.catalog_audit_events (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type           text CHECK (entity_type IN ('bouquet', 'product', 'collection', 'image', 'partner')),
  entity_id             uuid,
  revision_id           uuid REFERENCES public.catalog_product_revisions(id) ON DELETE SET NULL,
  action                text NOT NULL,
  actor                 text,
  before_summary        jsonb,
  after_summary         jsonb,
  metadata              jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_audit_events_action_not_blank CHECK (length(btrim(action)) > 0)
);

CREATE INDEX IF NOT EXISTS catalog_audit_events_entity_idx
  ON public.catalog_audit_events (entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS catalog_audit_events_revision_idx
  ON public.catalog_audit_events (revision_id, created_at DESC);

-- =============================================================================
-- 5. Row-Level Security — admin backend (service role) only
-- =============================================================================
ALTER TABLE public.catalog_product_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_audit_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.catalog_product_revisions FROM anon, authenticated;
REVOKE ALL ON TABLE public.catalog_product_images FROM anon, authenticated;
REVOKE ALL ON TABLE public.catalog_collections FROM anon, authenticated;
REVOKE ALL ON TABLE public.catalog_collection_items FROM anon, authenticated;
REVOKE ALL ON TABLE public.catalog_audit_events FROM anon, authenticated;
