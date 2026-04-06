-- Processing fee per income row (Stripe/card: fixed 5.3% of gross). Used for net profit in admin accounting.

ALTER TABLE public.income_records
  ADD COLUMN IF NOT EXISTS processing_fee_amount numeric(12,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.income_records.processing_fee_amount IS
  'Payment processing fee (THB). Stripe/card rows: 5.3% of amount; other methods: 0.';

-- Backfill existing rows (Stripe = 5.3% of gross; cancelled rows store 0)
UPDATE public.income_records
SET processing_fee_amount = CASE
  WHEN income_status = 'cancelled' THEN 0
  WHEN payment_method = 'stripe' THEN ROUND((amount * 0.053)::numeric, 2)
  ELSE 0
END
WHERE processing_fee_amount = 0;
