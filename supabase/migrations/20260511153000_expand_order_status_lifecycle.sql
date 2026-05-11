-- Align order_status with the customer-facing lifecycle.
-- Payment confirmation remains in payment_status; order_status is the admin-controlled fulfillment pipeline.

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_order_status_check;

UPDATE public.orders
SET order_status = CASE
  WHEN order_status IS NULL OR trim(order_status::text) = '' THEN 'NEW'
  WHEN upper(trim(order_status::text)) = 'PAID' THEN 'NEW'
  WHEN upper(trim(order_status::text)) IN ('ACCEPTED', 'ORDER_ACCEPTED') THEN 'ACCEPTED'
  WHEN upper(trim(order_status::text)) IN ('PROCESSING', 'PREPARING') THEN 'PREPARING'
  WHEN upper(trim(order_status::text)) IN ('READY_TO_DISPATCH', 'READY_FOR_DISPATCH', 'READY_FOR_DELIVERY') THEN 'READY_FOR_DELIVERY'
  WHEN upper(trim(order_status::text)) IN ('DISPATCHED', 'OUT_FOR_DELIVERY') THEN 'OUT_FOR_DELIVERY'
  WHEN upper(trim(order_status::text)) = 'DELIVERED' THEN 'DELIVERED'
  WHEN upper(trim(order_status::text)) IN ('CANCELED', 'CANCELLED', 'REFUNDED') THEN 'CANCELLED'
  ELSE 'NEW'
END
WHERE order_status IS DISTINCT FROM CASE
  WHEN order_status IS NULL OR trim(order_status::text) = '' THEN 'NEW'
  WHEN upper(trim(order_status::text)) = 'PAID' THEN 'NEW'
  WHEN upper(trim(order_status::text)) IN ('ACCEPTED', 'ORDER_ACCEPTED') THEN 'ACCEPTED'
  WHEN upper(trim(order_status::text)) IN ('PROCESSING', 'PREPARING') THEN 'PREPARING'
  WHEN upper(trim(order_status::text)) IN ('READY_TO_DISPATCH', 'READY_FOR_DISPATCH', 'READY_FOR_DELIVERY') THEN 'READY_FOR_DELIVERY'
  WHEN upper(trim(order_status::text)) IN ('DISPATCHED', 'OUT_FOR_DELIVERY') THEN 'OUT_FOR_DELIVERY'
  WHEN upper(trim(order_status::text)) = 'DELIVERED' THEN 'DELIVERED'
  WHEN upper(trim(order_status::text)) IN ('CANCELED', 'CANCELLED', 'REFUNDED') THEN 'CANCELLED'
  ELSE 'NEW'
END;

ALTER TABLE public.orders
  ALTER COLUMN order_status SET DEFAULT 'NEW';

ALTER TABLE public.orders
  ADD CONSTRAINT orders_order_status_check
  CHECK (order_status IN (
    'NEW',
    'ACCEPTED',
    'PREPARING',
    'READY_FOR_DELIVERY',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED'
  ));
