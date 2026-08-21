-- Per-item wholesale source for COGS (who sold Lanna Bloom this line).
-- Distinct from orders.confirmed_shop_id (fulfillment / pickup shop).

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS source_shop_id text,
  ADD COLUMN IF NOT EXISTS source_shop_name text;
