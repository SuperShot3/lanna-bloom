-- Phase 1: Supabase catalog schema (mirrors Sanity bouquet / product / partner / siteSettings).
-- Storefront still reads Sanity; import and cutover in later phases.
-- Access: service role only (RLS enabled, no anon/authenticated policies).

-- =============================================================================
-- 1. Partners
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.catalog_partners (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_sanity_id    text UNIQUE,
  shop_name           text NOT NULL,
  contact_name        text NOT NULL,
  phone_number        text NOT NULL,
  line_or_whatsapp    text,
  shop_address        text,
  shop_bio_en         text,
  shop_bio_th         text,
  portrait            jsonb,
  city                text NOT NULL DEFAULT 'Chiang Mai',
  status              text NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'approved', 'disabled')),
  supabase_user_id    uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS catalog_partners_legacy_sanity_id_idx
  ON public.catalog_partners (legacy_sanity_id)
  WHERE legacy_sanity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS catalog_partners_supabase_user_id_idx
  ON public.catalog_partners (supabase_user_id)
  WHERE supabase_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS catalog_partners_status_idx
  ON public.catalog_partners (status);

-- =============================================================================
-- 2. Bouquets (flowers)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.catalog_bouquets (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_sanity_id                text UNIQUE,
  partner_id                      uuid REFERENCES public.catalog_partners(id) ON DELETE SET NULL,
  slug_en                         text NOT NULL,
  slug_th                         text,
  name_en                         text NOT NULL,
  name_th                         text NOT NULL DEFAULT '',
  description_en                  text NOT NULL DEFAULT '',
  description_th                  text NOT NULL DEFAULT '',
  composition_en                  text NOT NULL DEFAULT '',
  composition_th                  text NOT NULL DEFAULT '',
  product_kind                    text NOT NULL DEFAULT 'legacy'
    CHECK (product_kind IN (
      'legacy', 'single_stem_count', 'fixed_bouquet', 'customizable_bouquet'
    )),
  -- Mirrors Sanity option arrays; loaders map to BouquetSellableOption[].
  pricing                         jsonb NOT NULL DEFAULT '{"sizes":[]}'::jsonb,
  status                          text NOT NULL DEFAULT 'approved'
    CHECK (status IN ('pending_review', 'approved', 'rejected')),
  featured_popular                boolean NOT NULL DEFAULT false,
  discount_percent                smallint
    CHECK (discount_percent IS NULL OR (discount_percent >= 1 AND discount_percent <= 90)),
  delivery_options                text[] NOT NULL DEFAULT '{}',
  excluded_delivery_destinations  text[] NOT NULL DEFAULT '{}',
  presentation_formats            text[] NOT NULL DEFAULT '{}',
  colors                          text[] NOT NULL DEFAULT '{}',
  flower_types                    text[] NOT NULL DEFAULT '{}',
  occasion                        text[] NOT NULL DEFAULT '{}',
  images                          jsonb NOT NULL DEFAULT '[]'::jsonb,
  source                          text,
  created_by                      text,
  approved_by                     text,
  approved_at                     timestamptz,
  created_at                      timestamptz NOT NULL DEFAULT now(),
  updated_at                      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_bouquets_slug_en_key UNIQUE (slug_en)
);

CREATE INDEX IF NOT EXISTS catalog_bouquets_legacy_sanity_id_idx
  ON public.catalog_bouquets (legacy_sanity_id)
  WHERE legacy_sanity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS catalog_bouquets_partner_id_idx
  ON public.catalog_bouquets (partner_id);

CREATE INDEX IF NOT EXISTS catalog_bouquets_status_idx
  ON public.catalog_bouquets (status);

CREATE INDEX IF NOT EXISTS catalog_bouquets_featured_popular_idx
  ON public.catalog_bouquets (featured_popular)
  WHERE featured_popular = true;

CREATE INDEX IF NOT EXISTS catalog_bouquets_slug_th_idx
  ON public.catalog_bouquets (slug_th)
  WHERE slug_th IS NOT NULL;

