-- Optional iPhone/ops photo of what was bought for this line (COGS).
-- Distinct from image_url_snapshot (catalog listing photo).

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS purchase_photo_path text;
