-- Admin order list: sort pending deliveries first, then by delivery_date (see getOrders / getOrdersForExport).

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS admin_needs_delivery_sort smallint
  GENERATED ALWAYS AS (
    CASE
      WHEN order_status IS NULL THEN 1
      WHEN upper(trim(order_status::text)) IN ('DELIVERED', 'CANCELLED') THEN 0
      ELSE 1
    END
  ) STORED;

COMMENT ON COLUMN public.orders.admin_needs_delivery_sort IS
  '1 = still in delivery pipeline; 0 = terminal (delivered/cancelled). Used for admin list ordering.';

CREATE INDEX IF NOT EXISTS idx_orders_admin_needs_delivery_sort
  ON public.orders (admin_needs_delivery_sort DESC, delivery_date ASC NULLS LAST, created_at DESC);
