-- Add columns for Supabase-as-primary order storage and fulfillment status
-- Run in Supabase SQL Editor

-- order_json: full order payload for migration/backfill and fast reads
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_json jsonb;

-- Fulfillment status (customer-facing): new, confirmed, preparing, dispatched, delivered, cancelled, issue
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS fulfillment_status text DEFAULT 'new';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS fulfillment_status_updated_at timestamptz DEFAULT now();

-- Backfill fulfillment_status for existing rows
UPDATE public.orders
SET fulfillment_status = 'new'
WHERE fulfillment_status IS NULL;

-- Stripe webhook idempotency: prevent double-processing
CREATE TABLE IF NOT EXISTS public.stripe_events (
  event_id text PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  type text
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_created_at ON public.stripe_events(created_at DESC);
