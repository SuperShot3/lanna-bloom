-- Photo of the actual bouquet/product delivered for a specific order line,
-- uploaded by admin/florist after the sale (Products > Sold history page).
-- Distinct from order_items.image_url_snapshot (the storefront listing photo
-- shown at checkout time) and order_items.purchase_photo_path (COGS receipt).

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS delivery_photo_path text;

COMMENT ON COLUMN public.order_items.delivery_photo_path IS
  'Storage path (private "receipts" bucket) of a photo of what was actually delivered for this order line, added after the sale. Distinct from image_url_snapshot (storefront listing photo) and purchase_photo_path (COGS receipt).';
