-- Replace product_kind with pricing_type (single_price | size_based | stem_count).

ALTER TABLE public.catalog_bouquets
  ADD COLUMN IF NOT EXISTS pricing_type text;

-- Backfill pricing_type from product_kind + pricing shape
UPDATE public.catalog_bouquets
SET pricing_type = CASE
  WHEN product_kind = 'single_stem_count' THEN 'stem_count'
  WHEN product_kind = 'fixed_bouquet' THEN 'size_based'
  WHEN product_kind = 'customizable_bouquet' THEN 'single_price'
  WHEN product_kind = 'legacy' AND (
    SELECT COUNT(*)::int
    FROM jsonb_array_elements(COALESCE(pricing -> 'sizes', '[]'::jsonb)) el
    WHERE COALESCE((el ->> 'price')::numeric, 0) > 0
      AND COALESCE((el ->> 'availability')::text, 'true') IS DISTINCT FROM 'false'
  ) >= 2 THEN 'size_based'
  ELSE 'single_price'
END
WHERE pricing_type IS NULL;

UPDATE public.catalog_bouquets
SET pricing_type = 'single_price'
WHERE pricing_type IS NULL;

ALTER TABLE public.catalog_bouquets
  ALTER COLUMN pricing_type SET DEFAULT 'single_price',
  ALTER COLUMN pricing_type SET NOT NULL;

ALTER TABLE public.catalog_bouquets
  DROP CONSTRAINT IF EXISTS catalog_bouquets_product_kind_check;

ALTER TABLE public.catalog_bouquets
  ADD CONSTRAINT catalog_bouquets_pricing_type_check
  CHECK (pricing_type IN ('single_price', 'size_based', 'stem_count'));

-- Drop legacy column after backfill (pricing JSON migration via scripts/migrate-catalog-pricing.ts)
ALTER TABLE public.catalog_bouquets
  DROP COLUMN IF EXISTS product_kind;

COMMENT ON COLUMN public.catalog_bouquets.pricing_type IS
  'single_price | size_based (S/M/L/XL) | stem_count (rose tiers)';