-- =============================================================================
-- 3. Products (non-flower)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.catalog_products (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_sanity_id                text UNIQUE,
  partner_id                      uuid NOT NULL REFERENCES public.catalog_partners(id) ON DELETE RESTRICT,
  slug_en                         text NOT NULL,
  slug_th                         text,
  name_en                         text NOT NULL,
  name_th                         text NOT NULL DEFAULT '',
  description_en                  text NOT NULL DEFAULT '',
  description_th                  text NOT NULL DEFAULT '',
  category                        text NOT NULL,
  price                           numeric(12,2) NOT NULL CHECK (price >= 0),
  cost                            numeric(12,2) CHECK (cost IS NULL OR cost >= 0),
  commission_percent              numeric(6,2) CHECK (
    commission_percent IS NULL OR (commission_percent >= 0 AND commission_percent <= 500)
  ),
  moderation_status               text NOT NULL DEFAULT 'submitted'
    CHECK (moderation_status IN ('submitted', 'live', 'needs_changes', 'rejected')),
  admin_note                      text,
  discount_percent                smallint
    CHECK (discount_percent IS NULL OR (discount_percent >= 1 AND discount_percent <= 90)),
  excluded_delivery_destinations  text[] NOT NULL DEFAULT '{}',
  images                          jsonb NOT NULL DEFAULT '[]'::jsonb,
  structured_attributes           jsonb NOT NULL DEFAULT '{}'::jsonb,
  custom_attributes               jsonb NOT NULL DEFAULT '[]'::jsonb,
  admin_overrides                 jsonb,
  admin_change_summary            text,
  admin_last_edited_at            timestamptz,
  admin_last_edited_by            text,
  created_at                      timestamptz NOT NULL DEFAULT now(),
  updated_at                      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_products_slug_en_key UNIQUE (slug_en),
  CONSTRAINT catalog_products_category_check CHECK (category IN (
    'balloons', 'plushy_toys', 'gifts', 'money_flowers', 'handmade_floral',
    'food_sweets', 'wellness', 'home_lifestyle', 'stationery', 'baby_family',
    'fashion', 'seasonal', 'other'
  ))
);

CREATE INDEX IF NOT EXISTS catalog_products_legacy_sanity_id_idx
  ON public.catalog_products (legacy_sanity_id)
  WHERE legacy_sanity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS catalog_products_partner_id_idx
  ON public.catalog_products (partner_id);

CREATE INDEX IF NOT EXISTS catalog_products_moderation_status_idx
  ON public.catalog_products (moderation_status);

CREATE INDEX IF NOT EXISTS catalog_products_category_idx
  ON public.catalog_products (category);

CREATE INDEX IF NOT EXISTS catalog_products_slug_th_idx
  ON public.catalog_products (slug_th)
  WHERE slug_th IS NOT NULL;

-- =============================================================================
-- 4. Homepage media (siteSettings singleton)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.catalog_site_settings (
  id                    text PRIMARY KEY DEFAULT 'default'
    CHECK (id = 'default'),
  hero_image            jsonb,
  hero_carousel_images  jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at            timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.catalog_site_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 5. Global slug registry (per locale)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.catalog_slug_registry (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL,
  locale        text NOT NULL CHECK (locale IN ('en', 'th')),
  entity_type   text NOT NULL CHECK (entity_type IN ('bouquet', 'product')),
  entity_id     uuid NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_slug_registry_slug_locale_key UNIQUE (slug, locale)
);

CREATE INDEX IF NOT EXISTS catalog_slug_registry_entity_idx
  ON public.catalog_slug_registry (entity_type, entity_id);

-- =============================================================================
-- 6. Row-Level Security — admin backend (service role) only
-- =============================================================================
ALTER TABLE public.catalog_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_bouquets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_slug_registry ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.catalog_partners FROM anon, authenticated;
REVOKE ALL ON TABLE public.catalog_bouquets FROM anon, authenticated;
REVOKE ALL ON TABLE public.catalog_products FROM anon, authenticated;
REVOKE ALL ON TABLE public.catalog_site_settings FROM anon, authenticated;
REVOKE ALL ON TABLE public.catalog_slug_registry FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.catalog_partners TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.catalog_bouquets TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.catalog_products TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.catalog_site_settings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.catalog_slug_registry TO service_role;
