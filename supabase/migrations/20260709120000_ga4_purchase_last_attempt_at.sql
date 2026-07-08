-- Track when each GA4 Measurement Protocol fallback attempt started (paired with atomic lock acquire).

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ga4_purchase_last_attempt_at timestamptz;

COMMENT ON COLUMN public.orders.ga4_purchase_last_attempt_at IS
  'Timestamp of the most recent Measurement Protocol send attempt (set atomically with lock acquire)';
