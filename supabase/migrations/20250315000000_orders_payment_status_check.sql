-- Fix orders_payment_status_check so it allows the values the app sends.
-- App uses: NOT_PAID (new/pending), PAID, ERROR, CANCELLED.

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payment_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('NOT_PAID', 'PAID', 'CANCELLED', 'ERROR'));
