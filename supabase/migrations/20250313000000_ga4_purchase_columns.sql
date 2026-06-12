-- GA4 Measurement Protocol: idempotency and optional client id for purchase events
-- Run in Supabase SQL Editor

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ga4_purchase_sent boolean DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ga4_purchase_sent_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ga_client_id text;

COMMENT ON COLUMN public.orders.ga4_purchase_sent IS 'True after backend sent GA4 purchase via Measurement Protocol (prevents duplicate sends)';
COMMENT ON COLUMN public.orders.ga4_purchase_sent_at IS 'Timestamp when GA4 purchase was sent';
COMMENT ON COLUMN public.orders.ga_client_id IS 'Optional GA client_id from frontend for server-side purchase attribution';
