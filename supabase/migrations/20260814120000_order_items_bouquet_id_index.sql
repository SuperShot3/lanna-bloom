-- Speed paid-units-sold aggregates (order_items grouped by bouquet_id).
CREATE INDEX IF NOT EXISTS idx_order_items_bouquet_id
  ON public.order_items (bouquet_id)
  WHERE bouquet_id IS NOT NULL;
