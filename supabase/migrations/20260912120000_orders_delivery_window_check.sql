-- Allow the delivery windows the app writes (lib/orders/deliveryFields.ts).
-- Paid Stripe checkouts failed when customers chose 09:00–20:00 (ANYTIME_9_20)
-- because orders_delivery_window_check did not include that value.

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_delivery_window_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_delivery_window_check
  CHECK (
    delivery_window IS NULL
    OR delivery_window IN (
      'ANYTIME_9_20',
      'MORNING_9_12',
      'MIDDAY_12_15',
      'AFTERNOON_15_18',
      'EVENING_18_20'
    )
  );
