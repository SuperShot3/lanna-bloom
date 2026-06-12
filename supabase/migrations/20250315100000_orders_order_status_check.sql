-- Fix orders_order_status_check so it allows the values the app uses.
-- App uses: NEW, PROCESSING, READY_TO_DISPATCH, DISPATCHED, DELIVERED, CANCELLED.

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_order_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_order_status_check
  CHECK (order_status IN ('NEW', 'PROCESSING', 'READY_TO_DISPATCH', 'DISPATCHED', 'DELIVERED', 'CANCELLED'));
