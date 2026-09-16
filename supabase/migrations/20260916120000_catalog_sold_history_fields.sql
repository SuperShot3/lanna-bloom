-- Product-level, admin-only "sold history" annotations (notes + shared image gallery)
-- for the Products > Sold history page. Distinct from:
--   - catalog_*.admin_note   -> moderation feedback shown to the vendor/partner
--   - catalog_*.images       -> live, customer-facing storefront gallery
-- Must never render on the storefront or be sent to partners.

ALTER TABLE public.catalog_bouquets
  ADD COLUMN IF NOT EXISTS sold_history_notes text,
  ADD COLUMN IF NOT EXISTS sold_history_images jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.catalog_products
  ADD COLUMN IF NOT EXISTS sold_history_notes text,
  ADD COLUMN IF NOT EXISTS sold_history_images jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.catalog_bouquets.sold_history_notes IS
  'Internal admin-only freeform notes for the Products > Sold history page. Never shown on storefront or to partners.';
COMMENT ON COLUMN public.catalog_bouquets.sold_history_images IS
  'Admin-curated image gallery for the Products > Sold history page (array of CatalogStoredImage). Separate from the live storefront images column and from per-sale order_items.image_url_snapshot.';

COMMENT ON COLUMN public.catalog_products.sold_history_notes IS
  'Internal admin-only freeform notes for the Products > Sold history page. Never shown on storefront or to partners.';
COMMENT ON COLUMN public.catalog_products.sold_history_images IS
  'Admin-curated image gallery for the Products > Sold history page (array of CatalogStoredImage). Separate from the live storefront images column and from per-sale order_items.image_url_snapshot.';
