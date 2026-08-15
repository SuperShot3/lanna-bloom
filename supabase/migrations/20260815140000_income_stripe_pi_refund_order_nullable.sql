-- Payment Link / Dashboard PaymentIntents have no storefront order.
-- 1) Allow income_refunds without order_id so Stripe refunds still hit NET KPIs.
-- 2) Unique Stripe PI refs on income_records so PI-only income is idempotent.

ALTER TABLE public.income_refunds
  ALTER COLUMN order_id DROP NOT NULL;

COMMENT ON COLUMN public.income_refunds.order_id IS
  'Storefront order id when known; NULL for Stripe refunds with no website order (Payment Link / Dashboard).';

CREATE UNIQUE INDEX IF NOT EXISTS income_records_stripe_pi_external_reference_uidx
  ON public.income_records (external_reference)
  WHERE external_reference LIKE 'pi_%';
