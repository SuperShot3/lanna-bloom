-- Store the Stripe commission entered on an admin refund so overview P&L
-- can show retained fees as shop loss without mixing refunds into income.

ALTER TABLE public.income_refunds
  ADD COLUMN IF NOT EXISTS retained_fee_amount numeric(12,2);

ALTER TABLE public.income_refunds
  DROP CONSTRAINT IF EXISTS income_refunds_retained_fee_amount_check;
ALTER TABLE public.income_refunds
  ADD CONSTRAINT income_refunds_retained_fee_amount_check
  CHECK (retained_fee_amount IS NULL OR retained_fee_amount >= 0);

COMMENT ON COLUMN public.income_refunds.retained_fee_amount IS
  'Stripe processing fee kept by Stripe on this refund (shop loss). Null for webhook-only rows; overview falls back to income_records.processing_fee_amount.';
