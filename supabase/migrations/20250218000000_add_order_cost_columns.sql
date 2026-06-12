-- Add cost and profit columns + customer_email to orders table
-- Run in Supabase SQL Editor if columns don't exist

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_email text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cogs_amount numeric(12,2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_cost numeric(12,2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_fee numeric(12,2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total_amount numeric(12,2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Backfill total_amount from grand_total for existing rows (optional)
UPDATE public.orders
SET total_amount = grand_total
WHERE total_amount IS NULL AND grand_total IS NOT NULL;
