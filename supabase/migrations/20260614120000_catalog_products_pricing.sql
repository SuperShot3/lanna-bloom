-- Add bouquet-style pricing to non-flower catalog products (gifts, plush, balloons, etc.).

ALTER TABLE public.catalog_products
  ADD COLUMN IF NOT EXISTS pricing_type text,
  ADD COLUMN IF NOT EXISTS pricing jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.catalog_products
SET
  pricing_type = COALESCE(pricing_type, 'single_price'),
  pricing = CASE
    WHEN pricing IS NULL OR pricing = '{}'::jsonb THEN jsonb_build_object(
      'price', price,
      'sizes', jsonb_build_array(
        jsonb_build_object(
          'key', 'm',
          'enabled', true,
          'price', price,
          'labelEn', 'Standard',
          'availability', true
        )
      )
    )
    ELSE pricing
  END
WHERE pricing_type IS NULL OR pricing = '{}'::jsonb;

ALTER TABLE public.catalog_products
  ALTER COLUMN pricing_type SET DEFAULT 'single_price';

UPDATE public.catalog_products
SET pricing_type = 'single_price'
WHERE pricing_type IS NULL;

ALTER TABLE public.catalog_products
  ALTER COLUMN pricing_type SET NOT NULL;

ALTER TABLE public.catalog_products
  DROP CONSTRAINT IF EXISTS catalog_products_pricing_type_check;

ALTER TABLE public.catalog_products
  ADD CONSTRAINT catalog_products_pricing_type_check
  CHECK (pricing_type IN ('single_price', 'size_based', 'stem_count'));

COMMENT ON COLUMN public.catalog_products.pricing_type IS
  'single_price | size_based (S/M/L/XL) | stem_count (rose tiers)';

COMMENT ON COLUMN public.catalog_products.pricing IS
  'Variant pricing JSON — same shape as catalog_bouquets.pricing';
