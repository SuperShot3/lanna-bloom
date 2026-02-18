-- Add payment_method to orders table
-- Values: STRIPE (online), PROMPTPAY (manual), BANK_TRANSFER (manual)
-- Existing rows default to BANK_TRANSFER (manual) for backward compatibility

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method text;

-- Backfill: orders with stripe_session_id or stripe_payment_intent_id are STRIPE
UPDATE public.orders
SET payment_method = 'STRIPE'
WHERE payment_method IS NULL
  AND (stripe_session_id IS NOT NULL OR stripe_payment_intent_id IS NOT NULL);

-- Remaining nulls = manual payment orders
UPDATE public.orders
SET payment_method = 'BANK_TRANSFER'
WHERE payment_method IS NULL;
