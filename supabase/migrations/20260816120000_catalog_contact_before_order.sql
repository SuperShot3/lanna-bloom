-- Per-product flag: customer must contact the shop before placing an order.
-- Storefront hides add-to-cart; checkout rejects flagged catalog rows.

ALTER TABLE public.catalog_bouquets
  ADD COLUMN IF NOT EXISTS contact_before_order boolean NOT NULL DEFAULT false;

ALTER TABLE public.catalog_products
  ADD COLUMN IF NOT EXISTS contact_before_order boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.catalog_bouquets.contact_before_order IS
  'When true, customers must contact LINE / WhatsApp / email before ordering; checkout is blocked.';

COMMENT ON COLUMN public.catalog_products.contact_before_order IS
  'When true, customers must contact LINE / WhatsApp / email before ordering; checkout is blocked.';
